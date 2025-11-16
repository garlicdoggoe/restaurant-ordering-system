/**
 * Unified order filtering and sorting utilities
 * Provides consistent filtering and sorting logic across all order views
 * Standard: Always displays most recent entries first
 */

import type { OrderStatus } from "@/lib/data-context"

export interface OrderFilterConfig {
  // Customer ID to filter by
  customerId: string
  
  // Date range filters
  fromDate?: string
  toDate?: string
  
  // Status filter
  statusFilter: string
  
  // Additional filter options
  orderType?: "pre-order" | "regular" | "all"
  
  // Custom filter function for view-specific logic
  customFilter?: (order: any) => boolean
  
  // Custom status matcher for view-specific status filtering logic
  customStatusMatcher?: (order: any, statusFilter: string) => boolean
  
  // Custom sort function (optional, defaults to most recent first)
  customSort?: (a: any, b: any) => number
}

/**
 * Get the creation timestamp from an order
 * Handles both Convex _creationTime and legacy createdAt fields
 */
export function getOrderTimestamp(order: any): number {
  return (order._creationTime ?? order.createdAt) ?? 0
}

/**
 * Check if an order is within the specified date range
 */
export function isWithinDateRange(order: any, fromDate?: string, toDate?: string): boolean {
  if (!fromDate && !toDate) return true
  
  const createdTs = getOrderTimestamp(order)
  
  // For "From" date, start from beginning of day (00:00:00.000) to include the entire selected day
  const fromTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null
  // For "To" date, extend to end of day (23:59:59.999) to include the entire selected day
  const toTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null
  
  // Inclusive filtering: >= fromTs and <= toTs
  if (fromTs !== null && createdTs < fromTs) return false
  if (toTs !== null && createdTs > toTs) return false
  
  return true
}

/**
 * Check if an order matches the status filter
 */
export function matchesStatusFilter(order: any, statusFilter: string, customStatusMatcher?: (order: any, statusFilter: string) => boolean): boolean {
  // Use custom status matcher if provided (for view-specific logic)
  if (customStatusMatcher) {
    return customStatusMatcher(order, statusFilter)
  }
  
  // Default status matching
  if (statusFilter === "all") return true
  return order.status === statusFilter
}

/**
 * Standard sort function: Most recent first (descending by creation time)
 * This is the default sorting behavior for all order views
 */
export function sortByMostRecent(a: any, b: any): number {
  const timestampA = getOrderTimestamp(a)
  const timestampB = getOrderTimestamp(b)
  return timestampB - timestampA // Descending: most recent first
}

/**
 * Filter and sort orders based on the provided configuration
 * Returns filtered and sorted orders (most recent first by default)
 */
export function filterAndSortOrders(
  orders: any[],
  config: OrderFilterConfig
): any[] {
  const {
    customerId,
    fromDate,
    toDate,
    statusFilter,
    orderType = "all",
    customFilter,
    customStatusMatcher,
    customSort = sortByMostRecent,
  } = config
  
  return orders
    .filter((order) => {
      // Filter by customer (skip if customerId is empty, which indicates show all orders for owners)
      if (customerId && order.customerId !== customerId) return false
      
      // Filter by order type
      if (orderType === "pre-order" && order.orderType !== "pre-order") return false
      if (orderType === "regular" && order.orderType === "pre-order") return false
      
      // Filter by date range
      if (!isWithinDateRange(order, fromDate, toDate)) return false
      
      // Apply custom filter if provided
      if (customFilter && !customFilter(order)) return false
      
      return true
    })
    .filter((order) => matchesStatusFilter(order, statusFilter, customStatusMatcher))
    .sort(customSort)
}

