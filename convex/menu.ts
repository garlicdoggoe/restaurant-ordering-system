import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").order("asc").collect();
  },
});

export const getMenuItems = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("menu_items")
        .filter((q) => q.eq(q.field("category"), args.category))
        .collect();
    }
    return await ctx.db.query("menu_items").collect();
  },
});

export const addMenuItem = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.optional(v.string()),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menu_items", { ...args, createdAt: now, updatedAt: now });
  },
});

export const updateMenuItem = mutation({
  args: {
    id: v.id("menu_items"),
    data: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      price: v.optional(v.number()),
      category: v.optional(v.string()),
      image: v.optional(v.string()),
      available: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const deleteMenuItem = mutation({
  args: { id: v.id("menu_items") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Helper function to add default categories (for initial setup)
export const addCategory = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("categories", args);
  },
});

// Function to seed default categories
export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existingCategories = await ctx.db.query("categories").collect();
    
    // Only seed if no categories exist
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Pasta", icon: "🍝", order: 1 },
        { name: "Pizza", icon: "🍕", order: 2 },
        { name: "Steak", icon: "🥩", order: 3 },
        { name: "Rice", icon: "🍚", order: 4 },
        { name: "Noodle", icon: "🍜", order: 5 },
        { name: "Salad", icon: "🥗", order: 6 },
      ];

      for (const category of defaultCategories) {
        await ctx.db.insert("categories", category);
      }
    }
  },
});

