"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Activity, ArrowLeft, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { useData } from "@/lib/data-context"
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

interface ActiveOrdersViewProps {
  onBackToMenu: () => void
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function ActiveOrdersView({ onBackToMenu, onNavigateToInbox }: ActiveOrdersViewProps) {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  
  // State for expanded/collapsed order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Filter active orders based on order type
  // Regular orders: pending, accepted, ready, in-transit, denied
  // Pre-orders: accepted, ready, in-transit, denied (exclude pending)
  const activeOrders = orders
    .filter((order) => {
      if (order.customerId !== customerId) return false
      
      // Active statuses for regular orders
      const regularActiveStatuses = ["pending", "accepted", "ready", "in-transit", "denied"]
      // Active statuses for pre-orders (exclude pending)
      const preOrderActiveStatuses = ["accepted", "ready", "in-transit", "denied"]
      
      if (order.orderType === "pre-order") {
        return preOrderActiveStatuses.includes(order.status)
      } else {
        return regularActiveStatuses.includes(order.status)
      }
    })
    .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))

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

  // Status icons for active order statuses
  const statusIcons = {
    accepted: <CheckCircle className="w-4 h-4 text-green-600" />,
    ready: <CheckCircle className="w-4 h-4 text-indigo-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    denied: <XCircle className="w-4 h-4 text-red-600" />,
    "in-transit": <Truck className="w-4 h-4 text-yellow-600" />,
  }

  // Status colors for active order statuses
  const statusColors = {
    accepted: "bg-green-100 text-green-800 border-green-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    "in-transit": "bg-yellow-100 text-yellow-800 border-yellow-200",
  }

  // Border classes for active order statuses
  const getOrderBorderClass = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 border-2"
      case "accepted":
        return "border-green-500 border-2"
      case "ready":
        return "border-indigo-500 border-2"
      case "denied":
        return "border-red-500 border-2"
      case "in-transit":
        return "border-yellow-500 border-2"
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
            <h1 className="text-fluid-2xl font-bold">Active Orders</h1>
            <p className="text-fluid-sm text-muted-foreground">
              {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

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
                        <CardTitle className="text-sm font-semibold">
                          {order.orderType === "pre-order" ? "Pre-Order" : "Order"} #{order._id.slice(-6).toUpperCase()}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusColors[order.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-200"} flex items-center gap-1 text-xs`}>
                            {statusIcons[order.status as keyof typeof statusIcons] || <Clock className="w-4 h-4 text-gray-600" />}
                            <span className="capitalize">{order.status.replace(/-/g, " ")}</span>
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
                  {/* Pre-order specific information */}
                  {order.orderType === "pre-order" && order.preOrderScheduledAt && (
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-800">
                        📅 Scheduled for: {new Date(order.preOrderScheduledAt).toLocaleString()}
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

                  {/* GCash Number Display */}
                  {order.gcashNumber && (
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-800">
                        💳 GCash: (+63) {order.gcashNumber}
                      </p>
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
                    {/* Details button - opens order details dialog */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrderId(order._id)
                        setDetailsDialogOpen(true)
                      }}
                      className="flex-1 touch-target text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
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
                    {/* Cancel button for cancellable statuses - only allow cancellation for pending or pre-order-pending status */}
                    {(order.status === "pending" || order.status === "pre-order-pending") && (
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

