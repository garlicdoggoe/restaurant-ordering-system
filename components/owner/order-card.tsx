"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, CheckCircle, Edit } from "lucide-react"
import { toast } from "sonner"
import { useData, type Order, type DeliveryFee } from "@/lib/data-context"
import { ChangeStatusDialog } from "./change-status-dialog"
import { OrderCardBase } from "@/components/shared/order-card-base"
import { isDeliveryOrder as isDeliveryOrderUtil, canEditOrderStatus } from "@/lib/order-utils"

interface OrderCardProps {
  order: Order
  onStatusChange: () => void
  onDenyClick: (orderId: string) => void
  onAcceptClick?: (orderId: string) => void
  deliveryFees: DeliveryFee[]
  // Optional delivery coordinates [lng, lat]
  deliveryCoordinates?: [number, number] | null
  // Expanded state for mobile collapse/expand
  isExpanded: boolean
  onToggleExpand: () => void
}

export function OrderCard({ 
  order, 
  onStatusChange, 
  onDenyClick, 
  onAcceptClick,
  deliveryFees,
  deliveryCoordinates,
  isExpanded,
  onToggleExpand,
}: OrderCardProps) {
  const { updateOrder } = useData()
  
  // Change status dialog state
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false)

  // Determine if order is delivery
  const isDeliveryOrder = isDeliveryOrderUtil(order)
  
  // Determine coordinates to use: provided coordinates > order's stored coordinates > null
  // Use order's customerCoordinates (stored at order creation) instead of fetching current user coordinates
  const mapCoordinates: [number, number] | null = deliveryCoordinates || 
    (order.customerCoordinates 
      ? [order.customerCoordinates.lng, order.customerCoordinates.lat] as [number, number]
      : null)

  const handleAcceptOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    if (onAcceptClick) {
      onAcceptClick(order._id)
      return
    }
    // Fallback direct accept if no dialog callback provided
    updateOrder(order._id, { status: "accepted" })
    toast.success("Order accepted!", {
      description: `Order #${order._id.slice(-6).toUpperCase()} has been accepted.`,
      duration: 3000,
    })
    onStatusChange()
  }

  const handleAcknowledgePreOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    // Move pre-order from pre-order-pending to pending status
    updateOrder(order._id, { status: "pending" })
    toast.success("Pre-order acknowledged!", {
      description: `Pre-order #${order._id.slice(-6).toUpperCase()} has been acknowledged and moved to pending.`,
      duration: 3000,
    })
    onStatusChange()
  }

  const handleDenyOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    onDenyClick(order._id)
  }

  const handleFinishOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    // Determine the next status based on order type and current status
    let newStatus: "in-transit" | "ready" | "completed" = "completed"
    
    // Handle pre-orders based on their fulfillment method
    if (order.orderType === "pre-order") {
      if (order.preOrderFulfillment === "delivery" && order.status === "accepted") {
        newStatus = "in-transit"
      } else if (order.preOrderFulfillment === "pickup" && order.status === "accepted") {
        newStatus = "ready"
      } else if (order.preOrderFulfillment === "pickup" && order.status === "ready") {
        newStatus = "completed"
      }
    }
    // Handle regular orders
    else if (order.orderType === "delivery" && order.status === "accepted") {
      newStatus = "in-transit"
    } else if ((order.orderType === "dine-in" || order.orderType === "takeaway") && order.status === "accepted") {
      newStatus = "ready"
    } else if ((order.orderType === "dine-in" || order.orderType === "takeaway") && order.status === "ready") {
      newStatus = "completed"
    }

    updateOrder(order._id, { status: newStatus })
    const description =
      newStatus === "in-transit"
        ? "sent for delivery"
        : newStatus === "ready"
        ? "marked as ready"
        : "completed"
    toast.success("Order updated!", {
      description: `Order #${order._id.slice(-6).toUpperCase()} has been ${description}.`,
      duration: 3000,
    })
    onStatusChange()
  }

  const handleMarkDelivered = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    updateOrder(order._id, { status: "delivered" })
    toast.success("Order delivered!", {
      description: `Order #${order._id.slice(-6).toUpperCase()} has been delivered.`,
      duration: 3000,
    })
    onStatusChange()
  }

  // Determine which buttons to show based on order status and type
  const showActionButtons = order.status === "pending" || order.status === "pre-order-pending"
  
  // Determine if finish button should be shown
  const showFinishButton = (() => {
    if (order.status === "accepted") return true
    
    // For dine-in, takeaway, and pre-order pickup: show button when ready
    if (order.status === "ready") {
      return order.orderType === "dine-in" || order.orderType === "takeaway" || 
             (order.orderType === "pre-order" && order.preOrderFulfillment === "pickup")
    }
    
    return false
  })()
  
  // Show delivered button for in-transit delivery orders (including pre-order delivery)
  const showDeliveredButton = order.status === "in-transit" && 
    (order.orderType === "delivery" || (order.orderType === "pre-order" && order.preOrderFulfillment === "delivery"))

  // Render action buttons based on order status
  const renderActionButtons = () => {
    // Pending orders: Accept/Deny buttons
    if (showActionButtons && order.status === "pending") {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation()
              handleAcceptOrder(e)
            }}
          >
            <Check className="w-4 h-4 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              handleDenyOrder(e)
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Deny
          </Button>
        </div>
      )
    }

    // Pre-order-pending orders: Acknowledge/Deny buttons
    if (showActionButtons && order.status === "pre-order-pending") {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-500 hover:bg-green-600"
            onClick={(e) => {
              e.stopPropagation()
              handleAcknowledgePreOrder(e)
            }}
          >
            <Check className="w-4 h-4 mr-1" />
            Acknowledge
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              handleDenyOrder(e)
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Deny
          </Button>
        </div>
      )
    }

    // Finish Order Button - Show for accepted/ready orders
    if (showFinishButton) {
      return (
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={(e) => {
            e.stopPropagation()
            handleFinishOrder(e)
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          {/* Regular orders */}
          {order.orderType === "delivery" && order.status === "accepted" && "Send for Delivery"}
          {(order.orderType === "dine-in" || order.orderType === "takeaway") && order.status === "accepted" && "Mark Ready"}
          {(order.orderType === "dine-in" || order.orderType === "takeaway") && order.status === "ready" && "Complete Order"}
          {/* Pre-order buttons */}
          {order.orderType === "pre-order" && order.preOrderFulfillment === "delivery" && order.status === "accepted" && "Send for Delivery"}
          {order.orderType === "pre-order" && order.preOrderFulfillment === "pickup" && order.status === "accepted" && "Mark Ready"}
          {order.orderType === "pre-order" && order.preOrderFulfillment === "pickup" && order.status === "ready" && "Complete Order"}
        </Button>
      )
    }

    // Mark as Delivered Button - Show for in-transit delivery orders
    if (showDeliveredButton) {
      return (
        <Button
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={(e) => {
            e.stopPropagation()
            handleMarkDelivered(e)
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Mark as Delivered
        </Button>
      )
    }

    return null
  }

  // Check if order status can be edited - cannot edit cancelled, completed, or delivered orders
  const canEditStatus = canEditOrderStatus(order.status)

  return (
    <>
      <OrderCardBase
        order={order}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        deliveryFees={deliveryFees}
        deliveryCoordinates={mapCoordinates}
        showDeliveryMap={isDeliveryOrder}
        actionButtons={renderActionButtons()}
        statusActionButton={
          canEditStatus ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowChangeStatusDialog(true)
              }}
              className="w-full touch-target text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              <span>Edit Status</span>
            </Button>
          ) : undefined
        }
      />

      {/* Change Status Dialog - allows owner to edit status (except cancelled, completed, or delivered orders) */}
      {showChangeStatusDialog && (
        <ChangeStatusDialog
          orderId={order._id}
          currentStatus={order.status}
          onClose={() => setShowChangeStatusDialog(false)}
          onSuccess={() => {
            setShowChangeStatusDialog(false)
            onStatusChange()
          }}
        />
      )}
    </>
  )
}
