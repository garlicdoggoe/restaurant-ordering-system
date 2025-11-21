"use client"

import { useState, useEffect } from "react"
import { useData, type Order } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { OrderCard } from "./order-card"
import { DenyOrderDialog } from "./deny-order-dialog"
import { AcceptOrderDialog } from "./accept-order-dialog"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled" | "denied" | "in-transit" | "delivered" | "pre-order-pending"

export function OrdersView({ initialOrderId, initialStatus }: { initialOrderId?: string, initialStatus?: OrderStatus }) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(initialStatus || "pending")
  const [denyOrderId, setDenyOrderId] = useState<string | null>(null)
  const [acceptOrderId, setAcceptOrderId] = useState<string | null>(null)
  // Track expanded state for each order (for mobile collapse/expand)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  // Search state for customer name search
  const [searchQuery, setSearchQuery] = useState<string>("")
  // Search matches state - stores all matching orders with their status
  const [searchMatches, setSearchMatches] = useState<Array<{ order: Order; status: OrderStatus }>>([])
  // Current match index for navigation
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1)
  // Track if we're searching by order ID only (to filter displayed orders)
  const [isSearchingByOrderId, setIsSearchingByOrderId] = useState<boolean>(false)

  const { ordersByStatus } = useData()
  
  // Query to get list of new order IDs (orders created after last view)
  const newOrderIds = useQuery(api.orders.getNewOrderIds) ?? []
  
  // Create a Set for fast lookup of new order IDs
  const newOrderIdsSet = new Set(newOrderIds)

  // Helper function to check if a timestamp is from today (local time)
  // Compares the date portion only, ignoring time
  const isToday = (timestamp: number): boolean => {
    const orderDate = new Date(timestamp)
    const today = new Date()
    
    // Compare year, month, and day only (ignore time)
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate()
    )
  }

  // Filter orders to only show today's orders (except pre-orders)
  // Pre-orders are shown regardless of creation date
  const filterByToday = (orders: Order[]) => {
    return orders.filter((order) => {
      // Always show pre-orders regardless of creation date
      if (order.orderType === "pre-order") {
        return true
      }
      // For regular orders, only show if created today
      // Use createdAt timestamp if available, otherwise fall back to _creationTime
      const orderTimestamp = order.createdAt || order._creationTime || 0
      return isToday(orderTimestamp)
    })
  }

  // NEW: Get filtered orders directly from status-specific queries, then apply today filter
  const getFilteredOrders = () => {
    let orders: Order[] = []
    if (selectedStatus === "pending") orders = ordersByStatus.pending
    else if (selectedStatus === "preparing") orders = ordersByStatus.accepted
    else if (selectedStatus === "ready") orders = ordersByStatus.ready
    else if (selectedStatus === "completed") orders = ordersByStatus.completed
    else if (selectedStatus === "cancelled") orders = ordersByStatus.cancelled
    else if (selectedStatus === "denied") orders = ordersByStatus.denied
    else if (selectedStatus === "in-transit") orders = ordersByStatus["in-transit"]
    else if (selectedStatus === "delivered") orders = ordersByStatus.delivered
    else if (selectedStatus === "pre-order-pending") orders = ordersByStatus["pre-order-pending"] || []
    
    // Apply today filter (excludes pre-orders from date filtering)
    return filterByToday(orders)
  }

  let filteredOrders = getFilteredOrders()

  // When searching by order ID only, show only the matched order(s) across all statuses
  // This ensures only matched orders are displayed, not all orders from the selected status
  if (isSearchingByOrderId && searchMatches.length > 0 && currentMatchIndex >= 0) {
    // Get all matched orders from all statuses
    const matchedOrders = searchMatches.map(m => m.order)
    // Replace filtered orders with only matched orders
    filteredOrders = matchedOrders
  }

  // Calculate counts based on filtered orders (today's orders only, except pre-orders)
  // This ensures the badge counts match what's actually displayed
  const getFilteredCounts = () => {
    return {
      pending: filterByToday(ordersByStatus.pending).length,
      preparing: filterByToday(ordersByStatus.accepted).length,
      ready: filterByToday(ordersByStatus.ready).length,
      completed: filterByToday(ordersByStatus.completed).length,
      cancelled: filterByToday(ordersByStatus.cancelled).length,
      denied: filterByToday(ordersByStatus.denied).length,
      "in-transit": filterByToday(ordersByStatus["in-transit"]).length,
      delivered: filterByToday(ordersByStatus.delivered).length,
      "pre-order-pending": (ordersByStatus["pre-order-pending"] || []).length, // Pre-orders always shown
    }
  }

  const statusCounts = getFilteredCounts()
  // Auto-expand the provided orderId on mount so users see it immediately
  useEffect(() => {
    if (initialOrderId) {
      setExpandedOrders(prev => {
        const next = new Set(prev)
        next.add(initialOrderId)
        return next
      })
    }
  }, [initialOrderId])

  // Map from actual order status to UI status
  const statusMap: Record<string, OrderStatus> = {
    "pending": "pending",
    "accepted": "preparing",
    "ready": "ready",
    "completed": "completed",
    "cancelled": "cancelled",
    "denied": "denied",
    "in-transit": "in-transit",
    "delivered": "delivered",
    "pre-order-pending": "pre-order-pending",
  }

  // Function to navigate to a specific match
  const navigateToMatch = (matchIndex: number) => {
    if (matchIndex < 0 || matchIndex >= searchMatches.length) return
    
    const match = searchMatches[matchIndex]
    // match.status is already the UI status (mapped in handleSearch)
    
    // Redirect to the correct status tab
    setSelectedStatus(match.status)
    // Auto-expand the found order
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.add(match.order._id)
      return next
    })
    // Scroll to top to ensure the order is visible
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Navigate to previous match
  const handlePreviousMatch = () => {
    if (searchMatches.length === 0) return
    const prevIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : searchMatches.length - 1
    setCurrentMatchIndex(prevIndex)
    navigateToMatch(prevIndex)
  }

  // Navigate to next match
  const handleNextMatch = () => {
    if (searchMatches.length === 0) return
    const nextIndex = currentMatchIndex < searchMatches.length - 1 ? currentMatchIndex + 1 : 0
    setCurrentMatchIndex(nextIndex)
    navigateToMatch(nextIndex)
  }

  // Search function: searches across all statuses by customer name or order ID
  // Collects all matching orders and navigates to the first one
  // Searches only within orders that would be displayed (respects today filter for regular orders)
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    // If search is empty, clear matches and reset
    if (!query.trim()) {
      setSearchMatches([])
      setCurrentMatchIndex(-1)
      setIsSearchingByOrderId(false)
      return
    }

    // Search across all statuses - normalize query for case-insensitive search
    const normalizedQuery = query.trim().toLowerCase()
    
    // Check each status group for matching orders
    // Apply the same today filter that's used for display, so we only find orders that would be visible
    const allStatusGroups = [
      { status: "pending", orders: filterByToday(ordersByStatus.pending) },
      { status: "accepted", orders: filterByToday(ordersByStatus.accepted) },
      { status: "ready", orders: filterByToday(ordersByStatus.ready) },
      { status: "completed", orders: filterByToday(ordersByStatus.completed) },
      { status: "cancelled", orders: filterByToday(ordersByStatus.cancelled) },
      { status: "denied", orders: filterByToday(ordersByStatus.denied) },
      { status: "in-transit", orders: filterByToday(ordersByStatus["in-transit"]) },
      { status: "delivered", orders: filterByToday(ordersByStatus.delivered) },
      { status: "pre-order-pending", orders: ordersByStatus["pre-order-pending"] || [] }, // Pre-orders always shown
    ]

    // Collect all matching orders across all statuses
    // Match by customer name OR order ID (full ID or last 6 characters)
    const matches: Array<{ order: Order; status: OrderStatus }> = []
    let hasOrderIdMatches = false
    let hasCustomerNameMatches = false
    
    for (const group of allStatusGroups) {
      const matchingOrders = group.orders.filter((order) => {
        // Match by customer name (case-insensitive)
        const matchesCustomerName = order.customerName.toLowerCase().includes(normalizedQuery)
        
        // Match by order ID - check full ID (case-insensitive)
        // This will match both full IDs and the last 6 characters (display format)
        const orderIdLower = order._id.toLowerCase()
        const matchesOrderId = orderIdLower.includes(normalizedQuery)
        
        // Track what type of matches we have
        if (matchesCustomerName) hasCustomerNameMatches = true
        if (matchesOrderId) hasOrderIdMatches = true
        
        // Return true if either customer name or order ID matches
        return matchesCustomerName || matchesOrderId
      })
      
      // Map actual status to UI status
      const uiStatus = statusMap[group.status] || group.status
      
      // Add all matches from this status group
      matchingOrders.forEach(order => {
        matches.push({ order, status: uiStatus })
      })
    }

    // Determine if search is by order ID only (has order ID matches but no customer name matches)
    // This means we should filter the displayed orders to only show matched ones
    setIsSearchingByOrderId(hasOrderIdMatches && !hasCustomerNameMatches)

    // Update matches state
    setSearchMatches(matches)
    
    // If matches found, navigate to the first one
    if (matches.length > 0) {
      setCurrentMatchIndex(0)
      navigateToMatch(0)
    } else {
      setCurrentMatchIndex(-1)
      setIsSearchingByOrderId(false)
    }
  }

  const nonPreOrders = filteredOrders.filter((o) => o.orderType !== "pre-order")
  const preOrders = filteredOrders.filter((o) => o.orderType === "pre-order")

  // Toggle expanded state for an order
  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const statusOptions = [
    { value: "pending", label: "Pending", count: statusCounts.pending, color: "bg-yellow-100 text-yellow-800" },
    { value: "preparing", label: "Preparing", count: statusCounts.preparing, color: "bg-blue-100 text-blue-800" },
    { value: "ready", label: "Ready", count: statusCounts.ready, color: "bg-indigo-100 text-indigo-800" },
    { value: "completed", label: "Completed", count: statusCounts.completed, color: "bg-green-100 text-green-800" },
    { value: "in-transit", label: "In Transit", count: statusCounts["in-transit"], color: "bg-yellow-100 text-yellow-800" },
    { value: "delivered", label: "Delivered", count: statusCounts.delivered, color: "bg-emerald-100 text-emerald-800" },
    { value: "cancelled", label: "Cancelled", count: statusCounts.cancelled, color: "bg-gray-100 text-gray-800" },
    { value: "denied", label: "Denied", count: statusCounts.denied, color: "bg-red-100 text-red-800" },
    { value: "pre-order-pending", label: "Pre-Orders", count: statusCounts["pre-order-pending"], color: "bg-blue-100 text-blue-800" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-2xl font-bold">Order Line</h1>
      </div>

      {/* Search Input - Search by customer name across all statuses */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by customer name or order ID..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Navigation buttons - show only when there are matches */}
        {searchMatches.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMatch}
              disabled={searchMatches.length === 0}
              className="h-10 w-10"
              aria-label="Previous match"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {currentMatchIndex + 1} / {searchMatches.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="h-10 w-10"
              aria-label="Next match"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Select - Sticky */}
      <div className="lg:hidden sticky top-0 z-40 bg-background pb-4">
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.label}</span>
                  <Badge variant="secondary" className={`rounded-full ${option.color}`}>
                    {option.count}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:flex items-center gap-4">
        <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as OrderStatus)}>
          <TabsList className="bg-muted grid grid-cols-9 w-full">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              <Badge variant="secondary" className="rounded-full bg-yellow-100 text-yellow-800">
                {statusCounts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preparing" className="gap-2">
              Preparing
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                {statusCounts.preparing}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-2">
              Ready
              <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-800">
                {statusCounts.ready}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              <Badge variant="secondary" className="rounded-full bg-green-100 text-green-800">
                {statusCounts.completed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in-transit" className="gap-2">
              In Transit
              <Badge variant="secondary" className="rounded-full bg-yellow-100 text-yellow-800">
                {statusCounts["in-transit"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="gap-2">
              Delivered
              <Badge variant="secondary" className="rounded-full bg-emerald-100 text-emerald-800">
                {statusCounts.delivered}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              Cancelled
              <Badge variant="secondary" className="rounded-full bg-gray-100 text-gray-800">
                {statusCounts.cancelled}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="denied" className="gap-2">
              Denied
              <Badge variant="secondary" className="rounded-full bg-red-100 text-red-800">
                {statusCounts.denied}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pre-order-pending" className="gap-2">
              Pre-Orders
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-800">
                {statusCounts["pre-order-pending"]}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {nonPreOrders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            isExpanded={expandedOrders.has(order._id)}
            onToggleExpand={() => toggleOrderExpanded(order._id)}
            onStatusChange={() => {
            }}
            onDenyClick={(orderId) => setDenyOrderId(orderId)}
            onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
            isNew={newOrderIdsSet.has(order._id)}
          />
        ))}
      </div>

      {preOrders.length > 0 && (
        <>
          <div className="mt-6">
            <h2 className="text-fluid-xl font-semibold">Pre-orders</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {preOrders.map((order) => (
              <OrderCard 
                key={order._id} 
                order={order}
                isExpanded={expandedOrders.has(order._id)}
                onToggleExpand={() => toggleOrderExpanded(order._id)}
                onStatusChange={() => {
                }}
                onDenyClick={(orderId) => setDenyOrderId(orderId)}
                onAcceptClick={(orderId) => setAcceptOrderId(orderId)}
                isNew={newOrderIdsSet.has(order._id)}
              />
            ))}
          </div>
        </>
      )}

      {denyOrderId && (
        <DenyOrderDialog
          orderId={denyOrderId}
          onClose={() => setDenyOrderId(null)}
          onSuccess={() => {
            setDenyOrderId(null)
          }}
        />
      )}

      {acceptOrderId && (
        <AcceptOrderDialog
          orderId={acceptOrderId}
          onClose={() => setAcceptOrderId(null)}
          onSuccess={() => {
            setAcceptOrderId(null)
          }}
        />
      )}
    </div>
  )
}
