"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CategoryFilter, Category } from "@/components/ui/category-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Search, X } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { MenuItem, OrderItem, MenuItemVariant } from "@/lib/data-context"

interface AddOrderItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddItem: (item: OrderItem) => void
}

export function AddOrderItemDialog({ isOpen, onClose, onAddItem }: AddOrderItemDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null)
  const [quantity, setQuantity] = useState(1)

  const { categories, menuItems } = useData()
  
  // Fetch variants for the selected item
  const variants = useQuery(
    api.menu.getVariantsByMenuItem,
    selectedItem ? { menuItemId: selectedItem._id as any } : "skip"
  ) || []

  // Reset state when dialog opens/closes
  const handleClose = () => {
    setSelectedItem(null)
    setSelectedVariant(null)
    setQuantity(1)
    setSearchQuery("")
    setSelectedCategory("all")
    onClose()
  }

  // Reset variant when item changes
  useEffect(() => {
    setSelectedVariant(null)
  }, [selectedItem])

  // Build categories with item counts
  const availableCategories = categories.length > 0 ? categories : [
    { _id: "1", name: "Pasta", icon: "🍝", order: 1 },
    { _id: "2", name: "Pizza", icon: "🍕", order: 2 },
    { _id: "3", name: "Rice Meals", icon: "🍚", order: 3 },
    { _id: "4", name: "Bilao", icon: "🍜", order: 4 },
    { _id: "5", name: "Bundles", icon: "🍽️", order: 5 },
    { _id: "6", name: "Burger", icon: "🍔", order: 6 },
    { _id: "7", name: "Snacks", icon: "🍟", order: 7 },
    { _id: "8", name: "Chillers", icon: "🍮", order: 8 },
    { _id: "9", name: "Salad", icon: "🥗", order: 9 },
  ]

  const allCategories: Category[] = [
    { 
      id: "all", 
      name: "All Items", 
      icon: "🍽️",
      count: menuItems.filter(item => item.available).length 
    },
    ...availableCategories.map((cat) => ({
      id: cat.name.toLowerCase(),
      name: cat.name,
      icon: cat.icon,
      count: menuItems.filter(item => 
        item.category.toLowerCase() === cat.name.toLowerCase() && item.available
      ).length
    })),
  ]

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || 
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    
    const matchesSearch = searchQuery === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch && item.available
  })

  const handleAddToOrder = () => {
    if (!selectedItem) return

    // Determine the final price and name based on variant selection
    const finalPrice = selectedVariant ? selectedVariant.price : selectedItem.price
    const finalName = selectedVariant 
      ? `${selectedItem.name} - ${selectedVariant.name}`
      : selectedItem.name

    const orderItem: OrderItem = {
      menuItemId: selectedItem._id,
      name: finalName,
      price: finalPrice,
      quantity,
      variantId: selectedVariant?._id,
      variantName: selectedVariant?.name,
      unitPrice: finalPrice,
    }

    onAddItem(orderItem)
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[800px] max-h-[90vh] w-[90vw] overflow-hidden flex flex-col" style={{ width: "90vw", maxWidth: "800px", height: "90vh", maxHeight: "90vh" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Add Item to Order</span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              className="pl-10 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <CategoryFilter
            categories={allCategories}
            selectedCategories={selectedCategory}
            onToggleCategory={setSelectedCategory}
            mode="buttons"
            title="Category"
            allowMultiple={false}
          />

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors min-h-[60px] flex items-center justify-center whitespace-nowrap ${
                    selectedItem?._id === item._id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <h3 className="font-medium text-base text-center">{item.name}</h3>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No available menu items found
              </div>
            )}
          </div>

          {/* Selected Item Details & Quantity */}
          {selectedItem && (
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{selectedItem.description}</p>
                  
                  {/* Variant Selection */}
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Variant:</label>
                      <Select value={selectedVariant?._id || ""} onValueChange={(value) => {
                        const variant = variants.find(v => v._id === value)
                        setSelectedVariant(variant || null)
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a variant..." />
                        </SelectTrigger>
                        <SelectContent>
                          {variants.map((variant) => (
                            <SelectItem key={variant._id} value={variant._id}>
                              {variant.name} - ₱{variant.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 ml-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-sm text-muted-foreground">Unit Price</p>
                      <p className="font-semibold text-lg">
                        ₱{(selectedVariant ? selectedVariant.price : selectedItem.price).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-xl">
                        ₱{((selectedVariant ? selectedVariant.price : selectedItem.price) * quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-12 text-base">
              Cancel
            </Button>
            <Button 
              onClick={handleAddToOrder} 
              disabled={!selectedItem || (variants.length > 0 && !selectedVariant)}
              className="flex-1 h-12 text-base"
            >
              Add to Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
