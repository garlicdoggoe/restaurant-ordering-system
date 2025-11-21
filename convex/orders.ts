import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Separate user role lookup with better caching - eliminates user dependency from order queries
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    return user ? { userId: user._id, role: user.role } : null;
  },
});

// Optimized orders.list - no user lookup inside, eliminates user dependency
export const list = query({
  args: { 
    userRole: v.union(v.literal("owner"), v.literal("customer")),
    userId: v.string()
  },
  handler: async (ctx, { userRole, userId }) => {
    if (userRole === "owner") {
      // Use status index to enable partial cache hits
      return await ctx.db.query("orders").collect();
    }
    
    // Customer: only own orders
    return await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", userId))
      .collect();
  },
});

// Status-filtered query for better caching - enables partial cache hits per status
export const listByStatus = query({
  args: { 
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("ready"),
      v.literal("denied"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("in-transit"),
      v.literal("delivered"),
      v.literal("pre-order-pending")
    )),
    userRole: v.union(v.literal("owner"), v.literal("customer")),
    userId: v.string()
  },
  handler: async (ctx, { status, userRole, userId }) => {
    if (userRole === "owner") {
      if (status) {
        return await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("orders").order("desc").collect();
    }
    
    // Customer filtered by customerId and optional status
    let query = ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", userId));
    
    const results = await query.collect();
    return status ? results.filter(o => o.status === status) : results;
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    const order = await ctx.db.get(id);
    if (!order) return null;

    if (currentUser.role === "owner" || order.customerId === (currentUser._id as unknown as string)) {
      return order;
    }

    throw new Error("Unauthorized to view this order");
  },
});

export const getCustomerPendingOrder = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .collect();
    // Return first non-preorder pending order (allow multiple pre-orders)
    return orders.find((o) => o.status === "pending" && o.orderType !== "pre-order") ?? null;
  },
});

