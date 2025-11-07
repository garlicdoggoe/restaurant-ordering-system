"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Clock, CheckCircle, XCircle, Truck, Timer, PackageCheck, Ban, ListFilter } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OwnerChatDialog } from "./owner-chat-dialog"
import { OrderFilter, type StatusFilterOption } from "@/components/ui/order-filter"

export function ChatView() {
  const { orders } = useData()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Draft filters (controlled by UI)
  const [fromDateDraft, setFromDateDraft] = useState("")
  const [toDateDraft, setToDateDraft] = useState("")
  const [statusFilterDraft, setStatusFilterDraft] = useState<string>("recent")
  // Applied filters (used for actual filtering)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("recent")

  // Aggregate chat stats per order without calling hooks in a loop
  const filteredOrders = useMemo(() => orders, [orders])
  const orderIds = useMemo(() => filteredOrders.map((o) => o._id as string), [filteredOrders])
  const perOrderStats = useQuery(api.chat.getPerOrderUnreadAndLast, orderIds.length ? { orderIds } : "skip") ?? []
  const statsMap = useMemo(() => {
    const m = new Map<string, { unreadCount: number; lastMessage: any | null }>()
    for (const r of perOrderStats) m.set(r.orderId, { unreadCount: r.unreadCount, lastMessage: r.lastMessage })
    return m
  }, [perOrderStats])

  // Status filter options (includes an "Active" aggregate option)
  const statusFilterOptions: StatusFilterOption[] = [
    { id: "all", label: "All", icon: Clock },
    { id: "recent", label: "Recent (Today)", icon: Clock },
    { id: "active", label: "Active", icon: ListFilter },
    { id: "pre-order-pending", label: "Pre-order Pending", icon: Clock },
    { id: "pending", label: "Pending", icon: Clock },
    { id: "accepted", label: "Accepted", icon: CheckCircle },
    { id: "ready", label: "Ready", icon: Timer },
    { id: "in-transit", label: "In Transit", icon: Truck },
    { id: "delivered", label: "Delivered", icon: PackageCheck },
    { id: "denied", label: "Denied", icon: XCircle },
    { id: "completed", label: "Completed", icon: CheckCircle },
    { id: "cancelled", label: "Cancelled", icon: Ban },
  ]

  const activeStatuses = new Set(["pre-order-pending", "pending", "accepted", "ready", "in-transit"])

  const withinDateRange = (t: number) => {
    if (!fromDate && !toDate) return true
    const start = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity
    const end = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity
    return t >= start && t <= end
  }

  const matchesStatus = (orderId: string, status: string) => {
    if (statusFilter === "all") return true
    if (statusFilter === "active") return activeStatuses.has(status as any)
    if (statusFilter === "recent") {
      const last = statsMap.get(orderId)?.lastMessage
      if (!last) return false
      const ts = new Date(last.timestamp)
      const now = new Date()
      return ts.getFullYear() === now.getFullYear() && ts.getMonth() === now.getMonth() && ts.getDate() === now.getDate()
    }
    return status === statusFilter
  }

  // Apply filters and sort ascending by creation time
  const ordersWithChat = orders
    .filter((o) => matchesStatus(o._id as string, o.status))
    .filter((o) => withinDateRange((o as any)._creationTime ?? (o as any).createdAt ?? 0))
    .sort((a, b) => {
      if (statusFilter === "recent") {
        const la = statsMap.get(a._id as string)?.lastMessage?.timestamp ?? 0
        const lb = statsMap.get(b._id as string)?.lastMessage?.timestamp ?? 0
        return la - lb
      }
      const ta = (a as any)._creationTime ?? (a as any).createdAt ?? 0
      const tb = (b as any)._creationTime ?? (b as any).createdAt ?? 0
      return ta - tb
    })

  // Helpers for message count and last message
  const getMessageCount = (orderId: string) => statsMap.get(orderId)?.unreadCount ?? 0
  const getLastMessage = (orderId: string) => statsMap.get(orderId)?.lastMessage

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fluid-2xl font-bold">Customer Chats</h1>
        <p className="text-muted-foreground">Communicate with customers about their orders</p>
      </div>

      {/* Filters */}
      <OrderFilter
        fromDate={fromDateDraft}
        toDate={toDateDraft}
        onFromDateChange={setFromDateDraft}
        onToDateChange={setToDateDraft}
        statusFilter={statusFilterDraft}
        onStatusFilterChange={setStatusFilterDraft}
        statusFilterOptions={statusFilterOptions}
        onClearAll={() => {
          // Reset both draft and applied to defaults
          setFromDateDraft("")
          setToDateDraft("")
          setStatusFilterDraft("recent")
          setFromDate("")
          setToDate("")
          setStatusFilter("recent")
        }}
        onApply={() => {
          // Commit drafts to applied
          setFromDate(fromDateDraft)
          setToDate(toDateDraft)
          setStatusFilter(statusFilterDraft)
        }}
        drawerTitle="Filter Chats"
      />

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
            const messageCount = getMessageCount(order._id)
            const lastMessage = getLastMessage(order._id)

            return (
              <Card key={order._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{order.customerName}</CardTitle>
                        {(() => {
                          const stats = statsMap.get(order._id)
                          return stats && stats.unreadCount > 0 ? (
                            <span className="bg-red-600 text-white font-bold text-[18px] leading-none px-2 py-1 rounded-md shadow">
                              {stats.unreadCount}
                            </span>
                          ) : null
                        })()}
                      </div>
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
