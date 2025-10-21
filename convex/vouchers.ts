import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("vouchers").collect(),
});

export const add = mutation({
  args: {
    code: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    minOrderAmount: v.number(),
    maxDiscount: v.optional(v.number()),
    expiresAt: v.number(),
    usageLimit: v.number(),
    usageCount: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("vouchers", { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("vouchers"),
    data: v.object({
      code: v.optional(v.string()),
      type: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
      value: v.optional(v.number()),
      minOrderAmount: v.optional(v.number()),
      maxDiscount: v.optional(v.number()),
      expiresAt: v.optional(v.number()),
      usageLimit: v.optional(v.number()),
      usageCount: v.optional(v.number()),
      active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const validate = query({
  args: { code: v.string(), orderAmount: v.number() },
  handler: async (ctx, { code, orderAmount }) => {
    const voucher = (
      await ctx.db.query("vouchers").withIndex("by_code", (q) => q.eq("code", code)).collect()
    )[0];

    if (!voucher || !voucher.active) return { valid: false, discount: 0, message: "Invalid voucher code" };
    if (voucher.expiresAt < Date.now()) return { valid: false, discount: 0, message: "Voucher has expired" };
    if (voucher.usageCount >= voucher.usageLimit)
      return { valid: false, discount: 0, message: "Voucher usage limit reached" };
    if (orderAmount < voucher.minOrderAmount)
      return { valid: false, discount: 0, message: `Minimum order amount is ₱${voucher.minOrderAmount}` };

    let discount = 0;
    if (voucher.type === "fixed") {
      discount = voucher.value;
    } else {
      discount = (orderAmount * voucher.value) / 100;
      if (voucher.maxDiscount && discount > voucher.maxDiscount) discount = voucher.maxDiscount;
    }
    return { valid: true, discount };
  },
});


