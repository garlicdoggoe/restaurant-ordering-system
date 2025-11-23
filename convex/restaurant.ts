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
    feePerKilometer: v.optional(v.number()), // Delivery fee per kilometer (default 15)
    preorderSchedule: v.optional(
      v.object({
        restrictionsEnabled: v.boolean(),
        dates: v.array(
          v.object({
            date: v.string(), // YYYY-MM-DD
            startTime: v.string(), // HH:MM 24h
            endTime: v.string(), // HH:MM 24h
          })
        ),
      })
    ),
    coordinates: v.optional(
      v.object({
        lng: v.number(),
        lat: v.number(),
      })
    ),
    preorderNotification: v.optional(v.string()), // Notification message for pre-orders
    allowNewOrders: v.optional(v.boolean()), // Whether new orders (including pre-orders) are accepted
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    // SECURITY: Validate input lengths
    if (args.name.length > 200) throw new Error("Restaurant name must be 200 characters or less");
    if (args.description.length > 2000) throw new Error("Description must be 2000 characters or less");
    if (args.address.length > 500) throw new Error("Address must be 500 characters or less");
    if (args.phone.length > 20) throw new Error("Phone number must be 20 characters or less");
    if (args.email.length > 255) throw new Error("Email must be 255 characters or less");

    const now = Date.now();
    const existing = await ctx.db.query("restaurant").collect();
    const normalizeEntry = (entry: { date: string; startTime: string; endTime?: string }) => ({
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime ?? entry.startTime,
    });
    const normalizeSchedule = (schedule?: {
      restrictionsEnabled: boolean;
      dates: { date: string; startTime: string; endTime?: string }[];
    }) => {
      if (!schedule) {
        return {
          restrictionsEnabled: false,
          dates: [],
        };
      }
      return {
        restrictionsEnabled: schedule.restrictionsEnabled,
        dates: schedule.dates.map(normalizeEntry),
      };
    };
    const preorderSchedule = normalizeSchedule(args.preorderSchedule ?? existing[0]?.preorderSchedule);
    // Default feePerKilometer to 15 if not provided
    const feePerKilometer = args.feePerKilometer ?? existing[0]?.feePerKilometer ?? 15;
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, {
        ...args,
        feePerKilometer,
        preorderSchedule,
        updatedAt: now,
      });
      return existing[0]._id;
    }
    return await ctx.db.insert("restaurant", {
      ...args,
      feePerKilometer,
      preorderSchedule,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Set restaurant coordinates (helper mutation for easy setup)
export const setCoordinates = mutation({
  args: {
    coordinates: v.object({
      lng: v.number(),
      lat: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user is authenticated and is an owner
    await verifyOwner(ctx);

    const existing = await ctx.db.query("restaurant").collect();
    const now = Date.now();
    
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, {
        coordinates: args.coordinates,
        updatedAt: now,
      });
      return existing[0]._id;
    } else {
      throw new Error("Restaurant record does not exist. Please create restaurant first using upsert mutation.");
    }
  },
});


