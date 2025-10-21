"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
import Image from "next/image"
import { useData } from "@/lib/data-context"
import { toast } from "sonner"
import { useState } from "react"

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
  const { deleteMenuItem } = useData()
  const [isDeleting, setIsDeleting] = useState(false)

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
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-square">
        <Image src={item.image || "/menu-sample.jpg"} alt={item.name} fill className="object-cover" />
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Unavailable</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold">₱{item.price.toFixed(2)}</span>
            <div className="text-xs text-muted-foreground capitalize">{item.category}</div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={onEdit}
              disabled={isDeleting}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              className="text-destructive bg-transparent hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
