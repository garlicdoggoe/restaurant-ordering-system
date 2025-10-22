"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
// Use api directly instead of casting to any

// Types
export type OrderStatus = "pending" | "accepted" | "ready" | "denied" | "completed" | "cancelled" | "in-transit" | "delivered"
export type OrderType = "dine-in" | "takeaway" | "delivery" | "pre-order"
export type PreOrderFulfillment = "pickup" | "delivery"
export type PaymentPlan = "full" | "downpayment"
export type RemainingPaymentMethod = "online" | "cash"
export type RestaurantStatus = "open" | "closed" | "busy"
export type VoucherType = "percentage" | "fixed"
export type DiscountType = "percentage" | "fixed"

export interface User {
  _id: string
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: "owner" | "customer"
  phone?: string
  address?: string
  coordinates?: {
    lng: number
    lat: number
  }
  gcashNumber?: string // GCash payment method number
  profileComplete: boolean
  createdAt: number
  updatedAt: number
}

export interface Restaurant {
  _id: string
  name: string
  description: string
  address: string
  phone: string
  email: string
  logo?: string
  status: RestaurantStatus
  openingTime?: string // Format: "HH:MM" (24-hour format)
  closingTime?: string // Format: "HH:MM" (24-hour format)
  averagePrepTime: number
  averageDeliveryTime: number
  platformFee?: number // Platform service fee
  coordinates?: {
    lng: number
    lat: number
  }
}

export interface DeliveryFee {
  _id: string
  barangay: string
  fee: number
  createdAt: number
  updatedAt: number
}

export interface Category {
  _id: string
  name: string
  icon: string
  order: number
}

export interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  category: string
  image?: string
  available: boolean
}

export interface MenuItemVariant {
  _id: string
  menuItemId: string
  name: string
  price: number
  available: boolean
  sku?: string
  createdAt: number
  updatedAt: number
}

export interface Attribute {
  _id: string
  key: string
  label: string
  inputType: "select" | "number" | "boolean" | "text"
  createdAt: number
  updatedAt: number
}

export interface VariantAttribute {
  _id: string
  variantId: string
  attributeId: string
  value: string
  attribute?: Attribute
  createdAt: number
  updatedAt: number
}

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  // Optional variant information for flexible pricing
  variantId?: string
  variantName?: string
  attributes?: Record<string, string>
  unitPrice?: number
}

export interface Order {
  _id: string
  _creationTime?: number // Convex built-in creation timestamp
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  gcashNumber?: string // GCash number used for payment
  items: OrderItem[]
  subtotal: number
  platformFee: number
  discount: number
  total: number
  orderType: OrderType
  preOrderFulfillment?: PreOrderFulfillment
  preOrderScheduledAt?: number
  paymentPlan?: PaymentPlan
  downpaymentAmount?: number
  downpaymentProofUrl?: string
  remainingPaymentMethod?: RemainingPaymentMethod
  remainingPaymentProofUrl?: string
  status: OrderStatus
  paymentScreenshot?: string
  voucherCode?: string
  denialReason?: string
  specialInstructions?: string // Customer special instructions (max 100 chars)
  estimatedPrepTime?: number
  estimatedDeliveryTime?: number
  createdAt: number // Keep for backward compatibility
  updatedAt: number
}

export interface Voucher {
  _id: string
  code: string
  type: VoucherType
  value: number
  minOrderAmount: number
  maxDiscount?: number
  expiresAt: number
  usageLimit: number
  usageCount: number
  active: boolean
}

export interface Promotion {
  _id: string
  title: string
  description: string
  image?: string
  discountType: DiscountType
  discountValue: number
  startDate: number
  endDate: number
  active: boolean
}

export interface DenialReason {
  _id: string
  reason: string
  isPreset: boolean
}

export interface ChatMessage {
  _id: string
  orderId: string
  senderId: string
  senderName: string
  senderRole: "owner" | "customer"
  message: string
  timestamp: number
}

// Context
interface DataContextType {
  // User
  currentUser: User | null

  // Restaurant
  restaurant: Restaurant
  updateRestaurant: (data: Partial<Restaurant>) => void

  // Delivery Fees
  deliveryFees: DeliveryFee[]
  updateDeliveryFee: (barangay: string, fee: number) => void
  bulkUpdateDeliveryFees: (fees: { barangay: string; fee: number }[]) => void
  removeDeliveryFee: (barangay: string) => void

  // Categories
  categories: Category[]

