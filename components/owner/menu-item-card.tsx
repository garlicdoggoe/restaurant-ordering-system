"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Edit, Trash2 } from "lucide-react"
import { useData } from "@/lib/data-context"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MenuItemImage } from "@/components/ui/menu-item-image"

interface MenuItemCardProps {
  item: {
    _id: string
    name: string
    description: string
    price: number
    category: string
    image?: string
    available: boolean
  }
  onEdit: () => void
}

export function MenuItemCard({ item, onEdit }: MenuItemCardProps) {
  const { deleteMenuItem, updateMenuItem } = useData()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [displayPrice, setDisplayPrice] = useState(item.price)

  // Fetch variants to determine display price
  const variants = useQuery(api.menu.getVariantsByMenuItem, { menuItemId: item._id as Id<"menu_items"> })

  useEffect(() => {
    if (variants && variants.length > 0) {
      // Show minimum variant price if variants exist
      const minPrice = Math.min(...variants.map(v => v.price))
      setDisplayPrice(minPrice)
    } else {
      // Fallback to item price
      setDisplayPrice(item.price)
    }
  }, [variants, item.price])

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteMenuItem(item._id)
      toast.success("Menu item deleted successfully")
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast.error("Failed to delete menu item. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleAvailability = async (checked: boolean) => {
    setIsToggling(true)
    try {
      await updateMenuItem(item._id, { available: checked })
      toast.success(`Menu item ${checked ? "made available" : "marked as unavailable"}`)
    } catch (error) {
      console.error("Error updating menu item availability:", error)
      toast.error("Failed to update availability. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3]">
        <MenuItemImage 
          src={item.image} 
          alt={item.name} 
          fill 
          className="object-contain" 
        />
      </div>
      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-sm">{item.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold">
              {variants && variants.length > 0 ? `From ₱${displayPrice.toFixed(2)}` : `₱${displayPrice.toFixed(2)}`}
            </span>
            <div className="text-xs text-muted-foreground capitalize">{item.category}</div>
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onEdit}
              disabled={isDeleting || isToggling}
              className="h-7 w-7 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-destructive bg-transparent hover:bg-destructive hover:text-destructive-foreground h-7 w-7 p-0"
              onClick={handleDelete}
              disabled={isDeleting || isToggling}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {/* Availability toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Label htmlFor={`availability-${item._id}`} className="text-xs cursor-pointer">
            Available for ordering
          </Label>
          <Switch
            id={`availability-${item._id}`}
            checked={item.available}
            onCheckedChange={handleToggleAvailability}
            disabled={isToggling || isDeleting}
          />
        </div>
      </CardContent>
    </Card>
  )
}
