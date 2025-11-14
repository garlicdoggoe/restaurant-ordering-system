import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Separate user role lookup with better caching - eliminates user dependency from order queries
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    return user ? { userId: user._id, role: user.role } : null;
  },
});

// Optimized orders.list - no user lookup inside, eliminates user dependency
export const list = query({
  args: { 
    userRole: v.union(v.literal("owner"), v.literal("customer")),
    userId: v.string()
  },
  handler: async (ctx, { userRole, userId }) => {
    if (userRole === "owner") {
      // Use status index to enable partial cache hits
      return await ctx.db.query("orders").collect();
    }
    
    // Customer: only own orders
    return await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", userId))
      .collect();
  },
});

// Status-filtered query for better caching - enables partial cache hits per status
export const listByStatus = query({
  args: { 
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("ready"),
      v.literal("denied"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("in-transit"),
      v.literal("delivered"),
      v.literal("pre-order-pending")
    )),
    userRole: v.union(v.literal("owner"), v.literal("customer")),
    userId: v.string()
  },
  handler: async (ctx, { status, userRole, userId }) => {
    if (userRole === "owner") {
      if (status) {
        return await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("orders").order("desc").collect();
    }
    
    // Customer filtered by customerId and optional status
    let query = ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", userId));
    
    const results = await query.collect();
    return status ? results.filter(o => o.status === status) : results;
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    const order = await ctx.db.get(id);
    if (!order) return null;

    if (currentUser.role === "owner" || order.customerId === (currentUser._id as unknown as string)) {
      return order;
    }

    throw new Error("Unauthorized to view this order");
  },
});

export const getCustomerPendingOrder = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .collect();
    // Return first non-preorder pending order (allow multiple pre-orders)
    return orders.find((o) => o.status === "pending" && o.orderType !== "pre-order") ?? null;
  },
});

export const create = mutation({
  args: {
    // customerId is derived from the authenticated user to prevent spoofing
    customerId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.optional(v.string()),
    gcashNumber: v.optional(v.string()),
    items: v.array(
      v.object({ 
        menuItemId: v.string(), 
        name: v.string(), 
        price: v.number(), 
        quantity: v.number(),
        // Optional variant information for flexible pricing
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        attributes: v.optional(v.record(v.string(), v.string())),
        unitPrice: v.optional(v.number()),
      })
    ),
    subtotal: v.number(),
    platformFee: v.number(),
    discount: v.number(),
    total: v.number(),
    orderType: v.union(
      v.literal("dine-in"),
      v.literal("takeaway"),
      v.literal("delivery"),
      v.literal("pre-order")
    ),
    preOrderFulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
    preOrderScheduledAt: v.optional(v.number()),
    paymentPlan: v.optional(v.union(v.literal("full"), v.literal("downpayment"))),
    downpaymentAmount: v.optional(v.number()),
    downpaymentProofUrl: v.optional(v.string()),
    remainingPaymentMethod: v.optional(v.union(v.literal("online"), v.literal("cash"))),
    remainingPaymentProofUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("ready"),
      v.literal("denied"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("in-transit"),
      v.literal("delivered"),
      v.literal("pre-order-pending")
    ),
    paymentScreenshot: v.optional(v.string()),
    voucherCode: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Only customers can create orders; force customerId to current user's id
    if (currentUser.role !== "customer") throw new Error("Only customers can create orders");

    // Validate special instructions length (max 100 characters)
    if (args.specialInstructions && args.specialInstructions.length > 100) {
      throw new Error("Landmark/Special instructions must be 100 characters or less");
    }

    // If client sent a Convex storageId instead of a URL for payment screenshot, resolve it to a URL
    // This allows clients to pass a storage reference without extra round trips for URL resolution
    let resolvedPaymentScreenshot = args.paymentScreenshot;
    if (
      typeof resolvedPaymentScreenshot === "string" &&
      resolvedPaymentScreenshot.length > 0 &&
      !resolvedPaymentScreenshot.startsWith("http")
    ) {
      const url = await ctx.storage.getUrl(resolvedPaymentScreenshot as any);
      if (url) {
        resolvedPaymentScreenshot = url;
      }
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      ...args,
      paymentScreenshot: resolvedPaymentScreenshot,
      customerId: currentUser._id as unknown as string,
      // Default: customers cannot send images unless explicitly enabled by owner
      allowCustomerImages: false,
      createdAt: now,
      updatedAt: now,
    });

    // Seed initial chat message when order is created (after checkout)
    // This allows customers and owners to chat about any order, regardless of status or orderType
    // Messages are created for all orders including: pending non-preorders, pending pre-orders,
    // and all other order types and statuses
    const restaurant = await ctx.db.query("restaurant").first();
    // Get the owner user to send the message with correct senderId
    const ownerUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "owner"))
      .first();
    
    // Use different message text for pre-order-pending status vs regular pending/other statuses
    // Both pre-orders and regular orders (including pending non-preorders) get initial messages
    const initialMessage = args.status === "pre-order-pending" 
      ? `Pre-order placed. We'll review and confirm your order soon. Order #${orderId.toString().slice(-6).toUpperCase()} | View details: /owner?orderId=${orderId}`
      : `Order placed. We'll review and confirm your order soon. Order #${orderId.toString().slice(-6).toUpperCase()} | View details: /owner?orderId=${orderId}`;
    
    // Only seed message if owner exists (should always exist, but check for safety)
    if (ownerUser) {
      await ctx.db.insert("chat_messages", {
        orderId: orderId as unknown as string,
        senderId: ownerUser._id as unknown as string,
        senderName: restaurant?.name || `${ownerUser.firstName} ${ownerUser.lastName}`,
        senderRole: "owner",
        message: initialMessage,
        timestamp: now,
      });
    }

    return orderId;
  },
});

