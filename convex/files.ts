import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate an upload URL for client-side direct uploads to Convex storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return url;
  },
});

// Given a storageId, return a temporary URL that can be used to view the file
export const getUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    if (!storageId) return null;
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});