export const create = mutation({
  args: {
    // customerId is derived from the authenticated user to prevent spoofing
    customerId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.optional(v.string()),
    customerCoordinates: v.optional(
      v.object({
        lng: v.number(),
        lat: v.number(),
      })
    ), // Coordinates at time of order creation (isolated per order)
    gcashNumber: v.optional(v.string()),
    items: v.array(
      v.object({ 
        menuItemId: v.string(), 
        name: v.string(), 
        price: v.number(), 
        quantity: v.number(),
        // Optional variant information for flexible pricing
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        attributes: v.optional(v.record(v.string(), v.string())),
        unitPrice: v.optional(v.number()),
        // Selected choices from choice groups - stores choice data directly (maps choiceGroupId -> { name: string, price: number })
        selectedChoices: v.optional(v.record(v.string(), v.object({
          name: v.string(),
          price: v.number(),
        }))),
        // Bundle items - for bundle menu items, stores the actual items included (selected from choice groups + fixed items)
        bundleItems: v.optional(v.array(v.object({
          menuItemId: v.string(),
          variantId: v.optional(v.string()),
          name: v.string(),
          price: v.number(),
        }))),
      })
    ),
    subtotal: v.number(),
    platformFee: v.number(),
    deliveryFee: v.optional(v.number()), // Delivery fee calculated based on distance
    discount: v.number(),
    total: v.number(),
    orderType: v.union(
      v.literal("dine-in"),
      v.literal("takeaway"),
      v.literal("delivery"),
      v.literal("pre-order")
    ),
    preOrderFulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
    preOrderScheduledAt: v.optional(v.number()),
    paymentPlan: v.optional(v.union(v.literal("full"), v.literal("downpayment"))),
    downpaymentAmount: v.optional(v.number()),
    downpaymentProofUrl: v.optional(v.string()),
    remainingPaymentMethod: v.optional(v.union(v.literal("online"), v.literal("cash"))),
    remainingPaymentProofUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("ready"),
      v.literal("denied"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("in-transit"),
      v.literal("delivered"),
      v.literal("pre-order-pending")
    ),
    paymentScreenshot: v.optional(v.string()),
    voucherCode: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Only customers can create orders; force customerId to current user's id
    if (currentUser.role !== "customer") throw new Error("Only customers can create orders");

    // Validate special instructions length (max 100 characters)
    if (args.specialInstructions && args.specialInstructions.length > 100) {
      throw new Error("Landmark/Special instructions must be 100 characters or less");
    }

    // SECURITY: Validate and recalculate all prices server-side to prevent price manipulation
    const restaurant = await ctx.db.query("restaurant").first();
    if (!restaurant) throw new Error("Restaurant configuration not found");

    // Validate and recalculate each order item
    const validatedItems = [];
    let calculatedSubtotal = 0;

    for (const item of args.items) {
      // Validate menu item exists and is available
      const menuItem = await ctx.db.get(item.menuItemId as Id<"menu_items">);
      if (!menuItem) {
        throw new Error("One or more menu items are no longer available. Please refresh and try again.");
      }
      // Type guard: ensure this is a menu_item (not another table type)
      if (!("available" in menuItem) || !menuItem.available) {
        throw new Error("One or more menu items are currently unavailable. Please remove them from your cart.");
      }

      // Validate quantity is positive
      if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new Error("Invalid quantity. Please enter a positive whole number.");
      }

      // Type assertion: we know this is a menu_item from the check above
      const menuItemTyped = menuItem as { _id: Id<"menu_items">; price: number; available: boolean; isBundle?: boolean };
      let itemUnitPrice = menuItemTyped.price; // Start with base price

      // If variant is specified, validate and use variant price
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId as Id<"menu_item_variants">);
        if (!variant) {
          throw new Error("Selected variant is no longer available. Please refresh and try again.");
        }
        // Type guard: ensure this is a variant
        if (!("menuItemId" in variant) || variant.menuItemId !== menuItemTyped._id) {
          throw new Error("Invalid variant selection. Please refresh and try again.");
        }
        const variantTyped = variant as { menuItemId: Id<"menu_items">; available: boolean; price: number };
        if (!variantTyped.available) {
          throw new Error("Selected variant is currently unavailable. Please choose a different option.");
        }
        itemUnitPrice = variantTyped.price;
      }

      // Validate and calculate choice prices
      let choicePriceAdjustment = 0;
      let validatedSelectedChoices = undefined;
      if (item.selectedChoices) {
        // Get all choice groups for this menu item
        const choiceGroups = await ctx.db
          .query("menu_item_choice_groups")
          .withIndex("by_menuItemId", (q: any) => q.eq("menuItemId", menuItemTyped._id))
          .collect();

        validatedSelectedChoices = {} as Record<string, { name: string; price: number }>;

        // Validate each selected choice
        for (const [choiceGroupId, selectedChoice] of Object.entries(item.selectedChoices)) {
          const choiceGroup = choiceGroups.find(g => g._id === choiceGroupId as any);
          if (!choiceGroup) {
            throw new Error("Invalid choice selection. Please refresh and try again.");
          }

          // Find the choice in the group
          const choice = choiceGroup.choices?.find(c => c.name === selectedChoice.name);
          if (!choice) {
            throw new Error("Selected choice is no longer available. Please refresh and try again.");
          }
          if (!choice.available) {
            throw new Error("Selected choice is currently unavailable. Please choose a different option.");
          }

          // Use server-side price, not client-provided price
          choicePriceAdjustment += choice.price;
          
          // Store validated choice with server-calculated price
          validatedSelectedChoices[choiceGroupId] = {
            name: choice.name,
            price: choice.price,
          };
        }
      }

      // Calculate final unit price (base/variant price + choice adjustments)
      const finalUnitPrice = itemUnitPrice + choicePriceAdjustment;

      // Validate bundle items if this is a bundle
      let validatedBundleItems = undefined;
      if (menuItemTyped.isBundle && item.bundleItems) {
        validatedBundleItems = [];
        for (const bundleItem of item.bundleItems) {
          const bundleMenuItem = await ctx.db.get(bundleItem.menuItemId as Id<"menu_items">);
          if (!bundleMenuItem) {
            throw new Error("One or more bundle items are no longer available. Please refresh and try again.");
          }
          // Type guard: ensure this is a menu_item
          if (!("available" in bundleMenuItem) || !bundleMenuItem.available) {
            throw new Error("One or more bundle items are currently unavailable. Please refresh and try again.");
          }
          const bundleMenuItemTyped = bundleMenuItem as { _id: Id<"menu_items">; price: number; available: boolean };

          let bundleItemPrice = bundleMenuItemTyped.price;
          if (bundleItem.variantId) {
            const bundleVariant = await ctx.db.get(bundleItem.variantId as Id<"menu_item_variants">);
            if (!bundleVariant) {
              throw new Error("Invalid bundle item configuration. Please refresh and try again.");
            }
            // Type guard: ensure this is a variant
            if (!("menuItemId" in bundleVariant) || bundleVariant.menuItemId !== bundleMenuItemTyped._id) {
              throw new Error("Invalid bundle item configuration. Please refresh and try again.");
            }
            const bundleVariantTyped = bundleVariant as { menuItemId: Id<"menu_items">; price: number };
            bundleItemPrice = bundleVariantTyped.price;
          }

          validatedBundleItems.push({
            menuItemId: bundleItem.menuItemId,
            variantId: bundleItem.variantId,
            name: bundleItem.name,
            price: bundleItemPrice, // Use server-calculated price
          });
        }
      }

      // Calculate item total price
      const itemTotalPrice = finalUnitPrice * item.quantity;
      calculatedSubtotal += itemTotalPrice;

      // Store validated item with server-calculated prices
      validatedItems.push({
        menuItemId: item.menuItemId,
        name: item.name,
        price: itemTotalPrice, // Total price for this item (unit price * quantity)
        quantity: item.quantity,
        variantId: item.variantId,
        variantName: item.variantName,
        attributes: item.attributes,
        unitPrice: finalUnitPrice, // Store unit price for reference
        selectedChoices: validatedSelectedChoices,
        bundleItems: validatedBundleItems,
      });
    }

    // SECURITY: Calculate platform fee server-side
    let calculatedPlatformFee = 0;
    if (restaurant.platformFeeEnabled && restaurant.platformFee) {
      calculatedPlatformFee = restaurant.platformFee;
    }

    // SECURITY: Calculate delivery fee server-side (if delivery order)
    let calculatedDeliveryFee = 0;
    let serverCalculationSucceeded = false;
    const isDelivery = args.orderType === "delivery" || 
      (args.orderType === "pre-order" && args.preOrderFulfillment === "delivery");
    
    if (isDelivery && args.customerCoordinates && restaurant.coordinates) {
      // SECURITY: Calculate distance server-side using Mapbox API
      const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
      if (accessToken) {
        try {
          const coordinates = `${restaurant.coordinates.lng},${restaurant.coordinates.lat};${args.customerCoordinates.lng},${args.customerCoordinates.lat}`;
          const profile = "mapbox/driving";
          const url = `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?access_token=${accessToken}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              const distanceInMeters = data.routes[0]?.distance;
              if (typeof distanceInMeters === "number" && distanceInMeters > 0) {
                const feePerKm = restaurant.feePerKilometer ?? 15;
                const distanceInKm = distanceInMeters / 1000;
                
                if (distanceInKm <= 0.5) {
                  calculatedDeliveryFee = 0;
                } else if (distanceInKm <= 1) {
                  calculatedDeliveryFee = 20;
                } else {
                  calculatedDeliveryFee = 20 + (distanceInKm - 1) * feePerKm;
                }
                serverCalculationSucceeded = true;
              }
            }
          }
        } catch (error) {
          // If distance calculation fails, we'll use client-provided fee if available
          console.error("Failed to calculate delivery fee:", error);
        }
      }
    }
    
    // If server calculation failed but client provided a fee, use client's fee
    // This handles cases where Mapbox API is temporarily unavailable
    if (!serverCalculationSucceeded && args.deliveryFee !== undefined && args.deliveryFee > 0) {
      calculatedDeliveryFee = args.deliveryFee;
    }

    // SECURITY: Validate and calculate voucher discount server-side
    let calculatedDiscount = 0;
    if (args.voucherCode) {
      const voucher = await ctx.db
        .query("vouchers")
        .withIndex("by_code", (q) => q.eq("code", args.voucherCode!))
        .first();

      if (!voucher || !voucher.active) {
        throw new Error("Invalid voucher code");
      }
      if (voucher.expiresAt < Date.now()) {
        throw new Error("Voucher has expired");
      }
      if (voucher.usageCount >= voucher.usageLimit) {
        throw new Error("Voucher usage limit reached");
      }
      if (calculatedSubtotal < voucher.minOrderAmount) {
        throw new Error(`Minimum order amount is ₱${voucher.minOrderAmount}`);
      }

      // Calculate discount based on voucher type
      if (voucher.type === "fixed") {
        calculatedDiscount = voucher.value;
      } else {
        calculatedDiscount = (calculatedSubtotal * voucher.value) / 100;
        if (voucher.maxDiscount && calculatedDiscount > voucher.maxDiscount) {
          calculatedDiscount = voucher.maxDiscount;
        }
      }

      // Increment voucher usage count
      await ctx.db.patch(voucher._id, {
        usageCount: voucher.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    // SECURITY: Calculate total server-side
    const calculatedTotal = calculatedSubtotal + calculatedPlatformFee + calculatedDeliveryFee - calculatedDiscount;

    // SECURITY: Verify client-provided totals match server-calculated totals (with small tolerance for floating point)
    const tolerance = 0.01; // 1 cent tolerance for most calculations
    // Delivery fee tolerance is higher (5 pesos) because it's based on external API calls
    // that can have slight variations due to network conditions, API response differences, etc.
    const deliveryFeeTolerance = 5.0; // 5 pesos tolerance for delivery fees
    
    if (Math.abs(args.subtotal - calculatedSubtotal) > tolerance) {
      throw new Error("Subtotal mismatch. Please refresh and try again.");
    }
    if (Math.abs(args.platformFee - calculatedPlatformFee) > tolerance) {
      throw new Error("Platform fee mismatch. Please refresh and try again.");
    }
    // Only validate delivery fee if server calculation succeeded
    // If server calculation failed, we already used the client's fee, so no validation needed
    if (args.deliveryFee !== undefined && serverCalculationSucceeded && Math.abs(args.deliveryFee - calculatedDeliveryFee) > deliveryFeeTolerance) {
      throw new Error("Delivery fee mismatch. Please refresh and try again.");
    }
    if (Math.abs(args.discount - calculatedDiscount) > tolerance) {
      throw new Error("Discount mismatch. Please refresh and try again.");
    }
    if (Math.abs(args.total - calculatedTotal) > tolerance) {
      throw new Error("Total mismatch. Please refresh and try again.");
    }

    // If client sent a Convex storageId instead of a URL for payment screenshot, resolve it to a URL
    // This allows clients to pass a storage reference without extra round trips for URL resolution
    let resolvedPaymentScreenshot = args.paymentScreenshot;
    if (
      typeof resolvedPaymentScreenshot === "string" &&
      resolvedPaymentScreenshot.length > 0 &&
      !resolvedPaymentScreenshot.startsWith("http")
    ) {
      // SECURITY: Validate storageId exists and get URL
      try {
        const url = await ctx.storage.getUrl(resolvedPaymentScreenshot as Id<"_storage">);
        if (!url) {
          throw new Error("Invalid payment screenshot. Please upload a valid image.");
        }
        resolvedPaymentScreenshot = url;
      } catch (error) {
        throw new Error("Invalid payment screenshot. Please upload a valid image.");
      }
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      customerId: currentUser._id as unknown as string,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerAddress: args.customerAddress,
      customerCoordinates: args.customerCoordinates,
      gcashNumber: args.gcashNumber,
      items: validatedItems, // Use validated items with server-calculated prices
      subtotal: calculatedSubtotal, // Use server-calculated subtotal
      platformFee: calculatedPlatformFee, // Use server-calculated platform fee
      deliveryFee: calculatedDeliveryFee, // Use server-calculated delivery fee
      discount: calculatedDiscount, // Use server-calculated discount
      total: calculatedTotal, // Use server-calculated total
      orderType: args.orderType,
      preOrderFulfillment: args.preOrderFulfillment,
      preOrderScheduledAt: args.preOrderScheduledAt,
      paymentPlan: args.paymentPlan,
      downpaymentAmount: args.downpaymentAmount,
      downpaymentProofUrl: args.downpaymentProofUrl,
      remainingPaymentMethod: args.remainingPaymentMethod,
      remainingPaymentProofUrl: args.remainingPaymentProofUrl,
      status: args.status,
      paymentScreenshot: resolvedPaymentScreenshot,
      voucherCode: args.voucherCode,
      specialInstructions: args.specialInstructions,
      // Default: customers cannot send images unless explicitly enabled by owner
      allowCustomerImages: false,
      createdAt: now,
      updatedAt: now,
    });

    // Seed initial chat message when order is created (after checkout)
    // This allows customers and owners to chat about any order, regardless of status or orderType
    // Messages are created for all orders including: pending non-preorders, pending pre-orders,
    // and all other order types and statuses
    // Note: restaurant was already fetched above for price validation
    // Get the owner user to send the message with correct senderId
    const ownerUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "owner"))
      .first();
    
    // Use different message text for pre-order-pending status vs regular pending/other statuses
    // Both pre-orders and regular orders (including pending non-preorders) get initial messages
    const initialMessage = args.status === "pre-order-pending" 
      ? `Pre-order placed. We'll review and confirm your order soon. Order #${orderId.toString().slice(-6).toUpperCase()} | View details: /owner?orderId=${orderId}`
      : `Order placed. We'll review and confirm your order soon. Order #${orderId.toString().slice(-6).toUpperCase()} | View details: /owner?orderId=${orderId}`;
    
    // Only seed message if owner exists (should always exist, but check for safety)
    if (ownerUser) {
      await ctx.db.insert("chat_messages", {
        orderId: orderId as unknown as string,
        senderId: ownerUser._id as unknown as string,
        senderName: restaurant?.name || `${ownerUser.firstName} ${ownerUser.lastName}`,
        senderRole: "owner",
        message: initialMessage,
        timestamp: now,
      });
    }

    return orderId;
  },
});

