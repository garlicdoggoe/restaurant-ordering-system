import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration to update existing orders from donation/tax fields to platformFee
 * This should be run once to migrate existing data
 */
export const migrateOrdersToPlatformFee = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all orders that still have the old donation field
    const orders = await ctx.db.query("orders").collect();
    
    let migratedCount = 0;
    
    for (const order of orders) {
      // Check if this order has the old donation field
      const orderDoc = order as any;
      if (orderDoc.donation !== undefined && orderDoc.platformFee === undefined) {
        // Migrate donation to platformFee
        await ctx.db.patch(order._id, {
          platformFee: orderDoc.platformFee || 0,
        });
        migratedCount++;
      }
    }
    
    console.log(`Migrated ${migratedCount} orders from donation/tax to platformFee`);
    return { migratedCount };
  },
});
