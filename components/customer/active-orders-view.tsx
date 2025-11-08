"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { useData } from "@/lib/data-context"
import { filterAndSortOrders } from "@/lib/order-filter-utils"
import { OrderTracking } from "./order-tracking"
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
import { toast } from "sonner"
import { OrderCard } from "./order-card"

interface ActiveOrdersViewProps {
  onBackToMenu: () => void
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function ActiveOrdersView({ onBackToMenu, onNavigateToInbox }: ActiveOrdersViewProps) {
  const { orders, updateOrder, currentUser, deliveryFees } = useData()
  const customerId = currentUser?._id || ""
  
  // State for expanded/collapsed order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  // Use unified filtering utility - standard: most recent first
  // Filter active orders based on order type
  // Regular orders: pending, accepted, ready, in-transit, denied
  // Pre-orders: accepted, ready, in-transit, denied (exclude pending)
  const activeOrders = filterAndSortOrders(orders, {
    customerId,
    orderType: "all",
    statusFilter: "all", // We'll filter by active statuses in customFilter
    customFilter: (order) => {
      // Active statuses for regular orders
      const regularActiveStatuses = ["pending", "accepted", "ready", "in-transit", "denied"]
      // Active statuses for pre-orders (exclude pending)
      const preOrderActiveStatuses = ["accepted", "ready", "in-transit", "denied"]
      
      if (order.orderType === "pre-order") {
        return preOrderActiveStatuses.includes(order.status)
      } else {
        return regularActiveStatuses.includes(order.status)
      }
    },
  })

  const handleCancelOrder = (orderId: string) => {
    updateOrder(orderId, { status: "cancelled" })
    setCancelOrderId(null)
    toast.success("Order cancelled successfully")
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


  return (
    <div className="space-y-8 xs:space-y-6">
      {/* Active Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeOrders.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <CardContent className="p-6 xs:p-8 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-fluid-lg font-semibold mb-2">No active orders</h3>
              <p className="text-fluid-sm text-muted-foreground">
                You don't have any active orders at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          activeOrders.map((order) => {
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
                deliveryFees={deliveryFees}
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
    </div>
  )
}

