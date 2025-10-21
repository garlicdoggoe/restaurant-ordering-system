"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Heart } from "lucide-react"
import Image from "next/image"

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => {
        const isFavorite = favorites.has(item.id)
        return (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group relative">
            <div className="relative aspect-square">
              <Image src={item.image || "/menu-sample.jpg"} alt={item.name} fill className="object-cover" />
              
              {/* Heart button in top-right corner */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggleFavorite(item.id)}
              >
                <Heart 
                  className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button>
              
              {/* Add button in bottom-right corner */}
              <Button
                size="icon"
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onAddToCart(item)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <CardContent className="p-3">
              <h3 className="font-semibold mb-1 text-sm">{item.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">from ₱{item.price.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
