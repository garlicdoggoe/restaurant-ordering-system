import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurant").collect();
    return restaurants[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    logo: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("busy")),
    openingTime: v.optional(v.string()),
    closingTime: v.optional(v.string()),
    averagePrepTime: v.number(),
    averageDeliveryTime: v.number(),
    platformFee: v.optional(v.number()), // Platform service fee
    platformFeeEnabled: v.optional(v.boolean()), // Whether platform fee is enabled
    coordinates: v.optional(
      v.object({
        lng: v.number(),
        lat: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("restaurant").collect();
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, { ...args, updatedAt: now });
      return existing[0]._id;
    }
    return await ctx.db.insert("restaurant", { ...args, createdAt: now, updatedAt: now });
  },
});


