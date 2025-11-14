"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Truck, Package, CircleCheck, Ban, MapPin, ShoppingBag } from "lucide-react"
import { type Order, type DeliveryFee } from "@/lib/data-context"
import { DeliveryMap } from "@/components/ui/delivery-map"
import { DeliveryMapModal } from "@/components/ui/delivery-map-modal"
import { PaymentModal } from "@/components/ui/payment-modal"

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

interface OrderCardBaseProps {
  order: Order
  isExpanded: boolean
  onToggleExpand: () => void
  deliveryFees: DeliveryFee[]
  // Optional cancellation notice to display
  cancellationNotice?: string | null
  // Optional delivery coordinates for map display [lng, lat]
  deliveryCoordinates?: [number, number] | null
  // Children to render as action buttons (customer or owner specific)
  actionButtons?: React.ReactNode
  // Whether to show delivery map (default: true for delivery orders)
  showDeliveryMap?: boolean
}

export function OrderCardBase({
  order,
  isExpanded,
  onToggleExpand,
  deliveryFees,
  cancellationNotice,
  deliveryCoordinates,
  actionButtons,
  showDeliveryMap = true,
}: OrderCardBaseProps) {
  // Calculate total item count by quantity so we can surface it up front
  const totalItemCount = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
  
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

  // Determine coordinates for map: use provided coordinates > order's stored coordinates > null
  // Order's customerCoordinates are stored at order creation time (isolated per order)
  const mapCoordinates = deliveryCoordinates || 
    (order.customerCoordinates 
      ? [order.customerCoordinates.lng, order.customerCoordinates.lat] as [number, number]
      : null)

  // Track which proof is currently previewed inside the reusable payment modal
  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    open: boolean
    title: string
    paymentUrl: string | null
    downpaymentUrl: string | null
  }>({
    open: false,
    title: "",
    paymentUrl: null,
    downpaymentUrl: null,
  })

  // Track map modal state
  const [mapModalOpen, setMapModalOpen] = useState(false)

  // Helper to open the modal with context-specific data
  const showPaymentModal = (config: { title: string; paymentUrl: string | null; downpaymentUrl?: string | null }) => {
    setPaymentModalConfig({
      open: true,
      title: config.title,
      paymentUrl: config.paymentUrl,
      downpaymentUrl: config.downpaymentUrl ?? null,
    })
  }

  // Payment proof display combinations reused in multiple spots
  const hasPrimaryProofs = Boolean(order.paymentScreenshot || order.downpaymentProofUrl)
  const hasRemainingProof = Boolean(order.remainingPaymentProofUrl)

  // Text label for fulfillment mode so we can surface it in collapsed view immediately
  const fulfillmentLabel = (() => {
    if (order.orderType === "delivery") return "Delivery"
    if (order.orderType === "dine-in") return "Dine-in"
    if (order.orderType === "takeaway") return "Takeaway"
    if (order.orderType === "pre-order") {
      return order.preOrderFulfillment === "delivery" ? "Pre-order Delivery" : "Pre-order Pickup"
    }
    return "Pickup"
  })()

  return (
    <Card className="h-fit">
      {/* Header doubles as the expand/collapse control so we no longer use a dialog */}
      <CardHeader 
        className="p-3 xs:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
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
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 xs:p-4 space-y-4 border-t">
        {/* Summary content is always visible so owners no longer need a modal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Order Items</h4>
            <span className="text-xs text-muted-foreground">{totalItemCount} items</span>
          </div>
          <Separator className="mb-3" />
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

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span>Total: ₱{fullOrderTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{fulfillmentLabel}</span>
          </div>
        </div>

        {/* Delivery map is part of the base summary for delivery orders */}
        {isDeliveryOrder && showDeliveryMap && order.customerAddress && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Delivery Location</h4>
              {/* Make map clickable to open enlarged modal */}
              <div 
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation() // Prevent card expansion when clicking map
                  setMapModalOpen(true)
                }}
                title="Click to view enlarged map"
              >
                <DeliveryMap
                  address={order.customerAddress}
                  coordinates={mapCoordinates}
                  mapHeightPx={200}
                />
              </div>
            </div>
          </>
        )}

        {/* Expanded content contains the more detailed breakdown plus payment proof */}
        {isExpanded && (
          <>
            {/* Cancellation notice - only relevant while expanded */}
            {cancellationNotice && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <p className="font-medium text-amber-800">
                  ⚠️ {cancellationNotice}
                </p>
              </div>
            )}

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

            {/* Payment Proofs Section */}
            {(hasPrimaryProofs || hasRemainingProof) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Payment Proofs</h4>
                <div className="grid gap-3">
                  {hasPrimaryProofs && (
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => showPaymentModal({
                        title: order.paymentScreenshot && order.downpaymentProofUrl ? "Payment Proofs" : "Payment Screenshot",
                        paymentUrl: order.paymentScreenshot || order.downpaymentProofUrl || null,
                        downpaymentUrl: order.paymentScreenshot && order.downpaymentProofUrl ? order.downpaymentProofUrl : null,
                      })}
                    >
                      <Image
                        src={order.paymentScreenshot || order.downpaymentProofUrl || "/menu-sample.jpg"}
                        alt="Payment proof"
                        fill
                        className="object-contain bg-muted"
                      />
                      {order.paymentScreenshot && order.downpaymentProofUrl && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          2 Proofs
                        </div>
                      )}
                    </div>
                  )}
                  {hasRemainingProof && (
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => showPaymentModal({
                        title: "Remaining Payment Screenshot",
                        paymentUrl: order.remainingPaymentProofUrl || null,
                      })}
                    >
                      <Image
                        src={order.remainingPaymentProofUrl || "/menu-sample.jpg"}
                        alt="Remaining payment proof"
                        fill
                        className="object-contain bg-muted"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </>
        )}

        {/* Action Buttons - Always visible after the summary for quick actions */}
        {actionButtons && (
          <>
            <Separator />
            <div className="space-y-2 pt-2">
              {actionButtons}
            </div>
          </>
        )}
      </CardContent>

      {/* Shared payment modal so thumbnails can be tapped anywhere */}
      <PaymentModal
        open={paymentModalConfig.open}
        onOpenChange={(open) => setPaymentModalConfig((prev) => ({ ...prev, open }))}
        paymentUrl={paymentModalConfig.paymentUrl}
        downpaymentUrl={paymentModalConfig.downpaymentUrl}
        title={paymentModalConfig.title || "Payment Proof"}
      />

      {/* Map modal for enlarged, interactive map view */}
      {isDeliveryOrder && showDeliveryMap && order.customerAddress && (
        <DeliveryMapModal
          open={mapModalOpen}
          onOpenChange={setMapModalOpen}
          address={order.customerAddress}
          coordinates={mapCoordinates}
        />
      )}
    </Card>
  )
}
