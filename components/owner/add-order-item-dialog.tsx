"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CategoryFilter, Category } from "@/components/ui/category-filter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Search, X } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { MenuItem, OrderItem, MenuItemVariant, MenuItemChoiceGroup, MenuItemChoice } from "@/lib/data-context"
import { DEFAULT_CATEGORIES } from "@/lib/default-categories"

interface AddOrderItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddItem: (item: OrderItem) => void
}

// Helper component to display choices for a choice group
function ChoiceGroupSelector({ 
  group, 
  selectedChoiceIndex, 
  onSelect,
  isBundle,
  allMenuItems
}: { 
  group: MenuItemChoiceGroup
  selectedChoiceIndex: number | undefined
  onSelect: (choiceIndex: number, choiceData: { name: string; price: number; menuItemId?: string; variantId?: string }) => void
  isBundle?: boolean
  allMenuItems?: MenuItem[]
}) {
  // Choices are now stored directly in the group
  const choices = useMemo(() => (group.choices || []) as MenuItemChoice[], [group.choices])
  const availableChoices = useMemo(() => {
    return choices
      .map((choice, originalIndex) => ({ ...choice, originalIndex }))
      .filter((c) => c.available !== false)
  }, [choices])

  // Notify parent of choice selection with choice data
  const handleSelect = (value: string) => {
    const choiceIndex = parseInt(value, 10)
    const selectedChoice = availableChoices.find(c => c.originalIndex === choiceIndex)
    if (selectedChoice) {
      // For bundle choices, get menu item name and price
      if (isBundle && selectedChoice.menuItemId) {
        const menuItem = allMenuItems?.find(m => m._id === selectedChoice.menuItemId)
        if (menuItem) {
          onSelect(choiceIndex, { 
            name: menuItem.name, 
            price: menuItem.price,
            menuItemId: selectedChoice.menuItemId,
            variantId: selectedChoice.variantId
          })
        }
      } else {
        onSelect(choiceIndex, { name: selectedChoice.name, price: selectedChoice.price })
      }
    }
  }

  if (availableChoices.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{group.name} *</Label>
      <RadioGroup value={selectedChoiceIndex !== undefined ? String(selectedChoiceIndex) : ""} onValueChange={handleSelect}>
        <div className="space-y-2">
          {availableChoices.map((choice) => {
            // For bundle choices, show menu item name
            const displayName = isBundle && choice.menuItemId
              ? allMenuItems?.find(m => m._id === choice.menuItemId)?.name || choice.name
              : choice.name
            
            return (
              <div key={`${choice.originalIndex}-${choice.name}`} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={String(choice.originalIndex)} id={`choice-${group._id}-${choice.originalIndex}`} />
                  <Label 
                    htmlFor={`choice-${group._id}-${choice.originalIndex}`} 
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    <span>{displayName}</span>
                    {!isBundle && choice.price !== 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({choice.price >= 0 ? '+' : ''}₱{choice.price.toFixed(2)})
                      </span>
                    )}
                  </Label>
                </div>
              </div>
            )
          })}
        </div>
      </RadioGroup>
    </div>
  )
}

