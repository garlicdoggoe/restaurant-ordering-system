"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, X, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useData } from "@/lib/data-context"
import Image from "next/image"
import { formatPhoneForDisplay } from "@/lib/phone-validation"
import { PaymentModal } from "@/components/ui/payment-modal"
import { ChangeStatusDialog } from "./change-status-dialog"

interface OrderCardProps {
  order: {
    id: string
    customerName: string
    customerPhone: string
    customerAddress?: string
    gcashNumber?: string
    type: "dine-in" | "takeaway" | "delivery" | "pre-order"
    time: string
    items: Array<{
      name: string
      quantity: number
      price: number
      variantName?: string
      size?: string
    }>
    subtotal: number
    platformFee: number
    total: number
    paymentScreenshot?: string
    downpaymentProofUrl?: string
    paymentStatus?: "Initially paid" | "Fully paid"
    status: string
    specialInstructions?: string
    // Add pre-order specific fields
    preOrderFulfillment?: "pickup" | "delivery"
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
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  // Change status dialog state
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false)

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

  const handleAcknowledgePreOrder = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    // Move pre-order from pre-order-pending to pending status
    updateOrder(order.id, { status: "pending" })
    toast.success("Pre-order acknowledged!", {
      description: `Pre-order #${order.id.slice(-6).toUpperCase()} has been acknowledged and moved to pending.`,
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
    // Determine the next status based on order type and current status
    let newStatus: "in-transit" | "ready" | "completed" = "completed"
    
    // Handle pre-orders based on their fulfillment method
    if (order.type === "pre-order") {
      if (order.preOrderFulfillment === "delivery" && order.status === "accepted") {
        newStatus = "in-transit"
      } else if (order.preOrderFulfillment === "pickup" && order.status === "accepted") {
        newStatus = "ready"
      } else if (order.preOrderFulfillment === "pickup" && order.status === "ready") {
        newStatus = "completed"
      }
    }
    // Handle regular orders
    else if (order.type === "delivery" && order.status === "accepted") {
      newStatus = "in-transit"
    } else if ((order.type === "dine-in" || order.type === "takeaway") && order.status === "accepted") {
      newStatus = "ready"
    } else if ((order.type === "dine-in" || order.type === "takeaway") && order.status === "ready") {
      newStatus = "completed"
    }

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
  const showActionButtons = order.status === "pending" || order.status === "pre-order-pending"
  
  // Show change status button for denied orders
  const showChangeStatusButton = order.status === "denied"
  
  // Determine if finish button should be shown
  const showFinishButton = (() => {
    if (order.status === "accepted") return true
    
    // For dine-in, takeaway, and pre-order pickup: show button when ready
    if (order.status === "ready") {
      return order.type === "dine-in" || order.type === "takeaway" || 
             (order.type === "pre-order" && order.preOrderFulfillment === "pickup")
    }
    
    return false
  })()
  
  // Show delivered button for in-transit delivery orders (including pre-order delivery)
  const showDeliveredButton = order.status === "in-transit" && 
    (order.type === "delivery" || (order.type === "pre-order" && order.preOrderFulfillment === "delivery"))

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
          <p className="text-xs text-muted-foreground">{formatPhoneForDisplay(order.customerPhone)}</p>
          {order.gcashNumber && (
            <p className="text-xs text-blue-600 font-medium">💳 GCash: (+63) {order.gcashNumber}</p>
          )}
          {order.customerAddress && (order.type === "delivery" || order.type === "pre-order") && (
            <p className="text-xs text-muted-foreground">{order.customerAddress}</p>
          )}
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-medium text-yellow-800 mb-1">📝 Landmark/Special Instructions:</p>
            <p className="text-xs text-yellow-700">{order.specialInstructions}</p>
          </div>
        )}

        {/* Payment Screenshot - Handle both paymentScreenshot and downpaymentProofUrl */}
        {(order.paymentScreenshot || order.downpaymentProofUrl) && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {order.paymentScreenshot && order.downpaymentProofUrl 
                ? "Payment Proofs:" 
                : "Payment Proof:"}
            </p>
            <div 
              className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation() // Prevent card click
                setPaymentModalOpen(true)
              }}
            >
              <Image
                src={order.paymentScreenshot || order.downpaymentProofUrl || "/menu-sample.jpg"}
                alt="Payment proof"
                fill
                className="object-contain bg-muted"
              />
              {/* Show indicator when both proofs are available */}
              {order.paymentScreenshot && order.downpaymentProofUrl && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  2
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Items:</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <div>
                  <div>{item.quantity}x {item.name}</div>
                  {/* Display variant information if available */}
                  {(item.variantName || item.size) && (
                    <div className="text-xs text-gray-500 ml-2">
                      {item.variantName || item.size}
                    </div>
                  )}
                </div>
                <span>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>₱{(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Platform fee:</span>
            <span>₱{(order.platformFee || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-sm font-bold">₱{(order.total || 0).toFixed(2)}</span>
          </div>
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
        {showActionButtons && order.status === "pending" && (
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

        {/* Pre-order Acknowledgement Buttons - Show for pre-order-pending orders */}
        {showActionButtons && order.status === "pre-order-pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={handleAcknowledgePreOrder}
            >
              <Check className="w-4 h-4 mr-1" />
              Acknowledge
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
            {/* Regular orders */}
            {order.type === "delivery" && order.status === "accepted" && "Send for Delivery"}
            {(order.type === "dine-in" || order.type === "takeaway") && order.status === "accepted" && "Mark Ready"}
            {(order.type === "dine-in" || order.type === "takeaway") && order.status === "ready" && "Complete Order"}
            {/* Pre-order buttons */}
            {order.type === "pre-order" && order.preOrderFulfillment === "delivery" && order.status === "accepted" && "Send for Delivery"}
            {order.type === "pre-order" && order.preOrderFulfillment === "pickup" && order.status === "accepted" && "Mark Ready"}
            {order.type === "pre-order" && order.preOrderFulfillment === "pickup" && order.status === "ready" && "Complete Order"}
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
      
      {/* Payment Modal for larger image view */}
      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen} 
        paymentUrl={order.paymentScreenshot || null} 
        downpaymentUrl={order.downpaymentProofUrl || null}
        title={order.paymentScreenshot && order.downpaymentProofUrl ? "Payment Proofs" : "Payment Proof"} 
      />

      {/* Change Status Dialog for denied orders */}
      {showChangeStatusDialog && (
        <ChangeStatusDialog
          orderId={order.id}
          onClose={() => setShowChangeStatusDialog(false)}
          onSuccess={() => {
            setShowChangeStatusDialog(false)
            onStatusChange()
          }}
        />
      )}
    </Card>
  )
}