export const update = mutation({
  args: {
    id: v.id("orders"),
    data: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("accepted"),
          v.literal("ready"),
          v.literal("denied"),
          v.literal("completed"),
          v.literal("cancelled"),
          v.literal("in-transit"),
          v.literal("delivered"),
          v.literal("pre-order-pending")
        )
      ),
      denialReason: v.optional(v.string()),
      estimatedPrepTime: v.optional(v.number()),
      estimatedDeliveryTime: v.optional(v.number()),
      preOrderFulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
      preOrderScheduledAt: v.optional(v.number()),
      paymentPlan: v.optional(v.union(v.literal("full"), v.literal("downpayment"))),
      downpaymentAmount: v.optional(v.number()),
      downpaymentProofUrl: v.optional(v.string()),
      remainingPaymentMethod: v.optional(v.union(v.literal("online"), v.literal("cash"))),
      remainingPaymentProofUrl: v.optional(v.string()),
      items: v.optional(v.array(
        v.object({ 
          menuItemId: v.string(), 
          name: v.string(), 
          price: v.number(), 
          quantity: v.number(),
          variantId: v.optional(v.string()),
          variantName: v.optional(v.string()),
          attributes: v.optional(v.record(v.string(), v.string())),
          unitPrice: v.optional(v.number()),
        })
      )),
      // Toggle if customer can send images in chat for this order
      allowCustomerImages: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Order not found");

    // Owners can update any order status; customers can only cancel their own pending orders
    if (currentUser.role === "owner") {
      // Check if order is transitioning to accepted status
      const wasAccepted = existing.status === "accepted";
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });

      // Auto-chat when owner acknowledges a pre-order
      // Trigger condition: status transitions from "pre-order-pending" to "pending"
      // This informs both customer and owner in the shared chat thread.
      if (existing.status === "pre-order-pending" && data.status === "pending") {
        const restaurant = await ctx.db.query("restaurant").first();
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          // Include a customer-friendly details link parsed by chat dialogs into a button
          message: `Pre-order acknowledged. We'll notify you when it's being prepared. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
      }

      // Seed chat message on first transition to accepted status
      if (!wasAccepted && data.status === "accepted") {
        // Get restaurant name for the message sender
        const restaurant = await ctx.db.query("restaurant").first();
        // Insert initial chat message announcing order acceptance
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Order now being prepared.`,
          timestamp: Date.now(),
        });
      }

      // Auto-chat when order is marked as ready
      // Check if order is transitioning to ready status (from any status except ready)
      if (existing.status !== "ready" && data.status === "ready") {
        const restaurant = await ctx.db.query("restaurant").first();
        // Insert chat message announcing order is ready
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order is ready for pickup! View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
      }

      // Auto-chat when order is marked as in-transit
      // Check if order is transitioning to in-transit status (from any status except in-transit)
      if (existing.status !== "in-transit" && data.status === "in-transit") {
        const restaurant = await ctx.db.query("restaurant").first();
        // Insert chat message announcing order is in transit
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order is on the way! View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
      }

      // Auto-chat when order is marked as delivered
      // Check if order is transitioning to delivered status (from any status except delivered)
      if (existing.status !== "delivered" && data.status === "delivered") {
        const restaurant = await ctx.db.query("restaurant").first();
        // Insert chat message announcing order is delivered
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order has been delivered! Thank you for your order. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
      }

      // Auto-chat when order is marked as completed
      // Check if order is transitioning to completed status (from any status except completed)
      if (existing.status !== "completed" && data.status === "completed") {
        const restaurant = await ctx.db.query("restaurant").first();
        // Insert chat message announcing order is completed
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order has been completed! Thank you for your order. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
      }

      // Auto-chat on denial with reason
      if (data.status === "denied") {
        const restaurant = await ctx.db.query("restaurant").first();
        const reason = data.denialReason ?? existing.denialReason ?? "No reason provided";
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Order denied. Reason: ${reason}`,
          timestamp: Date.now(),
        });
      }
      return id;
    }

    // Customer path: allow cancelling their own order or updating remaining payment proof
    if (existing.customerId !== (currentUser._id as unknown as string)) {
      throw new Error("Unauthorized to update this order");
    }

    // Allow customers to cancel pending orders, denied orders, or pre-order-pending orders
    // For pre-orders, cancellation must be at least 1 day before the scheduled date
    const isCancellation = data.status === "cancelled";
    const isPreOrder = existing.orderType === "pre-order";
    const isPreOrderPending = existing.status === "pre-order-pending";
    
    let allowedCancelUpdate = false;
    if (isCancellation) {
      // Regular orders: allow cancellation for pending or denied status
      if (!isPreOrder && (existing.status === "pending" || existing.status === "denied")) {
        allowedCancelUpdate = true;
      }
      // Pre-orders: allow cancellation for pre-order-pending, pending, or denied status
      // BUT only if cancelled at least 1 day before scheduled date
      else if (isPreOrder && (isPreOrderPending || existing.status === "pending" || existing.status === "denied")) {
        if (existing.preOrderScheduledAt) {
          const now = Date.now();
          const scheduledDate = existing.preOrderScheduledAt;
          const oneDayInMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
          const timeUntilScheduled = scheduledDate - now;
          
          // Check if cancellation is at least 1 day before scheduled date
          if (timeUntilScheduled >= oneDayInMs) {
            allowedCancelUpdate = true;
          } else {
            throw new Error("Pre-orders can only be cancelled at least 1 day before the scheduled order date");
          }
        } else {
          // If no scheduled date, allow cancellation (shouldn't happen, but handle gracefully)
          allowedCancelUpdate = true;
        }
      }
    }
    
    // Allow customers to update remaining payment proof URL for their own orders
    const allowedPaymentProofUpdate = data.remainingPaymentProofUrl !== undefined && 
      Object.keys(data).length === 1; // Only updating remainingPaymentProofUrl

    if (!allowedCancelUpdate && !allowedPaymentProofUpdate) {
      throw new Error("Customers can only cancel pending/denied/pre-order-pending orders or update remaining payment proof");
    }

    if (allowedCancelUpdate) {
      await ctx.db.patch(id, { status: "cancelled", updatedAt: Date.now() });
      
      // Send customer cancellation message
      await ctx.db.insert("chat_messages", {
        orderId: id as unknown as string,
        senderId: currentUser._id as unknown as string,
        senderName: existing.customerName,
        senderRole: "customer",
        message: "I have cancelled this order",
        timestamp: Date.now(),
      });
      
      // Automatically send owner refund message
      const restaurant = await ctx.db.query("restaurant").first();
      const ownerUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "owner"))
        .first();
      
      if (ownerUser) {
        // Include the GCash number from the order instance in the refund message
        const gcashNumber = existing.gcashNumber ? `${existing.gcashNumber}` : "";
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: ownerUser._id as unknown as string,
          senderName: restaurant?.name || `${ownerUser.firstName} ${ownerUser.lastName}`,
          senderRole: "owner",
          message: `Your refund is on the way! It will be processed within 1–3 business days. We'll send it to the GCash number you provided (+63) ${gcashNumber} and share a screenshot once completed 😊`,
          timestamp: Date.now(),
        });
      }
    } else if (allowedPaymentProofUpdate) {
      // If the client sent a Convex storageId instead of a URL, resolve it to a URL
      let remainingPaymentProofUrl = data.remainingPaymentProofUrl;
      if (
        typeof remainingPaymentProofUrl === "string" &&
        remainingPaymentProofUrl.length > 0 &&
        !remainingPaymentProofUrl.startsWith("http")
      ) {
        const resolvedUrl = await ctx.storage.getUrl(remainingPaymentProofUrl as any);
        if (resolvedUrl) {
          remainingPaymentProofUrl = resolvedUrl;
        }
      }

      await ctx.db.patch(id, { remainingPaymentProofUrl, updatedAt: Date.now() });
    }
    
    return id;
  },
});

