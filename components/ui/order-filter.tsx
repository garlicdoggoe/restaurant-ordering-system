"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Filter, X, LucideIcon } from "lucide-react"

export interface StatusFilterOption {
  id: string
  label: string
  icon: LucideIcon
}

interface OrderFilterProps {
  // Date filter state (draft values - what user is currently selecting)
  fromDate: string
  toDate: string
  onFromDateChange: (date: string) => void
  onToDateChange: (date: string) => void
  
  // Applied date filter values (to compare with draft and show Apply button when different)
  appliedFromDate?: string
  appliedToDate?: string
  
  // Status filter state
  statusFilter: string
  onStatusFilterChange: (filter: string) => void
  
  // Filter options configuration
  statusFilterOptions: StatusFilterOption[]
  
  // Clear all filters handler
  onClearAll: () => void
  
  // Apply filters handler (parent decides when to commit staged values)
  onApply?: () => void
  
  // Optional title for the filter drawer
  drawerTitle?: string
}

/**
 * Reusable order filter component that provides:
 * - Sticky filter section that locks below top nav on mobile (top-14)
 * - Full-width filter bar with status tabs and date filter controls
 * - Mobile: Compact view with status tabs and expandable drawer for date filters
 * - Desktop: Full filter controls with date range and status filters
 * 
 * This component handles the UI and state management for filtering orders by date and status.
 */
export function OrderFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  appliedFromDate = "",
  appliedToDate = "",
  statusFilter,
  onStatusFilterChange,
  statusFilterOptions,
  onClearAll,
  onApply,
  drawerTitle = "Filter Orders",
}: OrderFilterProps) {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  return (
    <>
      {/* Sticky Filter Section - Full width, locks below top nav on mobile */}
      <div className="sticky top-14 lg:top-0 z-40 bg-background border-b shadow-sm -mx-3 xs:-mx-6 px-3 xs:px-6 py-3 xs:py-4">
        <div className="space-y-3">
          {/* Mobile: Compact filter bar with status tabs and expand button */}
          <div className="lg:hidden">
            {/* Status filter tabs - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {statusFilterOptions.map((option) => {
                const Icon = option.icon
                const isActive = statusFilter === option.id
                return (
                  <Button
                    key={option.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStatusFilterChange(option.id)}
                    className={`flex-shrink-0 gap-2 touch-target text-xs ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-fluid-sm">{option.label}</span>
                  </Button>
                )
              })}
            </div>
            
            {/* Date filters section - button to open drawer and apply button when filters are set */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterDrawerOpen(true)}
                className="w-full touch-target flex items-center justify-center gap-2"
              >
              <Filter className="h-4 w-4" />
              <span className="text-xs">
                {(() => {
                  // Don't show dates when "Recent (Today)" filter is active
                  if (statusFilter === "recent") {
                    return "Date Filters"
                  }
                  // Show actual dates when filters are active
                  if (appliedFromDate || appliedToDate) {
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return ""
                      const date = new Date(dateStr)
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    const from = formatDate(appliedFromDate)
                    const to = formatDate(appliedToDate)
                    if (from && to) {
                      return `${from} - ${to}`
                    } else if (from) {
                      return `From ${from}`
                    } else if (to) {
                      return `Until ${to}`
                    }
                  }
                  return "Date Filters"
                })()}
              </span>
              </Button>
              
              {/* Show Apply Filters button when date filters are set (draft state differs from applied) */}
              {onApply && (fromDate !== appliedFromDate || toDate !== appliedToDate) && (
                <Button
                  size="sm"
                  onClick={() => {
                    onApply()
                  }}
                  className="w-full touch-target"
                >
                  Apply Filters
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: Full filter controls */}
          <div className="hidden lg:block space-y-4">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label htmlFor="desktop-from-date" className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    id="desktop-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromDateChange(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="desktop-to-date" className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    id="desktop-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => onToDateChange(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="touch-target"
                >
                  Clear All
                </Button>
                {onApply && (
                  <Button
                    size="sm"
                    onClick={() => onApply()}
                    className="touch-target"
                  >
                    Apply Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusFilterOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = statusFilter === option.id
                  return (
                    <Button
                      key={option.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => onStatusFilterChange(option.id)}
                      className={`flex-shrink-0 gap-2 touch-target text-xs ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer - For date filters only */}
      {isFilterDrawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsFilterDrawerOpen(false)}
        />
      )}
      
      <div className={`
        lg:hidden fixed top-0 left-0 right-0 bg-background border-b z-50
        transform transition-transform duration-300 ease-in-out
        ${isFilterDrawerOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{drawerTitle}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFilterDrawerOpen(false)}
              className="touch-target"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Date Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="from-date" className="text-xs text-muted-foreground">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => onFromDateChange(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-xs text-muted-foreground">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => onToDateChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="flex-1 touch-target"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply?.()
                setIsFilterDrawerOpen(false)
              }}
              className="flex-1 touch-target"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

