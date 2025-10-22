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
  Truck, 
  Package, 
  Upload, 
  X
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

interface OrderTrackingProps {
  orderId: string
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
  const { getOrderById, updateOrder, currentUser } = useData()
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
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)

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
      const { [orderId]: _, ...rest } = prev
      return rest
    })
  }

  const statusIcons = {
    completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    accepted: <CheckCircle className="w-4 h-4 text-green-600" />,
    ready: <CheckCircle className="w-4 h-4 text-indigo-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    denied: <XCircle className="w-4 h-4 text-red-600" />,
    cancelled: <Ban className="w-4 h-4 text-gray-600" />,
    "in-transit": <Truck className="w-4 h-4 text-yellow-600" />,
    delivered: <Package className="w-4 h-4 text-emerald-600" />,
  }

  const statusColors = {
    completed: "bg-green-100 text-green-800 border-green-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-yellow-100 text-yellow-800 border-yellow-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }

  const statusDescriptions = {
    pending: "Waiting for restaurant confirmation",
    accepted: "Order confirmed - being prepared",
    ready: "Order is ready for pickup/delivery",
    "in-transit": "Order is on the way",
    denied: "Order was denied by restaurant",
    completed: "Order completed",
    cancelled: "Order cancelled",
    delivered: "Order delivered",
  }

  const getOrderBorderClass = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 border-2"
      case "ready":
        return "border-indigo-500 border-2"
      case "completed":
      case "accepted":
        return "border-green-500 border-2"
      case "denied":
        return "border-red-500 border-2"
      case "cancelled":
        return "border-gray-500 border-2"
      case "in-transit":
        return "border-yellow-500 border-2"
      case "delivered":
        return "border-emerald-500 border-2"
      default:
        return "border-2"
    }
  }

  const createdTs = (order._creationTime ?? order.createdAt) || 0

  return (
    <>
      <Card className={`h-fit ${getOrderBorderClass(order.status)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                {/* Status Badge */}
                <Badge className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1`}>
                  {statusIcons[order.status as keyof typeof statusIcons]}
                  <span className="capitalize">{order.status.replace('-', ' ')}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Placed at {new Date(createdTs).toLocaleString()}</p>
              {/* Status Description */}
              <p className="text-xs text-gray-600 mt-1">
                {statusDescriptions[order.status as keyof typeof statusDescriptions]}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GCash Number Display */}
          {order.gcashNumber && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                💳 GCash Number Used: (+63) {order.gcashNumber}
              </p>
            </div>
          )}

          {/* Denial Reason Display */}
          {order.status === "denied" && order.denialReason && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Order Denied</p>
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
              <div key={idx} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">📝 Special Instructions:</p>
              <p className="text-sm text-yellow-700">{order.specialInstructions}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform fee</span>
              <span>₱{(order.platformFee || 0).toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₱{order.discount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>₱{order.total.toFixed(2)}</span>
          </div>

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
                          className="bg-yellow-600 hover:bg-yellow-700"
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

          {order.paymentScreenshot && (
            <div className="text-xs text-muted-foreground">
              Payment screenshot provided
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

            {order.paymentScreenshot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentUrl(order.paymentScreenshot || null)
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
                View Remaining
              </Button>
            )}

            {order.status === "pending" && (
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

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {paymentUrl ? (
            <Image src={paymentUrl} alt="Payment Proof" width={400} height={300} className="w-full rounded border object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">No payment proof available.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
