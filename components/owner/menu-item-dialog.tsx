"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData, type MenuItem } from "@/lib/data-context"
import { toast } from "sonner"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Plus, Trash2, Edit } from "lucide-react"

interface MenuItemDialogProps {
  item?: MenuItem
  onClose: () => void
}

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const { addMenuItem, updateMenuItem, categories, addVariant, updateVariant, deleteVariant } = useData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price?.toString() || "", // Ensure price is always a string for input
    category: item?.category || "pizza",
    image: item?.image || "",
    available: item?.available ?? true,
  })

  // Variants state
  const [variants, setVariants] = useState<any[]>([])
  const [editingVariant, setEditingVariant] = useState<any>(null)
  const [newVariant, setNewVariant] = useState({
    name: "",
    price: "",
    available: true,
    sku: "",
  })

  // Fetch variants when editing existing item
  const variantsQuery = useQuery(api.menu.getVariantsByMenuItem, 
    item ? { menuItemId: item._id as any } : "skip"
  )

  useEffect(() => {
    if (variantsQuery) {
      setVariants(variantsQuery)
    }
  }, [variantsQuery])

  // Helper function to handle price changes safely
  const handlePriceChange = (value: string) => {
    // Only allow valid number characters and decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '')
    // Prevent multiple decimal points
    const parts = sanitizedValue.split('.')
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitizedValue
    setFormData({ ...formData, price: finalValue })
  }

  // Helper to sanitize numeric input for variant editing while allowing empty and preventing leading zeros
  const sanitizeNumericInput = (value: string) => {
    // Remove invalid characters
    let v = value.replace(/[^0-9.]/g, '')
    // Collapse multiple dots into one
    const parts = v.split('.')
    if (parts.length > 2) {
      v = parts[0] + '.' + parts.slice(1).join('')
    }
    // Normalize leading zeros (keep "0" and "0.")
    if (v.startsWith('0') && v.length > 1 && !v.startsWith('0.')) {
      // Remove all leading zeros but leave one if the string becomes empty
      v = v.replace(/^0+/, '')
      if (v === '') v = '0'
    }
    return v
  }

  // Variant management functions
  const handleAddVariant = async () => {
    if (!item?._id) {
      toast.error("Cannot add variant: menu item is missing.")
      return
    }
    if (!newVariant.name.trim() || !newVariant.price) {
      toast.error("Please fill in variant name and price")
      return
    }

    const price = parseFloat(newVariant.price.toString())
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    try {
      await addVariant({
        menuItemId: item._id,
        name: newVariant.name.trim(),
        price: price,
        available: newVariant.available,
        sku: newVariant.sku.trim() || undefined,
      })
      
      setNewVariant({ name: "", price: "", available: true, sku: "" })
      toast.success("Variant added successfully")
    } catch (error) {
      console.error("Error adding variant:", error)
      toast.error("Failed to add variant. Please try again.")
    }
  }

  const handleUpdateVariant = async (variantId: string, data: any) => {
    try {
      await updateVariant(variantId, data)
      toast.success("Variant updated successfully")
    } catch (error) {
      console.error("Error updating variant:", error)
      toast.error("Failed to update variant. Please try again.")
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    try {
      await deleteVariant(variantId)
      toast.success("Variant deleted successfully")
    } catch (error) {
      console.error("Error deleting variant:", error)
      toast.error("Failed to delete variant. Please try again.")
    }
  }

  const addPresetVariants = async () => {
    if (!item?._id) {
      toast.error("Cannot add preset variants: menu item is missing.")
      return
    }
    // Validate that we have a valid price before creating variants
    const basePrice = parseFloat(formData.price.toString())
    if (isNaN(basePrice) || basePrice <= 0) {
      toast.error("Please enter a valid price before adding preset variants")
      return
    }

    const isPizza = formData.category.toLowerCase() === "pizza"
    const presetVariants = isPizza 
      ? [
          { name: "Solo", price: Math.round(basePrice * 0.7 * 100) / 100 }, // Round to 2 decimal places
          { name: "Regular", price: basePrice },
          { name: "Mega", price: Math.round(basePrice * 1.3 * 100) / 100 },
          { name: "Quadro", price: Math.round(basePrice * 1.6 * 100) / 100 },
        ]
      : [
          { name: "Small", price: Math.round(basePrice * 0.8 * 100) / 100 },
          { name: "Medium", price: basePrice },
          { name: "Large", price: Math.round(basePrice * 1.2 * 100) / 100 },
          { name: "Extra Large", price: Math.round(basePrice * 1.4 * 100) / 100 },
        ]

    try {
      for (const variant of presetVariants) {
        await addVariant({
          menuItemId: item._id,
          name: variant.name,
          price: variant.price,
          available: true,
        })
      }
      toast.success(`${presetVariants.length} preset variants added successfully`)
    } catch (error) {
      console.error("Error adding preset variants:", error)
      toast.error("Failed to add preset variants. Please try again.")
    }
  }

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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
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
                      <SelectItem value="rice meals">🍚 Rice Meals</SelectItem>
                      <SelectItem value="bilao">🍜 Bilao</SelectItem>
                      <SelectItem value="bundles">🍽️ Bundles</SelectItem>
                      <SelectItem value="burger">🍔 Burger</SelectItem>
                      <SelectItem value="snacks">🍟 Snacks</SelectItem>
                      <SelectItem value="chillers">🍮 Chillers</SelectItem>
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
                onChange={(e) => handlePriceChange(e.target.value)}
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

          {/* Variants section - only show when editing existing item */}
          {item && (
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Variants</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPresetVariants}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Preset Variants
                </Button>
              </div>

              {/* Existing variants */}
              {variants.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Variants</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {variants.map((variant) => {
                      const isEditing = editingVariant && editingVariant._id === variant._id
                      return (
                        <div key={variant._id} className="p-3 border rounded-md">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  placeholder="Variant name"
                                  value={editingVariant.name}
                                  onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
                                />
                                <Input
                                  placeholder="Price"
                                  type="number"
                                  step="0.01"
                                  value={String(editingVariant.price ?? '')}
                                  onChange={(e) => setEditingVariant({ ...editingVariant, price: sanitizeNumericInput(e.target.value) })}
                                />
                              </div>
                              <div className="flex items-center gap-4">
                                <Input
                                  placeholder="SKU (optional)"
                                  value={editingVariant.sku || ""}
                                  onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                                  className="flex-1"
                                />
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={editingVariant.available}
                                    onCheckedChange={(checked) => setEditingVariant({ ...editingVariant, available: checked })}
                                  />
                                  <Label className="text-sm">Available</Label>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setEditingVariant(null)}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    const priceNum = parseFloat(String(editingVariant.price))
                                    handleUpdateVariant(editingVariant._id, {
                                      name: editingVariant.name,
                                      price: isNaN(priceNum) ? 0 : priceNum,
                                      available: editingVariant.available,
                                      sku: editingVariant.sku || undefined,
                                    })
                                    setEditingVariant(null)
                                  }}
                                  disabled={!editingVariant.name?.trim() || String(editingVariant.price).trim() === ''}
                                  className="flex-1"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="font-medium">{variant.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ₱{variant.price.toFixed(2)} • {variant.available ? "Available" : "Unavailable"}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingVariant({ ...variant })}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteVariant(variant._id)}
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              

              {/* Add new variant */}
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <Label>Add New Variant</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Variant name (e.g., Small, Large)"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                  />
                  <Input
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="SKU (optional)"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newVariant.available}
                      onCheckedChange={(checked) => setNewVariant({ ...newVariant, available: checked })}
                    />
                    <Label className="text-sm">Available</Label>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddVariant}
                  disabled={!newVariant.name.trim() || !newVariant.price}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </div>
          )}

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
        </div>
      </DialogContent>
    </Dialog>
  )
}
