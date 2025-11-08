"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, ChevronDown, ChevronUp, FileText, Truck, Package, CircleCheck } from "lucide-react"
import { type Order, type DeliveryFee } from "@/lib/data-context"

// Helper function to get delivery fee from address
// Tries to match barangay names from deliveryFees array against the address string
function getDeliveryFeeFromAddress(address: string | undefined, deliveryFees: DeliveryFee[]): number {
  if (!address) return 0
  
  const addressLower = address.toLowerCase()
  
  // Try to find matching barangay in address
  for (const df of deliveryFees) {
    const barangayLower = df.barangay.toLowerCase()
    // Check if barangay name appears in address (handles "Puro-Batia" vs "Puro Batia" variations)
    if (addressLower.includes(barangayLower) || addressLower.includes(barangayLower.replace(/-/g, " ")) || addressLower.includes(barangayLower.replace(/ /g, "-"))) {
      return df.fee
    }
  }
  
  return 0
}

interface OrderCardProps {
  order: Order
  isExpanded: boolean
  onToggleExpand: () => void
  onDetailsClick: () => void
  onNavigateToInbox?: (orderId: string) => void
  onCancelClick?: () => void
  canCancel?: boolean
  deliveryFees: DeliveryFee[]
  showCancelButton?: boolean
  cancellationNotice?: string | null
}

