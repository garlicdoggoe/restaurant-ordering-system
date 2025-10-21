"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { toast } from "sonner"

interface MenuItemDialogProps {
  item?: any
  onClose: () => void
}

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const { addMenuItem, updateMenuItem, categories } = useData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price || "",
    category: item?.category || "pizza",
    image: item?.image || "",
    available: item?.available ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data
      if (!formData.name.trim() || !formData.description.trim() || !formData.price) {
        toast.error("Please fill in all required fields")
        return
      }

      const price = parseFloat(formData.price.toString())
      if (isNaN(price) || price <= 0) {
        toast.error("Please enter a valid price")
        return
      }

      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category,
        image: formData.image.trim() || undefined,
        available: formData.available,
      }

      if (item) {
        // Update existing item
        await updateMenuItem(item._id, menuItemData)
        toast.success("Menu item updated successfully")
      } else {
        // Create new item
        await addMenuItem(menuItemData)
        toast.success("Menu item added successfully")
      }

      onClose()
    } catch (error) {
      console.error("Error saving menu item:", error)
      toast.error("Failed to save menu item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {/* Use categories from database if available, fallback to default ones */}
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category._id} value={category.name.toLowerCase()}>
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="pasta">🍝 Pasta</SelectItem>
                      <SelectItem value="pizza">🍕 Pizza</SelectItem>
                      <SelectItem value="steak">🥩 Steak</SelectItem>
                      <SelectItem value="rice">🍚 Rice</SelectItem>
                      <SelectItem value="noodle">🍜 Noodle</SelectItem>
                      <SelectItem value="salad">🥗 Salad</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the menu item..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              type="url"
            />
            {formData.image && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Preview:</Label>
                <div className="mt-1">
                  <img
                    src={formData.image}
                    alt="Menu item preview"
                    className="w-20 h-20 object-cover rounded-md border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₱) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="available">Availability</Label>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm">Available for ordering</span>
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : (item ? "Update Item" : "Add Item")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
