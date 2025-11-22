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

// Get all delivery fees
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("delivery_fees").collect();
  },
});

// Get delivery fee by barangay
export const getByBarangay = query({
  args: { barangay: v.string() },
  handler: async (ctx, args) => {
    const fees = await ctx.db
      .query("delivery_fees")
      .withIndex("by_barangay", (q) => q.eq("barangay", args.barangay))
      .collect();
    return fees[0] ?? null;
  },
});

// Upsert delivery fee (create or update)
export const upsert = mutation({
  args: {
    barangay: v.string(),
    fee: v.number(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);
    
    // SECURITY: Validate input lengths and ranges
    if (args.barangay.length > 200) {
      throw new Error("Barangay name must be 200 characters or less");
    }
    if (args.fee < 0 || args.fee > 10000) {
      throw new Error("Delivery fee must be between 0 and 10000 pesos");
    }
    if (!Number.isFinite(args.fee)) {
      throw new Error("Delivery fee must be a valid number");
    }
    
    const now = Date.now();
    
    // Check if delivery fee already exists for this barangay
    const existing = await ctx.db
      .query("delivery_fees")
      .withIndex("by_barangay", (q) => q.eq("barangay", args.barangay))
      .first();
    
    if (existing) {
      // Update existing delivery fee
      await ctx.db.patch(existing._id, {
        fee: args.fee,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new delivery fee
      return await ctx.db.insert("delivery_fees", {
        barangay: args.barangay,
        fee: args.fee,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Delete delivery fee by barangay
export const remove = mutation({
  args: { barangay: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);
    
    // SECURITY: Validate input length
    if (args.barangay.length > 200) {
      throw new Error("Barangay name must be 200 characters or less");
    }
    
    const existing = await ctx.db
      .query("delivery_fees")
      .withIndex("by_barangay", (q) => q.eq("barangay", args.barangay))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Bulk upsert delivery fees (for batch operations)
export const bulkUpsert = mutation({
  args: {
    fees: v.array(
      v.object({
        barangay: v.string(),
        fee: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);
    
    // SECURITY: Validate input array is not empty and not too large
    if (args.fees.length === 0) {
      throw new Error("At least one delivery fee is required");
    }
    if (args.fees.length > 1000) {
      throw new Error("Cannot process more than 1000 delivery fees at once");
    }
    
    const now = Date.now();
    const results = [];
    
    for (const feeData of args.fees) {
      // SECURITY: Validate each fee entry
      if (feeData.barangay.length > 200) {
        throw new Error(`Barangay name must be 200 characters or less: ${feeData.barangay.substring(0, 50)}`);
      }
      if (feeData.fee < 0 || feeData.fee > 10000) {
        throw new Error(`Delivery fee must be between 0 and 10000 pesos: ${feeData.barangay}`);
      }
      if (!Number.isFinite(feeData.fee)) {
        throw new Error(`Delivery fee must be a valid number: ${feeData.barangay}`);
      }
      // Check if delivery fee already exists for this barangay
      const existing = await ctx.db
        .query("delivery_fees")
        .withIndex("by_barangay", (q) => q.eq("barangay", feeData.barangay))
        .first();
      
      if (existing) {
        // Update existing delivery fee
        await ctx.db.patch(existing._id, {
          fee: feeData.fee,
          updatedAt: now,
        });
        results.push({ barangay: feeData.barangay, id: existing._id, action: "updated" });
      } else {
        // Create new delivery fee
        const id = await ctx.db.insert("delivery_fees", {
          barangay: feeData.barangay,
          fee: feeData.fee,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ barangay: feeData.barangay, id, action: "created" });
      }
    }
    
    return results;
  },
});
