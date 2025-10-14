"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Upload } from "lucide-react"
import { useData } from "@/lib/data-context"
import { toast } from "sonner"

interface CheckoutDialogProps {
  items: any[]
  subtotal: number
  tax: number
  donation: number
  total: number
  onClose: () => void
  onSuccess: () => void
}

export function CheckoutDialog({ items, subtotal, tax, donation, total, onClose, onSuccess }: CheckoutDialogProps) {
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in")
  const [customerName, setCustomerName] = useState("John Doe")
  const [customerPhone, setCustomerPhone] = useState("+1234567890")
  const [customerAddress, setCustomerAddress] = useState("")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addOrder } = useData()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentScreenshot(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const customerId = "customer1" // Demo customer ID

      // Transform cart items to order items
      const orderItems = items.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      // For demo, using placeholder for payment screenshot
      const paymentScreenshotUrl = paymentScreenshot ? "/menu-sample.jpg" : undefined

      addOrder({
        customerId,
        customerName,
        customerPhone,
        customerAddress: orderType === "delivery" ? customerAddress : undefined,
        items: orderItems,
        subtotal,
        tax,
        donation,
        discount: 0,
        total,
        orderType,
        status: "pending",
        paymentScreenshot: paymentScreenshotUrl,
      })

      // Show success toast notification
      toast.success("Order placed successfully!", {
        description: `Your order for $${total.toFixed(2)} has been placed and is being processed.`,
        duration: 4000,
      })

      onSuccess()
    } catch (error) {
      console.error("Failed to create order:", error)
      // Show error toast notification
      toast.error("Failed to place order", {
        description: "Please try again or contact support if the problem persists.",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Your phone number"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Order Type</Label>
            <RadioGroup value={orderType} onValueChange={(v: any) => setOrderType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dine-in" id="dine-in" />
                <Label htmlFor="dine-in" className="font-normal cursor-pointer">
                  Dine In
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="takeaway" id="takeaway" />
                <Label htmlFor="takeaway" className="font-normal cursor-pointer">
                  Take Away
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="font-normal cursor-pointer">
                  Delivery
                </Label>
              </div>
            </RadioGroup>
          </div>

          {orderType === "delivery" && (
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address</Label>
              <Input
                id="address"
                placeholder="Enter delivery address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                required
              />
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="payment-screenshot">Payment Screenshot</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                id="payment-screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="payment-screenshot" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {paymentScreenshot ? paymentScreenshot.name : "Click to upload payment proof"}
                </p>
              </label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Donation</span>
              <span>${donation.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
