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

    if (!currentUser) throw new Error("User not found");

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
    items: v.array(
      v.object({ menuItemId: v.string(), name: v.string(), price: v.number(), quantity: v.number() })
    ),
    subtotal: v.number(),
    tax: v.number(),
    donation: v.number(),
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
      v.literal("denied"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("in-transit"),
      v.literal("delivered")
    ),
    paymentScreenshot: v.optional(v.string()),
    voucherCode: v.optional(v.string()),
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

    const now = Date.now();
    return await ctx.db.insert("orders", {
      ...args,
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

    // Customer path: allow cancelling their own order
    if (existing.customerId !== (currentUser._id as unknown as string)) {
      throw new Error("Unauthorized to update this order");
    }

    const allowedCustomerUpdate = data.status === "cancelled" && existing.status === "pending";
    if (!allowedCustomerUpdate) {
      throw new Error("Customers can only cancel pending orders");
    }

    await ctx.db.patch(id, { status: "cancelled", updatedAt: Date.now() });
    return id;
  },
});


