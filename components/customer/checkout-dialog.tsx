"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Upload } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
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
  const { addOrder, currentUser } = useData()
  // Initialize form fields from current user when available; fall back to empty
  const [customerName, setCustomerName] = useState(() => `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim())
  const [customerPhone, setCustomerPhone] = useState(() => currentUser?.phone ?? "")
  const [customerAddress, setCustomerAddress] = useState(() => currentUser?.address ?? "")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [paymentScreenshotId, setPaymentScreenshotId] = useState<string | null>(null)
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)
  const paymentScreenshotUrl = useQuery((api as any).files?.getUrl, paymentScreenshotId ? { storageId: paymentScreenshotId as any } : (undefined as any)) as string | undefined | null
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-order fields
  const [preOrderFulfillment, setPreOrderFulfillment] = useState<"pickup" | "delivery">("pickup")
  const [preOrderDate, setPreOrderDate] = useState<string>("") // ISO date
  const [preOrderTime, setPreOrderTime] = useState<string>("") // HH:MM
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment">("full")
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash">("online")


  // Keep phone/address synced from profile on open/switches
  useEffect(() => {
    if (currentUser?.phone) {
      setCustomerPhone((prev) => prev || currentUser.phone as string)
    }
    if (currentUser && (currentUser.firstName || currentUser.lastName)) {
      const n = `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim()
      setCustomerName((prev) => prev || n)
    }
  }, [currentUser])

  useEffect(() => {
    const wantsDelivery = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
    if (wantsDelivery && currentUser?.address) {
      setCustomerAddress((prev) => prev || (currentUser.address as string))
    }
  }, [orderType, preOrderFulfillment, currentUser?.address])


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPaymentScreenshot(file)
      try {
        const uploadUrl = await generateUploadUrl({})
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        })
        const json = await res.json()
        const storageId = json.storageId as string
        setPaymentScreenshotId(storageId)
      } catch (err) {
        console.error("Upload failed", err)
        toast.error("Failed to upload payment screenshot")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentUser?._id) {
        throw new Error("Not authenticated")
      }

      // Transform cart items to order items
      const orderItems = items.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      // Use uploaded storage file URL if present; fallback to no screenshot
      const screenshotUrl = paymentScreenshotId ? paymentScreenshotUrl ?? undefined : undefined

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
        // Backend enforces and overrides customerId to the authenticated user; provide for types
        customerId: currentUser._id,
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
        paymentScreenshot: screenshotUrl,
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
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone<span className="text-red-500">*</span></Label>
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
              <Label htmlFor="address">Delivery Address <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="pre-address">Delivery Address <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="preorder-date">Pickup/Delivery Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="preorder-date"
                    type="date"
                    value={preOrderDate}
                    onChange={(e) => setPreOrderDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                <Label htmlFor="preorder-time">Time <span className="text-red-500">*</span></Label>
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
            {paymentScreenshotUrl && (
              <div className="mt-2 w-full">
                <img src={paymentScreenshotUrl} alt="Payment" className="w-full rounded border object-contain" />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee</span>
              <span>₱{donation.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
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
