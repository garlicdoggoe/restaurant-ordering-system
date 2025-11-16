/**
 * Reusable Status Badge Component
 * Centralized component for displaying order status badges with consistent styling
 */

import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/data-context"
import {
  ORDER_STATUS_COLORS_FOR_TRACKING,
  getStatusLabel,
  getStatusIconsForTracking,
} from "@/lib/order-utils"

interface StatusBadgeProps {
  /**
   * The order status to display
   */
  status: OrderStatus | string
  /**
   * Whether to show an icon next to the status text
   * @default false
   */
  showIcon?: boolean
  /**
   * Additional className to apply to the badge
   */
  className?: string
  /**
   * Badge variant (from shadcn/ui Badge component)
   * @default "outline"
   */
  variant?: "default" | "secondary" | "destructive" | "outline"
}

/**
 * StatusBadge component for displaying order status with consistent styling
 * Uses centralized status colors and formatting from order-utils
 */
export function StatusBadge({
  status,
  showIcon = false,
  className = "",
  variant = "outline",
}: StatusBadgeProps) {
  // Get color classes for the status, fallback to default if status not found
  const colorClasses =
    ORDER_STATUS_COLORS_FOR_TRACKING[status as OrderStatus] ||
    "bg-gray-100 text-gray-800 border-gray-200"

  // Get formatted label for the status
  const label = getStatusLabel(status as OrderStatus) || status

  return (
    <Badge
      variant={variant}
      className={`${colorClasses} ${className}`}
    >
      {showIcon && getStatusIconsForTracking(status as OrderStatus)}
      <span>{label}</span>
    </Badge>
  )
}

