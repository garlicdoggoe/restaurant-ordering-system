import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("denial_reasons").collect(),
});

export const add = mutation({
  args: { reason: v.string(), isPreset: v.boolean() },
  handler: async (ctx, { reason, isPreset }) => {
    return await ctx.db.insert("denial_reasons", { reason, isPreset, createdAt: Date.now() });
  },
});


