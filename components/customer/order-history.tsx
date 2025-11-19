"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Clock, CheckCircle, XCircle, Ban } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { OrderTracking } from "./order-tracking"
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
import { filterAndSortOrders } from "@/lib/order-filter-utils"
import { OrderCard } from "./order-card"
import Image from "next/image"

interface OrderHistoryProps {
  onBackToMenu: () => void
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function OrderHistory({ onNavigateToInbox }: OrderHistoryProps) {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
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
  const [, setUploadingOrderId] = useState<string | null>(null)
  const [orderUploadStates, setOrderUploadStates] = useState<Record<string, { file: File | null; previewUrl: string | null }>>({})
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false)
  
  // State for expanded/collapsed order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Convex mutations and queries for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  // Use unified filtering utility - standard: most recent first
  const filteredOrders = filterAndSortOrders(orders, {
    customerId,
    fromDate,
    toDate,
    statusFilter,
    orderType: "all",
    // Custom status matcher for order history view-specific logic
    customStatusMatcher: (order, filter) => {
      // Status filtering with view-specific logic
      if (filter === "all") {
        // Exclude realtime orders from "all" view since they're handled by floating component
        if (order.orderType === "pre-order") {
          return order.status === "pending" || order.status === "completed" || order.status === "delivered" || order.status === "cancelled" || order.status === "denied"
        }
        return order.status === "completed" || order.status === "delivered" || order.status === "cancelled" || order.status === "denied"
      }
      // Pre-orders tab shows only pending pre-orders; accepted/in-transit pre-orders are handled by floating component
      if (filter === "pre-orders") return order.orderType === "pre-order" && order.status === "pending"
      if (filter === "completed") return order.status === "completed" || order.status === "delivered"
      return order.status === filter
    },
  })

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRemainingPaymentProofChange = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleConfirmRemainingPaymentUpload = async (orderId: string) => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleCancelPendingRemainingPayment = (orderId: string) => {
    // Clear localStorage immediately to prevent re-restoration by useEffect
    try { window.localStorage.removeItem(`remaining_payment_proof_${orderId}`) } catch {}
    // Clear from state synchronously to update UI immediately
    setOrderUploadStates((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getCurrentDateFilterText = () => {
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


  return (
    <div id="onboarding-view-orders" className="space-y-8 xs:space-y-6">
      {/* Filter Component - Now includes sticky filter section with status tabs */}
      <OrderFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        statusFilter={statusFilter}
        onStatusFilterChange={(filter) => setStatusFilter(filter as "all" | OrderStatus | "pre-orders")}
        statusFilterOptions={statusFilterOptions}
        onClearAll={clearAllFilters}
        drawerTitle="Date Range"
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
            const showCancelButton = order.status === "pending" || order.status === "pre-order-pending"

            return (
              <OrderCard
                key={order._id}
                order={order}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleOrderExpansion(order._id)}
                onDetailsClick={() => {
                  setSelectedOrderId(order._id)
                  setDetailsDialogOpen(true)
                }}
                onNavigateToInbox={onNavigateToInbox}
                onCancelClick={() => setCancelOrderId(order._id)}
                canCancel={showCancelButton}
                showCancelButton={showCancelButton}
              />
            )
          })
        )}
      </div>
      
      {/* Dialogs */}
      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrderId && (
            <OrderTracking orderId={selectedOrderId} />
          )}
        </DialogContent>
      </Dialog>

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

      <Dialog open={paymentOpen} onOpenChange={(open) => {
        setPaymentOpen(open)
        if (!open) setPaymentUrl(null)
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {paymentUrl ? (
            <div className="relative w-full h-96">
              <Image src={paymentUrl} alt="Payment Proof" fill className="rounded border object-contain" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payment proof available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}