export const update = mutation({
  args: {
    id: v.id("orders"),
    data: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("accepted"),
          v.literal("ready"),
          v.literal("denied"),
          v.literal("completed"),
          v.literal("cancelled"),
          v.literal("in-transit"),
          v.literal("delivered"),
          v.literal("pre-order-pending")
        )
      ),
      denialReason: v.optional(v.string()),
      estimatedPrepTime: v.optional(v.number()),
      estimatedDeliveryTime: v.optional(v.number()),
      preOrderFulfillment: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
      preOrderScheduledAt: v.optional(v.number()),
      paymentPlan: v.optional(v.union(v.literal("full"), v.literal("downpayment"))),
      downpaymentAmount: v.optional(v.number()),
      downpaymentProofUrl: v.optional(v.string()),
      remainingPaymentMethod: v.optional(v.union(v.literal("online"), v.literal("cash"))),
      remainingPaymentProofUrl: v.optional(v.string()),
      items: v.optional(v.array(
        v.object({ 
          menuItemId: v.string(), 
          name: v.string(), 
          price: v.number(), 
          quantity: v.number(),
          variantId: v.optional(v.string()),
          variantName: v.optional(v.string()),
          attributes: v.optional(v.record(v.string(), v.string())),
          unitPrice: v.optional(v.number()),
          bundleItems: v.optional(v.array(v.object({
            menuItemId: v.string(),
            variantId: v.optional(v.string()),
            name: v.string(),
            price: v.number(),
          }))),
        })
      )),
      // Toggle if customer can send images in chat for this order
      allowCustomerImages: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, data }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Order not found");

    // Owners can update any order status; customers can only cancel their own pending orders
    if (currentUser.role === "owner") {
      // Prevent status changes from cancelled, completed, or delivered orders
      // These are final states and should not be modified
      if (data.status !== undefined && data.status !== existing.status) {
        const finalStates = ["cancelled", "completed", "delivered"];
        if (finalStates.includes(existing.status)) {
          throw new Error(`Cannot change status of an order that is already ${existing.status}. Final states cannot be modified.`);
        }
      }

      // Check if status is being changed
      const statusChanged = data.status !== undefined && data.status !== existing.status;
      const previousStatus = existing.status;
      
      // Check if order is transitioning to accepted status
      const wasAccepted = existing.status === "accepted";
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });

      // Fetch restaurant once for all chat messages (used multiple times below)
      const restaurant = await ctx.db.query("restaurant").first();

      // Track if a chat message was already sent by specific handlers
      let chatMessageSent = false;

      // Auto-chat when owner acknowledges a pre-order
      // Trigger condition: status transitions from "pre-order-pending" to "pending"
      // This informs both customer and owner in the shared chat thread.
      if (existing.status === "pre-order-pending" && data.status === "pending") {
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          // Include a customer-friendly details link parsed by chat dialogs into a button
          message: `Pre-order acknowledged. We'll notify you when it's being prepared. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Seed chat message on first transition to accepted status
      if (!wasAccepted && data.status === "accepted") {
        // Insert initial chat message announcing order acceptance
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Order now being prepared.`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Auto-chat when order is marked as ready
      // Check if order is transitioning to ready status (from any status except ready)
      if (existing.status !== "ready" && data.status === "ready") {
        // Insert chat message announcing order is ready
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order is ready for pickup! View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Auto-chat when order is marked as in-transit
      // Check if order is transitioning to in-transit status (from any status except in-transit)
      if (existing.status !== "in-transit" && data.status === "in-transit") {
        // Insert chat message announcing order is in transit
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order is on the way! View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Auto-chat when order is marked as delivered
      // Check if order is transitioning to delivered status (from any status except delivered)
      if (existing.status !== "delivered" && data.status === "delivered") {
        // Insert chat message announcing order is delivered
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order has been delivered! Thank you for your order. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Auto-chat when order is marked as completed
      // Check if order is transitioning to completed status (from any status except completed)
      if (existing.status !== "completed" && data.status === "completed") {
        // Insert chat message announcing order is completed
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order has been completed! Thank you for your order. View details: /customer?orderId=${id}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Auto-chat on denial with reason
      if (data.status === "denied") {
        const reason = data.denialReason ?? existing.denialReason ?? "No reason provided";
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: currentUser._id as unknown as string,
          senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
          senderRole: "owner",
          message: `Your order was not approved. Please wait while a representative reviews it and assists with the resolution. Reason: ${reason}`,
          timestamp: Date.now(),
        });
        chatMessageSent = true;
      }

      // Handle status change: send chat message and create modification log
      // This runs for ALL status changes, including ones not handled above
      if (statusChanged && data.status !== undefined) {
        const newStatus = data.status;
        
        // Human-readable status labels
        const statusLabels: Record<string, string> = {
          "pre-order-pending": "Awaiting Restaurant Confirmation",
          "pending": "Pending",
          "accepted": "Preparing",
          "ready": "Ready",
          "denied": "Denied",
          "completed": "Completed",
          "cancelled": "Cancelled",
          "in-transit": "In Transit",
          "delivered": "Delivered",
        };
        
        // Send generic chat message if not already sent by specific handlers
        if (!chatMessageSent) {
          const statusLabel = statusLabels[newStatus] || newStatus;
          await ctx.db.insert("chat_messages", {
            orderId: id as unknown as string,
            senderId: currentUser._id as unknown as string,
            senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
            senderRole: "owner",
            message: `Order status updated to: ${statusLabel}. View details: /customer?orderId=${id}`,
            timestamp: Date.now(),
          });
        }
        
        // Create modification log entry for status change
        const previousValue = JSON.stringify({ status: previousStatus });
        const newValue = JSON.stringify({ status: newStatus });
        const oldStatusLabel = statusLabels[previousStatus] || previousStatus;
        const newStatusLabel = statusLabels[newStatus] || newStatus;
        
        await ctx.db.insert("order_modifications", {
          orderId: id,
          modifiedBy: currentUser._id as unknown as string,
          modifiedByName: `${currentUser.firstName} ${currentUser.lastName}`,
          modificationType: "status_changed",
          previousValue,
          newValue,
          itemDetails: `Status changed from "${oldStatusLabel}" to "${newStatusLabel}"`,
          timestamp: Date.now(),
        });
      }
      
      return id;
    }

    // Customer path: allow cancelling their own order or updating remaining payment proof
    if (existing.customerId !== (currentUser._id as unknown as string)) {
      throw new Error("Unauthorized to update this order");
    }

    // Allow customers to cancel pending orders, denied orders, or pre-order-pending orders
    // For pre-orders, cancellation must be at least 1 day before the scheduled date
    const isCancellation = data.status === "cancelled";
    const isPreOrder = existing.orderType === "pre-order";
    const isPreOrderPending = existing.status === "pre-order-pending";
    
    let allowedCancelUpdate = false;
    if (isCancellation) {
      // Regular orders: allow cancellation for pending or denied status
      if (!isPreOrder && (existing.status === "pending" || existing.status === "denied")) {
        allowedCancelUpdate = true;
      }
      // Pre-orders: allow cancellation for pre-order-pending, pending, or denied status
      // BUT only if cancelled at least 1 day before scheduled date
      else if (isPreOrder && (isPreOrderPending || existing.status === "pending" || existing.status === "denied")) {
        if (existing.preOrderScheduledAt) {
          const now = Date.now();
          const scheduledDate = existing.preOrderScheduledAt;
          const oneDayInMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
          const timeUntilScheduled = scheduledDate - now;
          
          // Check if cancellation is at least 1 day before scheduled date
          if (timeUntilScheduled >= oneDayInMs) {
            allowedCancelUpdate = true;
          } else {
            throw new Error("Pre-orders can only be cancelled at least 1 day before the scheduled order date");
          }
        } else {
          // If no scheduled date, allow cancellation (shouldn't happen, but handle gracefully)
          allowedCancelUpdate = true;
        }
      }
    }
    
    // Allow customers to update remaining payment proof URL for their own orders
    const allowedPaymentProofUpdate = data.remainingPaymentProofUrl !== undefined && 
      Object.keys(data).length === 1; // Only updating remainingPaymentProofUrl

    if (!allowedCancelUpdate && !allowedPaymentProofUpdate) {
      throw new Error("Customers can only cancel pending/denied/pre-order-pending orders or update remaining payment proof");
    }

    if (allowedCancelUpdate) {
      await ctx.db.patch(id, { status: "cancelled", updatedAt: Date.now() });
      
      // Send customer cancellation message
      await ctx.db.insert("chat_messages", {
        orderId: id as unknown as string,
        senderId: currentUser._id as unknown as string,
        senderName: existing.customerName,
        senderRole: "customer",
        message: "I have cancelled this order",
        timestamp: Date.now(),
      });
      
      // Automatically send owner refund message
      const restaurant = await ctx.db.query("restaurant").first();
      const ownerUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "owner"))
        .first();
      
      if (ownerUser) {
        // Include the GCash number from the order instance in the refund message
        const gcashNumber = existing.gcashNumber ? `${existing.gcashNumber}` : "";
        await ctx.db.insert("chat_messages", {
          orderId: id as unknown as string,
          senderId: ownerUser._id as unknown as string,
          senderName: restaurant?.name || `${ownerUser.firstName} ${ownerUser.lastName}`,
          senderRole: "owner",
          message: `Your refund is on the way! It will be processed within 1–3 business days. We'll send it to the GCash number you provided (+63) ${gcashNumber} and share a screenshot once completed 😊`,
          timestamp: Date.now(),
        });
      }
    } else if (allowedPaymentProofUpdate) {
      // If the client sent a Convex storageId instead of a URL, resolve it to a URL
      let remainingPaymentProofUrl = data.remainingPaymentProofUrl;
      if (
        typeof remainingPaymentProofUrl === "string" &&
        remainingPaymentProofUrl.length > 0 &&
        !remainingPaymentProofUrl.startsWith("http")
      ) {
        // SECURITY: Validate storageId exists and get URL
        try {
          const resolvedUrl = await ctx.storage.getUrl(remainingPaymentProofUrl as Id<"_storage">);
          if (!resolvedUrl) {
            throw new Error("Invalid payment proof. Please upload a valid image.");
          }
          remainingPaymentProofUrl = resolvedUrl;
        } catch (error) {
          throw new Error("Invalid payment proof. Please upload a valid image.");
        }
      }

      await ctx.db.patch(id, { remainingPaymentProofUrl, updatedAt: Date.now() });
    }
    
    return id;
  },
});

