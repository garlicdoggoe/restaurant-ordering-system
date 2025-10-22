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
    // If client sent a Convex storageId instead of a URL for image, resolve it to a URL
    let resolvedImage = args.image;
    if (
      typeof resolvedImage === "string" &&
      resolvedImage.length > 0 &&
      !resolvedImage.startsWith("http")
    ) {
      const url = await ctx.storage.getUrl(resolvedImage as any);
      if (url) {
        resolvedImage = url;
      }
    }

    const now = Date.now();
    return await ctx.db.insert("menu_items", { 
      ...args, 
      image: resolvedImage,
      createdAt: now, 
      updatedAt: now 
    });
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
    // If client sent a Convex storageId instead of a URL for image, resolve it to a URL
    let resolvedImage = data.image;
    if (
      typeof resolvedImage === "string" &&
      resolvedImage.length > 0 &&
      !resolvedImage.startsWith("http")
    ) {
      const url = await ctx.storage.getUrl(resolvedImage as any);
      if (url) {
        resolvedImage = url;
      }
    }

    await ctx.db.patch(id, { 
      ...data, 
      image: resolvedImage,
      updatedAt: Date.now() 
    });
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
        { name: "Rice Meals", icon: "🍚", order: 3 },
        { name: "Bilao", icon: "🍜", order: 4 },
        { name: "Bundles", icon: "🍽️", order: 5 },
        { name: "Burger", icon: "🍔", order: 6 },
        { name: "Snacks", icon: "🍟", order: 7 },
        { name: "Chillers", icon: "🍮", order: 8 },
        { name: "Salad", icon: "🥗", order: 9 },
      ];

      for (const category of defaultCategories) {
        await ctx.db.insert("categories", category);
      }
    }
  },
});

// Variant management functions
export const getVariantsByMenuItem = query({
  args: { menuItemId: v.id("menu_items") },
  handler: async (ctx, { menuItemId }) => {
    return await ctx.db
      .query("menu_item_variants")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", menuItemId))
      .collect();
  },
});

export const addVariant = mutation({
  args: {
    menuItemId: v.id("menu_items"),
    name: v.string(),
    price: v.number(),
    available: v.boolean(),
    sku: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menu_item_variants", { 
      ...args, 
      createdAt: now, 
      updatedAt: now 
    });
  },
});

export const updateVariant = mutation({
  args: {
    id: v.id("menu_item_variants"),
    data: v.object({
      name: v.optional(v.string()),
      price: v.optional(v.number()),
      available: v.optional(v.boolean()),
      sku: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const deleteVariant = mutation({
  args: { id: v.id("menu_item_variants") },
  handler: async (ctx, { id }) => {
    // Also delete associated variant attributes
    const variantAttributes = await ctx.db
      .query("variant_attributes")
      .withIndex("by_variantId", (q) => q.eq("variantId", id))
      .collect();
    
    for (const attr of variantAttributes) {
      await ctx.db.delete(attr._id);
    }
    
    await ctx.db.delete(id);
  },
});

// Attribute management functions
export const getAttributes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("attributes").collect();
  },
});

export const upsertAttribute = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    inputType: v.union(
      v.literal("select"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("text")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attributes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { 
        ...args, 
        updatedAt: now 
      });
      return existing._id;
    } else {
      return await ctx.db.insert("attributes", { 
        ...args, 
        createdAt: now, 
        updatedAt: now 
      });
    }
  },
});

export const setVariantAttribute = mutation({
  args: {
    variantId: v.id("menu_item_variants"),
    attributeId: v.id("attributes"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("variant_attributes")
      .withIndex("by_variantId_attributeId", (q) => 
        q.eq("variantId", args.variantId).eq("attributeId", args.attributeId)
      )
      .first();
    
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { 
        value: args.value, 
        updatedAt: now 
      });
      return existing._id;
    } else {
      return await ctx.db.insert("variant_attributes", { 
        ...args, 
        createdAt: now, 
        updatedAt: now 
      });
    }
  },
});

export const getVariantAttributes = query({
  args: { variantId: v.id("menu_item_variants") },
  handler: async (ctx, { variantId }) => {
    const variantAttributes = await ctx.db
      .query("variant_attributes")
      .withIndex("by_variantId", (q) => q.eq("variantId", variantId))
      .collect();
    
    // Fetch attribute details for each variant attribute
    const result = [];
    for (const va of variantAttributes) {
      const attribute = await ctx.db.get(va.attributeId);
      if (attribute) {
        result.push({
          ...va,
          attribute,
        });
      }
    }
    
    return result;
  },
});

