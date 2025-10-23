"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Heart } from "lucide-react"
import { MenuItemOrderDialog } from "./menu-item-order-dialog"
import { MenuItemImage } from "@/components/ui/menu-item-image"

interface MenuItemGridProps {
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    image: string
  }>
  onAddToCart: (item: any) => void
}

export function MenuItemGrid({ items, onAddToCart }: MenuItemGridProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [activeItem, setActiveItem] = useState<any | null>(null)

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    )
  }

  return (
    <>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 lg:gap-4">
      {items.map((item) => {
        const isFavorite = favorites.has(item.id)
        return (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group relative">
            <div className="relative aspect-square">
              <MenuItemImage src={item.image} alt={item.name} fill className="object-cover" />
              
              {/* Heart button in top-right corner */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                onClick={() => toggleFavorite(item.id)}
              >
                <Heart 
                  className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button>
            </div>
            
            <CardContent className="p-1 lg:px-3">
              <div className="flex items-start justify-between gap-1.5 px-2 lg:px-0">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-0.5 truncate text-[clamp(0.875rem,1.2vw,1rem)]">{item.name}</h3>
                  <span className="text-[clamp(0.875rem,1.2vw,1rem)]">from ₱{item.price.toFixed(2)}</span>
                </div>
                
                {/* Add button beside the item name and price */}
                <Button
                  size="icon"
                  className="rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg flex-shrink-0 touch-target w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9"
                  onClick={() => setActiveItem(item)}
                >
                  <Plus className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
    {activeItem && (
      <MenuItemOrderDialog
        item={activeItem}
        onClose={() => setActiveItem(null)}
        onConfirm={(payload, quantity) => {
          // Add the selected item with quantity by calling onAddToCart repeatedly
          for (let i = 0; i < quantity; i++) {
            onAddToCart(payload)
          }
          setActiveItem(null)
        }}
      />
    )}
    </>
  )
}