export const updateOrderItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        menuItemId: v.string(),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        variantId: v.optional(v.string()),
        variantName: v.optional(v.string()),
        attributes: v.optional(v.record(v.string(), v.string())),
        unitPrice: v.optional(v.number()),
        selectedChoices: v.optional(v.record(v.string(), v.object({
          name: v.string(),
          price: v.number(),
        }))),
        bundleItems: v.optional(v.array(v.object({
          menuItemId: v.string(),
          variantId: v.optional(v.string()),
          name: v.string(),
          price: v.number(),
        }))),
      })
    ),
    modificationType: v.string(),
    itemDetails: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, items, modificationType, itemDetails }) => {
    const identity = await ctx.auth.getUserIdentity();
    const clerkId = identity?.subject;
    if (!clerkId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Only owners can modify order items
    if (currentUser.role !== "owner") {
      throw new Error("Only owners can modify order items");
    }

    const existing = await ctx.db.get(orderId);
    if (!existing) throw new Error("Order not found");

    // Only allow modification when not in blocked states
    // Blocked states: accepted, completed, in-transit, delivered, cancelled
    // This allows modification for: pending, pre-order-pending, denied, ready
    const blocked = new Set(["accepted", "completed", "in-transit", "delivered", "cancelled"]);
    if (blocked.has(existing.status)) {
      throw new Error("Order items cannot be modified in the current state");
    }

    // Validate items array is not empty
    if (items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // Calculate new totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = existing.platformFee || 0;
    const deliveryFee = existing.deliveryFee || 0; // Preserve delivery fee when recalculating
    const discount = existing.discount || 0;
    const total = subtotal + platformFee + deliveryFee - discount;

    // Store previous state for audit log
    const previousValue = JSON.stringify({
      items: existing.items,
      subtotal: existing.subtotal,
      total: existing.total,
    });

    // Update the order
    await ctx.db.patch(orderId, {
      items,
      subtotal,
      total,
      updatedAt: Date.now(),
    });

    // Create audit log entry
    const newValue = JSON.stringify({
      items,
      subtotal,
      total,
    });

    await ctx.db.insert("order_modifications", {
      orderId,
      modifiedBy: currentUser._id as unknown as string,
      modifiedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      modificationType: modificationType as any,
      previousValue,
      newValue,
      itemDetails,
      timestamp: Date.now(),
    });

    // Auto-chat summary of item changes
    const prevItems = JSON.parse(previousValue)?.items ?? existing.items;
    const nextItems = items;
    
    // Helper function to summarize item changes
    const summarize = (prev: any[], next: any[]) => {
      // Create a key from menuItemId and variantId (if present)
      const byKey = (arr: any[]) => new Map(
        arr.map(i => [`${i.menuItemId}${i.variantId || ""}`, i])
      );
      const prevMap = byKey(prev);
      const nextMap = byKey(next);
      
      const added: string[] = [];
      const removed: string[] = [];
      const changed: string[] = [];
      
      // Check for added or changed items
      for (const [k, v] of nextMap.entries()) {
        const p = prevMap.get(k);
        if (!p) {
          added.push(`${v.name} x${v.quantity}`);
        } else if (p.quantity !== v.quantity) {
          changed.push(`${v.name} ${p.quantity}→${v.quantity}`);
        }
      }
      
      // Check for removed items
      for (const [k, v] of prevMap.entries()) {
        if (!nextMap.has(k)) {
          removed.push(v.name);
        }
      }
      
      const parts: string[] = [];
      if (added.length) parts.push(`added: ${added.join(", ")}`);
      if (removed.length) parts.push(`removed: ${removed.join(", ")}`);
      if (changed.length) parts.push(`qty: ${changed.join(", ")}`);
      
      return parts.join("; ") || "items updated";
    };
    
    const summary = summarize(prevItems, nextItems);
    const restaurant = await ctx.db.query("restaurant").first();
    await ctx.db.insert("chat_messages", {
      orderId: orderId as unknown as string,
      senderId: currentUser._id as unknown as string,
      senderName: restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: "owner",
      message: `Order items updated (${summary}). New total: ₱${total.toFixed(2)}`,
      timestamp: Date.now(),
    });

    return orderId;
  },
});


