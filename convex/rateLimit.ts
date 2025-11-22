import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { GenericMutationCtx, GenericActionCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Rate limit configuration per endpoint
// Format: { endpoint: { maxRequests, windowMs } }
// maxRequests: Maximum number of requests allowed in the time window
// windowMs: Time window in milliseconds
export const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  // Owner code validation - very strict (brute force target)
  validateOwnerCode: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  
  // Order creation - moderate (prevent spam orders)
  "orders.create": { maxRequests: 5, windowMs: 60 * 1000 }, // 5 orders per minute
  
  // Chat messages - moderate (prevent spam)
  "chat.send": { maxRequests: 15, windowMs: 60 * 1000 }, // 15 messages per minute
  
  // Distance calculation - moderate (prevent API abuse)
  "users.calculateDistance": { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  
  // Owner mutations - lenient (owners need flexibility)
  "menu.addMenuItem": { maxRequests: 15, windowMs: 60 * 1000 }, // 10 menu items per minute
  "vouchers.add": { maxRequests: 5, windowMs: 60 * 1000 }, // 5 vouchers per minute
  "promotions.add": { maxRequests: 5, windowMs: 60 * 1000 }, // 5 promotions per minute
  
  // Default rate limit for any unconfigured endpoint
  default: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
};

/**
 * Internal helper to check rate limit (used by both mutations and actions)
 * This is the core rate limiting logic that accesses the database
 */
async function checkRateLimitCore(
  ctx: GenericMutationCtx<DataModel>,
  endpoint: string
): Promise<void> {
  // Get rate limit configuration for this endpoint
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const { maxRequests, windowMs } = config;
  
  // Get user ID (or "anonymous" for unauthenticated requests)
  let userId = "anonymous";
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject) {
      // Try to get user ID from database
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
        .first();
      if (user) {
        userId = user._id as unknown as string;
      } else {
        // Authenticated but user not in DB - use clerkId as identifier
        userId = `clerk:${identity.subject}`;
      }
    }
  } catch (error) {
    // If auth fails, use anonymous
    userId = "anonymous";
  }
  
  const now = Date.now();
  const windowStart = now - (now % windowMs); // Align to window boundary
  
  // Find existing rate limit record
  const existing = await ctx.db
    .query("rate_limits")
    .withIndex("by_userId_endpoint", (q: any) => 
      q.eq("userId", userId).eq("endpoint", endpoint)
    )
    .first();
  
  if (existing) {
    // Check if we're in a new time window
    if (existing.windowStart < windowStart) {
      // New window - reset count
      await ctx.db.patch(existing._id, {
        count: 1,
        windowStart,
        lastRequestAt: now,
      });
    } else {
      // Same window - increment count
      const newCount = existing.count + 1;
      
      if (newCount > maxRequests) {
        // Rate limit exceeded
        const timeRemaining = windowMs - (now - existing.windowStart);
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        throw new Error(
          `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000 / 60} minute(s). Please try again in ${minutesRemaining} minute(s).`
        );
      }
      
      // Update count and timestamp
      await ctx.db.patch(existing._id, {
        count: newCount,
        lastRequestAt: now,
      });
    }
  } else {
    // First request for this user/endpoint - create new record
    await ctx.db.insert("rate_limits", {
      userId,
      endpoint,
      count: 1,
      windowStart,
      lastRequestAt: now,
    });
  }
}

// Internal mutation for rate limit checking (called by actions)
// Must be defined before checkRateLimitAction so it can be referenced in the API
export const checkRateLimitInternal = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    return await checkRateLimitCore(ctx, args.endpoint);
  },
});

/**
 * Check and enforce rate limiting for a mutation
 * @param ctx - Mutation context
 * @param endpoint - Endpoint name (e.g., "validateOwnerCode", "orders.create")
 * @returns void - throws error if rate limit exceeded
 */
export async function checkRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  endpoint: string
): Promise<void> {
  return await checkRateLimitCore(ctx, endpoint);
}

/**
 * Check and enforce rate limiting for an action
 * Actions can't access the database directly, so they call an internal mutation
 * @param ctx - Action context
 * @param endpoint - Endpoint name (e.g., "users.calculateDistance")
 * @returns void - throws error if rate limit exceeded
 */
export async function checkRateLimitAction(
  ctx: GenericActionCtx<DataModel>,
  endpoint: string
): Promise<void> {
  // Actions must call a mutation to check rate limits
  // Note: API types will be generated after Convex processes this file
  // Using type assertion temporarily until API is regenerated
  const rateLimitApi = api.rateLimit as any;
  await ctx.runMutation(rateLimitApi.checkRateLimitInternal, { endpoint });
}

/**
 * Clean up old rate limit records (should be called periodically)
 * Removes records older than 24 hours
 */
export async function cleanupRateLimits(ctx: GenericMutationCtx<DataModel>): Promise<number> {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  const oldRecords = await ctx.db
    .query("rate_limits")
    .withIndex("by_windowStart", (q: any) => q.lt("windowStart", oneDayAgo))
    .collect();
  
  let deletedCount = 0;
  for (const record of oldRecords) {
    await ctx.db.delete(record._id);
    deletedCount++;
  }
  
  return deletedCount;
}

// Export cleanup mutation for periodic execution (can be scheduled via Convex cron)
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    // Only allow owners to run cleanup (or make it internal)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("Not authenticated");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
      .first();
    
    // Allow cleanup by any authenticated user (or restrict to owners if preferred)
    if (!user) {
      throw new Error("User not found");
    }
    
    return await cleanupRateLimits(ctx);
  },
});

