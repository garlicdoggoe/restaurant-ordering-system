"use client"

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
// Use api directly instead of casting to any

// Types
export type OrderStatus = "pending" | "accepted" | "ready" | "denied" | "completed" | "cancelled" | "in-transit" | "delivered" | "pre-order-pending"
export type OrderType = "dine-in" | "takeaway" | "delivery" | "pre-order"
export type PreOrderFulfillment = "pickup" | "delivery"
export type PaymentPlan = "full" | "downpayment"
export type RemainingPaymentMethod = "online" | "cash"
export type RestaurantStatus = "open" | "closed" | "busy"
export type VoucherType = "percentage" | "fixed"
export type DiscountType = "percentage" | "fixed"

export interface PreorderScheduleDate {
  date: string // YYYY-MM-DD
  startTime: string // HH:MM 24h
  endTime: string // HH:MM 24h
}

export interface PreorderSchedule {
  restrictionsEnabled: boolean
  dates: PreorderScheduleDate[]
}

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
  onboardingCompleted?: boolean // Whether customer has completed the onboarding tour
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
  platformFeeEnabled?: boolean // Whether platform fee is enabled
  feePerKilometer?: number // Delivery fee per kilometer (default 15)
  preorderSchedule?: PreorderSchedule
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
  isBundle?: boolean // Whether this item is a bundle
  bundleItems?: Array<{ menuItemId: string; order: number }> // Items that make up the bundle
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

export interface MenuItemChoiceGroup {
  _id: string
  menuItemId: string
  name: string
  order: number
  required: boolean
  choices: MenuItemChoice[] // Choices are now stored directly in the group
  createdAt: number
  updatedAt: number
}

export interface MenuItemChoice {
  name: string
  price: number
  available: boolean
  order: number
  menuItemId?: string // For bundle choices: reference to menu item
  variantId?: string // For bundle choices: default variant
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
  size?: string
  attributes?: Record<string, string>
  unitPrice?: number
  // Selected choices from choice groups - stores choice data directly (maps choiceGroupId -> { name: string, price: number })
  selectedChoices?: Record<string, { name: string; price: number }>
  // Bundle items - for bundle menu items, stores the actual items included (selected from choice groups + fixed items)
  bundleItems?: Array<{ menuItemId: string; variantId?: string; name: string; price: number }>
}

export interface Order {
  _id: string
  _creationTime?: number // Convex built-in creation timestamp
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  customerCoordinates?: {
    lng: number
    lat: number
  } // Coordinates at time of order creation (isolated per order)
  gcashNumber?: string // GCash number used for payment
  items: OrderItem[]
  subtotal: number
  platformFee: number
  deliveryFee?: number // Delivery fee calculated based on distance
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
  // Whether customer is allowed to send image attachments in chat
  allowCustomerImages?: boolean
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
  startDate?: number
  endDate?: number
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

export interface OrderModification {
  _id: string
  orderId: string
  modifiedBy: string
  modifiedByName: string
  modificationType: "item_added" | "item_removed" | "item_quantity_changed" | "item_price_changed" | "order_edited" | "status_changed"
  previousValue: string
  newValue: string
  itemDetails?: string
  timestamp: number
}

// Context
interface DataContextType {
  // User
  currentUser: User | null

  // Restaurant
  restaurant: Restaurant
  updateRestaurant: (data: Partial<Restaurant>) => void


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
  ordersByStatus: {
    pending: Order[]
    accepted: Order[]
    ready: Order[]
    completed: Order[]
    denied: Order[]
    cancelled: Order[]
    "in-transit": Order[]
    delivered: Order[]
    "pre-order-pending": Order[]
  }
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

  // Order Modifications
  orderModifications: OrderModification[]
  getOrderModifications: (orderId: string) => OrderModification[]
  updateOrderItems: (orderId: string, items: OrderItem[], modificationType: string, itemDetails: string) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  
  // Get current user from Convex
  const currentUserDoc = useQuery(api.users.getCurrentUser)
  
  // NEW: Separate role query (caches independently from order queries)
  const userRoleDoc = useQuery(api.orders.getCurrentUserRole)
  
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
    // Surface Convex onboarding flag so UI can auto-start the tour exactly once after signup.
    onboardingCompleted: currentUserDoc.onboardingCompleted,
    createdAt: currentUserDoc.createdAt,
    updatedAt: currentUserDoc.updatedAt,
  } : null

