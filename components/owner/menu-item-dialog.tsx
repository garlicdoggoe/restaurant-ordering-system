"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData, type MenuItem, type MenuItemVariant, type MenuItemChoiceGroup, type MenuItemChoice } from "@/lib/data-context"
import { toast } from "sonner"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Plus, Trash2, Edit, Upload, ArrowUp, ArrowDown } from "lucide-react"
import { compressImage } from "@/lib/image-compression"
import { DEFAULT_CATEGORIES } from "@/lib/default-categories"

interface MenuItemDialogProps {
  item?: MenuItem
  onClose: () => void
}

// Helper component to fetch and display choices for a choice group
function ChoiceGroupEditor({ 
  group, 
  onUpdate, 
  onDelete, 
  onAddChoice, 
  onUpdateChoice, 
  onDeleteChoice,
  isBundle,
  bundleItems,
  availableMenuItems,
}: { 
  group: MenuItemChoiceGroup
  onUpdate: (groupId: string, data: Partial<MenuItemChoiceGroup>) => void
  onDelete: (groupId: string) => void
  onAddChoice: (groupId: string, choiceData: { name: string; price: string; available: boolean; menuItemId?: string; variantId?: string }, currentChoicesCount: number) => void
  onUpdateChoice: (groupId: string, choiceIndex: number, data: Partial<MenuItemChoice>) => void
  onDeleteChoice: (groupId: string, choiceIndex: number) => void
  isBundle?: boolean
  bundleItems?: Array<{ menuItemId: string; order: number }>
  availableMenuItems?: MenuItem[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState({ name: group.name, order: group.order })
  const [editingChoiceIndex, setEditingChoiceIndex] = useState<number | null>(null)
  const [editingChoiceData, setEditingChoiceData] = useState<MenuItemChoice | null>(null)
  const [newChoice, setNewChoice] = useState({ name: "", price: "", available: true, order: 0, menuItemId: "", variantId: "" })
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("")
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")

  // Fetch variants for selected menu item (for bundle choices)
  const selectedMenuItemVariants = useQuery(
    api.menu.getVariantsByMenuItem,
    selectedMenuItemId ? { menuItemId: selectedMenuItemId as Id<"menu_items"> } : "skip"
  )

  // Choices are now stored directly in the group
  const choices = useMemo(() => (group.choices || []).sort((a, b) => a.order - b.order), [group.choices])

  return (
    <div className="p-4 border rounded-md space-y-3">
      {isEditing ? (
        <div className="space-y-2">
          <Input
            placeholder="Group name (e.g., Pasta Type)"
            value={editingData.name}
            onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onUpdate(group._id, editingData)
                setIsEditing(false)
              }}
              disabled={!editingData.name.trim()}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{group.name}</h4>
            <p className="text-sm text-muted-foreground">{choices.length} choice(s)</p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDelete(group._id)}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Existing choices */}
      {choices.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Choices</Label>
          <div className="space-y-2">
            {choices.map((choice: MenuItemChoice, choiceIndex: number) => {
              const isEditingChoice = editingChoiceIndex === choiceIndex
              return (
                <div key={`${choiceIndex}-${choice.name}`} className="p-2 border rounded bg-muted/30">
                  {isEditingChoice && editingChoiceData ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Choice name"
                          value={editingChoiceData.name}
                          onChange={(e) => setEditingChoiceData({ ...editingChoiceData, name: e.target.value })}
                        />
                        <Input
                          placeholder="Price adjustment (optional, 0 = no change)"
                          type="number"
                          step="0.01"
                          value={editingChoiceData.price === 0 ? '' : String(editingChoiceData.price ?? '')}
                          onChange={(e) => {
                            // Sanitize numeric input
                            let v = e.target.value.replace(/[^0-9.]/g, '')
                            const parts = v.split('.')
                            if (parts.length > 2) {
                              v = parts[0] + '.' + parts.slice(1).join('')
                            }
                            if (v.startsWith('0') && v.length > 1 && !v.startsWith('0.')) {
                              v = v.replace(/^0+/, '')
                              if (v === '') v = '0'
                            }
                            setEditingChoiceData({ ...editingChoiceData, price: v === '' ? 0 : parseFloat(v) || 0 })
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingChoiceData.available}
                          onCheckedChange={(checked) => setEditingChoiceData({ ...editingChoiceData, available: checked })}
                        />
                        <Label className="text-sm">Available</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingChoiceIndex(null)
                            setEditingChoiceData(null)
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const priceNum = parseFloat(String(editingChoiceData.price))
                            onUpdateChoice(group._id, choiceIndex, {
                              name: editingChoiceData.name,
                              price: isNaN(priceNum) ? 0 : priceNum,
                              available: editingChoiceData.available,
                            })
                            setEditingChoiceIndex(null)
                            setEditingChoiceData(null)
                          }}
                          disabled={!editingChoiceData.name?.trim()}
                          className="flex-1"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{choice.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {choice.menuItemId ? (
                            // Bundle choice: show menu item info
                            <>
                              {availableMenuItems?.find(m => m._id === choice.menuItemId)?.name || choice.name}
                              {" • "}
                              {choice.available ? "Available" : "Unavailable"}
                            </>
                          ) : (
                            // Regular choice
                            <>
                              {choice.price !== 0 
                                ? `${choice.price >= 0 ? '+' : ''}₱${choice.price.toFixed(2)} • ${choice.available ? "Available" : "Unavailable"}`
                                : `No price adjustment • ${choice.available ? "Available" : "Unavailable"}`
                              }
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingChoiceIndex(choiceIndex)
                            setEditingChoiceData({ ...choice })
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteChoice(group._id, choiceIndex)}
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

      {/* Add new choice */}
      <div className="space-y-2 p-2 border rounded bg-muted/50">
        <Label className="text-sm">Add Choice</Label>
        {isBundle && bundleItems && bundleItems.length > 0 ? (
          // Bundle choice: select from bundle items
          <div className="space-y-2">
            <Select
              value={selectedMenuItemId}
              onValueChange={(value) => {
                setSelectedMenuItemId(value)
                const menuItem = availableMenuItems?.find(m => m._id === value)
                if (menuItem) {
                  setNewChoice({ 
                    ...newChoice, 
                    name: menuItem.name, 
                    price: "0", 
                    menuItemId: value,
                    variantId: ""
                  })
                  setSelectedVariantId("")
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a bundle item" />
              </SelectTrigger>
              <SelectContent>
                {bundleItems
                  .map(bi => bi.menuItemId)
                  .filter(menuItemId => {
                    // Filter out items already in this choice group
                    const alreadyInGroup = choices.some(c => c.menuItemId === menuItemId)
                    return !alreadyInGroup
                  })
                  .map(menuItemId => {
                    const menuItem = availableMenuItems?.find(m => m._id === menuItemId)
                    return menuItem ? (
                      <SelectItem key={menuItemId} value={menuItemId}>
                        {menuItem.name} - ₱{menuItem.price.toFixed(2)}
                      </SelectItem>
                    ) : null
                  })
                  .filter(Boolean)}
              </SelectContent>
            </Select>
            
            {/* Variant selection for bundle item */}
            {selectedMenuItemId && selectedMenuItemVariants && selectedMenuItemVariants.length > 0 && (
              <Select
                value={selectedVariantId || "base"}
                onValueChange={(value) => {
                  const variantId = value === "base" ? "" : value
                  setSelectedVariantId(variantId)
                  setNewChoice({ ...newChoice, variantId: variantId })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select variant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Price</SelectItem>
                  {selectedMenuItemVariants.map((variant) => (
                    <SelectItem key={variant._id} value={variant._id}>
                      {variant.name} - ₱{variant.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                checked={newChoice.available}
                onCheckedChange={(checked) => setNewChoice({ ...newChoice, available: checked })}
              />
              <Label className="text-sm">Available</Label>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onAddChoice(group._id, {
                  ...newChoice,
                  menuItemId: selectedMenuItemId || undefined,
                  variantId: selectedVariantId || undefined
                }, choices.length)
                setNewChoice({ name: "", price: "", available: true, order: 0, menuItemId: "", variantId: "" })
                setSelectedMenuItemId("")
                setSelectedVariantId("")
              }}
              disabled={!selectedMenuItemId}
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Choice
            </Button>
          </div>
        ) : (
          // Regular choice: manual entry
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Choice name"
                value={newChoice.name}
                onChange={(e) => setNewChoice({ ...newChoice, name: e.target.value })}
              />
              <Input
                placeholder="Price adjustment (optional, 0 = no change)"
                type="number"
                step="0.01"
                value={newChoice.price}
                onChange={(e) => setNewChoice({ ...newChoice, price: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newChoice.available}
                onCheckedChange={(checked) => setNewChoice({ ...newChoice, available: checked })}
              />
              <Label className="text-sm">Available</Label>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onAddChoice(group._id, newChoice, choices.length)
                setNewChoice({ name: "", price: "", available: true, order: 0, menuItemId: "", variantId: "" })
              }}
              disabled={!newChoice.name.trim()}
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Choice
            </Button>
          </>
        )}
      </div>
    </div>
  )
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
    isBundle: item?.isBundle ?? false,
  })

  // Image upload state management
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  // Variants state
  const [variants, setVariants] = useState<MenuItemVariant[]>([])
  const [editingVariant, setEditingVariant] = useState<MenuItemVariant | null>(null)
  const [newVariant, setNewVariant] = useState({
    name: "",
    price: "",
    available: true,
    sku: "",
  })

  // Choice groups state
  const [choiceGroups, setChoiceGroups] = useState<MenuItemChoiceGroup[]>([])
  const [newChoiceGroup, setNewChoiceGroup] = useState({
    name: "",
    order: 0,
  })
  
  // Bundle items state
  const [bundleItems, setBundleItems] = useState<Array<{ menuItemId: string; order: number }>>(item?.bundleItems || [])
  
  // Query to get menu items for bundle selection
  const availableMenuItemsQuery = useQuery(
    api.menu.getMenuItemsForBundle,
    formData.isBundle ? { excludeMenuItemId: item?._id as Id<"menu_items"> } : "skip"
  )

  // Fetch variants when editing existing item
  const variantsQuery = useQuery(api.menu.getVariantsByMenuItem, 
    item ? { menuItemId: item._id as Id<"menu_items"> } : "skip"
  )

  useEffect(() => {
    if (variantsQuery) {
      setVariants(variantsQuery)
    }
  }, [variantsQuery])


  // Fetch choice groups when editing existing item
  const choiceGroupsQuery = useQuery(api.menu.getChoiceGroupsByMenuItem,
    item ? { menuItemId: item._id as Id<"menu_items"> } : "skip"
  )

  useEffect(() => {
    if (choiceGroupsQuery) {
      setChoiceGroups(choiceGroupsQuery)
    }
  }, [choiceGroupsQuery])

  // Mutations for choice groups
  const addChoiceGroupMut = useMutation(api.menu.addChoiceGroup)
  const updateChoiceGroupMut = useMutation(api.menu.updateChoiceGroup)
  const deleteChoiceGroupMut = useMutation(api.menu.deleteChoiceGroup)
  const addChoiceMut = useMutation(api.menu.addChoice)
  const updateChoiceMut = useMutation(api.menu.updateChoice)
  const deleteChoiceMut = useMutation(api.menu.deleteChoice)

  // Choice group management functions
  const handleAddChoiceGroup = async () => {
    if (!item?._id) {
      toast.error("Cannot add choice group: menu item is missing.")
      return
    }
    if (!newChoiceGroup.name.trim()) {
      toast.error("Please enter a choice group name")
      return
    }

    try {
      const maxOrder = choiceGroups.length > 0 ? Math.max(...choiceGroups.map(g => g.order)) : -1
      await addChoiceGroupMut({
        menuItemId: item._id as Id<"menu_items">,
        name: newChoiceGroup.name.trim(),
        order: maxOrder + 1,
        required: true,
      })
      setNewChoiceGroup({ name: "", order: 0 })
      toast.success("Choice group added successfully")
    } catch (error) {
      console.error("Error adding choice group:", error)
      toast.error("Failed to add choice group. Please try again.")
    }
  }

  const handleUpdateChoiceGroup = async (groupId: string, data: Partial<MenuItemChoiceGroup>) => {
    try {
      await updateChoiceGroupMut({
        id: groupId as Id<"menu_item_choice_groups">,
        data: {
          name: data.name,
          order: data.order,
          required: data.required,
        },
      })
      toast.success("Choice group updated successfully")
    } catch (error) {
      console.error("Error updating choice group:", error)
      toast.error("Failed to update choice group. Please try again.")
    }
  }

  const handleDeleteChoiceGroup = async (groupId: string) => {
    try {
      await deleteChoiceGroupMut({ id: groupId as Id<"menu_item_choice_groups"> })
      toast.success("Choice group deleted successfully")
    } catch (error) {
      console.error("Error deleting choice group:", error)
      toast.error("Failed to delete choice group. Please try again.")
    }
  }

  // Fetch variants for bundle items - we'll query them when needed in the component

  const handleAddChoice = async (groupId: string, choiceData: { name: string; price: string; available: boolean; menuItemId?: string; variantId?: string }, currentChoicesCount: number) => {
    if (!choiceData.name.trim() && !choiceData.menuItemId) {
      toast.error("Please fill in choice name or select a menu item")
      return
    }

    // For bundle choices with menuItemId, price is always 0 (we use menu item price)
    // For regular choices, price is optional - default to 0 if empty or invalid
    let price = 0
    if (!choiceData.menuItemId) {
      price = choiceData.price && choiceData.price.trim() !== "" 
        ? parseFloat(choiceData.price.toString()) 
        : 0
      
      if (choiceData.price && choiceData.price.trim() !== "" && isNaN(price)) {
        toast.error("Please enter a valid price")
        return
      }
    }

    try {
      await addChoiceMut({
        choiceGroupId: groupId as Id<"menu_item_choice_groups">,
        name: choiceData.name.trim(),
        price: price,
        available: choiceData.available,
        order: currentChoicesCount, // Use current count as order
        menuItemId: choiceData.menuItemId ? (choiceData.menuItemId as Id<"menu_items">) : undefined,
        variantId: choiceData.variantId ? (choiceData.variantId as Id<"menu_item_variants">) : undefined,
      })
      toast.success("Choice added successfully")
    } catch (error) {
      console.error("Error adding choice:", error)
      toast.error("Failed to add choice. Please try again.")
    }
  }

  const handleUpdateChoice = async (groupId: string, choiceIndex: number, data: Partial<MenuItemChoice>) => {
    try {
      await updateChoiceMut({
        choiceGroupId: groupId as Id<"menu_item_choice_groups">,
        choiceIndex: choiceIndex,
        data: {
          name: data.name,
          price: data.price,
          available: data.available,
          order: data.order,
        },
      })
      toast.success("Choice updated successfully")
    } catch (error) {
      console.error("Error updating choice:", error)
      toast.error("Failed to update choice. Please try again.")
    }
  }

  const handleDeleteChoice = async (groupId: string, choiceIndex: number) => {
    try {
      await deleteChoiceMut({ 
        choiceGroupId: groupId as Id<"menu_item_choice_groups">,
        choiceIndex: choiceIndex,
      })
      toast.success("Choice deleted successfully")
    } catch (error) {
      console.error("Error deleting choice:", error)
      toast.error("Failed to delete choice. Please try again.")
    }
  }

  // Restore any pending image from localStorage (if available)
  useEffect(() => {
    const key = `menu_item_image_${item?._id || 'new'}`
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    if (!raw) return
    try {
      const stored = JSON.parse(raw) as { name: string; type: string; dataUrl: string }
      if (!stored?.dataUrl) return
      setPreviewUrl(stored.dataUrl)
      // Recreate File from data URL so submit flow can upload it
      fetch(stored.dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], stored.name || "menu-item.jpg", { type: stored.type || blob.type })
          setUploadedImage(file)
        })
        .catch(() => {
          // If reconstruction fails, just clear the preview
          setPreviewUrl(null)
        })
    } catch {
      // Ignore corrupted localStorage
    }
  }, [item?._id])

  // Helper function to handle price changes safely
  const handlePriceChange = (value: string) => {
    // Only allow valid number characters and decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '')
    // Prevent multiple decimal points
    const parts = sanitizedValue.split('.')
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitizedValue
    setFormData({ ...formData, price: finalValue })
  }

  // Helper function to convert file to data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle image file selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const originalFile = e.target.files[0]
    
    try {
      // Compress the image before storing and uploading
      // This reduces file size while maintaining acceptable quality
      const compressedFile = await compressImage(originalFile, 100) // Target 100KB
      
      // Store the compressed file for upload
      setUploadedImage(compressedFile)
      
      // Create immediate preview and persist temporarily in localStorage
      const dataUrl = await fileToDataUrl(compressedFile)
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
        return dataUrl
      })
      const key = `menu_item_image_${item?._id || 'new'}`
      const payload = { name: compressedFile.name, type: compressedFile.type, dataUrl }
      window.localStorage.setItem(key, JSON.stringify(payload))
    } catch (err) {
      console.error("Failed to compress or prepare image preview", err)
      toast.error("Failed to process image. Please try again.")
    }
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

  const handleUpdateVariant = async (variantId: string, data: Partial<MenuItemVariant>) => {
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

      // Upload image only now (on submit). We pass storageId; server resolves to URL.
      let imageStorageId: string | undefined = undefined
      if (uploadedImage) {
        try {
          const uploadUrl = await generateUploadUrl({})
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": uploadedImage.type || "application/octet-stream" },
            body: uploadedImage,
          })
          const json = await res.json()
          imageStorageId = json.storageId as string
        } catch (err) {
          console.error("Upload failed", err)
          toast.error("Failed to upload image")
          setIsSubmitting(false)
          return
        }
      }

      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category,
        image: imageStorageId || formData.image.trim() || undefined,
        available: formData.available,
        isBundle: formData.isBundle || undefined,
        bundleItems: formData.isBundle 
          ? (bundleItems.length > 0 
            ? bundleItems.map(bi => ({ menuItemId: bi.menuItemId as Id<"menu_items">, order: bi.order }))
            : undefined)
          : undefined,
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

      // Clear the temporarily saved image from localStorage after success
      try {
        const key = `menu_item_image_${item?._id || 'new'}`
        window.localStorage.removeItem(key)
      } catch {}
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
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
                    DEFAULT_CATEGORIES.map((category) => (
                      <SelectItem key={category._id} value={category.name.toLowerCase()}>
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </SelectItem>
                    ))
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
            <Label htmlFor="image">Menu Item Image</Label>
            
            {/* Image Upload Section */}
            <div className="border-2 border-dashed border-gray-400 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                id="menu-item-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="menu-item-image" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-700 font-medium">
                  Click to upload menu item image
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Or paste an image URL below
                </p>
              </label>
            </div>
            
            {/* Image URL Input (fallback) */}
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              type="url"
            />
            
            {/* Image Preview */}
            {(previewUrl || formData.image) && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Preview:</Label>
                <div className="mt-1 relative w-20 h-20">
                  <Image
                    src={previewUrl || formData.image || "/menu-sample.jpg"}
                    alt="Menu item preview"
                    fill
                    className="object-cover rounded-md border"
                  />
                </div>
              </div>
            )}
          </div>

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

          {/* Bundle toggle */}
          <div className="space-y-2">
            <Label htmlFor="isBundle">Bundle Item</Label>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">This item is a bundle</span>
              <Switch
                id="isBundle"
                checked={formData.isBundle}
                onCheckedChange={(checked) => setFormData({ ...formData, isBundle: checked })}
              />
            </div>
          </div>

          {/* Bundle Items Section - only show when bundle is enabled */}
          {formData.isBundle && (
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Bundle Items</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Add menu items to this bundle. Items can then be organized into choice groups or remain as fixed items.
              </p>
              
              {/* Bundle items list */}
              {bundleItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Bundle Items ({bundleItems.length})</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {bundleItems
                      .sort((a, b) => a.order - b.order)
                      .map((bundleItem) => {
                        const menuItem = availableMenuItemsQuery?.find(m => m._id === bundleItem.menuItemId)
                        const sortedItems = [...bundleItems].sort((a, b) => a.order - b.order)
                        const actualIndex = sortedItems.findIndex(bi => bi.menuItemId === bundleItem.menuItemId)
                        return (
                          <div key={`${bundleItem.menuItemId}-${bundleItem.order}`} className="p-3 border rounded-md flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{menuItem?.name || `Item ${actualIndex + 1}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {menuItem ? `₱${menuItem.price.toFixed(2)}` : "Item not found"}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newItems = [...bundleItems]
                                  const sorted = [...newItems].sort((a, b) => a.order - b.order)
                                  if (actualIndex > 0) {
                                    // Swap with previous
                                    const prevItem = sorted[actualIndex - 1]
                                    const currentItem = sorted[actualIndex]
                                    const tempOrder = currentItem.order
                                    currentItem.order = prevItem.order
                                    prevItem.order = tempOrder
                                    setBundleItems(newItems)
                                  }
                                }}
                                disabled={actualIndex === 0}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newItems = [...bundleItems]
                                  const sorted = [...newItems].sort((a, b) => a.order - b.order)
                                  if (actualIndex < sorted.length - 1) {
                                    // Swap with next
                                    const nextItem = sorted[actualIndex + 1]
                                    const currentItem = sorted[actualIndex]
                                    const tempOrder = currentItem.order
                                    currentItem.order = nextItem.order
                                    nextItem.order = tempOrder
                                    setBundleItems(newItems)
                                  }
                                }}
                                disabled={actualIndex === sortedItems.length - 1}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBundleItems(bundleItems.filter(bi => bi.menuItemId !== bundleItem.menuItemId))
                                }}
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Add bundle item */}
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <Label>Add Item to Bundle</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !bundleItems.some(bi => bi.menuItemId === value)) {
                      const maxOrder = bundleItems.length > 0 ? Math.max(...bundleItems.map(bi => bi.order)) : -1
                      setBundleItems([...bundleItems, { menuItemId: value, order: maxOrder + 1 }])
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a menu item to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenuItemsQuery?.filter(m => !bundleItems.some(bi => bi.menuItemId === m._id)).map((menuItem) => (
                      <SelectItem key={menuItem._id} value={menuItem._id}>
                        {menuItem.name} - ₱{menuItem.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
                                  onChange={(e) => {
                                    const sanitized = sanitizeNumericInput(e.target.value)
                                    setEditingVariant({ ...editingVariant, price: sanitized === '' ? 0 : parseFloat(sanitized) || 0 })
                                  }}
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

          {/* Choice Groups section - only show when editing existing item */}
          {item && (
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Choice Groups</h3>
              </div>

              {/* Existing choice groups */}
              {choiceGroups.length > 0 && (
                <div className="space-y-3">
                  {choiceGroups.map((group) => (
                    <ChoiceGroupEditor
                      key={group._id}
                      group={group}
                      onUpdate={handleUpdateChoiceGroup}
                      onDelete={handleDeleteChoiceGroup}
                      onAddChoice={handleAddChoice}
                      onUpdateChoice={handleUpdateChoice}
                      onDeleteChoice={handleDeleteChoice}
                      isBundle={formData.isBundle}
                      bundleItems={bundleItems}
                      availableMenuItems={availableMenuItemsQuery || []}
                    />
                  ))}
                </div>
              )}

              {/* Add new choice group */}
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <Label>Add New Choice Group</Label>
                <Input
                  placeholder="Group name (e.g., Pasta Type, Noodle Type)"
                  value={newChoiceGroup.name}
                  onChange={(e) => setNewChoiceGroup({ ...newChoiceGroup, name: e.target.value })}
                />
                <Button
                  type="button"
                  onClick={handleAddChoiceGroup}
                  disabled={!newChoiceGroup.name.trim()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Choice Group
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
