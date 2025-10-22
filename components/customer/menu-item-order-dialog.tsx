"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { MenuItemImage } from "@/components/ui/menu-item-image"

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
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="p-6">
          {/* Image */}
          <div className="w-full flex justify-center">
            <div className="relative w-40 h-40">
              <MenuItemImage src={item.image} alt={item.name} fill className="object-contain" />
            </div>
          </div>

          {/* Name & Description */}
          <div className="mt-4">
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground mt-2">{item.description}</p>
          </div>

          {/* Quantity & Price */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="rounded-md" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button type="button" size="icon" variant="outline" className="rounded-md" onClick={() => setQuantity((q) => q + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-right text-foreground font-semibold">₱{(unitPrice * quantity).toFixed(2)}</div>
          </div>

          {/* Variant Buttons */}
          {availableVariants.length > 0 && (
            <div className="mt-5">
              <div className="text-sm text-muted-foreground mb-2">Variant</div>
              <div className="grid grid-cols-3 gap-3">
                {availableVariants.map((v: any) => {
                  const selected = selectedVariantId === String(v._id)
                  return (
                    <Button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedVariantId(String(v._id))}
                      className={`${selected ? "bg-yellow-500 text-black border-yellow-500" : "bg-gray-100"} h-11`}
                    >
                      {v.name}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="h-12 bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={handleConfirm}
              disabled={availableVariants.length > 0 && !selectedVariantId}
            >
              Add to cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


