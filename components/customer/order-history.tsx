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

export function OrderHistory() {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // Set default filter based on current order existence
  const realtimeStatuses: OrderStatus[] = ["pending", "accepted", "ready", "in-transit"]
  const hasCurrentOrder = orders.filter((o) => o.customerId === customerId)
    .some((o) => {
      if (o.orderType === "pre-order") {
        return o.status !== "pending" && realtimeStatuses.includes(o.status as OrderStatus)
      }
      return realtimeStatuses.includes(o.status as OrderStatus)
    })
  
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus | "pre-orders" | "order-tracking">(
    hasCurrentOrder ? "order-tracking" : "all"
  )

  // State for remaining payment proof upload - per order
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)

  // Precompute customer orders and the current realtime order
  const customerOrders = orders.filter((o) => o.customerId === customerId)
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">Order Management</p>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-1/5 bg-white border-r border-gray-200 p-6">
          {/* Navigation Items */}
          <nav className="space-y-2">
            {/* Filter Navigation */}
            <div className="mt-6">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">FILTERS</div>
              <div className="space-y-1">
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "all" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("all")}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm">All</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "order-tracking" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("order-tracking")}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Order Tracking</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "completed" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("completed")}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Completed</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "cancelled" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("cancelled")}
                >
                  <Ban className="w-4 h-4" />
                  <span className="text-sm">Cancelled</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "denied" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("denied")}
                >
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">Denied</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter === "pre-orders" 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setStatusFilter("pre-orders")}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Pre-orders</span>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order._id} 
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</h3>
                          <p className="text-xs text-gray-500">
                            {new Date(order._creationTime ?? order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                        <span className="flex items-center gap-1">
                          {statusIcons[order.status as keyof typeof statusIcons]}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-4 space-y-3">
                    {/* Pre-order Details */}
                    {statusFilter === "pre-orders" && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="font-medium">{order.preOrderFulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
                        </div>
                        {order.preOrderScheduledAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Date:</span>
                            <span className="font-medium">{new Date(order.preOrderScheduledAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {order.preOrderFulfillment === "delivery" && order.customerAddress && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Address:</span>
                            <span className="font-medium text-right max-w-32 truncate">{order.customerAddress}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment:</span>
                          <span className="font-medium">{order.paymentPlan === "downpayment" ? "50% downpayment" : "Full"}</span>
                        </div>
                        {order.paymentScreenshot && (
                          <div className="text-xs text-green-600">✓ Payment screenshot provided</div>
                        )}
                      </div>
                    )}

                    {/* GCash Number Display */}
                    {order.gcashNumber && (
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800 font-medium">
                          💳 GCash Number: (+63) {order.gcashNumber}
                        </p>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-900">Items</h4>
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-gray-600">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>₱{order.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {order.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tax</span>
                          <span>₱{order.tax.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {order.donation > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Donation</span>
                          <span>₱{order.donation.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-₱{order.discount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between font-semibold text-sm border-t border-gray-100 pt-2">
                      <span>Total</span>
                      <span className="text-purple-600">₱{order.total.toFixed(2)}</span>
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
                                  <img 
                                    src={orderUploadStates[order._id]?.previewUrl || ""} 
                                    alt="Remaining Payment Preview" 
                                    className="w-full rounded-lg border object-contain max-h-32" 
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => handleConfirmRemainingPaymentUpload(order._id)}
                                    disabled={uploadingOrderId === order._id}
                                    className="bg-purple-600 hover:bg-purple-700"
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
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer">
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
                              <img 
                                src={order.remainingPaymentProofUrl} 
                                alt="Remaining Payment Proof" 
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
                          setSelectedOrderId(order._id)
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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