export const updateOrderItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        menuItemId: v.string(),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        attributes: v.optional(v.record(v.string(), v.string())),
        unitPrice: v.optional(v.number()),
      })
    ),
    modificationType: v.string(),
    itemDetails: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, items, modificationType, itemDetails }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Only owners can modify order items
    if (currentUser.role !== "owner") {
      throw new Error("Only owners can modify order items");
    }

    const existing = await ctx.db.get(orderId);
    if (!existing) throw new Error("Order not found");

    // Only allow modification when not in blocked states
    // Blocked states: accepted, completed, in-transit, delivered, cancelled
    // This allows modification for: pending, pre-order-pending, denied, ready
    const blocked = new Set(["accepted", "completed", "in-transit", "delivered", "cancelled"]);
    if (blocked.has(existing.status)) {
      throw new Error("Order items cannot be modified in the current state");
    }

    // Validate items array is not empty
    if (items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // Calculate new totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = existing.platformFee || 0;
    const discount = existing.discount || 0;
    const total = subtotal + platformFee - discount;

    // Store previous state for audit log
    const previousValue = JSON.stringify({
      items: existing.items,
      subtotal: existing.subtotal,
      total: existing.total,
    });

    // Update the order
    await ctx.db.patch(orderId, {
      items,
      subtotal,
      total,
      updatedAt: Date.now(),
    });

    // Create audit log entry
    const newValue = JSON.stringify({
      items,
      subtotal,
      total,
    });

    await ctx.db.insert("order_modifications", {
      orderId,
      modifiedBy: currentUser._id as unknown as string,
      modifiedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      modificationType: modificationType as any,
      previousValue,
      newValue,
      itemDetails,
      timestamp: Date.now(),
    });

    // Auto-chat summary of item changes
    const prevItems = JSON.parse(previousValue)?.items ?? existing.items;
    const nextItems = items;
    
    // Helper function to summarize item changes
    const summarize = (prev: any[], next: any[]) => {
      // Create a key from menuItemId and variantId (if present)
      const byKey = (arr: any[]) => new Map(
        arr.map(i => [`${i.menuItemId}${i.variantId || ""}`, i])
      );
      const prevMap = byKey(prev);
      const nextMap = byKey(next);
      
      const added: string[] = [];
      const removed: string[] = [];
      const changed: string[] = [];
      
      // Check for added or changed items
      for (const [k, v] of nextMap.entries()) {
        const p = prevMap.get(k);
        if (!p) {
          added.push(`${v.name} x${v.quantity}`);
        } else if (p.quantity !== v.quantity) {
          changed.push(`${v.name} ${p.quantity}→${v.quantity}`);
        }
      }
      
      // Check for removed items
      for (const [k, v] of prevMap.entries()) {
        if (!nextMap.has(k)) {
          removed.push(v.name);
        }
      }
      
      const parts: string[] = [];
      if (added.length) parts.push(`added: ${added.join(", ")}`);
      if (removed.length) parts.push(`removed: ${removed.join(", ")}`);
      if (changed.length) parts.push(`qty: ${changed.join(", ")}`);
      
      return parts.join("; ") || "items updated";
    };
    
    const summary = summarize(prevItems, nextItems);
    const restaurant = await ctx.db.query("restaurant").first();
    await ctx.db.insert("chat_messages", {
      orderId: orderId as unknown as string,
      senderId: currentUser._id as unknown as string,
      senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: "owner",
      message: `Order items updated (${summary}). New total: ₱${total.toFixed(2)}`,
      timestamp: Date.now(),
    });

    return orderId;
  },
});


