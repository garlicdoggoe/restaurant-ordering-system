"use client"

import React, { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Clock, CheckCircle, XCircle, Truck, Timer, PackageCheck, Ban, ListFilter } from "lucide-react"
import { useData, type OrderStatus } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OrderFilter, type StatusFilterOption } from "@/components/ui/order-filter"
import { filterAndSortOrders, getOrderTimestamp } from "@/lib/order-filter-utils"
import { StatusBadge } from "@/lib/status-badge"

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
  const [, setStatusFilterDraft] = useState<string>("active")
  // Applied filters (used for actual filtering)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")

  const customerId = currentUser?._id || ""
  // Status filter options - memoized to prevent dependency changes
  const statusFilterOptions: StatusFilterOption[] = useMemo(() => [
    { id: "all", label: "All", icon: Clock },
    { id: "active", label: "Open Orders", icon: ListFilter },
    { id: "pre-order-pending", label: "Pre-order Pending", icon: Clock },
    { id: "pending", label: "Pending", icon: Clock },
    { id: "accepted", label: "Preparing", icon: CheckCircle },
    { id: "ready", label: "Ready", icon: Timer },
    { id: "in-transit", label: "In Transit", icon: Truck },
    { id: "delivered", label: "Delivered", icon: PackageCheck },
    { id: "denied", label: "Denied", icon: XCircle },
    { id: "completed", label: "Completed", icon: CheckCircle },
    { id: "cancelled", label: "Cancelled", icon: Ban },
  ], [])

  const activeStatuses = new Set(["pre-order-pending", "pending", "accepted", "ready", "in-transit"])

  // Note: Date range filtering is now handled by filterAndSortOrders utility



  // Build per-order chat stats for all of this customer's orders
  const allCustomerOrders = useMemo(() => orders.filter((o) => o.customerId === customerId), [orders, customerId])
  const allOrderIds = useMemo(() => allCustomerOrders.map((o) => o._id as string), [allCustomerOrders])
  const perOrderStatsQuery = useQuery(api.chat.getPerOrderUnreadAndLast, allOrderIds.length ? { orderIds: allOrderIds } : "skip")
  const perOrderStats = useMemo(() => perOrderStatsQuery ?? [], [perOrderStatsQuery])
  const statsMap = useMemo(() => {
    const m = new Map<string, { unreadCount: number; lastMessage: { timestamp: number; message?: string } | null }>()
    for (const r of perOrderStats) m.set(r.orderId, { unreadCount: r.unreadCount, lastMessage: r.lastMessage })
    return m
  }, [perOrderStats])

  const matchesStatus = (orderId: string, status: string) => {
    if (statusFilter === "all") return true
    if (statusFilter === "active") return activeStatuses.has(status as OrderStatus)
    return status === statusFilter
  }

  // Calculate unread counts per status filter option
  // Only calculate for specific order statuses, NOT for aggregate filters (all, active)
  const statusUnreadCounts = useMemo(() => {
    const counts = new Map<string, number>()
    
    // Aggregate filter IDs that should NOT show notifications
    const aggregateFilters = new Set(["all", "active"])
    
    // Initialize only specific status options with 0 (exclude aggregate filters)
    statusFilterOptions.forEach(option => {
      if (!aggregateFilters.has(option.id)) {
        counts.set(option.id, 0)
      }
    })
    
    // Calculate counts for each order - only for specific order statuses
    allCustomerOrders.forEach(order => {
      const orderId = order._id as string
      const stats = statsMap.get(orderId)
      const unreadCount = stats?.unreadCount ?? 0
      
      if (unreadCount === 0) return // Skip orders with no unread messages
      
      const orderStatus = order.status
      
      // Only add to specific status count (not aggregate filters)
      if (orderStatus && !aggregateFilters.has(orderStatus)) {
        const statusCount = counts.get(orderStatus) ?? 0
        counts.set(orderStatus, statusCount + unreadCount)
      }
    })
    
    return counts
  }, [allCustomerOrders, statsMap, statusFilterOptions])

  // Use unified filtering utility with custom sorting for inbox view
  // Standard: most recent first (by creation time)
  const ordersWithChat = filterAndSortOrders(allCustomerOrders, {
    customerId,
    fromDate,
    toDate,
    statusFilter,
    orderType: "all",
    // Custom status matcher for inbox view
    customStatusMatcher: (order) => matchesStatus(order._id as string, order.status),
    // Custom sort: most recent first (by creation time)
    customSort: (a, b) => {
      // Sort by creation time (most recent first - descending)
      const ta = getOrderTimestamp(a)
      const tb = getOrderTimestamp(b)
      return tb - ta // Descending: most recent first
    },
  })

  // statsMap already computed above for all customer orders

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

  // Handler for status filter changes - applies immediately (especially for mobile)
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilterDraft(newStatus)
    // Apply immediately - no need to click "Apply Filters" for status filters
    setStatusFilter(newStatus)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <OrderFilter
        fromDate={fromDateDraft}
        toDate={toDateDraft}
        onFromDateChange={setFromDateDraft}
        onToDateChange={setToDateDraft}
        appliedFromDate={fromDate}
        appliedToDate={toDate}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        statusFilterOptions={statusFilterOptions}
        statusUnreadCounts={statusUnreadCounts}
        onClearAll={() => {
          // Reset both draft and applied to defaults
          setFromDateDraft("")
          setToDateDraft("")
          setStatusFilterDraft("active")
          setFromDate("")
          setToDate("")
          setStatusFilter("active")
        }}
        onApply={() => {
          // Only apply date filters - status filters are already applied immediately
          setFromDate(fromDateDraft)
          setToDate(toDateDraft)
        }}
        drawerTitle="Date Range"
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
                    <StatusBadge status={order.status} />
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
