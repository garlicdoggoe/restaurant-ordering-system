"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
          <div className="relative aspect-square">
            <Image src={item.image || "/menu-sample.jpg"} alt={item.name} fill className="object-cover" />
            <Button
              size="icon"
              className="absolute bottom-3 right-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onAddToCart(item)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
              <Button size="sm" variant="ghost" onClick={() => onAddToCart(item)}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
