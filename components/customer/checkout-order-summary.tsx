"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BundleItemsList } from "@/components/shared/bundle-items-list"
import type { CartItem } from "@/lib/cart-context"

interface CheckoutOrderSummaryProps {
  items: CartItem[]
  subtotal: number
  platformFee: number
  deliveryFee: number
  isCalculatingDistance: boolean
  orderType: "dine-in" | "takeaway" | "delivery" | "pre-order"
  preOrderFulfillment?: "pickup" | "delivery"
  isAddressWithinDeliveryCoverage: boolean
  isSubmitting: boolean
  missingFields: string[]
  isSubmitDisabled: boolean
  onQuantityChange: (itemId: string, newQuantity: number) => void
}

export function CheckoutOrderSummary({
  items,
  subtotal,
  platformFee,
  deliveryFee,
  isCalculatingDistance,
  orderType,
  preOrderFulfillment,
  isAddressWithinDeliveryCoverage,
  isSubmitting,
  missingFields,
  isSubmitDisabled,
  onQuantityChange,
}: CheckoutOrderSummaryProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const wantsDelivery = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
  const effectiveDeliveryFee = wantsDelivery && isAddressWithinDeliveryCoverage ? deliveryFee : 0
  const total = subtotal + platformFee + effectiveDeliveryFee

  return (
    <div className="flex-1 px-2 md:px-6 pt-2 md:pt-6 pb-2 md:pb-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold">Order Summary</h3>
        <span className="text-[12px] text-gray-600">Total items: {totalItems}</span>
      </div>
      
      <div className="space-y-3 md:space-y-4">
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between py-2 md:py-3">
              <div className="flex-1">
                <div className="font-medium text-sm md:text-base">
                  {item.name}
                </div>
                {item.size && <div className="text-xs md:text-sm text-gray-600">{item.size}</div>}
                {/* Bundle items list */}
                {item.bundleItems && item.bundleItems.length > 0 && (
                  <div className="mt-2">
                    <BundleItemsList bundleItems={item.bundleItems} />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 md:space-x-2">
                <span className="text-xs md:text-sm">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-6 h-6 md:w-8 md:h-8 p-0"
                  onClick={() => {
                    // Decrease quantity by 1
                    const newQuantity = Math.max(0, item.quantity - 1)
                    onQuantityChange(item.id, newQuantity)
                  }}
                >
                  -
                </Button>
                <span className="w-6 md:w-8 text-center text-xs md:text-sm">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-6 h-6 md:w-8 md:h-8 p-0"
                  onClick={() => {
                    // Increase quantity by 1
                    onQuantityChange(item.id, item.quantity + 1)
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-6" />
      
      <div className="space-y-2 text-xs md:space-y-3 text-sm md:text-base">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Platform fee</span>
          <span>₱{platformFee.toFixed(2)}</span>
        </div>
        {wantsDelivery && isAddressWithinDeliveryCoverage && (
          <div className="flex justify-between">
            <span>
              Delivery fee
              {isCalculatingDistance && <span className="text-xs text-muted-foreground ml-1">(calculating...)</span>}
            </span>
            <span>₱{deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>₱{total.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Missing fields indicator - only show when button is disabled and not submitting */}
      {!isSubmitting && missingFields.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-red-500 font-medium">Please fill in the following:</p>
          <ul className="text-xs text-red-500 list-disc list-inside space-y-0.5 ml-2">
            {missingFields.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
        </div>
      )}
      <Button 
        type="submit" 
        className="w-full mt-4 md:mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 md:py-4 rounded-lg text-sm md:text-base"
        disabled={isSubmitDisabled}
      >
        {isSubmitting ? "Placing Order..." : "Confirm order"}
      </Button>
    </div>
  )
}

