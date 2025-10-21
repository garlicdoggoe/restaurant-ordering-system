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
    items: v.array(
      v.object({
        menuItemId: v.string(),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    donation: v.number(),
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
      v.literal("delivered")
    ),
    paymentScreenshot: v.optional(v.string()),
    voucherCode: v.optional(v.string()),
    denialReason: v.optional(v.string()),
    estimatedPrepTime: v.optional(v.number()),
    estimatedDeliveryTime: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customerId", ["customerId"]) 
    .index("by_status", ["status"]),

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
    startDate: v.number(),
    endDate: v.number(),
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

  delivery_fees: defineTable({
    barangay: v.string(),
    fee: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_barangay", ["barangay"]),
});


