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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
          <div className="relative aspect-square">
            <Image src={item.image || "/menu-sample.jpg"} alt={item.name} fill className="object-cover" />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
              onClick={() => onAddToCart(item)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <CardContent className="p-3">
            <h3 className="font-semibold mb-1 text-sm">{item.name}</h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">₱{item.price.toFixed(2)}</span>
              <Button size="sm" variant="ghost" onClick={() => onAddToCart(item)} className="h-7 px-2 text-xs">
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