export function OrderCard({
  order,
  isExpanded,
  onToggleExpand,
  onDetailsClick,
  onNavigateToInbox,
  onCancelClick,
  canCancel = false,
  deliveryFees,
  showCancelButton = false,
  cancellationNotice,
}: OrderCardProps) {
  // Calculate total item count by quantity
  const totalItemCount = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
  
  // Get first 2 items for collapsed view
  const firstTwoItems = order.items.slice(0, 2)
  const hasMoreItems = order.items.length > 2
  
  // Determine order type prefix
  const orderTypePrefix = order.orderType === "pre-order" ? "Pre-order" : "Order"
  
  // Calculate delivery fee for delivery orders
  const isDeliveryOrder = order.orderType === "delivery" || (order.orderType === "pre-order" && order.preOrderFulfillment === "delivery")
  const deliveryFee = isDeliveryOrder ? getDeliveryFeeFromAddress(order.customerAddress, deliveryFees) : 0
  
  // Calculate full order total (subtotal + platformFee + deliveryFee - discount)
  const fullOrderTotal = order.subtotal + (order.platformFee || 0) + deliveryFee - (order.discount || 0)

  // Status icons for all possible order statuses - all yellow
  const statusIcons = {
    accepted: <CheckCircle className="w-4 h-4 text-yellow-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    "pre-order-pending": <Clock className="w-4 h-4 text-yellow-600" />,
    ready: <CheckCircle className="w-4 h-4 text-yellow-600" />,
    denied: <XCircle className="w-4 h-4 text-yellow-600" />,
    completed: <CircleCheck className="w-4 h-4 text-yellow-600" />,
    cancelled: <Ban className="w-4 h-4 text-yellow-600" />,
    "in-transit": <Truck className="w-4 h-4 text-yellow-600" />,
    delivered: <Package className="w-4 h-4 text-yellow-600" />,
  }

  // Status colors - no background or border, just yellow text
  const statusColors = {
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

  return (
    <Card className="h-fit mb-[-10px] lg:mb-0">
      {/* Mobile: Collapsed Header - Always visible on mobile */}
      <CardHeader 
        className="p-3 xs:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors lg:cursor-default lg:hover:bg-transparent"
        onClick={onToggleExpand}
      >
        <div className="flex flex-col mt-[-15px] mb-[-20px] lg:mt-0 lg:mb-0">
          {/* Top Section: Order ID/Name, Status, and Date */}
          <div className="flex items-start justify-between mb-2">
            {/* Left: Order name and ID */}
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold mb-1">
                {orderTypePrefix} #{order._id.slice(-6).toUpperCase()}
              </CardTitle>
              {/* Date below order ID */}
              <p className="text-xs text-muted-foreground">
                {new Date(order._creationTime ?? 0).toLocaleString()}
              </p>
            </div>
            {/* Right: Status with icon and chevron */}
            <div className="flex items-center gap-2">
              <Badge className={`${statusColors[order.status as keyof typeof statusColors] || "text-yellow-600"} flex items-center gap-1 text-xs !bg-transparent !border-0 !p-0 hover:!bg-transparent`} variant="outline">
                {statusIcons[order.status as keyof typeof statusIcons] || <Clock className="w-4 h-4 text-yellow-600" />}
                <span className="capitalize">{order.status.replace(/-/g, " ")}</span>
              </Badge>
              {/* Expand/Collapse Icon - Only show on mobile */}
              <div className="lg:hidden">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Middle Section: Order Items (first 2 items) - Only show when NOT expanded */}
          {/* Hidden on desktop since expanded view is always shown there */}
          {!isExpanded && (
            <div className="space-y-2 mb-3 lg:hidden">
              {firstTwoItems.map((item: any, idx: number) => {
                const itemTotal = item.price * item.quantity
                
                return (
                  <div key={idx} className="flex items-start justify-between">
                    {/* Left: Item name and variant/size */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{item.name}</div>
                      {(item.variantName || item.size) && (
                        <div className="text-xs text-muted-foreground">
                          {item.variantName || item.size}
                        </div>
                      )}
                    </div>
                    {/* Right: Quantity and Price */}
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                      <span className="font-medium text-sm">
                        ₱{itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {/* Show ellipsis if there are more items */}
              {hasMoreItems && (
                <div className="text-xs text-muted-foreground">...</div>
              )}
            </div>
          )}

          {/* Bottom Section: Total (lower right) - Only show when NOT expanded (mobile collapsed view) */}
          {/* Hidden on desktop since expanded view is always shown there */}
          {!isExpanded && (
            <div className="flex justify-end lg:hidden">
              <div className="font-semibold text-sm">
                Total {totalItemCount} items: ₱{fullOrderTotal.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Mobile: Expanded Content - Only visible when expanded on mobile */}
      {/* Desktop: Always show full content */}
      <CardContent className={`p-3 xs:p-4 space-y-3 lg:space-y-4 ${isExpanded ? 'border-t' : ''} lg:border-t ${isExpanded ? 'block' : 'hidden'} lg:block`}>
        {/* Status indicators
        {order.status === "pre-order-pending" && (
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
            <p className="font-medium text-orange-800">
              ⏳ Awaiting owner acknowledgement
            </p>
          </div>
        )}

        {order.status === "denied" && order.denialReason && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
            <p className="font-medium text-red-800 mb-1">
              ❌ Order Denied
            </p>
            <p className="text-red-700">{order.denialReason}</p>
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="font-medium text-yellow-800">
              🚫 Order Cancelled
            </p>
          </div>
        )} */}

        {/* Cancellation notice - show when cancellation is not allowed */}
        {cancellationNotice && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
            <p className="font-medium text-amber-800">
              ⚠️ {cancellationNotice}
            </p>
          </div>
        )}

        {/* Order Items Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Order Items</h4>
            <span className="text-xs text-muted-foreground">{totalItemCount}</span>
          </div>
          <Separator className="mb-2" />
          <div className="space-y-2">
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  {(item.variantName || item.size) && (
                    <div className="text-xs text-muted-foreground">
                      {item.variantName || item.size}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                  <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Payment Breakdown Section */}
        <div>
          <div className="space-y-1 lg:space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform fee</span>
              <span>₱{(order.platformFee || 0).toFixed(2)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span>₱{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{order.voucherCode ? ` (${order.voucherCode})` : ""}</span>
                <span>-₱{order.discount.toFixed(2)}</span>
              </div>
            )}
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold text-sm mb-2">
            <span>TOTAL</span>
            <span>₱{fullOrderTotal.toFixed(2)}</span>
          </div>
          {/* Partial payment breakdown */}
          {order.paymentPlan === "downpayment" && order.downpaymentAmount && (
            <>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>50% Downpayment</span>
                  <span className="text-green-600">-₱{order.downpaymentAmount.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-sm">
                <span>Remaining balance</span>
                <span>₱{(fullOrderTotal - order.downpaymentAmount).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Order Details Section */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Order Details</h4>
          <Separator className="mb-2" />
          <div className="space-y-2 text-xs">
            {order.preOrderScheduledAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled for</span>
                <span>{new Date(order.preOrderScheduledAt).toLocaleString()}</span>
              </div>
            )}
            {order.customerAddress && isDeliveryOrder && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right max-w-[60%]">{order.customerAddress}</span>
              </div>
            )}
            {order.paymentPlan && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment terms</span>
                <span>{order.paymentPlan === "full" ? "Full payment" : "Partial payment"}</span>
              </div>
            )}
            {order.paymentPlan === "downpayment" && order.remainingPaymentMethod && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining balance payment method</span>
                <span className="capitalize">{order.remainingPaymentMethod}</span>
              </div>
            )}
            {order.gcashNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GCash number</span>
                <span>(+63) {order.gcashNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Special Instructions Section */}
        {order.specialInstructions && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Special Instructions</h4>
              <p className="text-xs text-muted-foreground">{order.specialInstructions}</p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDetailsClick}
            className="flex-1 touch-target text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            <span>Details</span>
          </Button>
          {onNavigateToInbox && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToInbox(order._id)}
              className="flex-1 touch-target text-xs"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              <span>Message</span>
            </Button>
          )}
          {showCancelButton && canCancel && onCancelClick && (
            <Button
              size="sm"
              onClick={onCancelClick}
              className="touch-target text-xs !bg-red-600 hover:!bg-red-700 !text-white border-red-600"
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

