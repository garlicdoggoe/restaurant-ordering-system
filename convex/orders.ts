import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Access control: customers see only their orders; owners see all orders
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    // When unauthenticated (e.g., public homepage), return empty list instead of throwing
    if (!clerkId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    // During first sign-in, the Clerk account may exist before the Convex user doc is created.
    // Return an empty list instead of throwing to allow the client to proceed to profile completion.
    if (!currentUser) return [];

    if (currentUser.role === "owner") {
      return await ctx.db.query("orders").collect();
    }

    // Customer: only own orders
    return await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", currentUser._id as unknown as string))
      .collect();
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
      v.literal("delivered")
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
      throw new Error("Special instructions must be 100 characters or less");
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
    return await ctx.db.insert("orders", {
      ...args,
      paymentScreenshot: resolvedPaymentScreenshot,
      customerId: currentUser._id as unknown as string,
      createdAt: now,
      updatedAt: now,
    });
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
          v.literal("delivered")
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
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
      return id;
    }

    // Customer path: allow cancelling their own order or updating remaining payment proof
    if (existing.customerId !== (currentUser._id as unknown as string)) {
      throw new Error("Unauthorized to update this order");
    }

    // Allow customers to cancel pending orders or confirm denied orders
    const allowedCancelUpdate = data.status === "cancelled" && (existing.status === "pending" || existing.status === "denied");
    // Allow customers to update remaining payment proof URL for their own orders
    const allowedPaymentProofUpdate = data.remainingPaymentProofUrl !== undefined && 
      Object.keys(data).length === 1; // Only updating remainingPaymentProofUrl

    if (!allowedCancelUpdate && !allowedPaymentProofUpdate) {
      throw new Error("Customers can only cancel pending/denied orders or update remaining payment proof");
    }

    if (allowedCancelUpdate) {
      await ctx.db.patch(id, { status: "cancelled", updatedAt: Date.now() });
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

    // Only allow modification for pending and accepted orders
    if (existing.status !== "pending" && existing.status !== "accepted") {
      throw new Error("Only pending and accepted orders can be modified");
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

    return orderId;
  },
});


