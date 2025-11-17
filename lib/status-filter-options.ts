/**
 * Status filter options for order filtering
 * Provides reusable status filter configurations for different views
 */

import { Clock, CheckCircle, XCircle, Truck, Timer, PackageCheck, Ban, ListFilter, type LucideIcon } from "lucide-react"

export interface StatusFilterOption {
  id: string
  label: string
  icon: LucideIcon
}

/**
 * Comprehensive status filter options for chat and inbox views
 * Includes all order statuses plus aggregate options like "all", "recent", and "active"
 */
export const chatStatusFilterOptions: StatusFilterOption[] = [
  { id: "all", label: "All", icon: Clock },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "active", label: "Active", icon: ListFilter },
  { id: "pre-order-pending", label: "Pre-order Pending", icon: Clock },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "accepted", label: "Preparing", icon: CheckCircle },
  { id: "ready", label: "Ready", icon: Timer },
  { id: "in-transit", label: "In Transit", icon: Truck },
  { id: "delivered", label: "Delivered", icon: PackageCheck },
  { id: "denied", label: "Denied", icon: XCircle },
  { id: "completed", label: "Completed", icon: CheckCircle },
  { id: "cancelled", label: "Cancelled", icon: Ban },
]

