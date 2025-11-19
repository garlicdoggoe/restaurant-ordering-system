"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, CircleCheck, Ban, Truck, Package, Calendar } from "lucide-react"
import { useData, type OrderStatus, type Order } from "@/lib/data-context"
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
import { Id } from "@/convex/_generated/dataModel"
import { OrderCard } from "./order-card"

interface PreOrdersViewProps {
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function PreOrdersView({ onNavigateToInbox }: PreOrdersViewProps) {
  const { orders, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  
  // Use mutation directly for better error handling
  const patchOrder = useMutation(api.orders.update)
  
  // State for expanded/collapsed order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Filter state - support all possible statuses
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  // Status filter options for pre-orders - includes all possible statuses
  const statusFilterOptions: StatusFilterOption[] = [
    { id: "all", label: "All", icon: Calendar },
    { id: "pre-order-pending", label: "Pending Acknowledgment", icon: Clock },
    { id: "pending", label: "Pending", icon: Clock },
    { id: "accepted", label: "Preparing", icon: CheckCircle },
    { id: "ready", label: "Ready", icon: CheckCircle },
    { id: "denied", label: "Denied", icon: XCircle },
    { id: "completed", label: "Completed", icon: CircleCheck },
    { id: "cancelled", label: "Cancelled", icon: Ban },
    { id: "in-transit", label: "In Transit", icon: Truck },
    { id: "delivered", label: "Delivered", icon: Package },
  ]

  // Use unified filtering utility - standard: most recent first
  // Filter for ALL pre-orders - ensure only pre-order type orders are shown
  const activePreOrders = filterAndSortOrders(orders, {
    customerId,
    fromDate,
    toDate,
    statusFilter,
    orderType: "pre-order", // Only show pre-orders
  })

  // Helper function to check if a pre-order can be cancelled
  // Pre-orders can only be cancelled if cancelled at least 1 day before the scheduled date
  const canCancelPreOrder = (order: Order): { allowed: boolean; reason?: string } => {
    // Only allow cancellation for pending, pre-order-pending, or denied status
    if (order.status !== "pending" && order.status !== "pre-order-pending" && order.status !== "denied") {
      return { allowed: false, reason: "This pre-order cannot be cancelled in its current status" }
    }

    // For pre-orders, check if cancellation is at least 1 day before scheduled date
    if (order.preOrderScheduledAt) {
      const now = Date.now()
      const scheduledDate = order.preOrderScheduledAt
      const oneDayInMs = 24 * 60 * 60 * 1000 // 1 day in milliseconds
      const timeUntilScheduled = scheduledDate - now

      // Check if cancellation is at least 1 day before scheduled date
      if (timeUntilScheduled < oneDayInMs) {
        const scheduledDateStr = new Date(scheduledDate).toLocaleDateString()
        return { 
          allowed: false, 
          reason: `Pre-orders must be cancelled at least 1 day before the scheduled date (${scheduledDateStr}).` 
        }
      }
    }

    return { allowed: true }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o._id === orderId)
      if (!order) {
        toast.error("Order not found")
        setCancelOrderId(null)
        return
      }

      // Check if cancellation is allowed (client-side validation)
      const cancellationCheck = canCancelPreOrder(order)
      if (!cancellationCheck.allowed) {
        toast.error(cancellationCheck.reason || "Cannot cancel this pre-order")
        setCancelOrderId(null)
        return
      }

      // Attempt to cancel the order using mutation directly for proper error handling
      await patchOrder({
        id: orderId as Id<"orders">,
        data: { status: "cancelled" }
      })
      
      toast.success("Pre-order cancelled successfully")
      setCancelOrderId(null)
    } catch (error: unknown) {
      // Handle error from backend
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel pre-order"
      toast.error(errorMessage)
      setCancelOrderId(null)
    }
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

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setFromDate("")
    setToDate("")
    setStatusFilter("all")
  }


  return (
    <div className="space-y-8 xs:space-y-6">
      {/* Filter Component */}
      <OrderFilter
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        statusFilter={statusFilter}
        onStatusFilterChange={(filter) => setStatusFilter(filter as "all" | OrderStatus)}
        statusFilterOptions={statusFilterOptions}
        onClearAll={clearAllFilters}
        drawerTitle="Filter Pre-Orders"
      />

      {/* Pre-Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activePreOrders.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <CardContent className="p-6 xs:p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-fluid-lg font-semibold mb-2">No pre-orders</h3>
              <p className="text-fluid-sm text-muted-foreground">
                You don&apos;t have any pre-orders {statusFilter !== "all" ? `with status "${statusFilter}"` : ""} at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          activePreOrders.map((order) => {
            const isExpanded = expandedOrders.has(order._id)
            const cancellationCheck = canCancelPreOrder(order)
            const cancellationNotice = !cancellationCheck.allowed && order.status !== "cancelled" && (order.status === "pending" || order.status === "pre-order-pending" || order.status === "denied")
              ? cancellationCheck.reason || "This pre-order cannot be cancelled"
              : null

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
                canCancel={cancellationCheck.allowed}
                showCancelButton={cancellationCheck.allowed}
                cancellationNotice={cancellationNotice}
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
            <AlertDialogTitle>Cancel Pre-Order</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelOrderId && (() => {
                const order = orders.find(o => o._id === cancelOrderId)
                if (!order) return "Are you sure you want to cancel this pre-order? This action cannot be undone."
                
                const cancellationCheck = canCancelPreOrder(order)
                if (!cancellationCheck.allowed) {
                  return cancellationCheck.reason || "This pre-order cannot be cancelled."
                }
                
                // Show scheduled date information in the confirmation dialog
                if (order.preOrderScheduledAt) {
                  const scheduledDate = new Date(order.preOrderScheduledAt).toLocaleDateString()
                  return `Are you sure you want to cancel this pre-order scheduled for ${scheduledDate}? This action cannot be undone.`
                }
                
                return "Are you sure you want to cancel this pre-order? This action cannot be undone."
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep pre-order</AlertDialogCancel>
            {cancelOrderId && (() => {
              const order = orders.find(o => o._id === cancelOrderId)
              const cancellationCheck = order ? canCancelPreOrder(order) : { allowed: false }
              
              if (cancellationCheck.allowed) {
                return (
                  <AlertDialogAction onClick={() => handleCancelOrder(cancelOrderId)}>
                    Yes, cancel pre-order
                  </AlertDialogAction>
                )
              }
              return (
                <AlertDialogAction onClick={() => setCancelOrderId(null)}>
                  Close
                </AlertDialogAction>
              )
            })()}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
