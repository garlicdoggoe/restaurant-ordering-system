"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { 
  Clock, 
  CheckCircle,
  XCircle, 
  MessageSquare, 
  Ban,
  Upload
} from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PaymentModal } from "@/components/ui/payment-modal"
import { DeliveryMap } from "@/components/ui/delivery-map"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import {
  getStatusIconsForTracking,
  ORDER_STATUS_COLORS_FOR_TRACKING,
  getStatusDescription,
  getOrderBorderClass,
  isDeliveryOrder,
  getDeliveryFeeFromAddress,
  calculateFullOrderTotal,
  getOrderTypePrefix,
} from "@/lib/order-utils"

interface OrderTrackingProps {
  orderId: string
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
  const { getOrderById, updateOrder, deliveryFees } = useData()
  const order = getOrderById(orderId)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // State for remaining payment proof upload - per order
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  // Restore pending proofs from localStorage for the current order
  React.useEffect(() => {
    if (hasRestoredFromStorage || !order) return

    try {
      if (order.remainingPaymentProofUrl) return
      const key = `remaining_payment_proof_${order._id}`
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
      if (!raw) return
      try {
        const stored = JSON.parse(raw) as { name: string; type: string; dataUrl: string }
        if (!stored?.dataUrl) return
        // Recreate File from data URL so confirm flow can upload it later
        setOrderUploadStates((prev) => ({ ...prev, [order._id]: { file: null, previewUrl: stored.dataUrl } }))
        fetch(stored.dataUrl)
          .then((r) => r.blob())
          .then((blob) => {
            const file = new File([blob], stored.name || "remaining-payment.jpg", { type: stored.type || blob.type })
            setOrderUploadStates((prev) => ({ ...prev, [order._id]: { file, previewUrl: stored.dataUrl } }))
          })
          .catch(() => {
            // Ignore failures, user can reselect
          })
      } catch {
        // Ignore corrupted entry
      }
      setHasRestoredFromStorage(true)
    } catch {
      // Ignore
    }
  }, [hasRestoredFromStorage, order])

  if (!order) return null

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleCancelOrder = (orderId: string) => {
    updateOrder(orderId, { status: "cancelled" })
    setCancelOrderId(null)
  }

  const handleConfirmDenial = (orderId: string) => {
    // Change status to cancelled to remove it from active orders
    updateOrder(orderId, { status: "cancelled" })
    setCancelOrderId(null)
    toast.success("Order denial confirmed", {
      description: "You can now place a new order.",
      duration: 3000,
    })
  }