  // Menu Items
  menuItems: MenuItem[]
  addMenuItem: (item: Omit<MenuItem, "_id">) => void
  updateMenuItem: (id: string, data: Partial<MenuItem>) => void
  deleteMenuItem: (id: string) => void

  // Menu Item Variants
  getVariantsByMenuItem: (menuItemId: string) => MenuItemVariant[]
  addVariant: (variant: Omit<MenuItemVariant, "_id" | "createdAt" | "updatedAt">) => void
  updateVariant: (id: string, data: Partial<MenuItemVariant>) => void
  deleteVariant: (id: string) => void
  setVariantAttribute: (variantId: string, attributeId: string, value: string) => void

  // Orders
  orders: Order[]
  addOrder: (order: Omit<Order, "_id" | "createdAt" | "updatedAt">) => void
  updateOrder: (id: string, data: Partial<Order>) => void
  getOrderById: (id: string) => Order | undefined
  getCustomerPendingOrder: (customerId: string) => Order | undefined
  getCustomerActiveOrder: (customerId: string) => Order | undefined

  // Vouchers
  vouchers: Voucher[]
  addVoucher: (voucher: Omit<Voucher, "_id">) => void
  updateVoucher: (id: string, data: Partial<Voucher>) => void
  deleteVoucher: (id: string) => void
  validateVoucher: (code: string, orderAmount: number) => { valid: boolean; discount: number; message?: string }

  // Promotions
  promotions: Promotion[]
  addPromotion: (promotion: Omit<Promotion, "_id">) => void
  updatePromotion: (id: string, data: Partial<Promotion>) => void
  deletePromotion: (id: string) => void

  // Denial Reasons
  denialReasons: DenialReason[]
  addDenialReason: (reason: string) => void
  initializePresetReasons: () => void

