import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to verify user is authenticated and is an owner
async function verifyOwner(ctx: any) {
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
  handler: async (ctx) => ctx.db.query("promotions").collect(),
});

export const add = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    image: v.optional(v.string()),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    // SECURITY: Validate input lengths
    if (args.title.length > 200) throw new Error("Promotion title must be 200 characters or less");
    if (args.description.length > 2000) throw new Error("Promotion description must be 2000 characters or less");

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
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    // SECURITY: Validate input lengths
    if (data.title && data.title.length > 200) throw new Error("Promotion title must be 200 characters or less");
    if (data.description && data.description.length > 2000) throw new Error("Promotion description must be 2000 characters or less");

    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, { id }) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    await ctx.db.delete(id);
  },
});


