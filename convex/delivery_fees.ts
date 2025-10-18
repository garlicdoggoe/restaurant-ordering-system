import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const now = Date.now();
    const results = [];
    
    for (const feeData of args.fees) {
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