  // Chat Messages
  chatMessages: ChatMessage[]
  sendMessage: (
    orderId: string,
    senderId: string,
    senderName: string,
    senderRole: "owner" | "customer",
    message: string,
  ) => void
  getOrderMessages: (orderId: string) => ChatMessage[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  
  // Get current user from Convex
  const currentUserDoc = useQuery(api.users.getCurrentUser)
  
  // Transform Convex user data to our User interface
  const currentUser: User | null = currentUserDoc ? {
    _id: currentUserDoc._id,
    clerkId: currentUserDoc.clerkId,
    email: currentUserDoc.email,
    firstName: currentUserDoc.firstName,
    lastName: currentUserDoc.lastName,
    role: currentUserDoc.role,
    phone: currentUserDoc.phone,
    address: currentUserDoc.address,
    coordinates: currentUserDoc.coordinates,
    gcashNumber: currentUserDoc.gcashNumber,
    profileComplete: currentUserDoc.profileComplete,
    createdAt: currentUserDoc.createdAt,
    updatedAt: currentUserDoc.updatedAt,
  } : null

  // Queries
  const restaurantDoc = useQuery(api.restaurant.get) ?? null
  const deliveryFeesDocs = useQuery(api.delivery_fees.list) ?? []
  const categoriesDocs = useQuery(api.menu.getCategories) ?? []
  const menuDocs = useQuery(api.menu.getMenuItems, {}) ?? []
  // Orders are role-filtered server-side. This returns either all orders (owner) or only the current customer's orders.
  // Avoid querying when unauthenticated or before the Convex user doc exists on first login.
  // currentUserDoc === undefined => loading; null => not found yet
  const hasConvexUser = currentUserDoc !== undefined && currentUserDoc !== null
  const shouldFetchOrders = !!clerkUser && !!isLoaded && hasConvexUser
  const ordersDocs = useQuery(api.orders.list, shouldFetchOrders ? {} : undefined) ?? []
  const vouchersDocs = useQuery(api.vouchers.list) ?? []
  const promotionsDocs = useQuery(api.promotions.list) ?? []
  const denialReasonsDocs = useQuery(api.denial_reasons.list) ?? []

  // Debug logging for data context
  console.log("Data Context - Categories:", categoriesDocs)
  console.log("Data Context - Menu Items:", menuDocs)
  console.log("Data Context - Promotions:", promotionsDocs)

  // Mutations
  const upsertRestaurant = useMutation(api.restaurant.upsert)
  const upsertDeliveryFee = useMutation(api.delivery_fees.upsert)
  const bulkUpsertDeliveryFees = useMutation(api.delivery_fees.bulkUpsert)
  const removeDeliveryFeeMut = useMutation(api.delivery_fees.remove)
  const createMenuItem = useMutation(api.menu.addMenuItem)
  const patchMenuItem = useMutation(api.menu.updateMenuItem)
  const removeMenuItem = useMutation(api.menu.deleteMenuItem)

  // Variant mutations (merged from stashed changes)
  const addVariantMut = useMutation(api.menu.addVariant)
  const updateVariantMut = useMutation(api.menu.updateVariant)
  const deleteVariantMut = useMutation(api.menu.deleteVariant)
  const setVariantAttributeMut = useMutation(api.menu.setVariantAttribute)

  const createOrder = useMutation(api.orders.create)
  const patchOrder = useMutation(api.orders.update)
  const addVoucherMut = useMutation(api.vouchers.add)
  const updateVoucherMut = useMutation(api.vouchers.update)
  const deleteVoucherMut = useMutation(api.vouchers.remove)
  const addPromotionMut = useMutation(api.promotions.add)
  const updatePromotionMut = useMutation(api.promotions.update)
  const deletePromotionMut = useMutation(api.promotions.remove)
  const addDenialReasonMut = useMutation(api.denial_reasons.add)
  const initializePresetReasonsMut = useMutation(api.denial_reasons.initializePresetReasons)
  const sendChatMut = useMutation(api.chat.send)

  // Mapped values
  const restaurant: Restaurant = restaurantDoc
    ? ({
        _id: (restaurantDoc as any)._id as string,
        name: restaurantDoc.name,
        description: restaurantDoc.description,
        address: restaurantDoc.address,
        phone: restaurantDoc.phone,
        email: restaurantDoc.email,
        logo: restaurantDoc.logo,
        status: restaurantDoc.status,
        openingTime: restaurantDoc.openingTime,
        closingTime: restaurantDoc.closingTime,
        averagePrepTime: restaurantDoc.averagePrepTime,
        averageDeliveryTime: restaurantDoc.averageDeliveryTime,
        platformFee: restaurantDoc.platformFee,
        coordinates: restaurantDoc.coordinates,
      } as Restaurant)
    : ({
        _id: "",
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        status: "open",
        averagePrepTime: 0,
        averageDeliveryTime: 0,
      } as Restaurant)

  const deliveryFees: DeliveryFee[] = deliveryFeesDocs.map((df) => ({
    _id: df._id as string,
    barangay: df.barangay,
    fee: df.fee,
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
  }))

  const categories: Category[] = categoriesDocs.map((c) => ({ _id: c._id as string, name: c.name, icon: c.icon, order: c.order }))
  const menuItems: MenuItem[] = menuDocs.map((m) => ({ _id: m._id as string, name: m.name, description: m.description, price: m.price, category: m.category, image: m.image, available: m.available }))
  const orders: Order[] = ordersDocs.map((o) => ({
    _id: o._id as string,
    _creationTime: o._creationTime as number,
    customerId: o.customerId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    gcashNumber: o.gcashNumber,
    items: o.items,
    subtotal: o.subtotal,
    platformFee: o.platformFee,
    discount: o.discount,
    total: o.total,
    orderType: o.orderType,
    preOrderFulfillment: o.preOrderFulfillment,
    preOrderScheduledAt: o.preOrderScheduledAt,
    paymentPlan: o.paymentPlan,
    downpaymentAmount: o.downpaymentAmount,
    downpaymentProofUrl: o.downpaymentProofUrl,
    remainingPaymentMethod: o.remainingPaymentMethod,
    remainingPaymentProofUrl: o.remainingPaymentProofUrl,
    status: o.status,
    paymentScreenshot: o.paymentScreenshot,
    voucherCode: o.voucherCode,
    denialReason: o.denialReason,
    specialInstructions: o.specialInstructions,
    estimatedPrepTime: o.estimatedPrepTime,
    estimatedDeliveryTime: o.estimatedDeliveryTime,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }))
  const vouchers: Voucher[] = vouchersDocs as Voucher[]
  const promotions: Promotion[] = promotionsDocs as Promotion[]
  const denialReasons: DenialReason[] = denialReasonsDocs as DenialReason[]

  // Methods
  const updateRestaurant = useCallback((data: Partial<Restaurant>) => {
    const body = {
      name: data.name ?? restaurant.name,
      description: data.description ?? restaurant.description,
      address: data.address ?? restaurant.address,
      phone: data.phone ?? restaurant.phone,
      email: data.email ?? restaurant.email,
      logo: data.logo ?? restaurant.logo,
      status: (data.status ?? restaurant.status) as RestaurantStatus,
      openingTime: data.openingTime ?? restaurant.openingTime,
      closingTime: data.closingTime ?? restaurant.closingTime,
      averagePrepTime: data.averagePrepTime ?? restaurant.averagePrepTime,
      averageDeliveryTime: data.averageDeliveryTime ?? restaurant.averageDeliveryTime,
    }
    void upsertRestaurant(body)
  }, [restaurant, upsertRestaurant])

  const updateDeliveryFee = useCallback((barangay: string, fee: number) => {
    void upsertDeliveryFee({ barangay, fee })
  }, [upsertDeliveryFee])

  const bulkUpdateDeliveryFees = useCallback((fees: { barangay: string; fee: number }[]) => {
    void bulkUpsertDeliveryFees({ fees })
  }, [bulkUpsertDeliveryFees])

  const removeDeliveryFee = useCallback((barangay: string) => {
    void removeDeliveryFeeMut({ barangay })
  }, [removeDeliveryFeeMut])

  const addMenuItem = useCallback((item: Omit<MenuItem, "_id">) => {
    void createMenuItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image,
      available: item.available,
    })
  }, [createMenuItem])

  const updateMenuItem = useCallback((id: string, data: Partial<MenuItem>) => {
    void patchMenuItem({ id: id as Id<"menu_items">, data: {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image: data.image,
      available: data.available,
    }})
  }, [patchMenuItem])

  const deleteMenuItem = useCallback((id: string) => {
    void removeMenuItem({ id: id as Id<"menu_items"> })
  }, [removeMenuItem])

  // Variant methods
  const getVariantsByMenuItem = useCallback((menuItemId: string) => {
    // This will be implemented as a lazy query when needed
    return [] as MenuItemVariant[]
  }, [])

  const addVariant = useCallback((variant: Omit<MenuItemVariant, "_id" | "createdAt" | "updatedAt">) => {
    void addVariantMut({
      menuItemId: variant.menuItemId as any,
      name: variant.name,
      price: variant.price,
      available: variant.available,
      sku: variant.sku,
    })
  }, [addVariantMut])

  const updateVariant = useCallback((id: string, data: Partial<MenuItemVariant>) => {
    void updateVariantMut({ 
      id: id as any, 
      data: {
        name: data.name,
        price: data.price,
        available: data.available,
        sku: data.sku,
      }
    })
  }, [updateVariantMut])

  const deleteVariant = useCallback((id: string) => {
    void deleteVariantMut({ id: id as any })
  }, [deleteVariantMut])

  const setVariantAttribute = useCallback((variantId: string, attributeId: string, value: string) => {
    void setVariantAttributeMut({
      variantId: variantId as any,
      attributeId: attributeId as any,
      value,
    })
  }, [setVariantAttributeMut])

  const addOrder = useCallback((order: Omit<Order, "_id" | "createdAt" | "updatedAt">) => {
    void createOrder({
      // Backend will override customerId based on the authenticated user; we still pass for type compatibility
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      gcashNumber: order.gcashNumber,
      items: order.items,
      subtotal: order.subtotal,
      platformFee: order.platformFee,
      discount: order.discount,
      total: order.total,
      orderType: order.orderType,
      preOrderFulfillment: order.preOrderFulfillment,
      preOrderScheduledAt: order.preOrderScheduledAt,
      paymentPlan: order.paymentPlan,
      downpaymentAmount: order.downpaymentAmount,
      downpaymentProofUrl: order.downpaymentProofUrl,
      remainingPaymentMethod: order.remainingPaymentMethod,
      remainingPaymentProofUrl: order.remainingPaymentProofUrl,
      status: order.status,
      paymentScreenshot: order.paymentScreenshot,
      voucherCode: order.voucherCode,
      specialInstructions: order.specialInstructions,
    })
  }, [createOrder])

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    void patchOrder({ id: id as Id<"orders">, data: {
      status: data.status,
      denialReason: data.denialReason,
      estimatedPrepTime: data.estimatedPrepTime,
      estimatedDeliveryTime: data.estimatedDeliveryTime,
      preOrderFulfillment: data.preOrderFulfillment,
      preOrderScheduledAt: data.preOrderScheduledAt,
      paymentPlan: data.paymentPlan,
      downpaymentAmount: data.downpaymentAmount,
      downpaymentProofUrl: data.downpaymentProofUrl,
      remainingPaymentMethod: data.remainingPaymentMethod,
      remainingPaymentProofUrl: data.remainingPaymentProofUrl,
    } })
  }, [patchOrder])

  const getOrderById = useCallback((id: string) => {
    return orders.find((o) => o._id === id)
  }, [orders])

  const getCustomerPendingOrder = useCallback((customerId: string) => {
    // Since orders are already filtered by role on the server, customers' lists only include their orders.
    // We still filter by customerId for safety when called by UI using explicit id.
    return orders.find((o) => o.customerId === customerId && o.status === "pending" && o.orderType !== "pre-order")
  }, [orders])

  const getCustomerActiveOrder = useCallback((customerId: string) => {
    // Get the most recent active order (not completed, cancelled, or delivered)
    const activeStatuses = ["pending", "accepted", "ready", "in-transit", "denied"]
    return orders
      .filter((o) => o.customerId === customerId && activeStatuses.includes(o.status))
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))[0]
  }, [orders])

  const addVoucher = useCallback((voucher: Omit<Voucher, "_id">) => {
    void addVoucherMut({
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrderAmount: voucher.minOrderAmount,
      maxDiscount: voucher.maxDiscount,
      expiresAt: voucher.expiresAt,
      usageLimit: voucher.usageLimit,
      usageCount: voucher.usageCount,
      active: voucher.active,
    })
  }, [addVoucherMut])

  const updateVoucher = useCallback((id: string, data: Partial<Voucher>) => {
    void updateVoucherMut({ id: id as Id<"vouchers">, data })
  }, [updateVoucherMut])

  const deleteVoucher = useCallback((id: string) => {
    void deleteVoucherMut({ id: id as Id<"vouchers"> })
  }, [deleteVoucherMut])

  const validateVoucher = useCallback((code: string, orderAmount: number) => {
    const voucher = vouchers.find((v) => v.code === code && v.active)
    if (!voucher) return { valid: false, discount: 0, message: "Invalid voucher code" }
    if (voucher.expiresAt < Date.now()) return { valid: false, discount: 0, message: "Voucher has expired" }
    if (voucher.usageCount >= voucher.usageLimit) return { valid: false, discount: 0, message: "Voucher usage limit reached" }
    if (orderAmount < voucher.minOrderAmount) return { valid: false, discount: 0, message: `Minimum order amount is ₱${voucher.minOrderAmount}` }
    let discount = voucher.type === "fixed" ? voucher.value : Math.min((orderAmount * voucher.value) / 100, voucher.maxDiscount ?? Number.POSITIVE_INFINITY)
    return { valid: true, discount }
  }, [vouchers])

  const addPromotion = useCallback((promotion: Omit<Promotion, "_id">) => {
    void addPromotionMut(promotion)
  }, [addPromotionMut])

  const updatePromotion = useCallback((id: string, data: Partial<Promotion>) => {
    void updatePromotionMut({ id: id as Id<"promotions">, data })
  }, [updatePromotionMut])

  const deletePromotion = useCallback((id: string) => {
    void deletePromotionMut({ id: id as Id<"promotions"> })
  }, [deletePromotionMut])

  const addDenialReason = useCallback((reason: string) => {
    void addDenialReasonMut({ reason, isPreset: false })
  }, [addDenialReasonMut])

  const initializePresetReasons = useCallback(() => {
    void initializePresetReasonsMut({})
  }, [initializePresetReasonsMut])

  // Initialize preset denial reasons when component mounts
  useEffect(() => {
    if (denialReasons.length === 0) {
      initializePresetReasons()
    }
  }, [denialReasons.length, initializePresetReasons])

  const chatMessages: ChatMessage[] = []
  const sendMessage = useCallback((orderId: string, senderId: string, senderName: string, senderRole: "owner" | "customer", message: string) => {
    void sendChatMut({ orderId, senderId, senderName, senderRole, message })
  }, [sendChatMut])

  const getOrderMessages = useCallback((orderId: string) => {
    // For UI, components should query directly with useQuery(api.chat.listByOrder, { orderId })
    return [] as ChatMessage[]
  }, [])

  const value: DataContextType = {
    currentUser,
    restaurant,
    updateRestaurant,
    deliveryFees,
    updateDeliveryFee,
    bulkUpdateDeliveryFees,
    removeDeliveryFee,
    categories,
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getVariantsByMenuItem,
    addVariant,
    updateVariant,
    deleteVariant,
    setVariantAttribute,
    orders,
    addOrder,
    updateOrder,
    getOrderById,
    getCustomerPendingOrder,
    getCustomerActiveOrder,
    vouchers,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    validateVoucher,
    promotions,
    addPromotion,
    updatePromotion,
    deletePromotion,
    denialReasons,
    addDenialReason,
    initializePresetReasons,
    chatMessages,
    sendMessage,
    getOrderMessages,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
