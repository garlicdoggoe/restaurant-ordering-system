import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./rateLimit";

export const listByOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!user) throw new Error("User not found");

    const order = await ctx.db.get(orderId as any);
    if (!order) throw new Error("Order not found");

    const isOwner = user.role === "owner";
    const isCustomer = (order as any).customerId === (user._id as unknown as string);
    if (!isOwner && !isCustomer) {
      throw new Error("Unauthorized: You don't have access to this order");
    }

    return await ctx.db
      .query("chat_messages")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();
  },
});

export const send = mutation({
  args: {
    orderId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Rate limiting - prevent spam messages
    // Limit: 20 messages per minute per user
    await checkRateLimit(ctx, "chat.send");
    
    // SECURITY: Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) throw new Error("User not found");

    // SECURITY: Verify user has access to this order
    const order = await ctx.db.get(args.orderId as any);
    if (!order) throw new Error("Order not found");

    // Get restaurant settings to check work day hours
    const restaurant = await ctx.db.query("restaurant").first();
    
    // Check if chat should be automatically disabled based on work day grace period
    // If order is in final status (completed, delivered, cancelled) and past work day closing time, disable chat
    const finalStatuses = ["completed", "delivered", "cancelled"];
    const orderStatus = (order as { status?: string }).status;
    const isFinalStatus = orderStatus && finalStatuses.includes(orderStatus);
    
    if (isFinalStatus && restaurant) {
      // Helper function to check if chat should be disabled after work day grace period
      // Grace period logic:
      // - If same day as when status changed: chat is always enabled (even after closing time)
      // - If next day: chat enabled until closing time, then disabled after closing time
      // - If more than 1 day later: chat is disabled
      const shouldDisableChatAfterWorkDay = () => {
        // Get the time when status changed (use updatedAt as proxy for when status reached final state)
        const orderUpdatedAt = (order as { updatedAt?: number }).updatedAt || (order as { _creationTime?: number })._creationTime || 0;
        const statusChangeDate = new Date(orderUpdatedAt);
        const now = new Date();
        
        // Get the day when status changed (without time)
        const statusDay = new Date(statusChangeDate.getFullYear(), statusChangeDate.getMonth(), statusChangeDate.getDate());
        const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Calculate days difference
        const daysDiff = Math.floor((currentDay.getTime() - statusDay.getTime()) / (1000 * 60 * 60 * 24));
        
        // If we're on the same day as when status changed, chat is always enabled
        // (even after closing time - grace period for the day)
        if (daysDiff === 0) {
          return false;
        }
        
        // If we're more than 1 day later, chat is disabled
        if (daysDiff > 1) {
          return true;
        }
        
        // If we're on the next day (daysDiff === 1), check if past closing time
        if (!restaurant?.closingTime) {
          // If no closing time is set, allow chat for the entire next day
          return false;
        }
        
        // Parse closing time (format: "HH:MM")
        const [closeHour, closeMin] = restaurant.closingTime.split(':').map(Number);
        
        // Create a date object for the next day (current day) at closing time
        const closingTimeNextDay = new Date(now);
        closingTimeNextDay.setHours(closeHour, closeMin, 0, 0);
        
        // If current time is past closing time on the next day, disable chat
        return now > closingTimeNextDay;
      };
      
      // If we should disable chat after work day, update the order and prevent message
      if (shouldDisableChatAfterWorkDay()) {
        // Update order to disable chat automatically (if not already disabled)
        const currentAllowChat = (order as { allowChat?: boolean }).allowChat;
        if (currentAllowChat !== false) {
          await ctx.db.patch(args.orderId as any, { allowChat: false, updatedAt: Date.now() });
        }
        throw new Error("Chat is disabled for this order. The work day grace period has ended.");
      }
    }

    // Check if chat is allowed for this order
    // Default to true for backward compatibility (if allowChat is undefined, it means chat is allowed)
    const allowChat = (order as { allowChat?: boolean }).allowChat !== false;
    if (!allowChat) {
      throw new Error("Chat is disabled for this order");
    }

    // Customer can only access their own orders, owner can access all orders
    if (user.role === "customer" && (order as any).customerId !== (user._id as unknown as string)) {
      throw new Error("Unauthorized: You don't have access to this order");
    }

    // SECURITY: Derive all sender information from authenticated user (don't trust client)
    const senderId = user._id as unknown as string;
    const senderRole = user.role;
    const senderName = user.role === "owner" 
      ? (await ctx.db.query("restaurant").first())?.name || `${user.firstName} ${user.lastName}`
      : `${user.firstName} ${user.lastName}`;

    // SECURITY: Validate and sanitize message
    if (!args.message || args.message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (args.message.length > 100) {
      throw new Error("Message must be 100 characters or less");
    }
    
    // SECURITY: Strip all HTML tags to prevent XSS attacks
    // This removes <script>, <img>, <iframe>, event handlers, and all other HTML tags
    // Simple but effective: remove all content between < and > characters
    let sanitizedMessage = args.message.trim();
    // Remove all HTML tags
    sanitizedMessage = sanitizedMessage.replace(/<[^>]*>/g, "");
    // Remove HTML entities that could be used for XSS (basic protection)
    sanitizedMessage = sanitizedMessage.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    // Remove any remaining script-like patterns (case-insensitive)
    sanitizedMessage = sanitizedMessage.replace(/javascript:/gi, "");
    sanitizedMessage = sanitizedMessage.replace(/on\w+\s*=/gi, "");

    return await ctx.db.insert("chat_messages", { 
      orderId: args.orderId,
      senderId: senderId,
      senderName: senderName,
      senderRole: senderRole,
      message: sanitizedMessage,
      timestamp: Date.now() 
    });
  },
});

// Mark messages as read for a specific order
export const markAsRead = mutation({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, { orderId }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) throw new Error("User not found");

    // Get the latest message timestamp for this order
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();

    // If no messages, nothing to mark as read
    if (messages.length === 0) return;

    // Get the latest message timestamp
    const latestTimestamp = Math.max(...messages.map((m) => m.timestamp));

    // Check if read status already exists
    const existingReadStatus = await ctx.db
      .query("chat_read_status")
      .withIndex("by_orderId_userId", (q) => 
        q.eq("orderId", orderId).eq("userId", user._id)
      )
      .first();

    if (existingReadStatus) {
      // Update existing read status
      await ctx.db.patch(existingReadStatus._id, {
        lastReadTimestamp: latestTimestamp,
      });
    } else {
      // Create new read status
      await ctx.db.insert("chat_read_status", {
        orderId,
        userId: user._id,
        lastReadTimestamp: latestTimestamp,
      });
    }
  },
});

