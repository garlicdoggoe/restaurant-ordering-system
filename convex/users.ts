import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current user profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// Create or update user profile (called after Clerk signup)
export const upsertUser = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("customer"), v.literal("owner")),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const now = Date.now();
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      // Update existing user but preserve the role if it's already set to owner
      // IMPORTANT: Do not overwrite phone/address with undefined (e.g., from signup callback)
      const updateData: any = {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: now,
      };
      if (args.phone !== undefined) updateData.phone = args.phone;
      if (args.address !== undefined) updateData.address = args.address;
      
      // Only update role if the existing user is not an owner (preserve owner role)
      if (existingUser.role !== "owner") {
        updateData.role = args.role;
        console.log("upsertUser - Updating user role from", existingUser.role, "to", args.role);
      } else {
        console.log("upsertUser - Preserving owner role, not updating to", args.role);
      }
      
      await ctx.db.patch(existingUser._id, updateData);
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId,
        ...args,
        profileComplete: args.role === "owner" || !!(args.phone && args.address), // Owner is always complete, customer needs phone+address
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update user profile (for customers to complete their profile)
export const updateUserProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const updatedData: any = {
      ...args,
      updatedAt: Date.now(),
    };

    // For customers, check if profile is now complete
    if (user.role === "customer") {
      const phone = args.phone ?? user.phone;
      const address = args.address ?? user.address;
      updatedData.profileComplete = !!(phone && address);
    }

    await ctx.db.patch(user._id, updatedData);
    return user._id;
  },
});

// Get user by ID (for admin purposes)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

// Validate owner signup code
export const validateOwnerCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    // The owner signup code is "IchiroCocoiNami17?"
    const validOwnerCode = "IchiroCocoiNami17?";
    
    if (code === validOwnerCode) {
      return { valid: true };
    } else {
      return { valid: false, error: "Invalid owner code" };
    }
  },
});

// List all users (admin only)
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    // Check if current user is owner
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!currentUser || currentUser.role !== "owner") {
      throw new Error("Unauthorized: Only owners can list all users");
    }

    return await ctx.db.query("users").collect();
  },
});
