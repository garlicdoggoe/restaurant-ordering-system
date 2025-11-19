import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
    coordinates: v.optional(
      v.object({
        lng: v.number(),
        lat: v.number(),
      })
    ),
    gcashNumber: v.optional(v.string()),
    ownerToken: v.optional(v.string()), // Secure token from validateOwnerCode - required if role is "owner"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const now = Date.now();

    // SECURITY: If requesting owner role, validate the token server-side
    if (args.role === "owner") {
      if (!args.ownerToken) {
        throw new Error("Owner token required for owner role");
      }

      // Find and validate the token
      const tokenRecord = await ctx.db
        .query("owner_signup_tokens")
        .withIndex("by_token", (q) => q.eq("token", args.ownerToken!))
        .first();

      if (!tokenRecord) {
        throw new Error("Invalid owner token");
      }

      if (tokenRecord.used) {
        throw new Error("Owner token has already been used");
      }

      if (tokenRecord.expiresAt < now) {
        throw new Error("Owner token has expired");
      }

      // Mark token as used
      await ctx.db.patch(tokenRecord._id, { used: true });
    }
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      // Update existing user but preserve the role if it's already set to owner
      // IMPORTANT: Do not overwrite phone/address/gcashNumber with undefined (e.g., from signup callback)
      const updateData: any = {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: now,
      };
      if (args.phone !== undefined) updateData.phone = args.phone;
      if (args.address !== undefined) updateData.address = args.address;
      if (args.coordinates !== undefined) updateData.coordinates = args.coordinates;
      if (args.gcashNumber !== undefined) updateData.gcashNumber = args.gcashNumber;
      
      // Only update role if the existing user is not an owner (preserve owner role)
      // SECURITY: If trying to upgrade to owner, still validate token
      if (existingUser.role !== "owner" && args.role === "owner") {
        // Token validation already done above
        updateData.role = args.role;
      } else if (existingUser.role !== "owner") {
        updateData.role = args.role;
      }
      
      await ctx.db.patch(existingUser._id, updateData);
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        role: args.role,
        phone: args.phone,
        address: args.address,
        coordinates: args.coordinates,
        gcashNumber: args.gcashNumber,
        profileComplete: args.role === "owner" || !!(args.phone && args.address && args.gcashNumber), // Owner is always complete, customer needs phone+address+gcashNumber
        onboardingCompleted: args.role === "customer" ? false : undefined, // Only customers need onboarding, owners don't
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update user profile (for customers to complete their profile)
export const updateUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    coordinates: v.optional(
      v.object({
        lng: v.number(),
        lat: v.number(),
      })
    ),
    gcashNumber: v.optional(v.string()),
    distance: v.optional(v.union(v.number(), v.null())), // Distance in meters (calculated client-side via action)
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
      const gcashNumber = args.gcashNumber ?? user.gcashNumber;
      updatedData.profileComplete = !!(phone && address && gcashNumber);
    }

    // Distance is calculated client-side and passed as parameter
    // If distance is provided, use it (could be number or null)
    // If coordinates are being updated but distance not provided, set to null
    if (args.distance !== undefined) {
      updatedData.distance = args.distance;
    } else if (args.coordinates !== undefined) {
      // Coordinates are being updated but distance wasn't calculated
      // This shouldn't happen in normal flow, but handle it gracefully
      updatedData.distance = null;
    }
    // If neither coordinates nor distance are being updated, don't modify distance field

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

// Get user by ID as string (for fetching customer coordinates from orders)
export const getUserByIdString = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Convert string ID to Convex ID type
    const user = await ctx.db.get(userId as any);
    return user;
  },
});

// Validate owner signup code and generate secure one-time token
export const validateOwnerCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    // The owner signup code is "IchiroCocoiNami17?"
    // This is kept server-side only - never exposed to client
    const validOwnerCode = "IchiroCocoiNami17?";
    
    if (code !== validOwnerCode) {
      return { valid: false, error: "Invalid owner code" };
    }

    // Generate secure random token (crypto.randomUUID or similar)
    // Using timestamp + random string for token generation
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const now = Date.now();
    // Token expires in 24 hours
    const expiresAt = now + (24 * 60 * 60 * 1000);

    // Store token in database as unused
    await ctx.db.insert("owner_signup_tokens", {
      token,
      used: false,
      expiresAt,
      createdAt: now,
    });

    return { valid: true, token };
  },
});

// Debug query to check distance calculation status
export const debugDistanceCalculation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    const restaurant = await ctx.db.query("restaurant").collect();
    
    return {
      userHasCoordinates: !!user?.coordinates,
      userCoordinates: user?.coordinates,
      userDistance: user?.distance,
      restaurantExists: restaurant.length > 0,
      restaurantHasCoordinates: !!restaurant[0]?.coordinates,
      restaurantCoordinates: restaurant[0]?.coordinates,
      mapboxTokenSet: !!process.env.MAPBOX_ACCESS_TOKEN,
    };
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

/**
 * Calculate distance between customer coordinates and restaurant coordinates
 * using Mapbox Directions API. Returns distance in meters.
 * 
 * @param customerCoordinates - Customer location as {lng, lat}
 * @param restaurantCoordinates - Restaurant location as {lng, lat}
 * @returns Distance in meters, or null if route not found or API error
 */
export const calculateDistance = action({
  args: {
    customerCoordinates: v.object({
      lng: v.number(),
      lat: v.number(),
    }),
    restaurantCoordinates: v.object({
      lng: v.number(),
      lat: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Get Mapbox access token from environment variables
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error("MAPBOX_ACCESS_TOKEN environment variable is not set in Convex. Please set it in Settings > Environment Variables.");
      return null;
    }

    try {
      // Format coordinates for Mapbox Directions API
      // Format: {lng},{lat};{lng},{lat} (semicolon-separated)
      // Start from restaurant, end at customer (or vice versa - doesn't matter for distance)
      const coordinates = `${args.restaurantCoordinates.lng},${args.restaurantCoordinates.lat};${args.customerCoordinates.lng},${args.customerCoordinates.lat}`;
      
      // Use driving profile for route calculation
      const profile = "mapbox/driving";
      
      // Build API URL
      const url = `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?access_token=${accessToken}`;
      
      // Call Mapbox Directions API
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`Mapbox Directions API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
        return null;
      }
      
      const data = await response.json();
      
      // Check if route was found
      if (data.code === "NoRoute" || !data.routes || data.routes.length === 0) {
        console.warn(`No route found between coordinates. Restaurant: [${args.restaurantCoordinates.lng}, ${args.restaurantCoordinates.lat}], Customer: [${args.customerCoordinates.lng}, ${args.customerCoordinates.lat}]`);
        return null;
      }
      
      // Extract distance from first route (in meters)
      const distance = data.routes[0]?.distance;
      
      if (typeof distance !== "number") {
        console.error("Invalid distance in API response:", data);
        return null;
      }
      
      // NOTE: Avoid logging successful distance calculations to keep logs lean in production.
      return distance;
    } catch (error) {
      console.error("Error calculating distance via Mapbox Directions API:", error);
      return null;
    }
  },
});
// Mark onboarding as completed
export const markOnboardingCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

// Reset onboarding to allow restarting the tour
export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) throw new Error("User not found");

    // Only allow reset for customers
    if (user.role !== "customer") {
      throw new Error("Only customers can reset onboarding");
    }

    await ctx.db.patch(user._id, {
      onboardingCompleted: false,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

