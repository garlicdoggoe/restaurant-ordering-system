"use client"

import { useMemo, useState } from "react"
import { useData } from "@/lib/data-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OrderDetails } from "./order-details"
import { Button } from "@/components/ui/button"
import { formatPhoneForDisplay } from "@/lib/phone-validation"
import { PaymentModal } from "@/components/ui/payment-modal"
import { StatusBadge } from "@/lib/status-badge"

// Historical orders list for owners.
// Displays orders in a row-based layout with filters for order type and time range.
// Clicking a row opens the full order details modal reused from active orders view.
export function HistoricalOrdersView() {
  const { orders, menuItems, categories } = useData()

  // Filters
  const [selectedOrderType, setSelectedOrderType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("") // ISO string from <input type="datetime-local">
  const [toDate, setToDate] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">("desc") // Default to newest first

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  // Order types for filtering
  const orderTypes = [
    { value: "dine-in", label: "Dine In" },
    { value: "takeaway", label: "Takeaway" },
    { value: "delivery", label: "Delivery" },
    { value: "pre-order", label: "Pre-order" }
  ]

  // Order statuses for filtering
  const orderStatuses = [
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Preparing" },
    { value: "ready", label: "Ready" },
    { value: "in-transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "denied", label: "Denied" },
    { value: "cancelled", label: "Cancelled" },
    { value: "pre-order-pending", label: "Pre-order Pending" }
  ]

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

    const filtered = historicalBase.filter((order) => {
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

      // Order type filter
      if (selectedOrderType !== "all" && order.orderType !== selectedOrderType) return false

      // Order status filter
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false

      return true
    })

    // Sort by date
    return filtered.sort((a, b) => {
      const aTs = (a._creationTime ?? a.createdAt) || 0
      const bTs = (b._creationTime ?? b.createdAt) || 0
      return dateSortOrder === "asc" ? aTs - bTs : bTs - aTs
    })
  }, [historicalBase, fromDate, toDate, selectedOrderType, selectedStatus, search, dateSortOrder])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-2xl font-bold">Order History</h1>
      </div>

      {/* Mobile Filters - Sticky */}
      <div className="lg:hidden sticky top-0 z-40 bg-background pb-4 space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Search</span>
          <Input
            placeholder="Search by #ID, name, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Order Type</span>
            <Select value={selectedOrderType} onValueChange={setSelectedOrderType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Order Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {orderTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">From</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">To</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sort</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateSortOrder(dateSortOrder === "asc" ? "desc" : "asc")}
            className="w-full justify-start"
          >
            {dateSortOrder === "asc" ? "↑ Oldest First" : "↓ Newest First"}
          </Button>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:flex flex-col gap-3 md:flex-row md:items-end">
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
          <span className="text-xs text-muted-foreground">Order Type</span>
          <Select value={selectedOrderType} onValueChange={setSelectedOrderType}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Order Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {orderTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {orderStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
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

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sort</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateSortOrder(dateSortOrder === "asc" ? "desc" : "asc")}
            className="w-56 justify-start"
          >
            {dateSortOrder === "asc" ? "↑ Oldest First" : "↓ Newest First"}
          </Button>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredOrders.map((order) => {
          const createdTs = (order._creationTime ?? order.createdAt) || 0
          const idShort = order._id.slice(-6).toUpperCase()
          return (
            <div
              key={order._id}
              className="border rounded-lg p-4 space-y-3 hover:bg-accent/40 transition-colors"
              onClick={() => setSelectedOrderId(order._id)}
            >
              <div className="flex items-center justify-between">
                <button className="text-left font-mono text-sm hover:text-primary">
                  #{idShort}
                </button>
                <StatusBadge status={order.status} />
              </div>
              <div className="text-sm text-muted-foreground">{new Date(createdTs).toLocaleString()}</div>
              <div className="space-y-1">
                <div className="text-sm font-medium">{order.customerName}</div>
                <div className="text-sm text-muted-foreground">{formatPhoneForDisplay(order.customerPhone)}</div>
                {order.gcashNumber && (
                  <div className="text-sm text-blue-600 font-medium">
                    GCash: (+63) {order.gcashNumber}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">₱{order.total.toFixed(2)}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {order.orderType === 'dine-in' ? 'Dine In' : 
                     order.orderType === 'takeaway' ? 'Takeaway' :
                     order.orderType === 'delivery' ? 'Delivery' :
                     order.orderType === 'pre-order' ? 'Pre-order' : order.orderType}
                  </Badge>
                  {(order.paymentScreenshot || order.downpaymentProofUrl) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPaymentUrl(order.paymentScreenshot || null)
                        setPaymentOpen(true)
                      }}
                    >
                      {order.paymentScreenshot && order.downpaymentProofUrl 
                        ? "View Payment Proofs" 
                        : "View Payment"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filteredOrders.length === 0 && (
          <div className="px-4 py-8 text-sm text-muted-foreground text-center">No orders match the selected filters.</div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-lg border overflow-hidden">
        <div className="grid grid-cols-9 gap-2 bg-muted px-4 py-3 text-sm font-medium">
          <div>Order ID</div>
          <div>Placed At</div>
          <div>Customer</div>
          <div>Contact</div>
          <div>GCash</div>
          <div>Total</div>
          <div>Status</div>
          <div>Order Type</div>
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
                className="grid grid-cols-9 gap-2 w-full px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <button
                  className="text-left font-mono text-sm hover:text-primary"
                  onClick={() => setSelectedOrderId(order._id)}
                >
                  #{idShort}
                </button>
                <div className="text-sm text-muted-foreground">{new Date(createdTs).toLocaleString()}</div>
                <button
                  className="text-left text-sm hover:text-primary"
                  onClick={() => setSelectedOrderId(order._id)}
                >
                  {order.customerName}
                </button>
                <div className="text-sm text-muted-foreground">{formatPhoneForDisplay(order.customerPhone)}</div>
                <div className="text-sm text-blue-600 font-medium">
                  {order.gcashNumber ? `(+63) ${order.gcashNumber}` : '-'}
                </div>
                <div className="text-sm font-semibold">₱{order.total.toFixed(2)}</div>
                <div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-sm">
                  <Badge variant="outline" className="text-xs">
                    {order.orderType === 'dine-in' ? 'Dine In' : 
                     order.orderType === 'takeaway' ? 'Takeaway' :
                     order.orderType === 'delivery' ? 'Delivery' :
                     order.orderType === 'pre-order' ? 'Pre-order' : order.orderType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(order.paymentScreenshot || order.downpaymentProofUrl) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPaymentUrl(order.paymentScreenshot || null)
                        setPaymentOpen(true)
                      }}
                    >
                      {order.paymentScreenshot && order.downpaymentProofUrl 
                        ? "View Payment Proofs" 
                        : "View Payment"}
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

      <PaymentModal 
        open={paymentOpen} 
        onOpenChange={setPaymentOpen} 
        paymentUrl={paymentUrl} 
        downpaymentUrl={null} // Note: Historical orders view doesn't have access to downpaymentProofUrl in this context
        title="Payment Screenshot" 
      />
    </div>
  )
}



