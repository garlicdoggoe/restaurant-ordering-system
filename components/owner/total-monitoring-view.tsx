"use client"

import { useMemo, useState } from "react"

import { useData, type Order, type OrderItem, type OrderStatus } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, RefreshCcw, Clock4, Eye, ChevronDown, ChevronRight } from "lucide-react"
import { OrderDetails } from "./order-details"
import { calculateFullOrderTotal } from "@/lib/order-utils"

type MonitoringMode = "aggregated" | "timeline"

interface AggregatedItem {
  key: string
  name: string
  quantity: number
  total: number
}

interface TimelineEntry {
  id: string
  timestamp: number
  timeLabel: string
  customerName: string
  fulfillment?: Order["preOrderFulfillment"]
  items: OrderItem[]
  total: number
  primaryOrderId: string
  orderIds: string[]
}

const PREORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pre-order-pending", label: "Pre-order Pending" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "ready", label: "Ready" },
  { value: "in-transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "denied", label: "Denied" },
  { value: "cancelled", label: "Cancelled" },
]
const ALL_PREORDER_STATUSES: OrderStatus[] = PREORDER_STATUS_OPTIONS.map((option) => option.value)

/**
 * TotalMonitoringView
 *
 * This dashboard is dedicated to pre-orders only.
 * Owners can:
 * 1. Pick a specific date to see every scheduled pre-order for that day.
 * 2. Toggle between aggregated item totals and a time-based timeline of who ordered what.
 * 3. Review a right-hand summary panel that keeps the top-line numbers (orders, items, revenue) visible.
 *
 * NOTE:
 * - We rely on `preOrderScheduledAt` whenever available because that is the true fulfillment date.
 * - When a schedule is missing we gracefully fall back to `createdAt` so no order is lost.
 *
 * Manual Test Checklist:
 * 1. Open the Owner dashboard, switch to “Total Monitoring”, ensure the board renders without runtime errors.
 * 2. Change the date picker – the aggregated list and summary panel must update in sync.
 * 3. Toggle Aggregated/Timeline – confirm each mode preserves the chosen date and only shows pre-orders.
 * 4. For a day with no records the empty states should appear in both panels with friendly text.
 */
