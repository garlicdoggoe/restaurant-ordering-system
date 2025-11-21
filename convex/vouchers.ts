import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to verify user is authenticated and is an owner
async function verifyOwner(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any }) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;
  if (!clerkId) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .first();

  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Unauthorized: Only owners can perform this action");

  return user;
}

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
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    // SECURITY: Validate input lengths and format
    if (args.code.length > 50) throw new Error("Voucher code must be 50 characters or less");
    if (args.code.length < 3) throw new Error("Voucher code must be at least 3 characters");
    // Validate code format (alphanumeric and hyphens/underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(args.code)) {
      throw new Error("Voucher code can only contain letters, numbers, hyphens, and underscores");
    }

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
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    // SECURITY: Validate input lengths and format
    if (data.code !== undefined) {
      if (data.code.length > 50) throw new Error("Voucher code must be 50 characters or less");
      if (data.code.length < 3) throw new Error("Voucher code must be at least 3 characters");
      if (!/^[a-zA-Z0-9_-]+$/.test(data.code)) {
        throw new Error("Voucher code can only contain letters, numbers, hyphens, and underscores");
      }
    }

    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, { id }) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

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