export function AddOrderItemDialog({ isOpen, onClose, onAddItem }: AddOrderItemDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  // Map of choiceGroupId -> { name, price, menuItemId?, variantId? } (for order storage)
  const [selectedChoices, setSelectedChoices] = useState<Record<string, { name: string; price: number; menuItemId?: string; variantId?: string }>>({})
  // Map of choiceGroupId -> choiceIndex (for UI selection tracking)
  const [selectedChoiceIndices, setSelectedChoiceIndices] = useState<Record<string, number>>({})

  const { categories, menuItems } = useData()
  
  // Check if selected item is a bundle
  const isBundle = useMemo(() => selectedItem?.isBundle === true, [selectedItem])
  const bundleItems = useMemo(() => selectedItem?.bundleItems || [], [selectedItem])
  
  // Fetch variants for the selected item
  const variants = useQuery(
    api.menu.getVariantsByMenuItem,
    selectedItem ? { menuItemId: selectedItem._id as Id<"menu_items"> } : "skip"
  ) || []

  // Fetch choice groups for bundle items
  const choiceGroupsQuery = useQuery(
    api.menu.getChoiceGroupsByMenuItem,
    selectedItem && isBundle ? { menuItemId: selectedItem._id as Id<"menu_items"> } : "skip"
  )
  const choiceGroups = useMemo(() => (choiceGroupsQuery || []) as MenuItemChoiceGroup[], [choiceGroupsQuery])

  // Reset state when dialog opens/closes
  const handleClose = () => {
    setSelectedItem(null)
    setSelectedVariant(null)
    setQuantity(1)
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedChoices({})
    setSelectedChoiceIndices({})
    onClose()
  }

  // Reset variant and choices when item changes
  useEffect(() => {
    setSelectedVariant(null)
    setSelectedChoices({})
    setSelectedChoiceIndices({})
  }, [selectedItem])

  // Build categories with item counts
  // Use database categories if available, otherwise use default fallback categories
  const availableCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES

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

    // For bundles, validate that all required choice groups have selections
    if (isBundle && choiceGroups.length > 0) {
      const allGroupsHaveSelections = choiceGroups.every((group) => {
        if (!group.required) return true
        return selectedChoices[group._id] !== undefined
      })

      if (!allGroupsHaveSelections) {
        return
      }
    }

    // Determine the final price and name based on variant selection
    // For bundles, use the fixed price from the menu item (not affected by choices)
    const finalPrice = isBundle 
      ? selectedItem.price 
      : (selectedVariant ? selectedVariant.price : selectedItem.price)
    
    const finalName = selectedVariant 
      ? `${selectedItem.name} - ${selectedVariant.name}`
      : selectedItem.name

    // For bundles, build bundleItems array (selected items + fixed items)
    let bundleItemsArray: Array<{ menuItemId: string; variantId?: string; name: string; price: number }> | undefined = undefined
    
    if (isBundle && bundleItems.length > 0) {
      bundleItemsArray = []
      
      // Get all menuItemIds from choice groups (all possible choices)
      const choiceGroupMenuItemIds = new Set<string>()
      choiceGroups.forEach(group => {
        group.choices.forEach(choice => {
          if (choice.menuItemId) {
            choiceGroupMenuItemIds.add(choice.menuItemId)
          }
        })
      })
      
      // Fixed items = bundle items NOT in any choice group
      const fixedItems = bundleItems.filter(bi => !choiceGroupMenuItemIds.has(bi.menuItemId))
      
      // Add fixed items
      fixedItems.forEach(bi => {
        const menuItem = menuItems.find(m => m._id === bi.menuItemId)
        if (menuItem) {
          bundleItemsArray!.push({
            menuItemId: bi.menuItemId,
            name: menuItem.name,
            price: menuItem.price,
          })
        }
      })
      
      // Add selected choice items (using default variantId from choice if available)
      Object.values(selectedChoices).forEach((choice) => {
        if (choice.menuItemId) {
          const menuItem = menuItems.find(m => m._id === choice.menuItemId)
          if (menuItem) {
            bundleItemsArray!.push({
              menuItemId: choice.menuItemId,
              variantId: choice.variantId,
              name: menuItem.name,
              price: menuItem.price, // Base price - variant pricing handled separately
            })
          }
        }
      })
    }

    const orderItem: OrderItem = {
      menuItemId: selectedItem._id,
      name: finalName,
      price: finalPrice,
      quantity,
      variantId: selectedVariant?._id,
      variantName: selectedVariant?.name,
      unitPrice: finalPrice,
      selectedChoices: Object.keys(selectedChoices).length > 0 ? selectedChoices : undefined,
      bundleItems: bundleItemsArray,
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

                  {/* Choice Groups Selection (for bundle items) */}
                  {isBundle && choiceGroups.length > 0 && (
                    <div className="space-y-4 mt-4">
                      {choiceGroups.map((group) => (
                        <ChoiceGroupSelector
                          key={group._id}
                          group={group}
                          selectedChoiceIndex={selectedChoiceIndices[group._id]}
                          isBundle={isBundle}
                          allMenuItems={menuItems}
                          onSelect={(choiceIndex, choiceData) => {
                            setSelectedChoiceIndices((prev) => ({ ...prev, [group._id]: choiceIndex }))
                            setSelectedChoices((prev) => ({ 
                              ...prev, 
                              [group._id]: choiceData 
                            }))
                          }}
                        />
                      ))}
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
                        ₱{(isBundle 
                          ? selectedItem.price 
                          : (selectedVariant ? selectedVariant.price : selectedItem.price)
                        ).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-xl">
                        ₱{((isBundle 
                          ? selectedItem.price 
                          : (selectedVariant ? selectedVariant.price : selectedItem.price)
                        ) * quantity).toFixed(2)}
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
              disabled={
                !selectedItem || 
                (variants.length > 0 && !selectedVariant) ||
                (isBundle && choiceGroups.length > 0 && !choiceGroups.every((group) => {
                  if (!group.required) return true
                  return selectedChoices[group._id] !== undefined
                }))
              }
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
