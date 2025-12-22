"use client"

import { useMemo, useState } from "react"

import { useData, type Order, type OrderItem, type OrderStatus } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  orderId: string
}

const PREORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pre-order-pending", label: "Reviewing" },
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
  // Track which timeline cards are expanded to show/hide order items
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

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

  // Toggle card expansion to show/hide order items
  const toggleCardExpansion = (entryId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  // Split items into regular items and bundle items
  const regularItems = useMemo(() => {
    return filteredPreOrders.flatMap(order =>
      order.items.filter(item => !item.bundleItems || item.bundleItems.length === 0)
    )
  }, [filteredPreOrders])

  const bundleItems = useMemo(() => {
    return filteredPreOrders.flatMap(order =>
      order.items.filter(item => item.bundleItems && item.bundleItems.length > 0)
    )
  }, [filteredPreOrders])

  // Build aggregated regular item totals so the kitchen can prep by quantity.
  const regularAggregatedItems = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>()
    regularItems.forEach((item) => {
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
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [regularItems])

  // Aggregate bundle items by bundle name (e.g., "Family Combo × 5")
  const bundleAggregatedItems = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>()
    bundleItems.forEach((item) => {
      // Use bundle name as key (including variant and choices if applicable)
      const key = buildItemKey(item)
      // Build bundle display name with variant and choices
      let bundleDisplayName = item.name
      if (item.variantName) {
        bundleDisplayName += ` · ${item.variantName}`
      }
      if (item.selectedChoices && Object.keys(item.selectedChoices).length > 0) {
        const choicesText = Object.values(item.selectedChoices).map(c => c.name).join(", ")
        bundleDisplayName += ` (${choicesText})`
      }
      
      const current = map.get(key) ?? {
        key,
        name: bundleDisplayName,
        quantity: 0,
        total: 0,
      }
      current.quantity += item.quantity
      current.total += (item.unitPrice ?? item.price) * item.quantity
      map.set(key, current)
    })
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [bundleItems])

  // Aggregate individual items from all bundles (breakdown)
  // This shows what individual items need to be prepared from all bundles combined
  // Each entry in bundleItems array represents one instance of that item in the bundle
  // So we count each occurrence and multiply by the bundle quantity
  const bundleBreakdownAggregatedItems = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>()
    bundleItems.forEach((bundleItem) => {
      // Iterate through each bundle's individual items
      // Each entry in bundleItems represents one instance of that item in one bundle
      if (bundleItem.bundleItems) {
        bundleItem.bundleItems.forEach((bundleSubItem) => {
          // Create a key for the bundle sub-item (using menuItemId and variantId if available)
          const key = `${bundleSubItem.menuItemId}-${bundleSubItem.variantId ?? "base"}`
          
          // Use the bundle sub-item name
          const itemDisplayName = bundleSubItem.name
          
          const current = map.get(key) ?? {
            key,
            name: itemDisplayName,
            quantity: 0,
            total: 0,
          }
          // Each entry in bundleItems represents 1 instance per bundle, so multiply by bundleItem.quantity
          // (e.g., if 5 Family Combos each contain 2 Pizzas, bundleItems will have Pizza twice, so we add 2*5 = 10)
          current.quantity += bundleItem.quantity
          current.total += bundleSubItem.price * bundleItem.quantity
          map.set(key, current)
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [bundleItems])

  // Build timeline entries so front-of-house knows the sequence.
  // Each order gets its own timeline entry - no merging by customer.
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const formatTime = (timestamp: number) =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(timestamp)

    // Create one timeline entry per order - no grouping or merging
    return filteredPreOrders
      .map((order) => {
        const timestamp = getOrderDate(order).getTime()

        // Recalculate total using deliveryFee from order
        const orderTotal = calculateFullOrderTotal(
          order.subtotal,
          order.platformFee,
          order.deliveryFee || 0,
          order.discount
        )

        return {
          id: order._id,
          timestamp,
          timeLabel: formatTime(timestamp),
          customerName: order.customerName,
          fulfillment: order.preOrderFulfillment,
          items: [...order.items],
          total: orderTotal,
          orderId: order._id,
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)
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

  // CSV export – convert the current filtered pre-orders into a spreadsheet‑friendly file.
  // Each ORDER becomes:
  // 1) a header row with order-level columns filled and an empty `items` cell
  // 2) one row per item where only the `items` column is filled so items expand vertically
  const handleExportCsv = () => {
    if (filteredPreOrders.length === 0) {
      // No data to export – the button will already be disabled, but we keep a guard here for safety.
      return
    }

    const csvContent = buildPreordersCsv(filteredPreOrders)

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    const datePart = selectedDate || formatInputDate(new Date())
    link.href = url
    link.download = `preorders-${datePart}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="space-y-1 md:space-y-2">
        <h1 className="text-fluid-2xl font-bold">Total Monitoring</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Track every pre-order scheduled for the selected day. Switch views to focus on aggregated prep
          quantities or the chronological timeline of who will arrive next.
        </p>
      </header>

      {/* Controls */}
      <Card className="p-3 md:p-4 space-y-4 md:space-y-6">
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
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
            onClick={handleExportCsv}
            disabled={filteredPreOrders.length === 0}
          >
            Export to CSV
          </Button>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowStateFilter((prev) => !prev)}
            className="flex items-center gap-2 text-xs md:text-sm font-medium"
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

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main content */}
        <section className="space-y-4">
          {mode === "aggregated" ? (
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 pb-2 md:pb-4">
                <div>
                  <CardTitle className="text-base md:text-lg">Aggregated Items</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Total quantities for {selectedDate || "all dates"}. Use this to prepare ingredients in advance.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs w-fit">
                  {regularAggregatedItems.length + bundleAggregatedItems.length + bundleBreakdownAggregatedItems.length} items
                </Badge>
              </CardHeader>
              <CardContent className="p-3 md:p-6 space-y-6">
                {/* Regular Items Section */}
                {regularAggregatedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm md:text-base font-semibold">Regular Items</h3>
                      <Badge variant="outline" className="text-xs">
                        {regularAggregatedItems.length} items
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {regularAggregatedItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 md:px-4 md:py-3 shadow-sm bg-white/40"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">₱{item.total.toFixed(2)} total</p>
                          </div>
                          <Badge className="text-sm md:text-base px-3 py-1 flex-shrink-0">
                            ×{item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bundle Items Section */}
                {bundleAggregatedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm md:text-base font-semibold">Bundle Items</h3>
                      <Badge variant="outline" className="text-xs">
                        {bundleAggregatedItems.length} bundles
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {bundleAggregatedItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 md:px-4 md:py-3 shadow-sm bg-blue-50/40 border-blue-200"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">₱{item.total.toFixed(2)} total</p>
                          </div>
                          <Badge className="text-sm md:text-base px-3 py-1 flex-shrink-0 bg-blue-100 text-blue-900">
                            ×{item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bundle Breakdown Section */}
                {bundleBreakdownAggregatedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm md:text-base font-semibold">Bundle Breakdown</h3>
                      <Badge variant="outline" className="text-xs">
                        {bundleBreakdownAggregatedItems.length} items
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Individual items from all bundles combined. Use this for detailed prep planning.
                    </p>
                    <div className="space-y-3">
                      {bundleBreakdownAggregatedItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 md:px-4 md:py-3 shadow-sm bg-green-50/40 border-green-200"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                          </div>
                          <Badge className="text-sm md:text-base px-3 py-1 flex-shrink-0 bg-green-100 text-green-900">
                            ×{item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State - show only if all sections are empty */}
                {regularAggregatedItems.length === 0 && 
                 bundleAggregatedItems.length === 0 && 
                 bundleBreakdownAggregatedItems.length === 0 && (
                  <EmptyState label="No pre-orders for this date." />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-base md:text-lg">Within-the-day Timeline</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  See the exact time each pre-order is scheduled so staff can stage pickups or deliveries.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                {timelineEntries.length === 0 ? (
                  <EmptyState label="No pre-orders scheduled for this date." />
                ) : (
                  <div className="space-y-4">
                    {timelineEntries.map((entry) => {
                      const isExpanded = expandedCards.has(entry.id)
                      return (
                        <article key={entry.id} className="rounded-xl border p-3 md:p-4 shadow-sm">
                          <button
                            type="button"
                            onClick={() => toggleCardExpansion(entry.id)}
                            className="w-full text-left"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs md:text-sm text-muted-foreground">{entry.timeLabel}</p>
                                  <h3 className="text-sm md:text-base font-semibold truncate">{entry.customerName}</h3>
                                </div>
                              </div>
                              <div className="flex items-center flex-wrap gap-1 md:gap-2">
                                {entry.fulfillment && (
                                  <Badge variant="outline" className="uppercase text-[10px]">
                                    {entry.fulfillment}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs md:text-sm">₱{entry.total.toFixed(2)}</Badge>
                              </div>
                            </div>
                          </button>
                          {isExpanded && (
                            <>
                              <ul className="mt-3 space-y-1">
                                {entry.items.map((item, index) => (
                                  <li key={`${entry.id}-${index}`} className="flex justify-between text-xs md:text-sm text-muted-foreground gap-2">
                                    <span className="min-w-0 flex-1 break-words">
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
                                    <span className="flex-shrink-0">₱{((item.unitPrice ?? item.price) * item.quantity).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 w-full md:w-auto text-xs md:text-sm"
                                  onClick={() => setSelectedOrderId(entry.orderId)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Order Details
                                </Button>
                              </div>
                            </>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Right panel summary */}
        <aside className="space-y-3 md:space-y-4">
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Summary</CardTitle>
              <CardDescription className="text-xs md:text-sm">Aggregated totals for the selected date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
              <SummaryStat label="Pre-orders" value={kpis.totalOrders} />
              <SummaryStat label="Items to prep" value={kpis.totalItems} />
              <SummaryStat label="Unique customers" value={kpis.uniqueCustomers} />
              <SummaryStat label="Projected revenue" value={`₱${kpis.revenue.toFixed(2)}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Quick tips</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Use Aggregated view when planning prep, switch to Timeline when coordinating hand-offs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs md:text-sm text-muted-foreground space-y-2 p-3 md:p-6">
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
              className="flex items-center gap-2 md:gap-3 rounded-lg border px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm shadow-sm bg-muted/30"
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
    <div className="rounded-lg border px-3 py-2 md:px-4 md:py-3 bg-muted/30">
      <p className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg md:text-xl font-semibold">{value}</p>
    </div>
  )
}

/**
 * Empty helper so we can reuse the same messaging across the two panels.
 */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 md:py-12 text-center text-xs md:text-sm text-muted-foreground">
      <Calendar className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/40" />
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

// CSV helpers – keep pure so they are easy to test and reuse.
// NOTE: If column order ever changes, update both the headers array AND any index lookups below.
const CSV_HEADERS = [
  "customerName",
  "customerAddress",
  "customerPhone",
  "deliveryFee",
  "discount",
  "downpaymentAmount",
  "paymentPlan",
  "preOrderFulfillment",
  "preOrderScheduledAt",
  "specialInstructions",
  "total",
  "items",
] as const

type CsvHeader = (typeof CSV_HEADERS)[number]

function buildPreordersCsv(orders: Order[]): string {
  const rows: string[][] = []

  // Header row – fixed order so spreadsheets line up correctly.
  rows.push([...CSV_HEADERS])

  const itemsColIndex = CSV_HEADERS.indexOf("items")

  orders.forEach((order) => {
    // Order-level row: all columns except items.
    const orderRow: string[] = CSV_HEADERS.map((header: CsvHeader) => {
      switch (header) {
        case "customerName":
          return order.customerName ?? ""
        case "customerAddress":
          return order.customerAddress ?? ""
        case "customerPhone":
          return order.customerPhone ?? ""
        case "deliveryFee":
          return order.deliveryFee != null ? order.deliveryFee.toFixed(2) : ""
        case "discount":
          return order.discount != null ? order.discount.toFixed(2) : ""
        case "downpaymentAmount":
          return order.downpaymentAmount != null ? order.downpaymentAmount.toFixed(2) : ""
        case "paymentPlan":
          return order.paymentPlan ?? ""
        case "preOrderFulfillment":
          return order.preOrderFulfillment ?? ""
        case "preOrderScheduledAt":
          return order.preOrderScheduledAt != null
            ? formatPreorderScheduledAt(order.preOrderScheduledAt)
            : ""
        case "specialInstructions":
          return order.specialInstructions ?? ""
        case "total":
          // Use the stored total which already includes fees/discounts.
          return order.total != null ? order.total.toFixed(2) : ""
        case "items":
          // Intentionally blank on the order header row so items can expand vertically.
          return ""
      }
    })

    rows.push(orderRow)

    // Item rows: only the `items` column is filled, all others left blank.
    order.items.forEach((item) => {
      // Parent item (regular item or bundle parent)
      const parentRow = new Array(CSV_HEADERS.length).fill("")
      parentRow[itemsColIndex] = formatOrderItemForCsv(item)
      rows.push(parentRow)

      // If this is a bundle, also add separate rows for each sub-item so they are readable line by line.
      if (item.bundleItems && item.bundleItems.length > 0) {
        item.bundleItems.forEach((subItem) => {
          const subRow = new Array(CSV_HEADERS.length).fill("")
          subRow[itemsColIndex] = formatBundleSubItemForCsv(item, subItem)
          rows.push(subRow)
        })
      }
    })
  })

  // Join rows into a CSV string with proper escaping.
  return rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n")
}

function formatPreorderScheduledAt(timestamp: number): string {
  // Convert to a simple `YYYY-MM-DD HH:MM` so spreadsheets parse it as a date/time.
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatOrderItemForCsv(item: OrderItem): string {
  // Start with quantity and base name.
  let text = `${item.quantity}× ${item.name}`

  // Append variant name when present.
  if (item.variantName) {
    text += ` · ${item.variantName}`
  }

  // Append selected choices (e.g., toppings) if any.
  if (item.selectedChoices && Object.keys(item.selectedChoices).length > 0) {
    const choicesText = Object.values(item.selectedChoices)
      .map((choice) => choice.name)
      .join(", ")
    text += ` (${choicesText})`
  }

  return text
}

// For bundles, each sub-item also gets its own vertical row with a simple quantity × name format.
// NOTE: Each bundleSubItem represents one unit per bundle; we multiply by the bundle quantity
// so rows reflect the total pieces needed for that order.
function formatBundleSubItemForCsv(bundleItem: OrderItem, subItem: { name: string }): string {
  const totalQuantity = bundleItem.quantity
  return `${totalQuantity}× ${subItem.name}`
}

function escapeCsvValue(value: string): string {
  if (value === "") return ""

  // Escape double quotes by doubling them per CSV spec.
  let escaped = value.replace(/"/g, '""')

  // Wrap in quotes if the value contains commas, quotes, or newlines.
  if (/[",\n\r]/.test(escaped)) {
    escaped = `"${escaped}"`
  }

  return escaped
}
