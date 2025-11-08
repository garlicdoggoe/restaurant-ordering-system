"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { CheckoutDialog } from "./checkout-dialog"
import { useData } from "@/lib/data-context"

interface CartProps {
  items: Array<{
    id: string
    menuItemId: string
    name: string
    price: number
    quantity: number
    size?: string
  }>
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onClearCart: () => void
  onOpenSettings?: () => void
  onNavigateToView?: (view: "preorders" | "activeorders") => void
}

export function Cart({ items, onUpdateQuantity, onClearCart, onOpenSettings, onNavigateToView }: CartProps) {
  const [showCheckout, setShowCheckout] = useState(false)

  const { getCustomerActiveOrder, currentUser, restaurant } = useData()
  const customerId = currentUser?._id || ""
  const activeOrder = customerId ? getCustomerActiveOrder(customerId) : undefined
  const hasActiveOrder = !!activeOrder

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const platformFee = restaurant.platformFee || 10
  const total = subtotal + platformFee

  if (items.length === 0) {
    return (
      <Card className="h-fit">
        <CardContent className="p-6 xs:p-8 text-center">
          <ShoppingCart className="w-10 h-10 xs:w-12 xs:h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-fluid-sm text-muted-foreground">Your cart is empty</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="p-4 xs:p-6">
          <CardTitle className="flex items-center justify-between text-fluid-lg">
            <span>Your Order</span>
            <Badge>{items.reduce((total, item) => total + item.quantity, 0)} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 xs:p-6 space-y-4">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-fluid-sm">{item.name}</p>
                  {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                  <p className="text-fluid-sm text-muted-foreground">₱{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 xs:h-7 xs:w-7 bg-transparent touch-target"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-fluid-sm font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 xs:h-7 xs:w-7 bg-transparent touch-target"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2 text-fluid-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee</span>
              <span>₱{platformFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-fluid-base">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {hasActiveOrder ? (
              <div className="hidden lg:block p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-fluid-sm text-yellow-800 font-medium">You have an active order</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please wait for your current order to be completed, denied, or cancelled before placing a new one.
                </p>
                {activeOrder?.paymentScreenshot && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Payment Screenshot:</p>
                    <Image 
                      src={activeOrder.paymentScreenshot} 
                      alt="Payment" 
                      width={400}
                      height={300}
                      className="w-full rounded border object-contain" 
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button className="w-full touch-target" size="lg" onClick={() => setShowCheckout(true)}>
                  <span className="text-fluid-base">Proceed to Checkout</span>
                </Button>
                <Button variant="outline" className="w-full gap-2 bg-transparent touch-target" onClick={onClearCart}>
                  <Trash2 className="w-4 h-4" />
                  <span className="text-fluid-base">Clear Cart</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {showCheckout && (
        <CheckoutDialog
          items={items}
          subtotal={subtotal}
          platformFee={platformFee}
          total={total}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false)
            onClearCart()
          }}
          onOpenSettings={onOpenSettings}
          onNavigateToView={onNavigateToView}
        />
      )}
    </>
  )
}
