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

