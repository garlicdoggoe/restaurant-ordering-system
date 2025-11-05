"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { useData } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"

interface InboxViewProps {
  // Optional orderId to auto-open chat when component mounts or orderId changes
  orderIdToOpen?: string | null
  // Callback when chat is opened (to clear the orderIdToOpen state)
  onOrderOpened?: () => void
}

export function InboxView({ orderIdToOpen, onOrderOpened }: InboxViewProps = {}) {
  const { orders, currentUser } = useData()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Get all customer orders (chat is available for all orders after checkout)
  // Exclude cancelled orders as they're no longer active
  const customerId = currentUser?._id || ""
  const ordersWithChat = orders.filter(
    (order) => order.customerId === customerId && order.status !== "cancelled"
  )

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-yellow-100 text-yellow-800 border-yellow-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
    "pre-order-pending": "bg-blue-100 text-blue-800 border-blue-200",
  }

  // Auto-open chat when orderIdToOpen is provided
  // This allows opening chat for any order, not just accepted ones
  React.useEffect(() => {
    if (orderIdToOpen) {
      // Verify the order exists and belongs to the customer
      const orderToOpen = orders.find(
        (order) => order._id === orderIdToOpen && order.customerId === customerId
      )
      if (orderToOpen) {
        setSelectedOrderId(orderIdToOpen)
        setChatOpen(true)
        // Notify parent that chat has been opened
        onOrderOpened?.()
      }
    }
  }, [orderIdToOpen, orders, customerId, onOrderOpened])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fluid-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground">Chat with restaurant about your orders</p>
      </div>

      {ordersWithChat.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active chats</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {ordersWithChat.map((order) => {
            return (
              <Card key={order._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(order._creationTime ?? order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[order.status]}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Chat thread ready</p>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedOrderId(order._id)
                      setChatOpen(true)
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Open Chat
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedOrderId && (
        <ChatDialog orderId={selectedOrderId} open={chatOpen} onOpenChange={setChatOpen} />
      )}
    </div>
  )
}
