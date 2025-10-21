"use client"

import { useState } from "react"
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
    name: string
    price: number
    quantity: number
  }>
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onClearCart: () => void
}

export function Cart({ items, onUpdateQuantity, onClearCart }: CartProps) {
  const [showCheckout, setShowCheckout] = useState(false)

  const { getCustomerPendingOrder, currentUser } = useData()
  const customerId = currentUser?._id || ""
  const pendingOrder = customerId ? getCustomerPendingOrder(customerId) : undefined
  const hasPendingOrder = !!pendingOrder

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const platformFee = 10
  const total = subtotal + platformFee

  if (items.length === 0) {
    return (
      <Card className="h-fit">
        <CardContent className="p-8 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Your cart is empty</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Order</span>
            <Badge>{items.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-sm text-muted-foreground">₱{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-transparent"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-transparent"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee</span>
              <span>₱{platformFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {hasPendingOrder ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">You have a pending order</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please wait for your current order to be confirmed before placing a new one.
                </p>
                {pendingOrder?.paymentScreenshot && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Payment Screenshot:</p>
                    <img src={pendingOrder.paymentScreenshot} alt="Payment" className="w-full rounded border object-contain" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
                  Proceed to Checkout
                </Button>
                <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={onClearCart}>
                  <Trash2 className="w-4 h-4" />
                  Clear Cart
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
          tax={0}
          donation={platformFee}
          total={total}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false)
            onClearCart()
          }}
        />
      )}
    </>
  )
}
