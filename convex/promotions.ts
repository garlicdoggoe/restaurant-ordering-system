import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("promotions").collect(),
});

export const add = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    image: v.optional(v.string()),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("promotions", { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("promotions"),
    data: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
      discountValue: v.optional(v.number()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});


