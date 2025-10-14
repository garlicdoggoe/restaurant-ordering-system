"use client"

import { useState } from "react"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { OrderCard } from "./order-card"
import { OrderDetails } from "./order-details"

type OrderStatus = "all" | "dine-in" | "wait-list" | "takeaway" | "served"

export function OrdersView() {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("all")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { orders } = useData()

  const statusCounts = {
    all: orders.length,
    "dine-in": orders.filter((o) => o.orderType === "dine-in").length,
    "wait-list": orders.filter((o) => o.status === "pending").length,
    takeaway: orders.filter((o) => o.orderType === "takeaway").length,
    served: orders.filter((o) => o.status === "completed").length,
  }

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus === "all") return true
    if (selectedStatus === "dine-in") return order.orderType === "dine-in"
    if (selectedStatus === "wait-list") return order.status === "pending"
    if (selectedStatus === "takeaway") return order.orderType === "takeaway"
    if (selectedStatus === "served") return order.status === "completed"
    return false
  })

  const transformedOrders = filteredOrders.map((order) => ({
    id: order._id,
    tableNumber: "N/A",
    orderNumber: order._id.slice(-4).toUpperCase(),
    image: "/menu-sample.jpg",
    status: (
      order.status === "pending"
        ? "wait-list"
        : order.orderType === "dine-in"
          ? "dine-in"
          : order.orderType === "takeaway"
            ? "takeaway"
            : "served"
    ) as "dine-in" | "takeaway" | "wait-list" | "served",
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
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="rounded-full">
                {statusCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="dine-in" className="gap-2">
              Dine in
              <Badge variant="secondary" className="rounded-full bg-yellow-100 text-yellow-800">
                {statusCounts["dine-in"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="wait-list" className="gap-2">
              Wait list
              <Badge variant="secondary" className="rounded-full bg-orange-100 text-orange-800">
                {statusCounts["wait-list"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="takeaway" className="gap-2">
              Take away
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                {statusCounts.takeaway}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="served" className="gap-2">
              Served
              <Badge variant="secondary" className="rounded-full bg-green-100 text-green-800">
                {statusCounts.served}
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
