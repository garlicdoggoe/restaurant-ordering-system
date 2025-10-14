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
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery" | "pre-order">("dine-in")
  const [customerName, setCustomerName] = useState("John Doe")
  const [customerPhone, setCustomerPhone] = useState("+1234567890")
  const [customerAddress, setCustomerAddress] = useState("")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-order fields
  const [preOrderFulfillment, setPreOrderFulfillment] = useState<"pickup" | "delivery">("pickup")
  const [preOrderDate, setPreOrderDate] = useState<string>("") // ISO date
  const [preOrderTime, setPreOrderTime] = useState<string>("") // HH:MM
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment">("full")
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash">("online")
  const [downpaymentProof, setDownpaymentProof] = useState<File | null>(null)

  const { addOrder } = useData()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentScreenshot(e.target.files[0])
    }
  }

  const handleDownpaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDownpaymentProof(e.target.files[0])
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

      // Address logic
      const effectiveAddress = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
        ? customerAddress
        : undefined

      // Combine date + time into a single timestamp in local time
      let preOrderScheduledAt: number | undefined = undefined
      if (orderType === "pre-order" && preOrderDate) {
        const dateObj = new Date(preOrderDate)
        if (preOrderTime) {
          const [hh, mm] = preOrderTime.split(":")
          dateObj.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0)
        } else {
          dateObj.setHours(0, 0, 0, 0)
        }
        preOrderScheduledAt = dateObj.getTime()
      }

      addOrder({
        customerId,
        customerName,
        customerPhone,
        customerAddress: effectiveAddress,
        items: orderItems,
        subtotal,
        tax,
        donation,
        discount: 0,
        total,
        orderType,
        preOrderFulfillment: orderType === "pre-order" ? preOrderFulfillment : undefined,
        preOrderScheduledAt,
        paymentPlan: orderType === "pre-order" ? paymentPlan : undefined,
        downpaymentAmount: orderType === "pre-order" && paymentPlan === "downpayment" ? total * 0.5 : undefined,
        downpaymentProofUrl: undefined,
        remainingPaymentMethod: orderType === "pre-order" && paymentPlan === "downpayment" ? (downpaymentMethod === "online" ? "online" : "cash") : undefined,
        status: "pending",
        paymentScreenshot: paymentScreenshotUrl,
      })

      toast.success("Order placed successfully!", {
        description: `Your order for $${total.toFixed(2)} has been placed and is being processed.`,
        duration: 4000,
      })

      onSuccess()
    } catch (error) {
      console.error("Failed to create order:", error)
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pre-order" id="pre-order" />
                <Label htmlFor="pre-order" className="font-normal cursor-pointer">
                  Pre-order
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

          {orderType === "pre-order" && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Pre-order Fulfillment</Label>
                <RadioGroup value={preOrderFulfillment} onValueChange={(v: any) => setPreOrderFulfillment(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="font-normal cursor-pointer">Pickup</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delivery" id="pre-delivery" />
                    <Label htmlFor="pre-delivery" className="font-normal cursor-pointer">Delivery</Label>
                  </div>
                </RadioGroup>
              </div>

              {preOrderFulfillment === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="pre-address">Delivery Address</Label>
                  <Input
                    id="pre-address"
                    placeholder="Enter delivery address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preorder-date">Pickup/Delivery Date</Label>
                  <Input
                    id="preorder-date"
                    type="date"
                    value={preOrderDate}
                    onChange={(e) => setPreOrderDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preorder-time">Time</Label>
                  <Input
                    id="preorder-time"
                    type="time"
                    value={preOrderTime}
                    onChange={(e) => setPreOrderTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <Label>Payment Plan</Label>
                <RadioGroup value={paymentPlan} onValueChange={(v: any) => setPaymentPlan(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="font-normal cursor-pointer">Pay in full</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="downpayment" id="downpayment" />
                    <Label htmlFor="downpayment" className="font-normal cursor-pointer">50% downpayment</Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentPlan === "downpayment" && (
                <>
                  <div className="space-y-3">
                    <Label>Remaining Payment Method</Label>
                    <RadioGroup value={downpaymentMethod} onValueChange={(v: any) => setDownpaymentMethod(v)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="online" id="dp-online" />
                        <Label htmlFor="dp-online" className="font-normal cursor-pointer">Online</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="dp-cash" />
                        <Label htmlFor="dp-cash" className="font-normal cursor-pointer">Cash</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {downpaymentMethod === "cash" && (
                    <div className="space-y-2">
                      <Label htmlFor="downpayment-proof">Downpayment Proof (optional)</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                        <input
                          id="downpayment-proof"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleDownpaymentProofChange(e)}
                          className="hidden"
                        />
                        <label htmlFor="downpayment-proof" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {downpaymentProof ? downpaymentProof.name : "Click to upload payment proof"}
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
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
