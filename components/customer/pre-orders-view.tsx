"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Package, ArrowLeft, Calendar, ChevronDown, ChevronUp, CircleCheck } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import { OrderFilter, type StatusFilterOption } from "@/components/ui/order-filter"
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

interface PreOrdersViewProps {
  onBackToMenu: () => void
  // Optional callback to navigate to inbox with a specific orderId
  onNavigateToInbox?: (orderId: string) => void
}

export function PreOrdersView({ onBackToMenu, onNavigateToInbox }: PreOrdersViewProps) {
  const { orders, updateOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  
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
    { id: "accepted", label: "Accepted", icon: CheckCircle },
    { id: "ready", label: "Ready", icon: CheckCircle },
    { id: "denied", label: "Denied", icon: XCircle },
    { id: "completed", label: "Completed", icon: CircleCheck },
    { id: "cancelled", label: "Cancelled", icon: Ban },
    { id: "in-transit", label: "In Transit", icon: Truck },
    { id: "delivered", label: "Delivered", icon: Package },
  ]

  // Filter for ALL pre-orders - ensure only pre-order type orders are shown
  // Apply date and status filtering - show all statuses now
  const activePreOrders = orders
    .filter((order) => {
      // Always ensure only pre-order type orders are shown
      if (order.customerId !== customerId || order.orderType !== "pre-order") {
        return false
      }

      // Date filtering: compare created time using either Convex _creationTime or legacy createdAt
      // For "From" date, start from beginning of day (00:00:00.000) to include the entire selected day
      const fromTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null
      // For "To" date, extend to end of day (23:59:59.999) to include the entire selected day
      const toTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null
      
      const createdTs = (order._creationTime ?? order.createdAt) || 0
      
      // Inclusive filtering: >= fromTs and <= toTs
      if (fromTs !== null && createdTs < fromTs) return false
      if (toTs !== null && createdTs > toTs) return false

      // Apply status filter - now includes all statuses (no active-only restriction)
      if (statusFilter === "all") return true
      return order.status === statusFilter
    })
    .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))

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

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setFromDate("")
    setToDate("")
    setStatusFilter("all")
  }

  // Status icons for all possible order statuses
  const statusIcons = {
    accepted: <CheckCircle className="w-4 h-4 text-green-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    "pre-order-pending": <Clock className="w-4 h-4 text-blue-600" />,
    ready: <CheckCircle className="w-4 h-4 text-indigo-600" />,
    denied: <XCircle className="w-4 h-4 text-red-600" />,
    completed: <CircleCheck className="w-4 h-4 text-green-600" />,
    cancelled: <Ban className="w-4 h-4 text-gray-600" />,
    "in-transit": <Truck className="w-4 h-4 text-blue-600" />,
    delivered: <Package className="w-4 h-4 text-emerald-600" />,
  }

  // Status colors for all possible order statuses
  const statusColors = {
    accepted: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "pre-order-pending": "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }

  // Border classes for all possible order statuses
  const getOrderBorderClass = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 border-2"
      case "accepted":
        return "border-green-500 border-2"
      case "pre-order-pending":
        return "border-blue-500 border-2"
      case "ready":
        return "border-indigo-500 border-2"
      case "denied":
        return "border-red-500 border-2"
      case "completed":
        return "border-green-500 border-2"
      case "cancelled":
        return "border-gray-500 border-2"
      case "in-transit":
        return "border-blue-500 border-2"
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
            <h1 className="text-fluid-2xl font-bold">Pre-Orders</h1>
            <p className="text-fluid-sm text-muted-foreground">
              {activePreOrders.length} pre-order{activePreOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

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
                You don't have any pre-orders {statusFilter !== "all" ? `with status "${statusFilter}"` : ""} at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          activePreOrders.map((order) => {
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
                        <CardTitle className="text-sm font-semibold">Pre-Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
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
                  {order.preOrderScheduledAt && (
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-800">
                        📅 Scheduled for: {new Date(order.preOrderScheduledAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Pre-order-pending status indicator */}
                  {order.status === "pre-order-pending" && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                      <p className="font-medium text-orange-800">
                        ⏳ Awaiting owner acknowledgement
                      </p>
                    </div>
                  )}

                  {/* Denied status indicator with reason */}
                  {order.status === "denied" && order.denialReason && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-medium text-red-800 mb-1">
                        ❌ Order Denied
                      </p>
                      <p className="text-red-700">{order.denialReason}</p>
                    </div>
                  )}

                  {/* Cancelled status indicator */}
                  {order.status === "cancelled" && (
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                      <p className="font-medium text-gray-800">
                        🚫 Order Cancelled
                      </p>
                    </div>
                  )}

                  {/* Payment plan information */}
                  {order.paymentPlan && (
                    <div className="p-2 bg-green-50 rounded text-xs">
                      <p className="font-medium text-green-800">
                        💳 Payment: {order.paymentPlan === "full" ? "Full Payment" : "Down Payment"}
                        {order.paymentPlan === "downpayment" && order.downpaymentAmount && (
                          <span> (₱{order.downpaymentAmount.toFixed(2)})</span>
                        )}
                      </p>
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
                    {/* Only show cancel button for cancellable statuses */}
                    {(order.status === "pending" || order.status === "pre-order-pending" || order.status === "accepted") && (
                      <Button
                        size="sm"
                        onClick={() => setCancelOrderId(order._id)}
                        className="touch-target text-xs !bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                      >
                        <Ban className="w-4 h-4" />
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
            <AlertDialogTitle>Cancel Pre-Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this pre-order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep pre-order</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelOrderId && handleCancelOrder(cancelOrderId)}>
              Yes, cancel pre-order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
