"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, X, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useData } from "@/lib/data-context"
import Image from "next/image"

interface OrderCardProps {
  order: {
    id: string
    customerName: string
    customerPhone: string
    customerAddress?: string
    type: "dine-in" | "takeaway" | "delivery" | "pre-order"
    time: string
    items: Array<{
      name: string
      quantity: number
      price: number
    }>
    total: number
    paymentScreenshot?: string
    paymentStatus?: "Initially paid" | "Fully paid"
    status: string
  }
  onClick: () => void
  onStatusChange: () => void
  onDenyClick: (orderId: string) => void
  onAcceptClick?: (orderId: string) => void
}

const typeStyles: Record<"dine-in" | "takeaway" | "delivery" | "pre-order", string> = {
  "dine-in": "bg-[#FFD93D] text-[#8B6914] border-[#FFD93D]",
  takeaway: "bg-[#4DD0E1] text-[#006064] border-[#4DD0E1]",
  delivery: "bg-[#B39DDB] text-[#311B92] border-[#B39DDB]",
  "pre-order": "bg-[#C5E1A5] text-[#33691E] border-[#C5E1A5]",
}

const typeLabels: Record<"dine-in" | "takeaway" | "delivery" | "pre-order", string> = {
  "dine-in": "Dine in",
  takeaway: "Take away",
  delivery: "Delivery",
  "pre-order": "Pre-order",
}

export function OrderCard({ order, onClick, onStatusChange, onDenyClick, onAcceptClick }: OrderCardProps) {
  const { updateOrder } = useData()

  const handleAcceptOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    if (onAcceptClick) {
      onAcceptClick(order.id)
      return
    }
    // Fallback direct accept if no dialog callback provided
    updateOrder(order.id, { status: "accepted" })
    toast.success("Order accepted!", {
      description: `Order #${order.id.slice(-6).toUpperCase()} has been accepted.`,
      duration: 3000,
    })
    onStatusChange()
  }

  const handleDenyOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    onDenyClick(order.id)
  }

  const handleFinishOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    // For delivery orders from accepted -> in-transit; for dine-in/takeaway accepted -> ready
    let newStatus: "in-transit" | "ready" | "completed" = "completed"
    if (order.type === "delivery" && order.status === "accepted") newStatus = "in-transit"
    else if ((order.type === "dine-in" || order.type === "takeaway") && order.status === "accepted") newStatus = "ready"
    else if ((order.type === "dine-in" || order.type === "takeaway") && order.status === "ready") newStatus = "completed"

    updateOrder(order.id, { status: newStatus })
    const description =
      newStatus === "in-transit"
        ? "sent for delivery"
        : newStatus === "ready"
        ? "marked as ready"
        : "completed"
    toast.success("Order updated!", {
      description: `Order #${order.id.slice(-6).toUpperCase()} has been ${description}.`,
      duration: 3000,
    })
    onStatusChange()
  }

  const handleMarkDelivered = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    updateOrder(order.id, { status: "delivered" })
    toast.success("Order delivered!", {
      description: `Order #${order.id.slice(-6).toUpperCase()} has been delivered.`,
      duration: 3000,
    })
    onStatusChange()
  }

  // Show different buttons based on order status and type
  const showActionButtons = order.status === "pending"
  const showFinishButton = order.status === "accepted" || ((order.type === "dine-in" || order.type === "takeaway") && order.status === "ready")
  const showDeliveredButton = order.status === "in-transit" && order.type === "delivery"

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {/* Order ID and Timestamp */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Order #{order.id.slice(-6).toUpperCase()}</p>
          <span className="text-xs text-muted-foreground">{order.time}</span>
        </div>

        {/* Customer Information */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
          {order.customerAddress && (order.type === "delivery" || order.type === "pre-order") && (
            <p className="text-xs text-muted-foreground">{order.customerAddress}</p>
          )}
        </div>

        {/* Payment Screenshot */}
        {order.paymentScreenshot && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Payment Proof:</p>
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <Image
                src={order.paymentScreenshot || "/menu-sample.jpg"}
                alt="Payment proof"
                fill
                className="object-contain bg-muted"
              />
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Items:</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span>{item.quantity}x {item.name}</span>
                <span>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-sm font-medium">Total:</span>
          <span className="text-sm font-bold">₱{order.total.toFixed(2)}</span>
        </div>

        {/* Payment Status for pre-order downpayment online */}
        {order.paymentStatus && (
          <Badge variant="outline" className="w-full justify-center text-xs py-1 border-green-200 bg-green-50 text-green-800">
            {order.paymentStatus}
          </Badge>
        )}

        {/* Order Type Badge */}
        <Badge variant="outline" className={cn("w-full justify-center text-base py-2", typeStyles[order.type])}>
          {typeLabels[order.type]}
        </Badge>

        {/* Action Buttons */}
        {showActionButtons && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleAcceptOrder}
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handleDenyOrder}
            >
              <X className="w-4 h-4 mr-1" />
              Deny
            </Button>
          </div>
        )}

        {/* Finish Order Button - Show for preparing orders */}
        {showFinishButton && (
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleFinishOrder}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {order.type === "delivery" && order.status === "accepted" && "Send for Delivery"}
            {(order.type === "dine-in" || order.type === "takeaway") && order.status === "accepted" && "Mark Ready"}
            {(order.type === "dine-in" || order.type === "takeaway") && order.status === "ready" && "Complete Order"}
          </Button>
        )}

        {/* Mark as Delivered Button - Show for in-transit delivery orders */}
        {showDeliveredButton && (
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleMarkDelivered}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Mark as Delivered
          </Button>
        )}
      </CardContent>
    </Card>
  )
}