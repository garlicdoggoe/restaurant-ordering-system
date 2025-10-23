"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Package, Upload, ArrowLeft, Home, BarChart3, FileText, Users, Network } from "lucide-react"
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

interface OrderHistoryProps {
  onBackToMenu: () => void
}

export function OrderHistory({ onBackToMenu }: OrderHistoryProps) {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // Set default filter to "all" since order tracking is now handled by floating component
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus | "pre-orders">("all")

  // State for remaining payment proof upload - per order
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)

  // Precompute customer orders (excluding realtime orders that are now handled by floating component)
  const realtimeStatuses: OrderStatus[] = ["pending", "accepted", "ready", "in-transit"]
  const customerOrders = orders.filter((o) => o.customerId === customerId)
  
  const filteredOrders = customerOrders
    .filter((order) => {
      if (statusFilter === "all") {
        // Exclude realtime orders from "all" view since they're handled by floating component
        if (order.orderType === "pre-order") {
          return order.status === "pending" || order.status === "completed" || order.status === "delivered" || order.status === "cancelled" || order.status === "denied"
        }
        return order.status === "completed" || order.status === "delivered" || order.status === "cancelled" || order.status === "denied"
      }
      // Pre-orders tab shows only pending pre-orders; accepted/in-transit pre-orders are handled by floating component
      if (statusFilter === "pre-orders") return order.orderType === "pre-order" && order.status === "pending"
      if (statusFilter === "completed") return order.status === "completed" || order.status === "delivered"
      return order.status === statusFilter
    })
    .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))

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

  return (
    <div className="space-y-4 xs:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBackToMenu} className="touch-target">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-fluid-2xl font-bold">Order History</h1>
            <p className="text-fluid-sm text-muted-foreground">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "all", label: "All Orders", icon: FileText },
          { id: "pre-orders", label: "Pre-orders", icon: Clock },
          { id: "completed", label: "Completed", icon: CheckCircle },
          { id: "cancelled", label: "Cancelled", icon: XCircle },
          { id: "denied", label: "Denied", icon: Ban },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = statusFilter === tab.id
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex-shrink-0 gap-2 touch-target ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-fluid-sm">{tab.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 xs:p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-fluid-lg font-semibold mb-2">No orders found</h3>
              <p className="text-fluid-sm text-muted-foreground">
                {statusFilter === "all" 
                  ? "You haven't placed any orders yet." 
                  : `No ${statusFilter} orders found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order._id} className={`${getOrderBorderClass(order.status)}`}>
              <CardHeader className="p-4 xs:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-fluid-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                      <Badge className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1`}>
                        {statusIcons[order.status as keyof typeof statusIcons]}
                        <span className="capitalize text-xs">{order.status.replace('-', ' ')}</span>
                      </Badge>
                    </div>
                    <p className="text-fluid-sm text-muted-foreground">Placed at {new Date(order._creationTime ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 xs:p-6 space-y-4">
                {/* GCash Number Display */}
                {order.gcashNumber && (
                  <div className="p-3">
                    <p className="text-fluid-xs font-medium">
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

                {/* Special Instructions */}
                {order.specialInstructions && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-fluid-sm font-medium text-yellow-800 mb-1">📝 Special Instructions:</p>
                    <p className="text-fluid-sm text-yellow-700">{order.specialInstructions}</p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-fluid-sm">
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

                <div className="flex justify-between font-semibold text-fluid-lg">
                  <span>Total</span>
                  <span>₱{order.total.toFixed(2)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrderId(order._id)}
                    className="flex-1 touch-target"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="text-fluid-sm">View Details</span>
                  </Button>
                  {order.status === "pending" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelOrderId(order._id)}
                      className="touch-target"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {/* Dialogs */}
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