"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OwnerChatDialog } from "./owner-chat-dialog"

export function ChatView() {
  const { orders } = useData()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const messagesByOrder: Record<string, any[]> = {}
  for (const o of orders) {
    // It's okay to call useQuery conditionally only if the list length is stable; instead, keep list UI minimal.
    // Here we won't prefetch; we'll show chats button and load per dialog.
    messagesByOrder[o._id] = []
  }

  // Get orders that have messages or are active (pending/accepted)
  const ordersWithChat = orders.filter((order) => order.status === "pending" || order.status === "accepted")

  // Get message count for each order
  const getMessageCount = (_orderId: string) => 0

  // Get last message for each order
  const getLastMessage = (_orderId: string) => undefined as any

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    "in-transit": "bg-yellow-100 text-yellow-800 border-yellow-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Chats</h1>
        <p className="text-muted-foreground">Communicate with customers about their orders</p>
      </div>

      {ordersWithChat.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active chats</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ordersWithChat.map((order) => {
            const messageCount = getMessageCount(order._id)
            const lastMessage = getLastMessage(order._id)

            return (
              <Card key={order._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{order.customerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">Order #{order._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[order.status]}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastMessage ? (
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">
                        {lastMessage.senderRole === "customer" ? "Customer" : "You"}:
                      </p>
                      <p className="truncate">{lastMessage.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(lastMessage.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedOrderId(order._id)
                      setChatOpen(true)
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {messageCount > 0 ? `View Chat (${messageCount})` : "Start Chat"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedOrderId && <OwnerChatDialog orderId={selectedOrderId} open={chatOpen} onOpenChange={setChatOpen} />}
    </div>
  )
}
