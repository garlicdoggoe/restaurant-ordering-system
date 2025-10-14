"use client"

import { useMemo, useState } from "react"
import { useData } from "@/lib/data-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OrderDetails } from "./order-details"

// Historical orders list for owners.
// Displays orders in a row-based layout with filters for category and time range.
// Clicking a row opens the full order details modal reused from active orders view.
export function HistoricalOrdersView() {
  const { orders, menuItems, categories } = useData()

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("") // ISO string from <input type="datetime-local">
  const [toDate, setToDate] = useState<string>("")

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Build a lookup from menuItemId -> categoryId for efficient category filtering.
  const menuItemIdToCategoryId = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of menuItems) {
      map.set(item._id, item.category)
    }
    return map
  }, [menuItems])

  // Historical orders assumption:
  // Treat orders that are no longer in-progress as historical (completed, denied, cancelled).
  // If you want to include all past orders regardless of status, remove the status filter.
  const historicalBase = useMemo(() => {
    return orders.filter((o) => o.status === "completed" || o.status === "denied" || o.status === "cancelled")
  }, [orders])

  const filteredOrders = useMemo(() => {
    // Time filtering: compare created time using either Convex _creationTime or legacy createdAt
    // For "From" date, start from beginning of day (00:00:00.000) to include the entire selected day
    const fromTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null
    // For "To" date, extend to end of day (23:59:59.999) to include the entire selected day
    const toTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null

    return historicalBase.filter((order) => {
      const createdTs = (order._creationTime ?? order.createdAt) || 0

      // Inclusive filtering: >= fromTs and <= toTs
      if (fromTs !== null && createdTs < fromTs) return false
      if (toTs !== null && createdTs > toTs) return false

      if (selectedCategoryId === "all") return true

      // Category filter: include order if ANY item belongs to the selected category
      for (const item of order.items) {
        const catId = menuItemIdToCategoryId.get(item.menuItemId)
        if (catId === selectedCategoryId) return true
      }
      return false
    })
  }, [historicalBase, fromDate, toDate, selectedCategoryId, menuItemIdToCategoryId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order History</h1>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Category</span>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-56" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-56" />
        </div>
      </div>

      {/* Rows Header */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-6 gap-2 bg-muted px-4 py-3 text-sm font-medium">
          <div>Order ID</div>
          <div>Customer</div>
          <div>Contact</div>
          <div>Placed At</div>
          <div>Total</div>
          <div>Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {filteredOrders.map((order) => {
            const createdTs = (order._creationTime ?? order.createdAt) || 0
            const idShort = order._id.slice(-6).toUpperCase()
            return (
              <button
                key={order._id}
                className="grid grid-cols-6 gap-2 w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors"
                onClick={() => setSelectedOrderId(order._id)}
              >
                <div className="font-mono text-sm">#{idShort}</div>
                <div className="text-sm">{order.customerName}</div>
                <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                <div className="text-sm text-muted-foreground">{new Date(createdTs).toLocaleString()}</div>
                <div className="text-sm font-semibold">${order.total.toFixed(2)}</div>
                <div>
                  <Badge
                    variant={order.status === "completed" ? "secondary" : order.status === "denied" ? "destructive" : "outline"}
                  >
                    {order.status}
                  </Badge>
                </div>
              </button>
            )
          })}

          {filteredOrders.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground">No orders match the selected filters.</div>
          )}
        </div>
      </div>

      {selectedOrderId && (
        <OrderDetails orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  )
}



