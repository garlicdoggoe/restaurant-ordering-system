"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
// Switched order type controls to dropdown Select components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Upload, Edit, MapPin, Hand, CreditCard, Smartphone } from "lucide-react"
import { useData } from "@/lib/data-context"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { PhoneInput } from "@/components/ui/phone-input"
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/phone-validation"
import { useRouter } from "next/navigation"

interface CheckoutDialogProps {
  items: any[]
  subtotal: number
  platformFee: number
  total: number
  onClose: () => void
  onSuccess: () => void
}

export function CheckoutDialog({ items, subtotal, platformFee, total, onClose, onSuccess }: CheckoutDialogProps) {
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery" | "pre-order">("dine-in")
  const { addOrder, currentUser, restaurant } = useData()
  const router = useRouter()
  
  // Initialize form fields from current user when available; fall back to empty
  const [customerName, setCustomerName] = useState(() => `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim())
  const [customerPhone, setCustomerPhone] = useState(() => currentUser?.phone ?? "")
  const [customerAddress, setCustomerAddress] = useState(() => currentUser?.address ?? "")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const generateUploadUrl = useMutation((api as any).files?.generateUploadUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-order fields
  const [preOrderFulfillment, setPreOrderFulfillment] = useState<"pickup" | "delivery">("pickup")
  const [preOrderDate, setPreOrderDate] = useState<string>("") // ISO date
  const [preOrderTime, setPreOrderTime] = useState<string>("") // HH:MM
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment">("full")
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash">("online")
  // Special instructions with auto-save to localStorage
  const [specialInstructions, setSpecialInstructions] = useState<string>("")
  
  // Validation error states
  const [dateError, setDateError] = useState<string>("")
  const [timeError, setTimeError] = useState<string>("")

  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash")

  // Edit mode for delivery details
  const [isEditingDelivery, setIsEditingDelivery] = useState(false)

  // Keep phone/address synced from profile on open/switches
  useEffect(() => {
    if (currentUser?.phone) {
      // Database now stores only 10-digit numbers (no +63 prefix to strip)
      setCustomerPhone((prev) => prev || (currentUser.phone as string))
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

  // Restore any pending image from localStorage (if available)
  useEffect(() => {
    const key = "checkout_payment_image"
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    if (!raw) return
    try {
      const stored = JSON.parse(raw) as { name: string; type: string; dataUrl: string }
      if (!stored?.dataUrl) return
      setPreviewUrl(stored.dataUrl)
      // Recreate File from data URL so submit flow can upload it
      fetch(stored.dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], stored.name || "payment.jpg", { type: stored.type || blob.type })
          setPaymentScreenshot(file)
        })
        .catch(() => {
          // If reconstruction fails, just clear the preview
          setPreviewUrl(null)
        })
    } catch {
      // Ignore corrupted localStorage
    }
  }, [])

  // Load saved special instructions
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("checkout_special_instructions") : null
      if (raw !== null) setSpecialInstructions(raw)
    } catch {}
  }, [])

  // Persist special instructions automatically
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("checkout_special_instructions", specialInstructions)
      }
    } catch {}
  }, [specialInstructions])

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Validation functions for pre-order date and time
  // Ensures pre-order date is at least 1 day from current date
  const validatePreOrderDate = (date: string): string => {
    if (!date) return ""
    
    const selectedDate = new Date(date)
    const today = new Date()
    const oneDayFromNow = new Date(today)
    oneDayFromNow.setDate(today.getDate() + 1)
    oneDayFromNow.setHours(0, 0, 0, 0) // Start of day
    
    if (selectedDate < oneDayFromNow) {
      return "Pre-order date must be at least 1 day from today"
    }
    
    return ""
  }

  // Helper function to convert 24-hour format to 12-hour format with AM/PM
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Validates that pre-order time is within restaurant operating hours
  const validatePreOrderTime = (time: string, date: string): string => {
    if (!time || !date) return ""
    
    // Check if restaurant has opening/closing times set
    if (!restaurant?.openingTime || !restaurant?.closingTime) {
      return "Restaurant operating hours not available"
    }
    
    const [openingHour, openingMinute] = restaurant.openingTime.split(":").map(Number)
    const [closingHour, closingMinute] = restaurant.closingTime.split(":").map(Number)
    const [selectedHour, selectedMinute] = time.split(":").map(Number)
    
    const openingMinutes = openingHour * 60 + openingMinute
    const closingMinutes = closingHour * 60 + closingMinute
    const selectedMinutes = selectedHour * 60 + selectedMinute
    
    if (selectedMinutes < openingMinutes || selectedMinutes > closingMinutes) {
      const openingTime12 = formatTime12Hour(restaurant.openingTime)
      const closingTime12 = formatTime12Hour(restaurant.closingTime)
      return `Time must be between ${openingTime12} and ${closingTime12}`
    }
    
    return ""
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    setPaymentScreenshot(file)
    try {
      // Create immediate preview and persist temporarily in localStorage
      const dataUrl = await fileToDataUrl(file)
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
        return dataUrl
      })
      const key = "checkout_payment_image"
      const payload = { name: file.name, type: file.type, dataUrl }
      window.localStorage.setItem(key, JSON.stringify(payload))
    } catch (err) {
      console.error("Failed to prepare image preview", err)
      toast.error("Failed to prepare image preview")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentUser?._id) {
        throw new Error("Not authenticated")
      }

      // Validate phone number
      if (!isValidPhoneNumber(customerPhone)) {
        toast.error("Please enter a valid phone number")
        setIsSubmitting(false)
        return
      }

      // Validate pre-order fields if it's a pre-order
      if (orderType === "pre-order") {
        const dateValidationError = validatePreOrderDate(preOrderDate)
        const timeValidationError = validatePreOrderTime(preOrderTime, preOrderDate)
        
        if (dateValidationError || timeValidationError) {
          setDateError(dateValidationError)
          setTimeError(timeValidationError)
          setIsSubmitting(false)
          toast.error("Please fix the validation errors before submitting")
          return
        }
      }

      // Transform cart items to order items
      const orderItems = items.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      // Upload image only now (on submit). We pass storageId; server resolves to URL.
      let paymentScreenshotStorageId: string | undefined = undefined
      if (paymentScreenshot) {
        try {
          const uploadUrl = await generateUploadUrl({})
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": paymentScreenshot.type || "application/octet-stream" },
            body: paymentScreenshot,
          })
          const json = await res.json()
          paymentScreenshotStorageId = json.storageId as string
        } catch (err) {
          console.error("Upload failed", err)
          toast.error("Failed to upload payment screenshot")
          setIsSubmitting(false)
          return
        }
      }

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

      // Store only the 10-digit number in the database (without +63 prefix)
      const normalizedPhone = customerPhone

      addOrder({
        // Backend enforces and overrides customerId to the authenticated user; provide for types
        customerId: currentUser._id,
        customerName,
        customerPhone: normalizedPhone,
        customerAddress: effectiveAddress,
        gcashNumber: currentUser.gcashNumber, // Include GCash number used for payment
        items: orderItems,
        subtotal,
        platformFee,
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
        paymentScreenshot: paymentScreenshotStorageId,
        specialInstructions: specialInstructions.trim() || undefined, 
      })

      toast.success("Order placed successfully!", {
        description: `Your order for ₱${total.toFixed(2)} has been placed and is being processed.`,
        duration: 4000,
      })

      // Clear the temporarily saved image from localStorage after success
      try {
        window.localStorage.removeItem("checkout_payment_image")
      } catch {}
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
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

  // Calculate total items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-7xl xl:max-w-[90vw] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-8 pb-2">
          <DialogTitle className="text-2xl font-semibold">Checkout Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Delivery Details and Payment Options */}
          <div className="flex-1 px-8 pb-8 space-y-8">
            {/* Delivery Details Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              {isEditingDelivery ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Contact Person</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <PhoneInput
                    id="phone"
                    label="Phone Number"
                    value={customerPhone}
                    onChange={setCustomerPhone}
                    required
                  />

                  {(orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && (
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <Input
                          id="address"
                          placeholder="Enter delivery address"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact Person:</span>
                    <span className="font-medium">{customerName || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone Number:</span>
                    <span className="font-medium">(+63) {customerPhone || "Not provided"}</span>
                  </div>
                  {(orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium flex items-center">
                        <MapPin className="w-3 h-3 text-red-500 mr-1" />
                        {customerAddress || "Not provided"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Landmark:</span>
                    <span className="font-medium">Tapat ng gate na green.</span>
                  </div>
                </div>
              )}

              {/* Order Type and Pre-order options as dropdowns */}
              <div className="mt-3">
                <Label className="text-sm text-gray-700">Order Type</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine-in">Dine In</SelectItem>
                      <SelectItem value="takeaway">Take Away</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pre-order">Pre-order</SelectItem>
                    </SelectContent>
                  </Select>

                  {orderType === "pre-order" && (
                    <>
                      <div>
                        <Select value={preOrderFulfillment} onValueChange={(v: any) => setPreOrderFulfillment(v)}>
                          <SelectTrigger className="w-64">
                            <SelectValue placeholder="Pre-order Fulfillment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Fulfillment method</p>
                      </div>

                      <div>
                        <Select value={paymentPlan} onValueChange={(v: any) => setPaymentPlan(v)}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="Payment Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Pay in full</SelectItem>
                            <SelectItem value="downpayment">50% downpayment</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Payment terms</p>
                      </div>

                      {paymentPlan === "downpayment" && (
                        <div>
                          <Select value={downpaymentMethod} onValueChange={(v: any) => setDownpaymentMethod(v)}>
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Balance Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">Remaining balance payment method</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Date & Time for Pre-order */}
              {orderType === "pre-order" && (
                <div className="mt-6">
                  <Label className="text-sm text-gray-700">Pickup/Delivery Date & Time</Label>
                  <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <Input
                        id="preorder-date"
                        type="date"
                        value={preOrderDate}
                        onChange={(e) => {
                          const date = e.target.value
                          setPreOrderDate(date)
                          setDateError(validatePreOrderDate(date))
                          if (preOrderTime) {
                            setTimeError(validatePreOrderTime(preOrderTime, date))
                          }
                        }}
                        required
                        min={new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      />
                      {dateError && (
                        <p className="text-sm text-red-500 mt-1">{dateError}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        id="preorder-time"
                        type="time"
                        value={preOrderTime}
                        onChange={(e) => {
                          const time = e.target.value
                          setPreOrderTime(time)
                          setTimeError(validatePreOrderTime(time, preOrderDate))
                        }}
                        required
                        min={restaurant?.openingTime || "00:00"}
                        max={restaurant?.closingTime || "23:59"}
                      />
                      {restaurant?.openingTime && restaurant?.closingTime && (
                        <p className="text-xs text-muted-foreground">
                          Restaurant hours: {formatTime12Hour(restaurant.openingTime)} - {formatTime12Hour(restaurant.closingTime)}
                        </p>
                      )}
                      {timeError && (
                        <p className="text-xs text-red-500 mt-1">{timeError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Special Instructions - always visible and auto-saved */}
              <div className="mt-3">
                <Label htmlFor="special-instructions" className="mb-2">Special Instructions</Label>
                <Input
                  id="special-instructions"
                  placeholder="Optional"
                  value={specialInstructions}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 100) {
                      setSpecialInstructions(value)
                    }
                  }}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {specialInstructions.length}/100 characters
                </p>
              </div>
            </div>

            {/* Pre-order specific fields moved above and switched to dropdowns */}

            {/* Payment Options Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-6">Payment Options</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button
                  type="button"
                  variant={selectedPaymentMethod === "cash" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setSelectedPaymentMethod("cash")}
                >
                  <Hand className="w-6 h-6" />
                  <span className="text-sm">Cash on delivery</span>
                </Button>
                
                <Button
                  type="button"
                  variant={selectedPaymentMethod === "visa" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setSelectedPaymentMethod("visa")}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm">VISA</span>
                </Button>
                
                <Button
                  type="button"
                  variant={selectedPaymentMethod === "mastercard" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setSelectedPaymentMethod("mastercard")}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-sm">mastercard</span>
                </Button>
                
                <Button
                  type="button"
                  variant={selectedPaymentMethod === "gcash" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setSelectedPaymentMethod("gcash")}
                >
                  <Smartphone className="w-6 h-6" />
                  <span className="text-sm">GCash</span>
                </Button>
              </div>

              {/* Payment Proof Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  id="payment-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="payment-screenshot" className="cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload payment proof
                  </p>
                </label>
              </div>
              
              {previewUrl && (
                <div className="mt-3">
                  <img src={previewUrl} alt="Payment proof" className="w-full rounded border object-contain max-h-32" />
                </div>
              )}

              {/* GCash number display */}
              {currentUser?.gcashNumber && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    Please use (+63) {currentUser.gcashNumber} for payment processing
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 underline text-xs"
                    onClick={() => {
                      onClose()
                      router.push('/profile')
                    }}
                  >
                    Change GCash number
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="flex-1 bg-gray-50 px-8 pt-8 pb-8">
            <h3 className="text-xl font-semibold mb-6">Order Summary</h3>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {item.size && <div className="text-sm text-gray-600">{item.size}</div>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => {
                        // Handle quantity decrease
                        // This would need to be implemented with cart context
                      }}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => {
                        // Handle quantity increase
                        // This would need to be implemented with cart context
                      }}
                    >
                      +
                    </Button>
                    <span className="ml-3 font-semibold text-yellow-600">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />
            
            <div className="space-y-3 text-base">
              <div className="flex justify-between">
                <span className="text-gray-600">Total items: {totalItems}</span>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-8 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 rounded-lg text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Placing Order..." : "Confirm order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}