export function TotalMonitoringView() {
  const { orders } = useData()

  // Pre-select today's date so owners instantly see the latest queue.
  const [selectedDate, setSelectedDate] = useState(() => formatInputDate(new Date()))
  const [mode, setMode] = useState<MonitoringMode>("aggregated")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(() => [...ALL_PREORDER_STATUSES])
  // Keep the checkbox matrix hidden by default so the controls stay tidy until owners need them.
  const [showStateFilter, setShowStateFilter] = useState(false)

  // Work only with pre-orders – this view is intentionally scoped.
  const preOrdersForDate = useMemo(() => {
    const targetDate = selectedDate ? new Date(selectedDate) : undefined
    return orders
      .filter((order) => order.orderType === "pre-order")
      .filter((order) => {
        if (!targetDate) return true
        const scheduleDate = getOrderDate(order)
        return isSameDay(scheduleDate, targetDate)
      })
  }, [orders, selectedDate])

  // Pre-compute how many orders fall under each state so the checkbox list can display live counts.
  const statusOptions = useMemo(() => {
    return PREORDER_STATUS_OPTIONS.map((option) => ({
      ...option,
      count: preOrdersForDate.filter((order) => order.status === option.value).length,
    }))
  }, [preOrdersForDate])

  // Apply the checkbox state filter before calculating any downstream metrics or UI sections.
  const filteredPreOrders = useMemo(() => {
    const allowedStatuses = new Set(selectedStatuses)
    return preOrdersForDate.filter((order) => allowedStatuses.has(order.status))
  }, [preOrdersForDate, selectedStatuses])

  // Checkbox helpers stay tiny so we can easily reuse the same behavior if we relocate the component.
  const toggleStatus = (status: OrderStatus) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((entry) => entry !== status)
      }
      return [...prev, status]
    })
  }

  const selectAllStatuses = () => {
    setSelectedStatuses([...ALL_PREORDER_STATUSES])
  }

  const clearStatuses = () => {
    setSelectedStatuses([])
  }

  // Build aggregated item totals so the kitchen can prep by quantity.
  const aggregatedItems = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>()
    filteredPreOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = buildItemKey(item)
        // Build item name with variant and choices
        let itemDisplayName = item.name
        if (item.variantName) {
          itemDisplayName += ` · ${item.variantName}`
        }
        if (item.selectedChoices && Object.keys(item.selectedChoices).length > 0) {
          const choicesText = Object.values(item.selectedChoices).map(c => c.name).join(", ")
          itemDisplayName += ` (${choicesText})`
        }
        
        const current = map.get(key) ?? {
          key,
          name: itemDisplayName,
          quantity: 0,
          total: 0,
        }
        current.quantity += item.quantity
        current.total += (item.unitPrice ?? item.price) * item.quantity
        map.set(key, current)
      })
    })
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [filteredPreOrders])

  // Build timeline entries so front-of-house knows the sequence.
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const formatTime = (timestamp: number) =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(timestamp)

    const byCustomer = new Map<string, TimelineEntry>()

    filteredPreOrders.forEach((order) => {
      const timestamp = getOrderDate(order).getTime()
      const existing = byCustomer.get(order.customerId)

      // Recalculate total using deliveryFee from order
      const orderTotal = calculateFullOrderTotal(
        order.subtotal,
        order.platformFee,
        order.deliveryFee || 0,
        order.discount
      )

      if (!existing) {
        byCustomer.set(order.customerId, {
          id: `${order.customerId}-${timestamp}`,
          timestamp,
          timeLabel: formatTime(timestamp),
          customerName: order.customerName,
          fulfillment: order.preOrderFulfillment,
          items: [...order.items],
          total: orderTotal,
          primaryOrderId: order._id,
          orderIds: [order._id],
        })
        return
      }

      // Keep the earliest schedule so the list stays chronological per customer
      if (timestamp < existing.timestamp) {
        existing.timestamp = timestamp
        existing.timeLabel = formatTime(timestamp)
        existing.fulfillment = order.preOrderFulfillment ?? existing.fulfillment
        existing.primaryOrderId = order._id
      }

      // Append every item so staff can see the complete haul per customer
      existing.items = [...existing.items, ...order.items]
      existing.total += orderTotal
      existing.orderIds = [...existing.orderIds, order._id]
    })

    return Array.from(byCustomer.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredPreOrders])

  // High-level KPIs for the sticky summary pane.
  const kpis = useMemo(() => {
    const totalOrders = filteredPreOrders.length
    const totalItems = filteredPreOrders.reduce(
      (acc, order) => acc + order.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    )
    // Recalculate revenue using deliveryFee from each order
    const revenue = filteredPreOrders.reduce((acc, order) => {
      const orderTotal = calculateFullOrderTotal(
        order.subtotal,
        order.platformFee,
        order.deliveryFee || 0,
        order.discount
      )
      return acc + orderTotal
    }, 0)
    const uniqueCustomers = new Set(filteredPreOrders.map((order) => order.customerId)).size
    return { totalOrders, totalItems, revenue, uniqueCustomers }
  }, [filteredPreOrders])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-fluid-2xl font-bold">Total Monitoring</h1>
        <p className="text-muted-foreground text-sm">
          Track every pre-order scheduled for the selected day. Switch views to focus on aggregated prep
          quantities or the chronological timeline of who will arrive next.
        </p>
      </header>

      {/* Controls */}
      <Card className="p-4 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="touch-target"
                onClick={() => setSelectedDate(formatInputDate(new Date()))}
                title="Jump to today"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">View Filter</Label>
            <Tabs value={mode} onValueChange={(value) => setMode(value as MonitoringMode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="aggregated" className="gap-2 text-xs md:text-sm">
                  <Calendar className="h-4 w-4" />
                  Aggregated
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2 text-xs md:text-sm">
                  <Clock4 className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowStateFilter((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {showStateFilter ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {showStateFilter ? "Hide state filter" : "Show state filter"}
            <span className="text-xs text-muted-foreground">
              ({selectedStatuses.length}/{ALL_PREORDER_STATUSES.length} selected)
            </span>
          </Button>
          {showStateFilter && (
            <StateFilter
              options={statusOptions}
              selectedStatuses={selectedStatuses}
              onToggleStatus={toggleStatus}
              onSelectAll={selectAllStatuses}
              onClearAll={clearStatuses}
            />
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main content */}
        <section className="space-y-4">
          {mode === "aggregated" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Aggregated Items</CardTitle>
                  <CardDescription>
                    Total quantities for {selectedDate || "all dates"}. Use this to prepare ingredients in advance.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {aggregatedItems.length} items
                </Badge>
              </CardHeader>
              <CardContent>
                {aggregatedItems.length === 0 ? (
                  <EmptyState label="No pre-orders for this date." />
                ) : (
                  <div className="space-y-3">
                    {aggregatedItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-lg border px-4 py-3 shadow-sm bg-white/40"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">₱{item.total.toFixed(2)} total</p>
                        </div>
                        <Badge className="text-base px-3 py-1">
                          ×{item.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle>Within-the-day Timeline</CardTitle>
                <CardDescription>
                  See the exact time each pre-order is scheduled so staff can stage pickups or deliveries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timelineEntries.length === 0 ? (
                  <EmptyState label="No pre-orders scheduled for this date." />
                ) : (
                  <ScrollArea className="max-h-[540px]">
                    <div className="space-y-4 pr-2">
                      {timelineEntries.map((entry) => (
                        <article key={entry.id} className="rounded-xl border p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-sm text-muted-foreground">{entry.timeLabel}</p>
                              <h3 className="text-base font-semibold">{entry.customerName}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.fulfillment && (
                                <Badge variant="outline" className="uppercase text-[10px]">
                                  {entry.fulfillment}
                                </Badge>
                              )}
                              <Badge variant="secondary">₱{entry.total.toFixed(2)}</Badge>
                            </div>
                          </div>
                          <ul className="mt-3 space-y-1 text-sm">
                            {entry.items.map((item, index) => (
                              <li key={`${entry.id}-${index}`} className="flex justify-between text-muted-foreground">
                                <span>
                                  {item.quantity}× {item.name}
                                  {item.variantName ? ` · ${item.variantName}` : ""}
                                  {item.selectedChoices && Object.keys(item.selectedChoices).length > 0 && (
                                    <span className="text-muted-foreground">
                                      {" ("}
                                      {Object.values(item.selectedChoices).map(c => c.name).join(", ")}
                                      {")"}
                                    </span>
                                  )}
                                </span>
                                <span>₱{((item.unitPrice ?? item.price) * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setSelectedOrderId(entry.primaryOrderId)}
                            >
                              <Eye className="h-4 w-4" />
                              View Order Details
                            </Button>
                            {entry.orderIds.length > 1 && (
                              <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                                {entry.orderIds.length} orders merged
                              </Badge>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Right panel summary */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Aggregated totals for the selected date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryStat label="Pre-orders" value={kpis.totalOrders} />
              <SummaryStat label="Items to prep" value={kpis.totalItems} />
              <SummaryStat label="Unique customers" value={kpis.uniqueCustomers} />
              <SummaryStat label="Projected revenue" value={`₱${kpis.revenue.toFixed(2)}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick tips</CardTitle>
              <CardDescription>
                Use Aggregated view when planning prep, switch to Timeline when coordinating hand-offs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Filters only affect pre-orders so regular orders stay out of the way.</p>
              <p>• Update the scheduled times to keep this board accurate for the team.</p>
              <p>• When in doubt, refresh the date picker to snap back to today.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
      {selectedOrderId && (
        <OrderDetails orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  )
}

interface StateFilterOption {
  value: OrderStatus
  label: string
  count: number
}

interface StateFilterProps {
  options: StateFilterOption[]
  selectedStatuses: OrderStatus[]
  onToggleStatus: (status: OrderStatus) => void
  onSelectAll: () => void
  onClearAll: () => void
}

/**
 * Dedicated checkbox group so owners can zero in on only the states that matter for prep.
 * The component stays generic so we can reuse it in future variants (e.g., customer monitoring).
 */
function StateFilter({
  options,
  selectedStatuses,
  onToggleStatus,
  onSelectAll,
  onClearAll,
}: StateFilterProps) {
  const allSelected = selectedStatuses.length === options.length
  const hasSelection = selectedStatuses.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">States</Label>
          <p className="text-xs text-muted-foreground">
            Toggle the statuses you want to surface in the list and KPIs.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-primary hover:underline disabled:text-muted-foreground"
            disabled={allSelected}
          >
            Select all
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-primary hover:underline disabled:text-muted-foreground"
            disabled={!hasSelection}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isChecked = selectedStatuses.includes(option.value)
          return (
            <label
              key={option.value}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm bg-muted/30"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleStatus(option.value)}
                className="h-4 w-4 rounded border border-input text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              />
              <span className="flex-1">{option.label}</span>
              <Badge variant="outline" className="text-[11px]">
                {option.count}
              </Badge>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Small helper component for the right-side KPIs so the UI stays consistent and self-documenting.
 */
function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border px-4 py-3 bg-muted/30">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

/**
 * Empty helper so we can reuse the same messaging across the two panels.
 */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <Calendar className="h-10 w-10 text-muted-foreground/40" />
      <p>{label}</p>
    </div>
  )
}

// Date helpers – centralized so we can keep comments close to the implementation.
function getOrderDate(order: Order): Date {
  // Prefer the scheduled fulfillment time because that is what kitchens care about.
  if (order.preOrderScheduledAt) {
    return new Date(order.preOrderScheduledAt)
  }
  // Fall back to createdAt to avoid hiding orders if a schedule is missing.
  return new Date(order.createdAt ?? order._creationTime ?? Date.now())
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatInputDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function buildItemKey(item: OrderItem): string {
  return `${item.name}-${item.variantId ?? "base"}`
}


