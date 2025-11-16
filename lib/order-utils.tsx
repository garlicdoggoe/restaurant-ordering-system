/**
 * Order utility functions and constants
 * Shared utilities for order-related operations across components
 */

import { Clock, CheckCircle, XCircle, Truck, Package, CircleCheck, Ban } from "lucide-react"
import type { Order, DeliveryFee, OrderStatus } from "@/lib/data-context"
import React from "react"

/**
 * Final order states that cannot be edited
 */
export const FINAL_ORDER_STATES: OrderStatus[] = ["cancelled", "completed", "delivered"]

/**
 * Check if an order status can be edited
 * Orders in final states (cancelled, completed, delivered) cannot have their status changed
 */
export function canEditOrderStatus(status: OrderStatus | undefined | null): boolean {
  if (!status) return false
  return !FINAL_ORDER_STATES.includes(status)
}

/**
 * Check if an order is a delivery order
 */
export function isDeliveryOrder(order: Order | null | undefined): boolean {
  if (!order) return false
  return order.orderType === "delivery" || 
         (order.orderType === "pre-order" && order.preOrderFulfillment === "delivery")
}

/**
 * Get order type prefix for display
 */
export function getOrderTypePrefix(orderType: Order["orderType"]): string {
  return orderType === "pre-order" ? "Pre-order" : "Order"
}

/**
 * Get delivery fee from address by matching barangay names
 * Tries to match barangay names from deliveryFees array against the address string
 */
export function getDeliveryFeeFromAddress(address: string | undefined, deliveryFees: DeliveryFee[]): number {
  if (!address) return 0
  
  const addressLower = address.toLowerCase()
  
  // Try to find matching barangay in address
  for (const df of deliveryFees) {
    const barangayLower = df.barangay.toLowerCase()
    // Check if barangay name appears in address (handles "Puro-Batia" vs "Puro Batia" variations)
    if (addressLower.includes(barangayLower) || 
        addressLower.includes(barangayLower.replace(/-/g, " ")) || 
        addressLower.includes(barangayLower.replace(/ /g, "-"))) {
      return df.fee
    }
  }
  
  return 0
}

/**
 * Calculate full order total (subtotal + platformFee + deliveryFee - discount)
 */
export function calculateFullOrderTotal(
  subtotal: number,
  platformFee: number | undefined,
  deliveryFee: number,
  discount: number | undefined
): number {
  return subtotal + (platformFee || 0) + deliveryFee - (discount || 0)
}

/**
 * Status icons configuration - all yellow (for order cards)
 * Returns the appropriate icon for a given order status
 */
export function getStatusIcon(status: OrderStatus): React.ReactNode {
  switch (status) {
    case "accepted":
      return <CheckCircle className="w-4 h-4 text-yellow-600" />
    case "pending":
    case "pre-order-pending":
      return <Clock className="w-4 h-4 text-yellow-600" />
    case "ready":
      return <CheckCircle className="w-4 h-4 text-yellow-600" />
    case "denied":
      return <XCircle className="w-4 h-4 text-yellow-600" />
    case "completed":
      return <CircleCheck className="w-4 h-4 text-yellow-600" />
    case "cancelled":
      return <Ban className="w-4 h-4 text-yellow-600" />
    case "in-transit":
      return <Truck className="w-4 h-4 text-yellow-600" />
    case "delivered":
      return <Package className="w-4 h-4 text-yellow-600" />
    default:
      return <Clock className="w-4 h-4 text-yellow-600" />
  }
}

/**
 * Status colors configuration - all yellow text (for order cards)
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  accepted: "text-yellow-600",
  pending: "text-yellow-600",
  "pre-order-pending": "text-yellow-600",
  ready: "text-yellow-600",
  denied: "text-yellow-600",
  completed: "text-yellow-600",
  cancelled: "text-yellow-600",
  "in-transit": "text-yellow-600",
  delivered: "text-yellow-600",
}

/**
 * Human-readable status labels
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "pending": "Pending",
  "pre-order-pending": "Awaiting Restaurant Confirmation",
  "accepted": "Preparing",
  "ready": "Ready",
  "denied": "Denied",
  "completed": "Completed",
  "cancelled": "Cancelled",
  "in-transit": "In Transit",
  "delivered": "Delivered",
}

/**
 * Format status for display (capitalizes and replaces hyphens with spaces)
 */
export function formatStatusForDisplay(status: OrderStatus | string): string {
  return status.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] || formatStatusForDisplay(status)
}

/**
 * Status icons configuration for tracking view - with appropriate colors (different from card view)
 * Returns the appropriate icon with color for a given order status in tracking/status views
 */
export function getStatusIconsForTracking(status: OrderStatus): React.ReactNode {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case "accepted":
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case "ready":
      return <CheckCircle className="w-4 h-4 text-indigo-600" />
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-600" />
    case "pre-order-pending":
      return <Clock className="w-4 h-4 text-yellow-600" />
    case "denied":
      return <XCircle className="w-4 h-4 text-red-600" />
    case "cancelled":
      return <Ban className="w-4 h-4 text-gray-600" />
    case "in-transit":
      return <Truck className="w-4 h-4 text-yellow-600" />
    case "delivered":
      return <Package className="w-4 h-4 text-emerald-600" />
    default:
      return <Clock className="w-4 h-4 text-yellow-600" />
  }
}

/**
 * Status colors configuration for tracking view - with appropriate background and text colors
 * Returns badge color classes for status badges in tracking/status views
 */
export const ORDER_STATUS_COLORS_FOR_TRACKING: Record<OrderStatus, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "pre-order-pending": "bg-yellow-100 text-yellow-800 border-yellow-200",
  denied: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  "in-transit": "bg-yellow-100 text-yellow-800 border-yellow-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

/**
 * Human-readable status descriptions for tracking view
 * Returns user-friendly descriptions of what each status means
 */
export function getStatusDescriptions(): Record<OrderStatus, string> {
  return {
    pending: "Waiting for restaurant confirmation",
    "pre-order-pending": "Waiting for restaurant confirmation",
    accepted: "Order confirmed - being prepared",
    ready: "Order is ready for pickup",
    "in-transit": "Order is on the way",
    denied: "Order was denied by restaurant",
    completed: "Order completed",
    cancelled: "Waiting for the restaurant to refund payment",
    delivered: "Order delivered",
  }
}

/**
 * Get status description for a specific status
 */
export function getStatusDescription(status: OrderStatus): string {
  return getStatusDescriptions()[status] || "Unknown status"
}

/**
 * Get border class for order card based on status
 * Returns Tailwind CSS classes for border styling based on order status
 */
export function getOrderBorderClass(status: OrderStatus | string): string {
  switch (status) {
    case "pending":
    case "pre-order-pending":
      return "border-yellow-500 border-2"
    case "ready":
      return "border-indigo-500 border-2"
    case "completed":
    case "accepted":
      return "border-green-500 border-2"
    case "denied":
      return "border-red-500 border-2"
    case "cancelled":
      return "border-gray-500 border-2"
    case "in-transit":
      return "border-yellow-500 border-2"
    case "delivered":
      return "border-emerald-500 border-2"
    default:
      return "border-2"
  }
}

