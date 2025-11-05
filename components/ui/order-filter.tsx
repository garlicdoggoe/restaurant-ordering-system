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
  // Date filter state
  fromDate: string
  toDate: string
  onFromDateChange: (date: string) => void
  onToDateChange: (date: string) => void
  
  // Status filter state
  statusFilter: string
  onStatusFilterChange: (filter: string) => void
  
  // Filter options configuration
  statusFilterOptions: StatusFilterOption[]
  
  // Clear all filters handler
  onClearAll: () => void
  
  // Optional title for the filter drawer
  drawerTitle?: string
}

/**
 * Reusable order filter component that provides:
 * - Mobile filter button (fixed position)
 * - Desktop date range filters
 * - Mobile filter drawer with date and status filters
 * 
 * This component handles the UI and state management for filtering orders by date and status.
 */
export function OrderFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  statusFilter,
  onStatusFilterChange,
  statusFilterOptions,
  onClearAll,
  drawerTitle = "Filter Orders",
}: OrderFilterProps) {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile Filter Button - Fixed (outside header so it stays on screen) */}
      {!isFilterDrawerOpen && (
        <div className="lg:hidden fixed top-15 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="touch-target flex items-center gap-2 shadow-lg bg-background/95 backdrop-blur-sm border-2"
          >
            <Filter className="h-4 w-4" />
            <span className="text-xs">Filter</span>
          </Button>
        </div>
      )}

      {/* Desktop Date Filters */}
      <div className="hidden lg:block space-y-3">
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
        </div>
      </div>

      {/* Mobile Filter Drawer */}
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

          {/* Status Filters */}
          <div className="space-y-3">
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
              onClick={() => setIsFilterDrawerOpen(false)}
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

