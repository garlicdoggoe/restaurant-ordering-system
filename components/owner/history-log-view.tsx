"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Calendar, Download, Filter } from "lucide-react"
import { useData } from "@/lib/data-context"
import { formatPhoneForDisplay } from "@/lib/phone-validation"

export function HistoryLogView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const { orderModifications, orders } = useData()

  // Filter modifications based on search and filters
  const filteredModifications = orderModifications.filter((mod) => {
    // Search filter
    const order = orders.find(o => o._id === mod.orderId)
    const matchesSearch = searchQuery === "" || 
      mod.modifiedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.itemDetails?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order?.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order?._id.toLowerCase().includes(searchQuery.toLowerCase())

    // Date filter
    const modDate = new Date(mod.timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    let matchesDate = true
    if (dateFilter === "today") {
      matchesDate = modDate >= today
    } else if (dateFilter === "yesterday") {
      matchesDate = modDate >= yesterday && modDate < today
    } else if (dateFilter === "week") {
      matchesDate = modDate >= weekAgo
    } else if (dateFilter === "month") {
      matchesDate = modDate >= monthAgo
    }

    // Type filter
    const matchesType = typeFilter === "all" || mod.modificationType === typeFilter

    return matchesSearch && matchesDate && matchesType
  })

  // Get order details for a modification
  const getOrderDetails = (orderId: string) => {
    return orders.find(o => o._id === orderId)
  }

  // Format modification type for display
  const formatModificationType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Export functionality (placeholder)
  const handleExport = () => {
    const csvContent = [
      ["Date", "Order ID", "Customer", "Modified By", "Type", "Details"],
      ...filteredModifications.map(mod => {
        const order = getOrderDetails(mod.orderId)
        return [
          new Date(mod.timestamp).toLocaleString(),
          order?._id.slice(-6).toUpperCase() || "Unknown",
          order?.customerName || "Unknown",
          mod.modifiedByName,
          formatModificationType(mod.modificationType),
          mod.itemDetails || ""
        ]
      })
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `order-modifications-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-fluid-2xl font-bold">Order Modification History</h1>
        <Button onClick={handleExport} className="gap-2 w-full lg:w-auto">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer, or details..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Types</option>
            <option value="item_added">Item Added</option>
            <option value="item_removed">Item Removed</option>
            <option value="item_quantity_changed">Quantity Changed</option>
            <option value="item_price_changed">Price Changed</option>
            <option value="order_edited">Order Edited</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredModifications.length} of {orderModifications.length} modifications
        {searchQuery && (
          <span> matching "{searchQuery}"</span>
        )}
        {dateFilter !== "all" && (
          <span> from {dateFilter}</span>
        )}
        {typeFilter !== "all" && (
          <span> of type {formatModificationType(typeFilter)}</span>
        )}
      </div>

      {/* Modifications List */}
      <div className="space-y-4">
        {filteredModifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No modifications found matching your criteria
          </div>
        ) : (
          filteredModifications.map((mod) => {
            const order = getOrderDetails(mod.orderId)
            return (
              <Card key={mod._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        Order #{order?._id.slice(-6).toUpperCase() || "Unknown"}
                      </CardTitle>
                      <Badge variant="outline">
                        {formatModificationType(mod.modificationType)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(mod.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Order Details</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>{" "}
                          <span className="font-medium">{order?.customerName || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>{" "}
                          <span>{order?.customerPhone ? formatPhoneForDisplay(order.customerPhone) : "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>{" "}
                          <Badge variant="secondary" className="ml-1">
                            {order?.status || "Unknown"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Modification Details</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Modified by:</span>{" "}
                          <span className="font-medium">{mod.modifiedByName}</span>
                        </div>
                        {mod.itemDetails && (
                          <div>
                            <span className="text-muted-foreground">Details:</span>{" "}
                            <span>{mod.itemDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Show before/after values for detailed modifications */}
                  {(mod.modificationType === "order_edited" || mod.modificationType === "item_quantity_changed") && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Changes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-medium text-red-600 mb-1">Before</div>
                          <div className="bg-red-50 p-2 rounded text-muted-foreground">
                            {JSON.stringify(JSON.parse(mod.previousValue), null, 2)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-green-600 mb-1">After</div>
                          <div className="bg-green-50 p-2 rounded text-muted-foreground">
                            {JSON.stringify(JSON.parse(mod.newValue), null, 2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
