"use client"

import React from "react"

export interface BundleItem {
  menuItemId: string
  variantId?: string
  name: string
  price: number
}

interface BundleItemsListProps {
  bundleItems: BundleItem[]
  className?: string
  showPrices?: boolean
  compact?: boolean
}

export function BundleItemsList({
  bundleItems,
  className = "",
  showPrices = true,
  compact = false,
}: BundleItemsListProps) {
  if (!bundleItems || bundleItems.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className={`text-xs text-muted-foreground mt-0.5 ${className}`}>
        {bundleItems.map((bundleItem, index) => (
          <div key={index}>
            • {bundleItem.name}
            {/* {bundleItem.variantId && <span className="text-muted-foreground"> (variant)</span>}
            {showPrices && (
              <span className="text-muted-foreground"> - ₱{bundleItem.price.toFixed(2)}</span>
            )} */}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`text-xs text-muted-foreground mt-0.5 space-y-0.5 ${className}`}>
      {bundleItems.map((bundleItem, index) => (
        <div key={index}>
          • {bundleItem.name}
          {/* {bundleItem.variantId && <span className="text-muted-foreground"> (variant)</span>}
          {showPrices && (
            <span className="text-muted-foreground"> - ₱{bundleItem.price.toFixed(2)}</span>
          )} */}
        </div>
      ))}
    </div>
  )
}