  // Queries
  const restaurantDoc = useQuery(api.restaurant.get) ?? null
  const categoriesDocs = useQuery(api.menu.getCategories) ?? []
  const menuDocs = useQuery(api.menu.getMenuItems, {}) ?? []
  // Orders are role-filtered server-side. This returns either all orders (owner) or only the current customer's orders.
  // Avoid querying when unauthenticated or before the Convex user doc exists on first login.
  // currentUserDoc === undefined => loading; null => not found yet
  const hasConvexUser = currentUserDoc !== undefined && currentUserDoc !== null
  const shouldFetchOrders = !!clerkUser && !!isLoaded && hasConvexUser
  
  // NEW: Pass role and userId to avoid internal user lookup - eliminates user dependency
  const ordersDocs = useQuery(
    api.orders.list, 
    shouldFetchOrders && userRoleDoc && userRoleDoc.role && userRoleDoc.userId
      ? { userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  // NEW: Status-specific queries for owners to prevent full cache invalidation during status changes
  const pendingOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "pending", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const acceptedOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "accepted", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const readyOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "ready", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const completedOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "completed", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const deniedOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "denied", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const cancelledOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "cancelled", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const inTransitOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "in-transit", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const deliveredOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "delivered", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  
  const preOrderPendingOrders = useQuery(
    api.orders.listByStatus,
    shouldFetchOrders && userRoleDoc && userRoleDoc.role === "owner" && userRoleDoc.userId
      ? { status: "pre-order-pending", userRole: userRoleDoc.role, userId: userRoleDoc.userId }
      : "skip"
  ) ?? []
  const vouchersDocs = useQuery(api.vouchers.list) ?? []
  const promotionsDocs = useQuery(api.promotions.list) ?? []
  const denialReasonsDocs = useQuery(api.denial_reasons.list) ?? []
  // Order modifications - backend handles authorization by returning empty array for non-owners
  const orderModificationsDocs = useQuery(api.order_modifications.listAll) ?? []

  // NOTE: Intentionally avoid console logging large datasets here to keep the production console noise-free.

  // Mutations
  const upsertRestaurant = useMutation(api.restaurant.upsert)
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
  const updateOrderItemsMut = useMutation(api.orders.updateOrderItems)
  const addVoucherMut = useMutation(api.vouchers.add)
  const updateVoucherMut = useMutation(api.vouchers.update)
  const deleteVoucherMut = useMutation(api.vouchers.remove)
  const addPromotionMut = useMutation(api.promotions.add)
  const updatePromotionMut = useMutation(api.promotions.update)
  const deletePromotionMut = useMutation(api.promotions.remove)
  const addDenialReasonMut = useMutation(api.denial_reasons.add)
  const initializePresetReasonsMut = useMutation(api.denial_reasons.initializePresetReasons)
  const sendChatMut = useMutation(api.chat.send)

  // Mapped values - memoized to prevent dependency changes
  const normalizePreorderSchedule = (schedule?: { restrictionsEnabled: boolean; dates: { date: string; startTime: string; endTime?: string }[] }): PreorderSchedule => {
    if (!schedule) {
      return {
        restrictionsEnabled: false,
        dates: [],
      }
    }
    return {
      restrictionsEnabled: schedule.restrictionsEnabled,
      dates: schedule.dates.map((entry) => ({
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime ?? entry.startTime,
      })),
    }
  }

  const restaurant: Restaurant = useMemo(() => restaurantDoc
    ? ({
        _id: restaurantDoc._id as string,
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
        platformFeeEnabled: restaurantDoc.platformFeeEnabled,
        preorderSchedule: normalizePreorderSchedule(restaurantDoc.preorderSchedule),
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
        preorderSchedule: normalizePreorderSchedule(undefined),
      } as Restaurant), [restaurantDoc])

  const categories: Category[] = categoriesDocs.map((c) => ({ _id: c._id as string, name: c.name, icon: c.icon, order: c.order }))
  const menuItems: MenuItem[] = menuDocs.map((m) => ({ 
    _id: m._id as string, 
    name: m.name, 
    description: m.description, 
    price: m.price, 
    category: m.category, 
    image: m.image, 
    available: m.available,
    isBundle: (m as { isBundle?: boolean }).isBundle,
    bundleItems: (m as { bundleItems?: Array<{ menuItemId: string; order: number }> }).bundleItems,
  }))
  const orders: Order[] = ordersDocs.map((o) => ({
    _id: o._id as string,
    _creationTime: o._creationTime as number,
    customerId: o.customerId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    customerCoordinates: o.customerCoordinates,
    gcashNumber: o.gcashNumber,
    items: o.items,
    subtotal: o.subtotal,
    platformFee: o.platformFee,
    deliveryFee: o.deliveryFee,
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
    allowCustomerImages: (o as { allowCustomerImages?: boolean }).allowCustomerImages ?? false,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }))
  
  // NEW: Status-specific order arrays for owners - prevents full cache invalidation during status changes
  const transformOrderArray = (orderDocs: unknown[]) => orderDocs.map((o: unknown) => {
    const order = o as {
      _id: unknown
      _creationTime?: number
      customerId: string
      customerName: string
      customerPhone: string
      customerAddress?: string
      customerCoordinates?: { lng: number; lat: number }
      gcashNumber?: string
      items: OrderItem[]
      subtotal: number
      platformFee: number
      deliveryFee?: number
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
      specialInstructions?: string
      estimatedPrepTime?: number
      estimatedDeliveryTime?: number
      allowCustomerImages?: boolean
      createdAt: number
      updatedAt: number
    }
    return {
    _id: order._id as string,
    _creationTime: order._creationTime as number,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    customerCoordinates: order.customerCoordinates,
    gcashNumber: order.gcashNumber,
    items: order.items,
    subtotal: order.subtotal,
    platformFee: order.platformFee,
    deliveryFee: order.deliveryFee,
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
    denialReason: order.denialReason,
    specialInstructions: order.specialInstructions,
    estimatedPrepTime: order.estimatedPrepTime,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    allowCustomerImages: order.allowCustomerImages ?? false,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
  })
  
  const ordersByStatus = {
    pending: transformOrderArray(pendingOrders),
    accepted: transformOrderArray(acceptedOrders),
    ready: transformOrderArray(readyOrders),
    completed: transformOrderArray(completedOrders),
    denied: transformOrderArray(deniedOrders),
    cancelled: transformOrderArray(cancelledOrders),
    "in-transit": transformOrderArray(inTransitOrders),
    delivered: transformOrderArray(deliveredOrders),
    "pre-order-pending": transformOrderArray(preOrderPendingOrders),
  }
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
      platformFee: data.platformFee !== undefined ? data.platformFee : restaurant.platformFee,
      platformFeeEnabled: data.platformFeeEnabled !== undefined ? data.platformFeeEnabled : restaurant.platformFeeEnabled,
      preorderSchedule: normalizePreorderSchedule(data.preorderSchedule ?? restaurant.preorderSchedule),
    }
    void upsertRestaurant(body)
  }, [restaurant, upsertRestaurant])

