"use client"

import { useState } from "react"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { OrderCard } from "./order-card"
import { OrderDetails } from "./order-details"

type OrderStatus = "pending" | "preparing" | "cancelled" | "denied"

export function OrdersView() {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("pending")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { orders } = useData()

  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "accepted").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    denied: orders.filter((o) => o.status === "denied").length,
  }

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === "pending") return order.status === "pending"
    if (selectedStatus === "preparing") return order.status === "accepted"
    if (selectedStatus === "cancelled") return order.status === "cancelled"
    if (selectedStatus === "denied") return order.status === "denied"
    return true
  })

  const transformedOrders = filteredOrders.map((order) => ({
    id: order._id,
    tableNumber: "N/A",
    orderNumber: order._id.slice(-4).toUpperCase(),
    image: "/menu-sample.jpg",
    type: (order.orderType as "dine-in" | "takeaway" | "delivery" | "pre-order"),
    time: new Date(order._creationTime ?? order.createdAt).toLocaleString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Line</h1>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <TabsList className="bg-muted">
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
        {transformedOrders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={() => setSelectedOrderId(order.id)} />
        ))}
      </div>

      {selectedOrderId && <OrderDetails orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  )
}
