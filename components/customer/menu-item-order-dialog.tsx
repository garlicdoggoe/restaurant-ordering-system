"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MenuItemImage } from "@/components/ui/menu-item-image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useData, type MenuItem, MenuItemVariant, MenuItemChoiceGroup, MenuItemChoice } from "@/lib/data-context"

interface ItemSummary {
  id: string
  name: string
  description: string
  price: number
  image?: string
}

interface MenuItemOrderDialogProps {
  item: ItemSummary
  onClose: () => void
  onConfirm: (
    payload: {
      id: string
      menuItemId: string
      name: string
      price: number
      size?: string
      variantId?: string
      selectedChoices?: Record<string, { name: string; price: number }>
      bundleItems?: Array<{ menuItemId: string; variantId?: string; name: string; price: number }>
    },
    quantity: number,
  ) => void
}

// Helper component to fetch and display choices for a choice group
function ChoiceGroupSelector({ 
  group, 
  selectedChoiceIndex, 
  onSelect,
  // onVariantSelect, // COMMENTED OUT - variant handling
  // selectedVariantId, // COMMENTED OUT - variant handling
  isBundle,
  allMenuItems
}: { 
  group: MenuItemChoiceGroup
  selectedChoiceIndex: number | undefined
  onSelect: (choiceIndex: number, choiceData: { name: string; price: number; menuItemId?: string; variantId?: string }) => void
  // onVariantSelect?: (choiceIndex: number, variantId: string) => void // COMMENTED OUT - variant handling
  // selectedVariantId?: string // COMMENTED OUT - variant handling
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

  // Get selected choice for variant selection
  // const selectedChoice = selectedChoiceIndex !== undefined 
  //   ? availableChoices.find(c => c.originalIndex === selectedChoiceIndex)
  //   : null
  
  // const selectedMenuItemId = selectedChoice?.menuItemId
  
  // Fetch variants for selected menu item (for bundle choices)
  // const selectedMenuItemVariantsQuery = useQuery(
  //   api.menu.getVariantsByMenuItem,
  //   selectedMenuItemId ? { menuItemId: selectedMenuItemId as Id<"menu_items"> } : "skip"
  // )
  // const selectedMenuItemVariants = useMemo(() => {
  //   if (!selectedMenuItemVariantsQuery) return []
  //   return (selectedMenuItemVariantsQuery as MenuItemVariant[]).filter((v) => v.available !== false)
  // }, [selectedMenuItemVariantsQuery])

  return (
    <div className="space-y-2">
      <Label className="text-xs md:text-fluid-sm text-muted-foreground">{group.name} *</Label>
      <RadioGroup value={selectedChoiceIndex !== undefined ? String(selectedChoiceIndex) : ""} onValueChange={handleSelect}>
        <div className="space-y-2">
          {availableChoices.map((choice) => {
            // For bundle choices, show menu item name and price
            const displayName = isBundle && choice.menuItemId
              ? allMenuItems?.find(m => m._id === choice.menuItemId)?.name || choice.name
              : choice.name
            
            // const displayPrice = isBundle && choice.menuItemId
            //   ? allMenuItems?.find(m => m._id === choice.menuItemId)?.price || choice.price
            //   : choice.price
            
            return (
              <div key={`${choice.originalIndex}-${choice.name}`} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={String(choice.originalIndex)} id={`choice-${group._id}-${choice.originalIndex}`} />
                  <Label 
                    htmlFor={`choice-${group._id}-${choice.originalIndex}`} 
                    className="flex-1 cursor-pointer text-xs md:text-fluid-sm font-normal"
                  >
                    <span>{displayName}</span>
                    {!isBundle && choice.price !== 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({choice.price >= 0 ? '+' : ''}₱{choice.price.toFixed(2)})
                      </span>
                    )}
                    {/* Price display for bundle choices - COMMENTED OUT */}
                    {/* {isBundle && (
                      <span className="ml-2 text-muted-foreground">
                        ₱{displayPrice.toFixed(2)}
                      </span>
                    )} */}
                  </Label>
                </div>
                {/* Variant selection for bundle choice item - COMMENTED OUT */}
                {/* {isBundle && selectedChoiceIndex === choice.originalIndex && selectedMenuItemVariants.length > 0 && (
                  <div className="ml-6">
                    <Select
                      value={selectedVariantId || "base"}
                      onValueChange={(value) => {
                        if (onVariantSelect) {
                          // Convert "base" back to empty string for storage
                          const variantId = value === "base" ? "" : value
                          onVariantSelect(choice.originalIndex, variantId)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full text-xs h-8">
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
                  </div>
                )} */}
              </div>
            )
          })}
        </div>
      </RadioGroup>
    </div>
  )
}