  const addMenuItem = useCallback((item: Omit<MenuItem, "_id">) => {
    void createMenuItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image,
      available: item.available,
      isBundle: item.isBundle,
      // Transform bundleItems to convert menuItemId from string to Id<"menu_items">
      bundleItems: item.bundleItems?.map(bundleItem => ({
        menuItemId: bundleItem.menuItemId as Id<"menu_items">,
        order: bundleItem.order,
      })),
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
      isBundle: data.isBundle,
      // Transform bundleItems to convert menuItemId from string to Id<"menu_items">
      bundleItems: data.bundleItems?.map(bundleItem => ({
        menuItemId: bundleItem.menuItemId as Id<"menu_items">,
        order: bundleItem.order,
      })),
    }})
  }, [patchMenuItem])

  const deleteMenuItem = useCallback((id: string) => {
    void removeMenuItem({ id: id as Id<"menu_items"> })
  }, [removeMenuItem])

  // Variant methods
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getVariantsByMenuItem = useCallback((_menuItemId: string) => {
    // This will be implemented as a lazy query when needed
    return [] as MenuItemVariant[]
  }, [])

  const addVariant = useCallback((variant: Omit<MenuItemVariant, "_id" | "createdAt" | "updatedAt">) => {
    void addVariantMut({
      menuItemId: variant.menuItemId as Id<"menu_items">,
      name: variant.name,
      price: variant.price,
      available: variant.available,
      sku: variant.sku,
    })
  }, [addVariantMut])

  const updateVariant = useCallback((id: string, data: Partial<MenuItemVariant>) => {
    void updateVariantMut({ 
      id: id as Id<"menu_item_variants">, 
      data: {
        name: data.name,
        price: data.price,
        available: data.available,
        sku: data.sku,
      }
    })
  }, [updateVariantMut])

  const deleteVariant = useCallback((id: string) => {
    void deleteVariantMut({ id: id as Id<"menu_item_variants"> })
  }, [deleteVariantMut])

  const setVariantAttribute = useCallback((variantId: string, attributeId: string, value: string) => {
    void setVariantAttributeMut({
      variantId: variantId as Id<"menu_item_variants">,
      attributeId: attributeId as Id<"attributes">,
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
      customerCoordinates: order.customerCoordinates
        ? {
            lng: order.customerCoordinates.lng,
            lat: order.customerCoordinates.lat,
          }
        : undefined,
      gcashNumber: order.gcashNumber,
      items: order.items,
      subtotal: order.subtotal,
      platformFee: order.platformFee,
      deliveryFee: order.deliveryFee,
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
      allowCustomerImages: data.allowCustomerImages,
    } })
  }, [patchOrder])

  const getOrderById = useCallback((id: string) => {
    return orders.find((o) => o._id === id)
  }, [orders])

  const getCustomerPendingOrder = useCallback((customerId: string) => {
    // Since orders are already filtered by role on the server, customers' lists only include their orders.
    // We still filter by customerId for safety when called by UI using explicit id.
    // Only return non-pre-order pending orders to block simultaneous regular orders
    // This allows customers to place regular orders even when they have active pre-orders
    return orders.find((o) => o.customerId === customerId && o.status === "pending" && o.orderType !== "pre-order")
  }, [orders])

  const getCustomerActiveOrder = useCallback((customerId: string) => {
    // Get the most recent active NON-PRE-ORDER (not completed, cancelled, or delivered)
    // Pre-orders should not block regular orders, so we exclude them
    // This allows customers to place regular orders even when they have active pre-orders
    const activeStatuses = ["pending", "accepted", "ready", "in-transit", "denied"]
    return orders
      .filter((o) => o.customerId === customerId && activeStatuses.includes(o.status) && o.orderType !== "pre-order")
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
    const discount = voucher.type === "fixed" ? voucher.value : Math.min((orderAmount * voucher.value) / 100, voucher.maxDiscount ?? Number.POSITIVE_INFINITY)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getOrderMessages = useCallback((_orderId: string) => {
    // For UI, components should query directly with useQuery(api.chat.listByOrder, { orderId })
    return [] as ChatMessage[]
  }, [])

  // Order modifications methods
  const orderModifications: OrderModification[] = orderModificationsDocs.map((doc: unknown) => {
    const mod = doc as {
      _id: unknown
      orderId: string
      modifiedBy: string
      modifiedByName: string
      modificationType: string
      fieldName: string
      previousValue: string
      newValue: string
      itemDetails?: string
      timestamp: number
    }
    return {
    _id: mod._id as string,
    orderId: mod.orderId,
    modifiedBy: mod.modifiedBy,
    modifiedByName: mod.modifiedByName,
    modificationType: mod.modificationType as OrderModification["modificationType"],
    previousValue: mod.previousValue,
    newValue: mod.newValue,
    itemDetails: mod.itemDetails,
    timestamp: mod.timestamp,
  }
  })

  const getOrderModifications = useCallback((orderId: string) => {
    return orderModifications.filter(mod => mod.orderId === orderId)
  }, [orderModifications])

  const updateOrderItems = useCallback(async (orderId: string, items: OrderItem[], modificationType: string, itemDetails: string) => {
    // Use the dedicated updateOrderItems mutation which handles audit logging and auto-chat
    await updateOrderItemsMut({ 
      orderId: orderId as Id<"orders">, 
      items, 
      modificationType, 
      itemDetails 
    })
  }, [updateOrderItemsMut])

  const value: DataContextType = {
    currentUser,
    restaurant,
    updateRestaurant,
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
    ordersByStatus,
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
    orderModifications,
    getOrderModifications,
    updateOrderItems,
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
