"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { MenuItemOrderDialog } from "./menu-item-order-dialog"
import { AuthPromptDialog } from "@/components/auth-prompt-dialog"
import { MenuItemImage } from "@/components/ui/menu-item-image"
import type { CartItem } from "@/lib/cart-context"

interface MenuItemGridProps {
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    image: string
    available?: boolean
  }>
  onAddToCart: (item: Omit<CartItem, "quantity">, quantity?: number, suppressToast?: boolean) => void
}

export function MenuItemGrid({ items, onAddToCart }: MenuItemGridProps) {
  const { isSignedIn } = useAuth()
  const [activeItem, setActiveItem] = useState<MenuItemGridProps["items"][0] | null>(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Sort items so available items come first, unavailable items come last
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aAvailable = a.available !== false // Default to true if not specified
      const bAvailable = b.available !== false // Default to true if not specified
      
      // If both have same availability status, maintain original order
      if (aAvailable === bAvailable) return 0
      
      // Available items (true) come before unavailable items (false)
      return aAvailable ? -1 : 1
    })
  }, [items])

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    )
  }

  return (
    <>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-5">
      {sortedItems.map((item) => {
        const isAvailable = item.available !== false // Default to true if not specified
        // const isFavorite = favorites.has(item.id)
        return (
          <Card 
            key={item.id} 
            className={`overflow-hidden transition-shadow group relative pt-0 pb-5 ${
              isAvailable 
                ? "hover:shadow-lg" 
                : "opacity-50 grayscale pointer-events-none"
            }`}
          >
            <div className="relative aspect-square mb-[-12px]">
              <MenuItemImage src={item.image} alt={item.name} fill className="object-cover" />
              
              {/* Unavailable badge overlay */}
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                </div>
              )}
              
              {/* Heart button in top-right corner */}
              {/* <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                onClick={() => toggleFavorite(item.id)}
              >
                <Heart 
                  className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button> */}
            </div>
            
            <CardContent className="py-0 px-2 lg:px-3 lg:py-2">
              <div className="flex items-start justify-between gap-1.5 px-2 lg:px-0">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-0.5 truncate text-xs sm:text-[clamp(0.875rem,1.2vw,1rem)]">{item.name}</h3>
                    <span className="text-xs sm:text-[clamp(0.875rem,1.2vw,1rem)]">from ₱{item.price.toFixed(2)}</span>
                </div>
                
                {/* Add button beside the item name and price - only show if available */}
                {isAvailable && (
                  <Button
                    size="icon"
                    className="rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg flex-shrink-0 touch-target w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9"
                    onClick={() => {
                      // Check authentication before opening order dialog
                      if (!isSignedIn) {
                        setShowAuthPrompt(true)
                      } else {
                        setActiveItem(item)
                      }
                    }}
                  >
                    <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
    {/* Show auth prompt dialog if user is not signed in */}
    <AuthPromptDialog 
      open={showAuthPrompt} 
      onOpenChange={setShowAuthPrompt} 
    />
    {/* Show order dialog if user is signed in and clicked an item */}
    {activeItem && (
      <MenuItemOrderDialog
        item={activeItem}
        onClose={() => setActiveItem(null)}
        onConfirm={(payload, quantity) => {
          // Add the selected item with quantity - pass quantity to addToCart so it handles it in one go
          // This ensures only one toast notification is shown with the correct quantity
          onAddToCart(payload, quantity)
          setActiveItem(null)
        }}
      />
    )}
    </>
  )
}