export function MenuItemOrderDialog({ item, onClose, onConfirm }: MenuItemOrderDialogProps) {
  // Get full menu item from context to check if it's a bundle
  const { menuItems } = useData()
  const fullMenuItem = useMemo(() => {
    if (!item?.id) return null
    return menuItems.find((mi: MenuItem) => mi._id === item.id) || null
  }, [menuItems, item?.id])
  
  const isBundle = fullMenuItem?.isBundle === true
  const bundleItems = fullMenuItem?.bundleItems || []
  
  // Get all menu items for bundle item pricing
  const allMenuItems = menuItems

  // Fetch choice groups
  const choiceGroupsQuery = useQuery(api.menu.getChoiceGroupsByMenuItem, item?.id ? { menuItemId: item.id as Id<"menu_items"> } : "skip")
  const choiceGroups = useMemo(() => (choiceGroupsQuery || []) as MenuItemChoiceGroup[], [choiceGroupsQuery])
  
  // Fetch variants for main menu item
  const variantsQuery = useQuery(api.menu.getVariantsByMenuItem, item?.id ? { menuItemId: item.id as Id<"menu_items"> } : "skip")
  const variants = useMemo(() => variantsQuery || [], [variantsQuery])
  const availableVariants = useMemo(() => (variants as MenuItemVariant[]).filter((v) => v.available !== false), [variants])

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  // Map of choiceGroupId -> { name, price, menuItemId?, variantId? } (for order storage)
  const [selectedChoices, setSelectedChoices] = useState<Record<string, { name: string; price: number; menuItemId?: string; variantId?: string }>>({})
  // Map of choiceGroupId -> choiceIndex (for UI selection tracking)
  const [selectedChoiceIndices, setSelectedChoiceIndices] = useState<Record<string, number>>({})
  // Map of choiceGroupId -> selected variantId for bundle choice items - COMMENTED OUT
  // const [selectedVariantsForChoices, setSelectedVariantsForChoices] = useState<Record<string, string>>({})

  const selectedVariant = useMemo(() => availableVariants.find((v) => v._id === selectedVariantId) || null, [availableVariants, selectedVariantId])
  
  // For bundles, use the fixed price from the menu item's price column
  // For regular items, use base price + variant price + choice adjustments
  const unitPrice = useMemo(() => {
    if (isBundle) {
      // Bundle pricing: use the fixed price from the menu item's price column
      // Customer's choice selection doesn't affect the bundle price
      return item.price
    } else {
      // Regular item pricing: base price + variant price + choice adjustments
      const baseUnitPrice = selectedVariant ? selectedVariant.price : item.price
      const totalAdjustments = Object.values(selectedChoices).reduce((sum, choice) => {
        return sum + (choice.price || 0)
      }, 0)
      return baseUnitPrice + totalAdjustments
    }
  }, [isBundle, item.price, selectedChoices, selectedVariant])


  const handleConfirm = () => {
    // Validate that all required choice groups have selections
    const allGroupsHaveSelections = choiceGroups.every((group) => {
      if (!group.required) return true
      return selectedChoices[group._id] !== undefined
    })

    if (choiceGroups.length > 0 && !allGroupsHaveSelections) {
      // This will be handled by the disabled state, but add a check here too
      return
    }

    const variantName = selectedVariant?.name
    const variantId = selectedVariant?._id
    
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
        const menuItem = allMenuItems.find(m => m._id === bi.menuItemId)
        if (menuItem) {
          bundleItemsArray!.push({
            menuItemId: bi.menuItemId,
            name: menuItem.name,
            price: menuItem.price,
          })
        }
      })
      
      // Add selected choice items (with variants if selected) - COMMENTED OUT variant handling
      // We need to find the choice group ID for each selected choice to get the variant
      Object.values(selectedChoices).forEach((choice) => {
        if (choice.menuItemId) {
          const menuItem = allMenuItems.find(m => m._id === choice.menuItemId)
          if (menuItem) {
            // Get variant ID from selectedVariantsForChoices using groupId - COMMENTED OUT
            // const variantId = selectedVariantsForChoices[groupId] || choice.variantId
            
            // For bundle items, we'll use base price for now
            // Variant prices will be calculated when we have the variant data
            // The variant ID is stored so we can look up the price later if needed
            bundleItemsArray!.push({
              menuItemId: choice.menuItemId,
              // variantId: variantId, // COMMENTED OUT - variant handling
              name: menuItem.name,
              price: menuItem.price, // Base price - variant pricing handled separately
            })
          }
        }
      })
    }
    
    // Include selected choices in cart ID to make unique combinations
    const choicesKey = Object.keys(selectedChoices).sort().map(k => `${k}:${selectedChoices[k].name}`).join('|')
    const cartId = variantId 
      ? `${item.id}:${variantId}${choicesKey ? `:${choicesKey}` : ''}` 
      : `${item.id}${choicesKey ? `:${choicesKey}` : ''}`

    onConfirm(
      {
        id: cartId,
        menuItemId: item.id,
        name: item.name,
        price: unitPrice,
        size: variantName,
        variantId: variantId,
        selectedChoices: Object.keys(selectedChoices).length > 0 ? selectedChoices : undefined,
        bundleItems: bundleItemsArray,
      },
      quantity,
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[85vw] max-w-full md:max-w-xl max-h-[80vh] md:h-auto p-3 md:p-6">
        <div className="space-y-3 md:space-y-6">
          {/* Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-24 h-24 xs:w-32 xs:h-32 md:w-40 md:h-40">
              <MenuItemImage src={item.image} alt={item.name} fill className="object-contain" />
            </div>
          </div>

          {/* Name & Description */}
          <div>
            <h2 className="text-lg md:text-fluid-2xl font-semibold">{item.name}</h2>
            <p className="text-xs md:text-fluid-sm text-muted-foreground mt-2">{item.description}</p>
          </div>

          {/* Quantity & Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="rounded-md touch-target w-8 h-8 md:w-10 md:h-10" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Minus className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <span className="w-6 md:w-8 text-center font-medium text-xs md:text-fluid-base">{quantity}</span>
              <Button type="button" size="icon" variant="outline" className="rounded-md touch-target w-8 h-8 md:w-10 md:h-10" onClick={() => setQuantity((q) => q + 1)}>
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
            <div className="text-right text-foreground font-semibold text-sm md:text-fluid-lg">₱{(unitPrice * quantity).toFixed(2)}</div>
          </div>

          {/* Variant Selection - Dropdown on mobile, buttons on desktop */}
          {availableVariants.length > 0 && (
            <div>
              <div className="text-xs md:text-fluid-sm text-muted-foreground mb-2">Variant</div>
              
              {/* Mobile: Dropdown */}
              <div className="block md:hidden">
                <Select value={selectedVariantId || ""} onValueChange={(value) => setSelectedVariantId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVariants.map((v) => (
                      <SelectItem key={v._id} value={String(v._id)}>
                        {v.name} - ₱{v.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Desktop: Button Grid */}
              <div className="hidden md:grid grid-cols-2 xs:grid-cols-3 gap-2 xs:gap-3">
                {availableVariants.map((v) => {
                  const selected = selectedVariantId === String(v._id)
                  return (
                    <Button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedVariantId(String(v._id))}
                      className={`${selected ? "bg-yellow-500 text-black border-yellow-500" : "bg-gray-100"} h-8 md:h-11 touch-target text-xs md:text-fluid-sm`}
                    >
                      {v.name}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Choice Groups Selection */}
          {choiceGroups.length > 0 && (
            <div className="space-y-4">
              {/* onVariantSelect and selectedVariantId props - COMMENTED OUT - variant handling */}
              {choiceGroups.map((group) => (
                <ChoiceGroupSelector
                  key={group._id}
                  group={group}
                  selectedChoiceIndex={selectedChoiceIndices[group._id]}
                  isBundle={isBundle}
                  allMenuItems={allMenuItems}
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

          {/* Footer Buttons */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-4">
            <Button variant="outline" className="h-10 md:h-12 touch-target" onClick={onClose}>
              <span className="text-xs md:text-fluid-base">Cancel</span>
            </Button>
            <Button
              className="h-10 md:h-12 bg-yellow-500 hover:bg-yellow-600 text-white touch-target"
              onClick={handleConfirm}
              disabled={
                (availableVariants.length > 0 && !selectedVariantId) ||
                (choiceGroups.length > 0 && !choiceGroups.every((group) => {
                  if (!group.required) return true
                  return selectedChoices[group._id] !== undefined
                }))
              }
            >
              <span className="text-xs md:text-fluid-base">Add to cart</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


