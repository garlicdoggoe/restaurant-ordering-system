"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Package, Upload, ArrowLeft, Home, BarChart3, FileText, Users, Network, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import { OrderFilter, type StatusFilterOption } from "@/components/ui/order-filter"
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
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function OrderHistory({ onBackToMenu, onNavigateToInbox }: OrderHistoryProps) {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // Set default filter to "all" since order tracking is now handled by floating component
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus | "pre-orders">("all")
  
  // Date and time filter state
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  // Status filter options for mobile drawer (same as tabs)
  const statusFilterOptions: StatusFilterOption[] = [
    { id: "all", label: "All Orders", icon: FileText },
    { id: "pre-orders", label: "Pre-orders", icon: Clock },
    { id: "completed", label: "Completed", icon: CheckCircle },
    { id: "cancelled", label: "Cancelled", icon: XCircle },
    { id: "denied", label: "Denied", icon: Ban },
  ]

  // State for remaining payment proof upload - per order
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)
  
  // State for expanded/collapsed order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)

  // Precompute customer orders (excluding realtime orders that are now handled by floating component)
  const realtimeStatuses: OrderStatus[] = ["pending", "accepted", "ready", "in-transit"]
  const customerOrders = orders.filter((o) => o.customerId === customerId)
  
  const filteredOrders = customerOrders
    .filter((order) => {
      // Date filtering: compare created time using either Convex _creationTime or legacy createdAt
      // For "From" date, start from beginning of day (00:00:00.000) to include the entire selected day
      const fromTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null
      // For "To" date, extend to end of day (23:59:59.999) to include the entire selected day
      const toTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null
      
      const createdTs = (order._creationTime ?? order.createdAt) || 0
      
      // Inclusive filtering: >= fromTs and <= toTs
      if (fromTs !== null && createdTs < fromTs) return false
      if (toTs !== null && createdTs > toTs) return false
      
      // Status filtering
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

  // Toggle expanded state for order cards
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
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

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setFromDate("")
    setToDate("")
    setStatusFilter("all")
  }

  // Helper function to format current date filter display
  const getCurrentDateFilterText = () => {
    if (!fromDate && !toDate) return "All dates"
    
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    
    if (fromDate && toDate) {
      return `${formatDate(fromDate)} - ${formatDate(toDate)}`
    } else if (fromDate) {
      return `From ${formatDate(fromDate)}`
    } else {
      return `Until ${formatDate(toDate)}`
    }
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
    "pre-order-pending": <Clock className="w-4 h-4 text-blue-600" />,
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
    "pre-order-pending": "bg-blue-100 text-blue-800 border-blue-200",
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
    <div className="space-y-8 xs:space-y-6">
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

      {/* Filter Tabs - Always visible in header */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {statusFilterOptions.map((tab) => {
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

      {/* Filter Component */}
      <OrderFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        statusFilter={statusFilter}
        onStatusFilterChange={(filter) => setStatusFilter(filter as any)}
        statusFilterOptions={statusFilterOptions}
        onClearAll={clearAllFilters}
        drawerTitle="Filter Orders"
      />

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOrders.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
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
          filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order._id)
            
            return (
              <Card key={order._id} className={`${getOrderBorderClass(order.status)} h-fit mb-[-10px] lg:mb-0`}>
                {/* Mobile: Collapsed Header - Always visible on mobile */}
                <CardHeader 
                  className="p-3 xs:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors lg:cursor-default lg:hover:bg-transparent"
                  onClick={() => toggleOrderExpansion(order._id)}
                >
                  <div className="flex items-center justify-between mt-[-15px] mb-[-20px] lg:mt-0 lg:mb-0">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1 text-xs`}>
                            {statusIcons[order.status as keyof typeof statusIcons]}
                            <span className="capitalize">{order.status.replace('-', ' ')}</span>
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
                      <div className="flex items-center justify-between mt-1 lg:mr-0 mr-6 lg:mt-2">
                        <p className="text-xs text-muted-foreground">{new Date(order._creationTime ?? 0).toLocaleString()}</p>
                        <div className="flex justify-between font-semibold text-sm">
                          <span>Total: ₱{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Mobile: Expanded Content - Only visible when expanded on mobile */}
                {/* Desktop: Always show full content */}
                <CardContent className={`p-3 xs:p-4 space-y-3 lg:space-y-4 ${isExpanded ? 'border-t' : ''} lg:border-t ${isExpanded ? 'block' : 'hidden'} lg:block`}>
                  {/* GCash Number Display */}
                  {order.gcashNumber && (
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-800">
                        💳 GCash: (+63) {order.gcashNumber}
                      </p>
                    </div>
                  )}

                  {/* Denial Reason Display */}
                  {order.status === "denied" && order.denialReason && (
                    <div className="p-2 bg-red-50 rounded border border-red-200">
                      <div className="flex items-start gap-1">
                        <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-red-800">Order Denied</p>
                          <p className="text-xs text-red-700 mt-1">
                            {order.denialReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-1 lg:space-y-2 max-h-32 overflow-y-auto pr-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{item.quantity}x {item.name}</div>
                          {(item.variantName || item.size) && (
                            <div className="text-xs text-gray-500 truncate">
                              {item.variantName || item.size}
                            </div>
                          )}
                        </div>
                        <span className="font-medium ml-2 flex-shrink-0">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-800 mb-1">📝 Instructions:</p>
                      <p className="text-xs text-yellow-700 line-clamp-2">{order.specialInstructions}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-1 lg:space-y-2 text-xs">
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

                  <div className="flex justify-between font-semibold text-sm">
                    <span>Total</span>
                    <span>₱{order.total.toFixed(2)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1 lg:pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrderId(order._id)}
                      className="flex-1 touch-target text-xs"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      <span>Details</span>
                    </Button>
                    {/* Message button - navigates to inbox and opens chat for this order */}
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
                    {order.status === "pending" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelOrderId(order._id)}
                        className="touch-target text-xs"
                      >
                        <Ban className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
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