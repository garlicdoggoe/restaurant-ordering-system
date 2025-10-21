"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Package, Upload } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

export function OrderHistory() {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus | "pre-orders" | "order-tracking">("all")

  // State for remaining payment proof upload - per order
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)

  // Precompute customer orders and the current realtime order
  const customerOrders = orders.filter((o) => o.customerId === customerId)

  const realtimeStatuses: OrderStatus[] = ["pending", "accepted", "ready", "in-transit"]
  const currentRealtimeOrder = customerOrders
    .filter((o) => {
      // For pre-orders: start tracking only once accepted (preparing) or later
      if (o.orderType === "pre-order") {
        return o.status !== "pending" && realtimeStatuses.includes(o.status as OrderStatus)
      }
      // For regular orders: track pending/accepted/in-transit
      return realtimeStatuses.includes(o.status as OrderStatus)
    })
    .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))[0]

  const filteredOrders = (
    statusFilter === "order-tracking"
      ? (currentRealtimeOrder ? [currentRealtimeOrder] : [])
      : customerOrders
          .filter((order) => {
            if (statusFilter === "all") return true
            // Pre-orders tab shows only pending pre-orders; accepted/in-transit pre-orders move to Order Tracking
            if (statusFilter === "pre-orders") return order.orderType === "pre-order" && order.status === "pending"
            if (statusFilter === "completed") return order.status === "completed" || order.status === "delivered"
            return order.status === statusFilter
          })
          .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
  )

  // Restore pending proofs from localStorage for each order
  // Key format: remaining_payment_proof_<orderId>
  // Only restore once on mount to avoid re-restoring after cancel
  React.useEffect(() => {
    if (hasRestoredFromStorage) return

    try {
      const nextState: Record<string, { file: File | null; previewUrl: string | null }> = {}
      filteredOrders.forEach((order) => {
        if (order.remainingPaymentProofUrl) return
        const key = `remaining_payment_proof_${order._id}`
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
        if (!raw) return
        try {
          const stored = JSON.parse(raw) as { name: string; type: string; dataUrl: string }
          if (!stored?.dataUrl) return
          // Recreate File from data URL so confirm flow can upload it later
          nextState[order._id] = { file: null, previewUrl: stored.dataUrl }
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
      })
      if (Object.keys(nextState).length > 0) {
        setOrderUploadStates((prev) => ({ ...nextState, ...prev }))
      }
      setHasRestoredFromStorage(true)
    } catch {
      // Ignore
    }
  }, [hasRestoredFromStorage, filteredOrders])

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
    "in-transit": <Truck className="w-4 h-4 text-purple-600" />,
    delivered: <Package className="w-4 h-4 text-emerald-600" />,
  }

  const statusColors = {
    completed: "bg-green-100 text-green-800 border-green-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-purple-100 text-purple-800 border-purple-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
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
        return "border-purple-500 border-2"
      case "delivered":
        return "border-emerald-500 border-2"
      default:
        return "border-2"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">My Orders</h1>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="order-tracking">Order Tracking</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
          <TabsTrigger value="pre-orders">Pre-orders</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card 
              key={order._id} 
              className={getOrderBorderClass(order.status)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order._creationTime ?? order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[order.status as keyof typeof statusColors]}>
                    <span className="flex items-center gap-1">
                      {statusIcons[order.status as keyof typeof statusIcons]}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusFilter === "pre-orders" && (
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="font-medium">{order.preOrderFulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
                    </div>
                    {order.preOrderScheduledAt && (
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span className="font-medium">{new Date(order.preOrderScheduledAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {order.preOrderFulfillment === "delivery" && order.customerAddress && (
                      <div>
                        <span className="text-muted-foreground">Address: </span>
                        <span className="font-medium">{order.customerAddress}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Payment: </span>
                      <span className="font-medium">{order.paymentPlan === "downpayment" ? "50% downpayment" : "Full"}</span>
                    </div>
                    {order.paymentScreenshot && (
                      <div className="text-xs text-muted-foreground">Payment screenshot provided</div>
                    )}
                    
                  </div>
                )}

                {/* GCash Number Display */}
                {order.gcashNumber && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      💳 GCash Number Used: (+63) {order.gcashNumber}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.donation > 0 && (
                    <div className="flex justify-between">
                      <span>Donation</span>
                      <span>${order.donation.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>

                {/* Remaining Payment Proof Upload for Pre-orders */}
                {order.paymentPlan === "downpayment" && order.remainingPaymentMethod === "online" && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm font-medium">
                      Remaining Payment Proof
                    </Label>
                    
                    {/* If no finalized URL yet, show either pending preview + actions or the upload dock */}
                    {!order.remainingPaymentProofUrl && (
                      <>
                        {orderUploadStates[order._id]?.previewUrl ? (
                          <div className="space-y-2">
                            <div className="w-full">
                              <img 
                                src={orderUploadStates[order._id]?.previewUrl || ""} 
                                alt="Remaining Payment Preview" 
                                className="w-full rounded border object-contain max-h-32" 
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handleConfirmRemainingPaymentUpload(order._id)}
                                disabled={uploadingOrderId === order._id}
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
                          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                            <input
                              id={`remaining-payment-proof-${order._id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleRemainingPaymentProofChange(e, order._id)}
                              className="hidden"
                              disabled={uploadingOrderId === order._id}
                            />
                            <label htmlFor={`remaining-payment-proof-${order._id}`} className="cursor-pointer">
                              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
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
                        <div className="text-xs text-green-600">
                          ✓ Remaining payment proof provided
                        </div>
                        <div className="w-full">
                          <img 
                            src={order.remainingPaymentProofUrl} 
                            alt="Remaining Payment Proof" 
                            className="w-full rounded border object-contain max-h-32" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrderId(order._id)
                      setChatOpen(true)
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat with Restaurant
                  </Button>

                  {order.paymentScreenshot && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPaymentUrl(order.paymentScreenshot || null)
                        setPaymentOpen(true)
                      }}
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
                    >
                      View Remaining Payment
                    </Button>
                  )}

                  {order.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelOrderId(order._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrderId && <ChatDialog orderId={selectedOrderId} open={chatOpen} onOpenChange={setChatOpen} />}

      <AlertDialog open={!!cancelOrderId} onOpenChange={() => setCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep order</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelOrderId && handleCancelOrder(cancelOrderId)}>
              Yes, cancel order
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
            <img src={paymentUrl} alt="Payment Proof" className="w-full rounded border object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">No payment proof available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