// Get unread message count for the current user
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) return 0;

    // Determine which orders to check based on user role
    let orderIds: string[] = [];
    
    if (user.role === "customer") {
      // For customers, get all their orders
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_customerId", (q) => q.eq("customerId", user._id))
        .collect();
      orderIds = orders.map((o) => o._id as string);
    } else if (user.role === "owner") {
      // For owners, get all orders
      const orders = await ctx.db.query("orders").collect();
      orderIds = orders.map((o) => o._id as string);
    }

    if (orderIds.length === 0) return 0;

    // Get all read statuses for this user and these orders
    const readStatuses = await ctx.db
      .query("chat_read_status")
      .collect()
      .then((statuses) =>
        statuses.filter((s) => s.userId === user._id && orderIds.includes(s.orderId))
      );

    // Create a map of orderId -> lastReadTimestamp
    const readStatusMap = new Map<string, number>();
    for (const status of readStatuses) {
      readStatusMap.set(status.orderId, status.lastReadTimestamp);
    }

    // Get all messages for these orders
    const allMessages = await Promise.all(
      orderIds.map((orderId) =>
        ctx.db
          .query("chat_messages")
          .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
          .collect()
      )
    );

    // Flatten and count unread messages
    let unreadCount = 0;
    const expectedSenderRole = user.role === "customer" ? "owner" : "customer";

    for (const messages of allMessages) {
      for (const message of messages) {
        // Only count messages from the other role
        if (message.senderRole !== expectedSenderRole) continue;

        const lastReadTimestamp = readStatusMap.get(message.orderId);
        
        // If no read status exists, all messages are unread
        // Otherwise, count messages after the last read timestamp
        if (lastReadTimestamp === undefined || message.timestamp > lastReadTimestamp) {
          unreadCount++;
        }
      }
    }

    return unreadCount;
  },
});

// Get per-order unread count and last message for given orders
export const getPerOrderUnreadAndLast = query({
  args: { orderIds: v.array(v.string()) },
  handler: async (ctx, { orderIds }) => {
    if (orderIds.length === 0) return [] as Array<{ orderId: string; unreadCount: number; lastMessage: any | null }>

    // Get current user to determine which messages count as unread
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) return orderIds.map((id) => ({ orderId: id, unreadCount: 0, lastMessage: null }))

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!user) return orderIds.map((id) => ({ orderId: id, unreadCount: 0, lastMessage: null }))

    const expectedSenderRole = user.role === "customer" ? "owner" : "customer";

    // Fetch read statuses for all provided orders for this user
    const allStatuses = await ctx.db.query("chat_read_status").collect();
    const readStatusMap = new Map<string, number>();
    for (const s of allStatuses) {
      if (s.userId === user._id && orderIds.includes(s.orderId)) {
        readStatusMap.set(s.orderId, s.lastReadTimestamp);
      }
    }

    const results: Array<{ orderId: string; unreadCount: number; lastMessage: any | null }> = []

    for (const orderId of orderIds) {
      const messages = await ctx.db
        .query("chat_messages")
        .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
        .collect();

      let unreadCount = 0;
      const lastReadTimestamp = readStatusMap.get(orderId);
      let lastMessage: any | null = null;

      for (const m of messages) {
        if (!lastMessage || m.timestamp > (lastMessage as any).timestamp) lastMessage = m;
        if (m.senderRole !== expectedSenderRole) continue;
        if (lastReadTimestamp === undefined || m.timestamp > lastReadTimestamp) {
          unreadCount++;
        }
      }

      results.push({ orderId, unreadCount, lastMessage });
    }

    return results;
  },
});


