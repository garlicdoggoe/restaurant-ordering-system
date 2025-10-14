import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    return await ctx.db
      .query("chat_messages")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();
  },
});

export const send = mutation({
  args: {
    orderId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderRole: v.union(v.literal("owner"), v.literal("customer")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chat_messages", { ...args, timestamp: Date.now() });
  },
});


