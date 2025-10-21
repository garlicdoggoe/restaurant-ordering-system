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

// Initialize preset denial reasons if they don't exist
export const initializePresetReasons = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if preset reasons already exist
    const existingReasons = await ctx.db.query("denial_reasons").filter((q) => q.eq(q.field("isPreset"), true)).collect();
    
    // If no preset reasons exist, create them
    if (existingReasons.length === 0) {
      const presetReasons = [
        "Item not available",
        "Restaurant closed",
        "Invalid proof of payment",
        "Delivery area not covered",
        "Payment not received",
        "Customer requested cancellation",
        "Duplicate order detected"
      ];

      // Insert all preset reasons
      for (const reason of presetReasons) {
        await ctx.db.insert("denial_reasons", {
          reason,
          isPreset: true,
          createdAt: Date.now()
        });
      }
    }
    
    return "Preset reasons initialized";
  },
});


