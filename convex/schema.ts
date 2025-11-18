import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
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
    gcashNumber: v.optional(v.string()), // GCash payment method number
    profileComplete: v.boolean(), // Whether customer has completed profile
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]).index("by_email", ["email"]),

  restaurant: defineTable({
    name: v.string(),
    description: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    logo: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("busy")),
    openingTime: v.optional(v.string()), // Format: "HH:MM" (24-hour format)
    closingTime: v.optional(v.string()), // Format: "HH:MM" (24-hour format)
    averagePrepTime: v.number(),
    averageDeliveryTime: v.number(),
    platformFee: v.optional(v.number()), // Platform service fee
    platformFeeEnabled: v.optional(v.boolean()), // Whether platform fee is enabled
    preorderSchedule: v.optional(
      v.object({
        restrictionsEnabled: v.boolean(),
        dates: v.array(
          v.object({
            date: v.string(), // YYYY-MM-DD
            startTime: v.string(), // HH:MM 24h format
            endTime: v.string(), // HH:MM 24h format
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  categories: defineTable({
    name: v.string(),
    icon: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  menu_items: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.optional(v.string()),
    available: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"]),

  orders: defineTable({
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
    gcashNumber: v.optional(v.string()), // GCash number used for payment
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
      })
    ),
    subtotal: v.number(),
    platformFee: v.number(),
    discount: v.number(),
    total: v.number(),
    orderType: v.union(
      v.literal("dine-in"),
      v.literal("takeaway"),
      v.literal("delivery"),
      v.literal("pre-order")
    ),
    // Pre-order specific fields
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
    denialReason: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    estimatedPrepTime: v.optional(v.number()),
    estimatedDeliveryTime: v.optional(v.number()),
    // Whether the customer is allowed to send image attachments in chat for this order
    allowCustomerImages: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customerId", ["customerId"]) 
    .index("by_status", ["status"])
    .index("by_status_createdAt", ["status", "createdAt"]), // NEW: for sorted queries with better caching

  vouchers: defineTable({
    code: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(),
    minOrderAmount: v.number(),
    maxDiscount: v.optional(v.number()),
    expiresAt: v.number(),
    usageLimit: v.number(),
    usageCount: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),

  promotions: defineTable({
    title: v.string(),
    description: v.string(),
    image: v.optional(v.string()),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["active", "startDate", "endDate"]),

  denial_reasons: defineTable({
    reason: v.string(),
    isPreset: v.boolean(),
    createdAt: v.number(),
  }),

  chat_messages: defineTable({
    orderId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderRole: v.union(v.literal("owner"), v.literal("customer")),
    message: v.string(),
    timestamp: v.number(),
  }).index("by_orderId", ["orderId"]).index("by_timestamp", ["timestamp"]),

  // Chat read status - tracks when each user last read messages for each order
  chat_read_status: defineTable({
    orderId: v.string(),
    userId: v.string(),
    lastReadTimestamp: v.number(), // Timestamp of the last message that was read
  }).index("by_orderId_userId", ["orderId", "userId"]),

  delivery_fees: defineTable({
    barangay: v.string(),
    fee: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_barangay", ["barangay"]),

  // Menu item variants - flexible pricing per item
  menu_item_variants: defineTable({
    menuItemId: v.id("menu_items"),
    name: v.string(),
    price: v.number(),
    available: v.boolean(),
    sku: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_menuItemId", ["menuItemId"]),

  // Attribute definitions for variants
  attributes: defineTable({
    key: v.string(),
    label: v.string(),
    inputType: v.union(
      v.literal("select"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("text")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Variant-attribute relationships
  variant_attributes: defineTable({
    variantId: v.id("menu_item_variants"),
    attributeId: v.id("attributes"),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_variantId", ["variantId"]).index("by_variantId_attributeId", ["variantId", "attributeId"]),

  // Order modification audit log
  order_modifications: defineTable({
    orderId: v.id("orders"),
    modifiedBy: v.string(), // User ID who made the change
    modifiedByName: v.string(),
    modificationType: v.union(
      v.literal("item_added"),
      v.literal("item_removed"),
      v.literal("item_quantity_changed"),
      v.literal("item_price_changed"),
      v.literal("order_edited"),
      v.literal("status_changed")
    ),
    previousValue: v.string(), // JSON stringified previous state
    newValue: v.string(), // JSON stringified new state
    itemDetails: v.optional(v.string()), // Description of what changed
    timestamp: v.number(),
  }).index("by_orderId", ["orderId"]),

  // Owner signup validation tokens - secure one-time tokens for owner signup
  owner_signup_tokens: defineTable({
    token: v.string(), // Secure random token
    used: v.boolean(), // Whether the token has been used
    expiresAt: v.number(), // Expiration timestamp
    createdAt: v.number(),
  }).index("by_token", ["token"]),
});


