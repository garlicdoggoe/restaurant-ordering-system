"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { MenuItemImage } from "@/components/ui/menu-item-image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    },
    quantity: number,
  ) => void
}

export function MenuItemOrderDialog({ item, onClose, onConfirm }: MenuItemOrderDialogProps) {
  const variants = useQuery(api.menu.getVariantsByMenuItem, item?.id ? { menuItemId: item.id as any } : "skip") || []

  const availableVariants = useMemo(() => variants.filter((v: any) => v.available !== false), [variants])

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(1)

  const selectedVariant = useMemo(() => availableVariants.find((v: any) => v._id === selectedVariantId) || null, [availableVariants, selectedVariantId])
  const unitPrice = selectedVariant ? selectedVariant.price : item.price

  const handleConfirm = () => {
    const variantName = selectedVariant?.name
    const variantId = selectedVariant?._id
    const cartId = variantId ? `${item.id}:${variantId}` : item.id

    onConfirm(
      {
        id: cartId,
        menuItemId: item.id,
        name: item.name,
        price: unitPrice,
        size: variantName,
        variantId: variantId,
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
                    {availableVariants.map((v: any) => (
                      <SelectItem key={v._id} value={String(v._id)}>
                        {v.name} - ₱{v.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Desktop: Button Grid */}
              <div className="hidden md:grid grid-cols-2 xs:grid-cols-3 gap-2 xs:gap-3">
                {availableVariants.map((v: any) => {
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

          {/* Footer Buttons */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 md:pt-4">
            <Button variant="outline" className="h-10 md:h-12 touch-target" onClick={onClose}>
              <span className="text-xs md:text-fluid-base">Cancel</span>
            </Button>
            <Button
              className="h-10 md:h-12 bg-yellow-500 hover:bg-yellow-600 text-white touch-target"
              onClick={handleConfirm}
              disabled={availableVariants.length > 0 && !selectedVariantId}
            >
              <span className="text-xs md:text-fluid-base">Add to cart</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


