import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject;
  if (!clerkId) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .first();

  if (!user) throw new Error("User not found");
  return user;
}

// Generate an upload URL for client-side direct uploads to Convex storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

// Given a storageId, return a temporary URL that can be used to view the file
export const getUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    if (!storageId) return null;
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

// Mutation to get URL from storage ID (for immediate use after upload)
export const getUrlFromStorageId = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});


