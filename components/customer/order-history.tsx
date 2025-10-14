"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, CheckCircle, XCircle, MessageSquare, Ban, Truck, Package } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
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

export function OrderHistory() {
  const { orders, updateOrder } = useData()
  const customerId = "customer1" // Demo customer ID
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all")

  const filteredOrders = orders
    .filter((order) => {
      if (order.customerId !== customerId) return false
      if (statusFilter === "all") return true
      return order.status === statusFilter
    })
    .sort((a, b) => {
      // Sort by creation date in descending order (latest first)
      // Use Convex built-in _creationTime instead of custom createdAt
      return (b._creationTime ?? 0) - (a._creationTime ?? 0)
    })

  const handleCancelOrder = (orderId: string) => {
    updateOrder(orderId, { status: "cancelled" })
    setCancelOrderId(null)
  }

  const statusIcons = {
    completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    accepted: <CheckCircle className="w-4 h-4 text-green-600" />,
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    denied: <XCircle className="w-4 h-4 text-red-600" />,
    cancelled: <Ban className="w-4 h-4 text-gray-600" />,
    "in-transit": <Truck className="w-4 h-4 text-purple-600" />,
    delivered: <Package className="w-4 h-4 text-emerald-600" />,
  }

  const statusColors = {
    completed: "bg-green-100 text-green-800 border-green-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-purple-100 text-purple-800 border-purple-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }

  // Border colors for order cards based on status
  const getOrderBorderClass = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 border-2"
      case "completed":
      case "accepted":
        return "border-green-500 border-2"
      case "denied":
        return "border-red-500 border-2"
      case "cancelled":
        return "border-gray-500 border-2"
      case "in-transit":
        return "border-purple-500 border-2"
      case "delivered":
        return "border-emerald-500 border-2"
      default:
        return "border-2"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">My Orders</h1>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card 
              key={order._id} 
              className={getOrderBorderClass(order.status)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order._creationTime ?? order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[order.status as keyof typeof statusColors]}>
                    <span className="flex items-center gap-1">
                      {statusIcons[order.status as keyof typeof statusIcons]}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Order Items */}
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* Order Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.donation > 0 && (
                    <div className="flex justify-between">
                      <span>Donation</span>
                      <span>${order.donation.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.voucherCode && (
                    <div className="flex justify-between text-green-600">
                      <span>Voucher ({order.voucherCode})</span>
                      <span>Applied</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Total */}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                {order.status === "denied" && order.denialReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">Denial Reason:</p>
                    <p className="text-sm text-red-700">{order.denialReason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrderId(order._id)
                      setChatOpen(true)
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat with Restaurant
                  </Button>

                  {order.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelOrderId(order._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  )
}
