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
import type { MenuItemVariant, MenuItemChoiceGroup, MenuItemChoice } from "@/lib/data-context"

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
    },
    quantity: number,
  ) => void
}

// Helper component to fetch and display choices for a choice group
function ChoiceGroupSelector({ 
  group, 
  selectedChoiceIndex, 
  onSelect
}: { 
  group: MenuItemChoiceGroup
  selectedChoiceIndex: number | undefined
  onSelect: (choiceIndex: number, choiceData: { name: string; price: number }) => void
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
      onSelect(choiceIndex, { name: selectedChoice.name, price: selectedChoice.price })
    }
  }

  if (availableChoices.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-xs md:text-fluid-sm text-muted-foreground">{group.name} *</Label>
      <RadioGroup value={selectedChoiceIndex !== undefined ? String(selectedChoiceIndex) : ""} onValueChange={handleSelect}>
        <div className="space-y-2">
          {availableChoices.map((choice) => (
            <div key={`${choice.originalIndex}-${choice.name}`} className="flex items-center space-x-2">
              <RadioGroupItem value={String(choice.originalIndex)} id={`choice-${group._id}-${choice.originalIndex}`} />
              <Label 
                htmlFor={`choice-${group._id}-${choice.originalIndex}`} 
                className="flex-1 cursor-pointer text-xs md:text-fluid-sm font-normal"
              >
                <span>{choice.name}</span>
                {choice.price !== 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({choice.price >= 0 ? '+' : ''}₱{choice.price.toFixed(2)})
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}

export function MenuItemOrderDialog({ item, onClose, onConfirm }: MenuItemOrderDialogProps) {
  const variantsQuery = useQuery(api.menu.getVariantsByMenuItem, item?.id ? { menuItemId: item.id as Id<"menu_items"> } : "skip")
  const variants = useMemo(() => variantsQuery || [], [variantsQuery])
  const availableVariants = useMemo(() => (variants as MenuItemVariant[]).filter((v) => v.available !== false), [variants])

  // Fetch choice groups
  const choiceGroupsQuery = useQuery(api.menu.getChoiceGroupsByMenuItem, item?.id ? { menuItemId: item.id as Id<"menu_items"> } : "skip")
  const choiceGroups = useMemo(() => (choiceGroupsQuery || []) as MenuItemChoiceGroup[], [choiceGroupsQuery])

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  // Map of choiceGroupId -> { name, price } (for order storage)
  const [selectedChoices, setSelectedChoices] = useState<Record<string, { name: string; price: number }>>({})
  // Map of choiceGroupId -> choiceIndex (for UI selection tracking)
  const [selectedChoiceIndices, setSelectedChoiceIndices] = useState<Record<string, number>>({})

  const selectedVariant = useMemo(() => availableVariants.find((v) => v._id === selectedVariantId) || null, [availableVariants, selectedVariantId])
  
  // Calculate unit price: base price + variant price + sum of selected choice price adjustments
  const baseUnitPrice = selectedVariant ? selectedVariant.price : item.price
  
  // Calculate total unit price including all adjustments
  const unitPrice = useMemo(() => {
    const totalAdjustments = Object.values(selectedChoices).reduce((sum, choice) => {
      return sum + (choice.price || 0)
    }, 0)
    return baseUnitPrice + totalAdjustments
  }, [baseUnitPrice, selectedChoices])


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
              {choiceGroups.map((group) => (
                <ChoiceGroupSelector
                  key={group._id}
                  group={group}
                  selectedChoiceIndex={selectedChoiceIndices[group._id]}
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