  // Handle remaining payment proof selection (deferred upload with confirmation)
  const handleRemainingPaymentProofChange = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    try {
      const dataUrl = await fileToDataUrl(file)
      setOrderUploadStates((prev) => ({
        ...prev,
        [orderId]: { file, previewUrl: dataUrl },
      }))
      const key = `remaining_payment_proof_${orderId}`
      const payload = { name: file.name, type: file.type, dataUrl }
      window.localStorage.setItem(key, JSON.stringify(payload))
      toast.success("Image ready. Click Confirm Upload to finalize.")
    } catch (err) {
      console.error("Failed to prepare image preview", err)
      toast.error("Failed to prepare image preview")
    }
  }

  const handleConfirmRemainingPaymentUpload = async (orderId: string) => {
    const pending = orderUploadStates[orderId]
    if (!pending?.file) {
      toast.error("No image selected to upload")
      return
    }
    setUploadingOrderId(orderId)
    try {
      const uploadUrl = await generateUploadUrl({})
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": pending.file.type || "application/octet-stream" },
        body: pending.file,
      })
      const json = await res.json()
      const storageId = json.storageId as string

      // Update the order with the storage ID - Convex will resolve to URL
      updateOrder(orderId, { remainingPaymentProofUrl: storageId })

      // Clear local pending state and storage
      try { window.localStorage.removeItem(`remaining_payment_proof_${orderId}`) } catch {}
      setOrderUploadStates((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev
        return rest
      })
      toast.success("Remaining payment proof uploaded successfully")
    } catch (err) {
      console.error("Upload failed", err)
      toast.error("Failed to upload remaining payment proof")
    } finally {
      setUploadingOrderId(null)
    }
  }

  const handleCancelPendingRemainingPayment = (orderId: string) => {
    // Clear localStorage immediately to prevent re-restoration by useEffect
    try { window.localStorage.removeItem(`remaining_payment_proof_${orderId}`) } catch {}
    // Clear from state synchronously to update UI immediately
    setOrderUploadStates((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [orderId]: _, ...rest } = prev
      return rest
    })
  }

  // Calculate delivery fee and totals using utilities
  const isDelivery = isDeliveryOrder(order)
  const deliveryFee = isDelivery ? getDeliveryFeeFromAddress(order.customerAddress, deliveryFees) : 0
  const fullOrderTotal = calculateFullOrderTotal(
    order.subtotal,
    order.platformFee,
    deliveryFee,
    order.discount
  )
  
  // Get order type prefix
  const orderTypePrefix = getOrderTypePrefix(order.orderType)
  
  // Determine coordinates for delivery map
  const deliveryCoordinates: [number, number] | null = order?.customerCoordinates 
    ? [order.customerCoordinates.lng, order.customerCoordinates.lat] as [number, number]
    : null

  const createdTs = (order._creationTime ?? order.createdAt) || 0

  return (
    <>
      <Card className={`h-fit ${getOrderBorderClass(order.status as OrderStatus)}`}>
        <CardHeader className="p-4 xs:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-fluid-lg">{orderTypePrefix} #{order._id.slice(-6).toUpperCase()}</CardTitle>
                {/* Status Badge */}
                <Badge className={`${ORDER_STATUS_COLORS_FOR_TRACKING[order.status]} flex items-center gap-1`}>
                  {getStatusIconsForTracking(order.status)}
                  <span className="capitalize text-xs">{order.status === 'accepted' ? 'Pending' : order.status.replace('-', ' ')}</span>
                </Badge>
              </div>
              <p className="text-fluid-sm text-muted-foreground">Placed at {new Date(createdTs).toLocaleString()}</p>
              {/* Status Description */}
              <p className="text-xs text-yellow-600 mt-1">
                {getStatusDescription(order.status)}
              </p>
              {/* Estimated Time Display - Desktop Only */}
              {order.estimatedPrepTime && order.status === "accepted" && order.orderType !== "pre-order" && (
                <div className="hidden lg:block text-xs text-gray-600 mt-1 text-red-600">
                  <Clock className="w-3 h-3 inline mr-1 text-red-600" />
                  Estimated: {Math.max(0, order.estimatedPrepTime - 5)}-{order.estimatedPrepTime} minutes
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 xs:p-6 space-y-4 mt-[-50]">
          {/* GCash Number Display */}
          {order.gcashNumber && (
            <p className="text-fluid-xs font-medium">
              💳 GCash Number Used: (+63) {order.gcashNumber}
            </p>
          )}

          {/* Denial Reason Display */}
          {order.status === "denied" && order.denialReason && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-fluid-sm font-medium text-red-800">Order Denied</p>
                  <p className="text-xs text-red-700 mt-1">
                    Reason: {order.denialReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-fluid-sm">
                <div>
                  <div>{item.quantity}x {item.name}</div>
                  {/* Display variant information if available */}
                  {(item.variantName || item.size) && (
                    <div className="text-xs text-gray-500 ml-2">
                      {item.variantName || item.size}
                    </div>
                  )}
                </div>
                <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Payment Breakdown Section */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Payment Breakdown</h4>
            <div className="space-y-2 text-fluid-sm">
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
            <div className="flex justify-between font-semibold text-fluid-lg mb-2">
              <span>Total</span>
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
              {/* Pre-order scheduled date */}
              {order.preOrderScheduledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled for</span>
                  <span>{new Date(order.preOrderScheduledAt).toLocaleString()}</span>
                </div>
              )}
              {/* Pre-order fulfillment method */}
              {order.orderType === "pre-order" && order.preOrderFulfillment && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfillment method</span>
                  <Badge variant="outline" className={`text-xs ${
                    order.preOrderFulfillment === "pickup" 
                      ? "border-blue-200 bg-blue-50 text-blue-800" 
                      : "border-purple-200 bg-purple-50 text-purple-800"
                  }`}>
                    {order.preOrderFulfillment === "pickup" ? "Pickup" : "Delivery"}
                  </Badge>
                </div>
              )}
              {/* Delivery address */}
              {order.customerAddress && isDelivery && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right max-w-[60%]">{order.customerAddress}</span>
                </div>
              )}
              {/* Payment plan */}
              {order.paymentPlan && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment terms</span>
                  <span>{order.paymentPlan === "full" ? "Full payment" : "Partial payment"}</span>
                </div>
              )}
              {/* Remaining payment method */}
              {order.paymentPlan === "downpayment" && order.remainingPaymentMethod && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining balance payment method</span>
                  <span className="capitalize">{order.remainingPaymentMethod}</span>
                </div>
              )}
              {/* GCash number */}
              {order.gcashNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GCash number</span>
                  <span>(+63) {order.gcashNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Map for delivery orders */}
          {isDelivery && order.customerAddress && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Delivery Location</h4>
                <DeliveryMap
                  address={order.customerAddress}
                  coordinates={deliveryCoordinates}
                  mapHeightPx={200}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Payment Proofs Section */}
          {(order.paymentScreenshot || order.downpaymentProofUrl || order.remainingPaymentProofUrl) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Payment Proofs</h4>
              <div className="grid gap-3">
                {/* Primary payment proof (paymentScreenshot or downpaymentProofUrl) */}
                {(order.paymentScreenshot || order.downpaymentProofUrl) && (
                  <div 
                    className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setPaymentUrl(order.paymentScreenshot || order.downpaymentProofUrl || null)
                      setPaymentOpen(true)
                    }}
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
                {/* Remaining payment proof */}
                {order.remainingPaymentProofUrl && (
                  <div 
                    className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setPaymentUrl(order.remainingPaymentProofUrl || null)
                      setPaymentOpen(true)
                    }}
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

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-fluid-sm font-medium text-yellow-800 mb-1">Landmark/Special Instructions:</p>
              <p className="text-fluid-sm text-yellow-700">{order.specialInstructions}</p>
            </div>
          )}

          {/* Remaining Payment Proof Upload for Pre-orders */}
          {order.paymentPlan === "downpayment" && order.remainingPaymentMethod === "online" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">
                Remaining Payment Proof
              </Label>
              
              {/* If no finalized URL yet, show either pending preview + actions or the upload dock */}
              {!order.remainingPaymentProofUrl && (
                <>
                  {orderUploadStates[order._id]?.previewUrl ? (
                    <div className="space-y-3">
                      <div className="w-full">
                        <Image 
                          src={orderUploadStates[order._id]?.previewUrl || ""} 
                          alt="Remaining Payment Preview" 
                          width={400}
                          height={128}
                          className="w-full rounded-lg border object-contain max-h-32" 
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleConfirmRemainingPaymentUpload(order._id)}
                          disabled={uploadingOrderId === order._id}
                          className="bg-yellow-500 hover:bg-yellow-400"
                        >
                          {uploadingOrderId === order._id ? "Uploading..." : "Confirm Upload"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCancelPendingRemainingPayment(order._id)}
                          disabled={uploadingOrderId === order._id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-yellow-400 transition-colors cursor-pointer">
                      <input
                        id={`remaining-payment-proof-${order._id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleRemainingPaymentProofChange(e, order._id)}
                        className="hidden"
                        disabled={uploadingOrderId === order._id}
                      />
                      <label htmlFor={`remaining-payment-proof-${order._id}`} className="cursor-pointer">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          Click to select remaining payment proof
                        </p>
                      </label>
                    </div>
                  )}
                </>
              )}
              
              {/* Show uploaded image and status */}
              {order.remainingPaymentProofUrl && (
                <div className="space-y-2">
                  <div className="text-xs text-green-600 font-medium">
                    ✓ Remaining payment proof provided
                  </div>
                  <div className="w-full">
                    <Image 
                      src={order.remainingPaymentProofUrl} 
                      alt="Remaining Payment Proof" 
                      width={400}
                      height={128}
                      className="w-full rounded-lg border object-contain max-h-32" 
                    />
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChatOpen(true)
              }}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>

            {(order.paymentScreenshot || order.downpaymentProofUrl) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentUrl(order.paymentScreenshot || order.downpaymentProofUrl || null)
                  setPaymentOpen(true)
                }}
                className="flex-1"
              >
                View Payment
              </Button>
            )}

            {order.remainingPaymentProofUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentUrl(order.remainingPaymentProofUrl || null)
                  setPaymentOpen(true)
                }}
                className="flex-1"
              >
                View Balance Proof
              </Button>
            )}

            {/* Only allow cancellation for pending or pre-order-pending status */}
            {(order.status === "pending" || order.status === "pre-order-pending") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOrderId(order._id)}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}

            {order.status === "denied" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelOrderId(order._id)}
                className="flex-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm & Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChatDialog orderId={order._id} open={chatOpen} onOpenChange={setChatOpen} />

      <AlertDialog open={!!cancelOrderId} onOpenChange={() => setCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {order.status === "denied" ? "Confirm Order Denial" : "Cancel Order"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {order.status === "denied" 
                ? "Are you sure you want to confirm this order denial? This will clear the order and allow you to place a new one."
                : "Are you sure you want to cancel this order? This action cannot be undone."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {order.status === "denied" ? "No, keep order" : "No, keep order"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (cancelOrderId) {
                if (order.status === "denied") {
                  handleConfirmDenial(cancelOrderId)
                } else {
                  handleCancelOrder(cancelOrderId)
                }
              }
            }}>
              {order.status === "denied" ? "Yes, confirm denial" : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentModal 
        open={paymentOpen} 
        onOpenChange={setPaymentOpen} 
        paymentUrl={paymentUrl} 
        downpaymentUrl={order?.paymentScreenshot && order?.downpaymentProofUrl ? order.downpaymentProofUrl : null}
        title={order?.paymentScreenshot && order?.downpaymentProofUrl ? "Payment Proofs" : "Payment Proof"} 
      />
    </>
  )
}
