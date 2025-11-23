"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { MessageSquare } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OwnerChatDialog } from "./owner-chat-dialog"
import { OrderFilter } from "@/components/ui/order-filter"
import { StatusBadge } from "@/lib/status-badge"
import { chatStatusFilterOptions } from "@/lib/status-filter-options"

export function ChatView() {
  const { orders, updateOrder } = useData()
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
  const perOrderStatsQuery = useQuery(api.chat.getPerOrderUnreadAndLast, orderIds.length ? { orderIds } : "skip")
  const perOrderStats = useMemo(() => perOrderStatsQuery ?? [], [perOrderStatsQuery])
  const statsMap = useMemo(() => {
    const m = new Map<string, { unreadCount: number; lastMessage: { timestamp: number; message?: string; senderRole?: "owner" | "customer" } | null }>()
    for (const r of perOrderStats) m.set(r.orderId, { unreadCount: r.unreadCount, lastMessage: r.lastMessage })
    return m
  }, [perOrderStats])

  // Status filter options imported from lib for modularity
  const statusFilterOptions = chatStatusFilterOptions

  const activeStatuses = new Set(["pre-order-pending", "pending", "accepted", "ready", "in-transit"])

  const withinDateRange = (t: number) => {
    if (!fromDate && !toDate) return true
    const start = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity
    const end = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity
    return t >= start && t <= end
  }

  const matchesStatus = (orderId: string, status: string) => {
    if (statusFilter === "all") return true
    if (statusFilter === "active") return activeStatuses.has(status as OrderStatus)
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
    .filter((o) => withinDateRange(o._creationTime ?? o.createdAt ?? 0))
    .sort((a, b) => {
      if (statusFilter === "recent") {
        const la = statsMap.get(a._id as string)?.lastMessage?.timestamp ?? 0
        const lb = statsMap.get(b._id as string)?.lastMessage?.timestamp ?? 0
        return la - lb
      }
      const ta = a._creationTime ?? a.createdAt ?? 0
      const tb = b._creationTime ?? b.createdAt ?? 0
      return ta - tb
    })

  // Helpers for message count and last message
  const getMessageCount = (orderId: string) => statsMap.get(orderId)?.unreadCount ?? 0
  const getLastMessage = (orderId: string) => statsMap.get(orderId)?.lastMessage

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
                    <StatusBadge status={order.status} />
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

                  <div className="space-y-2">
                    {/* Chat toggle button */}
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <MessageSquare className={order.allowChat !== false ? "w-4 h-4 text-green-600" : "w-4 h-4 text-red-600"} />
                        <span className="text-xs font-medium">
                          {order.allowChat !== false ? "Chat Enabled" : "Chat Disabled"}
                        </span>
                      </div>
                      <Switch
                        checked={order.allowChat !== false}
                        onCheckedChange={(checked) => {
                          updateOrder(order._id, { allowChat: checked })
                        }}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedOrderId(order._id)
                        setChatOpen(true)
                      }}
                      variant={order.allowChat === false ? "outline" : "default"}
                      disabled={order.allowChat === false}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {order.allowChat === false
                        ? "Chat Disabled"
                        : messageCount > 0
                          ? `View Chat (${messageCount})`
                          : "Start Chat"}
                    </Button>
                  </div>
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
