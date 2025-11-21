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
    isBundle: v.optional(v.boolean()),
    bundleItems: v.optional(v.array(v.object({
      menuItemId: v.id("menu_items"),
      order: v.number(),
    }))),
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
      isBundle: v.optional(v.boolean()),
      bundleItems: v.optional(v.array(v.object({
        menuItemId: v.id("menu_items"),
        order: v.number(),
      }))),
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

    // Build patch data, excluding undefined fields (but allow explicit null/empty array for clearing)
    const patchData: any = {
      ...data,
      image: resolvedImage,
      updatedAt: Date.now(),
    };
    
    // If isBundle is explicitly set to false, clear bundleItems
    if (data.isBundle === false) {
      patchData.bundleItems = undefined;
    }
    
    // Remove undefined fields from patch data (except those we want to clear)
    Object.keys(patchData).forEach(key => {
      if (patchData[key] === undefined && key !== 'bundleItems') {
        delete patchData[key];
      }
    });
    
    await ctx.db.patch(id, patchData);
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

// Choice group management functions
export const getChoiceGroupsByMenuItem = query({
  args: { menuItemId: v.id("menu_items") },
  handler: async (ctx, { menuItemId }) => {
    const groups = await ctx.db
      .query("menu_item_choice_groups")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", menuItemId))
      .collect();
    
    // Sort by order field
    return groups.sort((a, b) => a.order - b.order);
  },
});

// Choices are now stored directly in the choice group, so we just get the group
export const getChoicesByGroup = query({
  args: { choiceGroupId: v.id("menu_item_choice_groups") },
  handler: async (ctx, { choiceGroupId }) => {
    const group = await ctx.db.get(choiceGroupId);
    if (!group) return [];
    
    // Return choices from the group, sorted by order
    return (group.choices || []).sort((a, b) => a.order - b.order);
  },
});

export const addChoiceGroup = mutation({
  args: {
    menuItemId: v.id("menu_items"),
    name: v.string(),
    order: v.number(),
    required: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menu_item_choice_groups", {
      menuItemId: args.menuItemId,
      name: args.name,
      order: args.order,
      required: args.required ?? true, // Default to required
      choices: [], // Initialize with empty choices array
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateChoiceGroup = mutation({
  args: {
    id: v.id("menu_item_choice_groups"),
    data: v.object({
      name: v.optional(v.string()),
      order: v.optional(v.number()),
      required: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    return id;
  },
});

export const deleteChoiceGroup = mutation({
  args: { id: v.id("menu_item_choice_groups") },
  handler: async (ctx, { id }) => {
    // Choices are stored in the group, so just delete the group
    await ctx.db.delete(id);
  },
});

export const addChoice = mutation({
  args: {
    choiceGroupId: v.id("menu_item_choice_groups"),
    name: v.string(),
    price: v.number(),
    available: v.boolean(),
    order: v.number(),
    menuItemId: v.optional(v.id("menu_items")), // For bundle choices: reference to menu item
    variantId: v.optional(v.id("menu_item_variants")), // For bundle choices: default variant
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.choiceGroupId);
    if (!group) throw new Error("Choice group not found");
    
    const newChoice = {
      name: args.name,
      price: args.price,
      available: args.available,
      order: args.order,
      menuItemId: args.menuItemId,
      variantId: args.variantId,
    };
    
    const updatedChoices = [...(group.choices || []), newChoice];
    await ctx.db.patch(args.choiceGroupId, { 
      choices: updatedChoices,
      updatedAt: Date.now() 
    });
    
    return args.choiceGroupId; // Return group ID since choices don't have separate IDs
  },
});

export const updateChoice = mutation({
  args: {
    choiceGroupId: v.id("menu_item_choice_groups"),
    choiceIndex: v.number(), // Index of the choice in the choices array
    data: v.object({
      name: v.optional(v.string()),
      price: v.optional(v.number()),
      available: v.optional(v.boolean()),
      order: v.optional(v.number()),
      menuItemId: v.optional(v.id("menu_items")), // For bundle choices: reference to menu item
      variantId: v.optional(v.id("menu_item_variants")), // For bundle choices: default variant
    }),
  },
  handler: async (ctx, { choiceGroupId, choiceIndex, data }) => {
    const group = await ctx.db.get(choiceGroupId);
    if (!group) throw new Error("Choice group not found");
    
    const choices = [...(group.choices || [])];
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      throw new Error("Invalid choice index");
    }
    
    choices[choiceIndex] = { ...choices[choiceIndex], ...data };
    
    await ctx.db.patch(choiceGroupId, { 
      choices,
      updatedAt: Date.now() 
    });
    
    return choiceGroupId;
  },
});

export const deleteChoice = mutation({
  args: { 
    choiceGroupId: v.id("menu_item_choice_groups"),
    choiceIndex: v.number(), // Index of the choice in the choices array
  },
  handler: async (ctx, { choiceGroupId, choiceIndex }) => {
    const group = await ctx.db.get(choiceGroupId);
    if (!group) throw new Error("Choice group not found");
    
    const choices = [...(group.choices || [])];
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      throw new Error("Invalid choice index");
    }
    
    choices.splice(choiceIndex, 1);
    
    await ctx.db.patch(choiceGroupId, { 
      choices,
      updatedAt: Date.now() 
    });
    
    return choiceGroupId;
  },
});

// Query to get menu items for bundle selection (exclude current item and existing bundles)
export const getMenuItemsForBundle = query({
  args: { 
    excludeMenuItemId: v.optional(v.id("menu_items")), // Current menu item to exclude
  },
  handler: async (ctx, { excludeMenuItemId }) => {
    let items = await ctx.db.query("menu_items").collect();
    
    // Filter out bundles and the current item
    items = items.filter(item => {
      if (excludeMenuItemId && item._id === excludeMenuItemId) return false;
      if (item.isBundle === true) return false; // Exclude other bundles
      return true;
    });
    
    return items;
  },
});

