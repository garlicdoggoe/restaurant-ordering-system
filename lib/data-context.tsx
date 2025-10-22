"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
const apiAny: any = api

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

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
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
  tax: number
  donation: number
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

  // Orders
  orders: Order[]
  addOrder: (order: Omit<Order, "_id" | "createdAt" | "updatedAt">) => void
  updateOrder: (id: string, data: Partial<Order>) => void
  getOrderById: (id: string) => Order | undefined
  getCustomerPendingOrder: (customerId: string) => Order | undefined

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
  const currentUserDoc = useQuery(apiAny.users?.getCurrentUser)
  
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
    gcashNumber: currentUserDoc.gcashNumber,
    profileComplete: currentUserDoc.profileComplete,
    createdAt: currentUserDoc.createdAt,
    updatedAt: currentUserDoc.updatedAt,
  } : null

  // Queries
  const restaurantDoc = useQuery(apiAny.restaurant?.get) ?? null
  const deliveryFeesDocs = useQuery(apiAny.delivery_fees?.list) ?? []
  const categoriesDocs = useQuery(apiAny.menu?.getCategories) ?? []
  const menuDocs = useQuery(apiAny.menu?.getMenuItems, {}) ?? []
  // Orders are role-filtered server-side. This returns either all orders (owner) or only the current customer's orders.
  // Avoid querying when unauthenticated or before the Convex user doc exists on first login.
  // currentUserDoc === undefined => loading; null => not found yet
  const hasConvexUser = currentUserDoc !== undefined && currentUserDoc !== null
  const shouldFetchOrders = !!clerkUser && !!isLoaded && hasConvexUser
  const ordersDocs = useQuery(apiAny.orders?.list, shouldFetchOrders ? {} : undefined) ?? []
  const vouchersDocs = useQuery(apiAny.vouchers?.list) ?? []
  const promotionsDocs = useQuery(apiAny.promotions?.list) ?? []
  const denialReasonsDocs = useQuery(apiAny.denial_reasons?.list) ?? []

  // Debug logging for data context
  console.log("Data Context - Categories:", categoriesDocs)
  console.log("Data Context - Menu Items:", menuDocs)
  console.log("Data Context - Promotions:", promotionsDocs)

  // Mutations
  const upsertRestaurant = useMutation(apiAny.restaurant?.upsert)
  const upsertDeliveryFee = useMutation(apiAny.delivery_fees?.upsert)
  const bulkUpsertDeliveryFees = useMutation(apiAny.delivery_fees?.bulkUpsert)
  const removeDeliveryFeeMut = useMutation(apiAny.delivery_fees?.remove)
  const createMenuItem = useMutation(apiAny.menu?.addMenuItem)
  const patchMenuItem = useMutation(apiAny.menu?.updateMenuItem)
  const removeMenuItem = useMutation(apiAny.menu?.deleteMenuItem)
  const createOrder = useMutation(apiAny.orders?.create)
  const patchOrder = useMutation(apiAny.orders?.update)
  const addVoucherMut = useMutation(apiAny.vouchers?.add)
  const updateVoucherMut = useMutation(apiAny.vouchers?.update)
  const deleteVoucherMut = useMutation(apiAny.vouchers?.remove)
  const addPromotionMut = useMutation(apiAny.promotions?.add)
  const updatePromotionMut = useMutation(apiAny.promotions?.update)
  const deletePromotionMut = useMutation(apiAny.promotions?.remove)
  const addDenialReasonMut = useMutation(apiAny.denial_reasons?.add)
  const initializePresetReasonsMut = useMutation(apiAny.denial_reasons?.initializePresetReasons)
  const sendChatMut = useMutation(apiAny.chat?.send)

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

  const deliveryFees: DeliveryFee[] = deliveryFeesDocs.map((df: any) => ({
    _id: df._id as string,
    barangay: df.barangay,
    fee: df.fee,
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
  }))

  const categories: Category[] = categoriesDocs.map((c: any) => ({ _id: c._id as string, name: c.name, icon: c.icon, order: c.order }))
  const menuItems: MenuItem[] = menuDocs.map((m: any) => ({ _id: m._id as string, name: m.name, description: m.description, price: m.price, category: m.category, image: m.image, available: m.available }))
  const orders: Order[] = ordersDocs.map((o: any) => ({
    _id: o._id as string,
    _creationTime: o._creationTime as number,
    customerId: o.customerId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    gcashNumber: o.gcashNumber,
    items: o.items,
    subtotal: o.subtotal,
    tax: o.tax,
    donation: o.donation,
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
  const vouchers: Voucher[] = vouchersDocs as any
  const promotions: Promotion[] = promotionsDocs as any
  const denialReasons: DenialReason[] = denialReasonsDocs as any

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
    void patchMenuItem({ id: id as any, data: {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image: data.image,
      available: data.available,
    }})
  }, [patchMenuItem])

  const deleteMenuItem = useCallback((id: string) => {
    void removeMenuItem({ id: id as any })
  }, [removeMenuItem])

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
      tax: order.tax,
      donation: order.donation,
      discount: order.discount,
      total: order.total,
      orderType: order.orderType,
      preOrderFulfillment: order.preOrderFulfillment as any,
      preOrderScheduledAt: order.preOrderScheduledAt,
      paymentPlan: order.paymentPlan as any,
      downpaymentAmount: order.downpaymentAmount,
      downpaymentProofUrl: order.downpaymentProofUrl,
      remainingPaymentMethod: order.remainingPaymentMethod as any,
      remainingPaymentProofUrl: order.remainingPaymentProofUrl,
      status: order.status,
      paymentScreenshot: order.paymentScreenshot,
      voucherCode: order.voucherCode,
      specialInstructions: order.specialInstructions,
    })
  }, [createOrder])

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    void patchOrder({ id: id as any, data: {
      status: data.status as any,
      denialReason: data.denialReason,
      estimatedPrepTime: data.estimatedPrepTime,
      estimatedDeliveryTime: data.estimatedDeliveryTime,
      preOrderFulfillment: data.preOrderFulfillment as any,
      preOrderScheduledAt: data.preOrderScheduledAt,
      paymentPlan: data.paymentPlan as any,
      downpaymentAmount: data.downpaymentAmount,
      downpaymentProofUrl: data.downpaymentProofUrl,
      remainingPaymentMethod: data.remainingPaymentMethod as any,
      remainingPaymentProofUrl: data.remainingPaymentProofUrl,
    } })
  }, [patchOrder])

  const getOrderById = useCallback((id: string) => {
    return (orders as any[]).find((o) => (o as any)._id === id)
  }, [orders])

  const getCustomerPendingOrder = useCallback((customerId: string) => {
    // Since orders are already filtered by role on the server, customers' lists only include their orders.
    // We still filter by customerId for safety when called by UI using explicit id.
    return (orders as any[]).find((o) => o.customerId === customerId && o.status === "pending" && o.orderType !== "pre-order")
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
    void updateVoucherMut({ id: id as any, data })
  }, [updateVoucherMut])

  const deleteVoucher = useCallback((id: string) => {
    void deleteVoucherMut({ id: id as any })
  }, [deleteVoucherMut])

  const validateVoucher = useCallback((code: string, orderAmount: number) => {
    const voucher = (vouchers as any[]).find((v) => v.code === code && v.active)
    if (!voucher) return { valid: false, discount: 0, message: "Invalid voucher code" }
    if (voucher.expiresAt < Date.now()) return { valid: false, discount: 0, message: "Voucher has expired" }
    if (voucher.usageCount >= voucher.usageLimit) return { valid: false, discount: 0, message: "Voucher usage limit reached" }
    if (orderAmount < voucher.minOrderAmount) return { valid: false, discount: 0, message: `Minimum order amount is ₱${voucher.minOrderAmount}` }
    let discount = voucher.type === "fixed" ? voucher.value : Math.min((orderAmount * voucher.value) / 100, voucher.maxDiscount ?? Number.POSITIVE_INFINITY)
    return { valid: true, discount }
  }, [vouchers])

  const addPromotion = useCallback((promotion: Omit<Promotion, "_id">) => {
    void addPromotionMut(promotion as any)
  }, [addPromotionMut])

  const updatePromotion = useCallback((id: string, data: Partial<Promotion>) => {
    void updatePromotionMut({ id: id as any, data })
  }, [updatePromotionMut])

  const deletePromotion = useCallback((id: string) => {
    void deletePromotionMut({ id: id as any })
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
    orders,
    addOrder,
    updateOrder,
    getOrderById,
    getCustomerPendingOrder,
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
