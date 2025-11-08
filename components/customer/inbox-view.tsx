"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Clock, CheckCircle, XCircle, Truck, Timer, PackageCheck, Ban, ListFilter } from "lucide-react"
import { useData } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OrderFilter, type StatusFilterOption } from "@/components/ui/order-filter"
import { filterAndSortOrders, getOrderTimestamp } from "@/lib/order-filter-utils"

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

  // Draft filters (controlled)
  const [fromDateDraft, setFromDateDraft] = useState("")
  const [toDateDraft, setToDateDraft] = useState("")
  const [statusFilterDraft, setStatusFilterDraft] = useState<string>("recent")
  // Applied filters (used for actual filtering)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("recent")

  const customerId = currentUser?._id || ""
  // Status filter options
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

  // Note: Date range filtering is now handled by filterAndSortOrders utility



  // Build per-order chat stats for all of this customer's orders to support "recent" filtering
  const allCustomerOrders = useMemo(() => orders.filter((o) => o.customerId === customerId), [orders, customerId])
  const allOrderIds = useMemo(() => allCustomerOrders.map((o) => o._id as string), [allCustomerOrders])
  const perOrderStats = useQuery(api.chat.getPerOrderUnreadAndLast, allOrderIds.length ? { orderIds: allOrderIds } : "skip") ?? []
  const statsMap = useMemo(() => {
    const m = new Map<string, { unreadCount: number; lastMessage: any | null }>()
    for (const r of perOrderStats) m.set(r.orderId, { unreadCount: r.unreadCount, lastMessage: r.lastMessage })
    return m
  }, [perOrderStats])

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

  // Use unified filtering utility with custom sorting for inbox view
  // Standard: most recent first (by last message timestamp for "recent", by creation time otherwise)
  const ordersWithChat = filterAndSortOrders(allCustomerOrders, {
    customerId,
    fromDate,
    toDate,
    statusFilter,
    orderType: "all",
    // Custom status matcher for inbox view
    customStatusMatcher: (order, filter) => matchesStatus(order._id as string, order.status),
    // Custom sort: most recent first (by last message for "recent", by creation time otherwise)
    customSort: (a, b) => {
      if (statusFilter === "recent") {
        // Sort by last message timestamp (most recent first - descending)
        const la = statsMap.get(a._id as string)?.lastMessage?.timestamp ?? 0
        const lb = statsMap.get(b._id as string)?.lastMessage?.timestamp ?? 0
        return lb - la // Descending: most recent first
      }
      // Sort by creation time (most recent first - descending)
      const ta = getOrderTimestamp(a)
      const tb = getOrderTimestamp(b)
      return tb - ta // Descending: most recent first
    },
  })

  // statsMap already computed above for all customer orders

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
          setFromDate(fromDateDraft)
          setToDate(toDateDraft)
          setStatusFilter(statusFilterDraft)
        }}
        drawerTitle="Filter Inbox"
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
            return (
              <Card key={order._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
                        {(() => {
                          const stats = statsMap.get(order._id)
                          return stats && stats.unreadCount > 0 ? (
                            <span className="bg-red-600 text-white font-bold text-[11px] leading-none px-1.5 py-1 rounded-md shadow mb-5px mt-[-5px]">
                              {stats.unreadCount}
                            </span>
                          ) : null
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(order._creationTime ?? order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[order.status as keyof typeof statusColors]}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const stats = statsMap.get(order._id)
                    const lastMessage = stats?.lastMessage
                    const preview = lastMessage ? (lastMessage.message as string) : "No messages yet"
                    return (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate max-w-[75%]">{preview}</p>
                        {!!stats?.unreadCount && (
                          <Badge variant="secondary" className="rounded-full">{stats.unreadCount}</Badge>
                        )}
                      </div>
                    )
                  })()}

                  <Button
                    className="w-full relative"
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
