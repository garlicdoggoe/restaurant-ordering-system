"use client"

import { useState } from "react"
import { useData, type Order } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { OrderCard } from "./order-card"
import { OrderDetails } from "./order-details"
import { DenyOrderDialog } from "./deny-order-dialog"
import { AcceptOrderDialog } from "./accept-order-dialog"

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled" | "denied" | "in-transit" | "delivered"

export function OrdersView() {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("pending")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [denyOrderId, setDenyOrderId] = useState<string | null>(null)
  const [acceptOrderId, setAcceptOrderId] = useState<string | null>(null)

  const { orders } = useData()

  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "accepted").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    denied: orders.filter((o) => o.status === "denied").length,
    "in-transit": orders.filter((o) => o.status === "in-transit").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === "pending") return order.status === "pending"
    if (selectedStatus === "preparing") return order.status === "accepted"
    if (selectedStatus === "ready") return order.status === "ready"
    if (selectedStatus === "completed") return order.status === "completed"
    if (selectedStatus === "cancelled") return order.status === "cancelled"
    if (selectedStatus === "denied") return order.status === "denied"
    if (selectedStatus === "in-transit") return order.status === "in-transit"
    if (selectedStatus === "delivered") return order.status === "delivered"
    return true
  })

  const nonPreOrders = filteredOrders.filter((o) => o.orderType !== "pre-order")
  const preOrders = filteredOrders.filter((o) => o.orderType === "pre-order")

  const toCard = (order: Order) => ({
    id: order._id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    gcashNumber: order.gcashNumber,
    type: (order.orderType as "dine-in" | "takeaway" | "delivery" | "pre-order"),
    time: new Date(order._creationTime ?? order.createdAt).toLocaleString(),
    items: order.items,
    subtotal: order.subtotal,
    platformFee: order.platformFee,
    total: order.total,
    paymentScreenshot: order.paymentScreenshot,
    specialInstructions: order.specialInstructions,
    // Include fields needed to compute payment status
    paymentPlan: order.paymentPlan,
    remainingPaymentMethod: order.remainingPaymentMethod,
    remainingPaymentProofUrl: order.remainingPaymentProofUrl,
    // Compute payment status for pre-orders with downpayment and online remaining payment
    paymentStatus: (() => {
      const isEligible = order.orderType === "pre-order" && order.paymentPlan === "downpayment" && order.remainingPaymentMethod === "online"
      if (!isEligible) return undefined
      const hasInitial = Boolean(order.paymentScreenshot)
      const hasRemaining = Boolean(order.remainingPaymentProofUrl)
      if (hasInitial && hasRemaining) return "Fully paid"
      if (hasInitial) return "Initially paid"
      return undefined
    })(),
    status: order.status,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Line</h1>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <TabsList className="bg-muted grid grid-cols-8 w-full">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {nonPreOrders.map((order) => toCard(order)).map((order) => (
          <OrderCard
            key={order.id}
            order={{
              ...order,
              paymentStatus:
                order.paymentStatus === "Fully paid" || order.paymentStatus === "Initially paid"
                  ? order.paymentStatus
                  : undefined,
            }}
            onClick={() => setSelectedOrderId(order.id)}
            onStatusChange={() => {
              // Force re-render when order status changes
              setSelectedOrderId(null)
            }}
            onDenyClick={(orderId) => setDenyOrderId(orderId)}
            onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
          />
        ))}
      </div>

      {preOrders.length > 0 && (
        <>
          <div className="mt-6">
            <h2 className="text-xl font-semibold">Pre-orders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {preOrders.map((order) => toCard(order)).map((order) => (
              <OrderCard 
                key={order.id} 
                order={{
                  ...order,
                  paymentStatus:
                    order.paymentStatus === "Fully paid" || order.paymentStatus === "Initially paid"
                      ? order.paymentStatus
                      : undefined,
                }}
                onClick={() => setSelectedOrderId(order.id)}
                onStatusChange={() => {
                  setSelectedOrderId(null)
                }}
                onDenyClick={(orderId) => setDenyOrderId(orderId)}
                onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
              />
            ))}
          </div>
        </>
      )}

      {selectedOrderId && <OrderDetails orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
      
      {denyOrderId && (
        <DenyOrderDialog
          orderId={denyOrderId}
          onClose={() => setDenyOrderId(null)}
          onSuccess={() => {
            setDenyOrderId(null)
            setSelectedOrderId(null)
          }}
        />
      )}

      {acceptOrderId && (
        <AcceptOrderDialog
          orderId={acceptOrderId}
          onClose={() => setAcceptOrderId(null)}
          onSuccess={() => {
            setAcceptOrderId(null)
            setSelectedOrderId(null)
          }}
        />
      )}
    </div>
  )
}
