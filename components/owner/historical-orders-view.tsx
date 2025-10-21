"use client"

import { useMemo, useState } from "react"
import { useData } from "@/lib/data-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OrderDetails } from "./order-details"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatPhoneForDisplay } from "@/lib/phone-validation"

// Historical orders list for owners.
// Displays orders in a row-based layout with filters for category and time range.
// Clicking a row opens the full order details modal reused from active orders view.
export function HistoricalOrdersView() {
  const { orders, menuItems, categories } = useData()

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("") // ISO string from <input type="datetime-local">
  const [toDate, setToDate] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // Build a lookup from menuItemId -> categoryId for efficient category filtering.
  const menuItemIdToCategoryId = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of menuItems) {
      map.set(item._id, item.category)
    }
    return map
  }, [menuItems])

  // Include all orders regardless of status in history
  const historicalBase = useMemo(() => {
    return orders
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

      // Search filter: match last 6 of order ID, customer name, or phone
      const q = search.trim().toLowerCase()
      if (q) {
        const idShort = (order._id || "").slice(-6).toLowerCase()
        const name = (order.customerName || "").toLowerCase()
        const phone = (order.customerPhone || "").toLowerCase()
        const matches = idShort.includes(q) || name.includes(q) || phone.includes(q)
        if (!matches) return false
      }

      if (selectedCategoryId === "all") return true

      // Category filter: include order if ANY item belongs to the selected category
      for (const item of order.items) {
        const catId = menuItemIdToCategoryId.get(item.menuItemId)
        if (catId === selectedCategoryId) return true
      }
      return false
    })
  }, [historicalBase, fromDate, toDate, selectedCategoryId, search, menuItemIdToCategoryId])

  // Status badge colors aligned across the app
  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border-green-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    "in-transit": "bg-purple-100 text-purple-800 border-purple-200",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order History</h1>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Search</span>
          <Input
            placeholder="Search by #ID, name, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
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
        <div className="grid grid-cols-7 gap-2 bg-muted px-4 py-3 text-sm font-medium">
          <div>Order ID</div>
          <div>Customer</div>
          <div>Contact</div>
          <div>Placed At</div>
          <div>Total</div>
          <div>Status</div>
          <div>Payment</div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {filteredOrders.map((order) => {
            const createdTs = (order._creationTime ?? order.createdAt) || 0
            const idShort = order._id.slice(-6).toUpperCase()
            return (
              <div
                key={order._id}
                className="grid grid-cols-7 gap-2 w-full px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <button
                  className="text-left font-mono text-sm hover:text-primary"
                  onClick={() => setSelectedOrderId(order._id)}
                >
                  #{idShort}
                </button>
                <button
                  className="text-left text-sm hover:text-primary"
                  onClick={() => setSelectedOrderId(order._id)}
                >
                  {order.customerName}
                </button>
                <div className="text-sm text-muted-foreground">{formatPhoneForDisplay(order.customerPhone)}</div>
                <div className="text-sm text-muted-foreground">{new Date(createdTs).toLocaleString()}</div>
                <div className="text-sm font-semibold">₱{order.total.toFixed(2)}</div>
                <div>
                  <Badge
                    variant="outline"
                    className={statusColors[order.status] ?? ""}
                  >
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {order.paymentScreenshot && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPaymentUrl(order.paymentScreenshot || null)
                        setPaymentOpen(true)
                      }}
                    >
                      View Payment
                    </Button>
                  )}
                </div>
              </div>
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

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {paymentUrl ? (
            <img src={paymentUrl} alt="Payment Screenshot" className="w-full rounded border object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">No payment screenshot available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}



