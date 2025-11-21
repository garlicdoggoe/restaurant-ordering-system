"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Ban, ChevronDown, ChevronUp, FileText, Upload} from "lucide-react"
import { type Order } from "@/lib/data-context"
import { PaymentProofUploadDialog } from "@/components/ui/payment-proof-upload-dialog"
import {
  isDeliveryOrder as isDeliveryOrderUtil,
  getOrderTypePrefix,
  calculateFullOrderTotal,
  getStatusIcon,
  ORDER_STATUS_COLORS,
  getStatusLabel,
} from "@/lib/order-utils"

interface OrderCardProps {
  order: Order
  isExpanded: boolean
  onToggleExpand: () => void
  onDetailsClick: () => void
  onNavigateToInbox?: (orderId: string) => void
  onCancelClick?: () => void
  canCancel?: boolean
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
  showCancelButton = false,
  cancellationNotice,
}: OrderCardProps) {
  // State for payment proof upload dialog
  const [isPaymentProofDialogOpen, setIsPaymentProofDialogOpen] = useState(false)
  
  // Calculate total item count by quantity
  const totalItemCount = order.items.reduce((sum: number, item) => sum + item.quantity, 0)
  
  // Get first 2 items for collapsed view
  const firstTwoItems = order.items.slice(0, 2)
  const hasMoreItems = order.items.length > 2
  
  // Determine order type prefix
  const orderTypePrefix = getOrderTypePrefix(order.orderType)
  
  // Get delivery fee from order (already calculated and stored)
  const isDeliveryOrder = isDeliveryOrderUtil(order)
  const deliveryFee = order.deliveryFee || 0
  
  // Calculate full order total (subtotal + platformFee + deliveryFee - discount)
  const fullOrderTotal = calculateFullOrderTotal(
    order.subtotal,
    order.platformFee,
    deliveryFee,
    order.discount
  )

  // Check if payment proof upload button should be shown
  // Only show when: paymentPlan is "downpayment", remainingPaymentMethod is "online", and proof hasn't been uploaded yet
  const shouldShowPaymentProofButton = 
    order.paymentPlan === "downpayment" && 
    order.remainingPaymentMethod === "online" && 
    !order.remainingPaymentProofUrl

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
              <Badge className={`${ORDER_STATUS_COLORS[order.status] || "text-yellow-600"} flex items-center gap-1 text-xs !bg-transparent !border-0 !p-0 hover:!bg-transparent`} variant="outline">
                {getStatusIcon(order.status)}
                <span className="capitalize">{getStatusLabel(order.status)}</span>
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
              {firstTwoItems.map((item, idx: number) => {
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
                      {item.selectedChoices && Object.keys(item.selectedChoices).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {Object.entries(item.selectedChoices).map(([groupId, choice]) => (
                            <div key={groupId}>• {choice.name}</div>
                          ))}
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
            {order.items.map((item, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  {(item.variantName || item.size) && (
                    <div className="text-xs text-muted-foreground">
                      {item.variantName || item.size}
                    </div>
                  )}
                  {item.selectedChoices && Object.keys(item.selectedChoices).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(item.selectedChoices).map(([groupId, choice]) => (
                        <div key={groupId}>• {choice.name}</div>
                      ))}
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
        <div className="space-y-2 pt-2">
          {/* First row: Details and Message buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDetailsClick}
              className="flex-1 touch-target text-xs"
            >
              <FileText className="w-3 h-3 mr-1" />
              <span>View Payment</span>
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
          </div>
          
          {/* Second row: Payment proof upload button (full width on mobile, conditional) */}
          {shouldShowPaymentProofButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentProofDialogOpen(true)}
              className="w-full touch-target text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              <span>Upload Remaining Payment Proof</span>
            </Button>
          )}
          
          {/* Third row: Cancel button (full width on mobile, conditional) */}
          {showCancelButton && canCancel && onCancelClick && (
            <Button
              size="sm"
              onClick={onCancelClick}
              className="w-full touch-target text-xs !bg-red-600 hover:!bg-red-700 !text-white border-red-600"
            >
              <Ban className="w-4 h-4 mr-1" />
              <span>Cancel Order</span>
            </Button>
          )}
        </div>
      </CardContent>
      
      {/* Payment Proof Upload Dialog */}
      {shouldShowPaymentProofButton && (
        <PaymentProofUploadDialog
          open={isPaymentProofDialogOpen}
          onOpenChange={setIsPaymentProofDialogOpen}
          orderId={order._id}
          onSuccess={() => {
            // Dialog will close automatically after successful upload
            // The order will be refreshed automatically by the data context
          }}
        />
      )}
    </Card>
  )
}

