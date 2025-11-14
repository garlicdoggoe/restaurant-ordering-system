"use client"

import { useState, useEffect } from "react"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { OrderCard } from "./order-card"
import { DenyOrderDialog } from "./deny-order-dialog"
import { AcceptOrderDialog } from "./accept-order-dialog"

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled" | "denied" | "in-transit" | "delivered" | "pre-order-pending"

export function OrdersView({ initialOrderId, initialStatus }: { initialOrderId?: string, initialStatus?: OrderStatus }) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(initialStatus || "pending")
  const [denyOrderId, setDenyOrderId] = useState<string | null>(null)
  const [acceptOrderId, setAcceptOrderId] = useState<string | null>(null)
  // Track expanded state for each order (for mobile collapse/expand)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  const { ordersByStatus, deliveryFees } = useData()

  // NEW: Use status-specific queries instead of client-side filtering for better cache performance
  const statusCounts = {
    pending: ordersByStatus.pending.length,
    preparing: ordersByStatus.accepted.length,
    ready: ordersByStatus.ready.length,
    completed: ordersByStatus.completed.length,
    cancelled: ordersByStatus.cancelled.length,
    denied: ordersByStatus.denied.length,
    "in-transit": ordersByStatus["in-transit"].length,
    delivered: ordersByStatus.delivered.length,
    "pre-order-pending": ordersByStatus["pre-order-pending"]?.length || 0,
  }

  // NEW: Get filtered orders directly from status-specific queries
  const getFilteredOrders = () => {
    if (selectedStatus === "pending") return ordersByStatus.pending
    if (selectedStatus === "preparing") return ordersByStatus.accepted
    if (selectedStatus === "ready") return ordersByStatus.ready
    if (selectedStatus === "completed") return ordersByStatus.completed
    if (selectedStatus === "cancelled") return ordersByStatus.cancelled
    if (selectedStatus === "denied") return ordersByStatus.denied
    if (selectedStatus === "in-transit") return ordersByStatus["in-transit"]
    if (selectedStatus === "delivered") return ordersByStatus.delivered
    if (selectedStatus === "pre-order-pending") return ordersByStatus["pre-order-pending"] || []
    return []
  }

  const filteredOrders = getFilteredOrders()
  // Auto-expand the provided orderId on mount so users see it immediately
  useEffect(() => {
    if (initialOrderId) {
      setExpandedOrders(prev => {
        const next = new Set(prev)
        next.add(initialOrderId)
        return next
      })
    }
  }, [initialOrderId])

  const nonPreOrders = filteredOrders.filter((o) => o.orderType !== "pre-order")
  const preOrders = filteredOrders.filter((o) => o.orderType === "pre-order")

  // Toggle expanded state for an order
  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const statusOptions = [
    { value: "pending", label: "Pending", count: statusCounts.pending, color: "bg-yellow-100 text-yellow-800" },
    { value: "preparing", label: "Preparing", count: statusCounts.preparing, color: "bg-blue-100 text-blue-800" },
    { value: "ready", label: "Ready", count: statusCounts.ready, color: "bg-indigo-100 text-indigo-800" },
    { value: "completed", label: "Completed", count: statusCounts.completed, color: "bg-green-100 text-green-800" },
    { value: "in-transit", label: "In Transit", count: statusCounts["in-transit"], color: "bg-yellow-100 text-yellow-800" },
    { value: "delivered", label: "Delivered", count: statusCounts.delivered, color: "bg-emerald-100 text-emerald-800" },
    { value: "cancelled", label: "Cancelled", count: statusCounts.cancelled, color: "bg-gray-100 text-gray-800" },
    { value: "denied", label: "Denied", count: statusCounts.denied, color: "bg-red-100 text-red-800" },
    { value: "pre-order-pending", label: "Pre-Orders", count: statusCounts["pre-order-pending"], color: "bg-blue-100 text-blue-800" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-2xl font-bold">Order Line</h1>
      </div>

      {/* Mobile Select - Sticky */}
      <div className="lg:hidden sticky top-0 z-40 bg-background pb-4">
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.label}</span>
                  <Badge variant="secondary" className={`rounded-full ${option.color}`}>
                    {option.count}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:flex items-center gap-4">
        <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <TabsList className="bg-muted grid grid-cols-9 w-full">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              <Badge variant="secondary" className="rounded-full bg-yellow-100 text-yellow-800">
                {statusCounts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preparing" className="gap-2">
              Preparing
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                {statusCounts.preparing}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-2">
              Ready
              <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-800">
                {statusCounts.ready}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              <Badge variant="secondary" className="rounded-full bg-green-100 text-green-800">
                {statusCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in-transit" className="gap-2">
              In Transit
              <Badge variant="secondary" className="rounded-full bg-yellow-100 text-yellow-800">
                {statusCounts["in-transit"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="gap-2">
              Delivered
              <Badge variant="secondary" className="rounded-full bg-emerald-100 text-emerald-800">
                {statusCounts.delivered}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              Cancelled
              <Badge variant="secondary" className="rounded-full bg-gray-100 text-gray-800">
                {statusCounts.cancelled}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="denied" className="gap-2">
              Denied
              <Badge variant="secondary" className="rounded-full bg-red-100 text-red-800">
                {statusCounts.denied}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pre-order-pending" className="gap-2">
              Pre-Orders
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                {statusCounts["pre-order-pending"]}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {nonPreOrders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            isExpanded={expandedOrders.has(order._id)}
            onToggleExpand={() => toggleOrderExpanded(order._id)}
            onStatusChange={() => {
            }}
            onDenyClick={(orderId) => setDenyOrderId(orderId)}
            onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
            deliveryFees={deliveryFees}
          />
        ))}
      </div>

      {preOrders.length > 0 && (
        <>
          <div className="mt-6">
            <h2 className="text-fluid-xl font-semibold">Pre-orders</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {preOrders.map((order) => (
              <OrderCard 
                key={order._id} 
                order={order}
                isExpanded={expandedOrders.has(order._id)}
                onToggleExpand={() => toggleOrderExpanded(order._id)}
                onStatusChange={() => {
                }}
                onDenyClick={(orderId) => setDenyOrderId(orderId)}
                onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
                deliveryFees={deliveryFees}
              />
            ))}
          </div>
        </>
      )}

      {denyOrderId && (
        <DenyOrderDialog
          orderId={denyOrderId}
          onClose={() => setDenyOrderId(null)}
          onSuccess={() => {
            setDenyOrderId(null)
          }}
        />
      )}

      {acceptOrderId && (
        <AcceptOrderDialog
          orderId={acceptOrderId}
          onClose={() => setAcceptOrderId(null)}
          onSuccess={() => {
            setAcceptOrderId(null)
          }}
        />
      )}
    </div>
  )
}
