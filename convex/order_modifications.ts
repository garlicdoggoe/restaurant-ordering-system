import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Only owners can view modification history
    if (currentUser.role !== "owner") {
      throw new Error("Only owners can view order modification history");
    }

    return await ctx.db
      .query("order_modifications")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) return []; // Return empty array if not authenticated

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) return []; // Return empty array if user not found

    // Only owners can view all modification history
    // Customers get empty array instead of error
    if (currentUser.role !== "owner") {
      return [];
    }

    return await ctx.db
      .query("order_modifications")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    orderId: v.id("orders"),
    modifiedBy: v.string(),
    modifiedByName: v.string(),
    modificationType: v.union(
      v.literal("item_added"),
      v.literal("item_removed"),
      v.literal("item_quantity_changed"),
      v.literal("item_price_changed"),
      v.literal("order_edited"),
      v.literal("status_changed")
    ),
    previousValue: v.string(),
    newValue: v.string(),
    itemDetails: v.optional(v.string()),
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

    // Only owners can create modification logs
    if (currentUser.role !== "owner") {
      throw new Error("Only owners can modify orders");
    }

    return await ctx.db.insert("order_modifications", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
