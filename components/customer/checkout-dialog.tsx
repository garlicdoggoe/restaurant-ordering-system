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
import { Upload, MapPin, Hand, CreditCard, Smartphone } from "lucide-react"
import { useData, type OrderType, type PreOrderFulfillment, type PaymentPlan, type RemainingPaymentMethod } from "@/lib/data-context"
import { useCart } from "@/lib/cart-context"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import dynamic from "next/dynamic"
const AddressMapPicker = dynamic(() => import("@/components/ui/address-map-picker"), { ssr: false })
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/phone-validation"
import { PaymentModal } from "@/components/ui/payment-modal"
import { compressImage } from "@/lib/image-compression"

interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  size?: string
}

interface CheckoutDialogProps {
  items: CartItem[]
  subtotal: number
  platformFee: number
  total: number
  onClose: () => void
  onSuccess: () => void
  onOpenSettings?: () => void
  onNavigateToView?: (view: "preorders" | "activeorders") => void
}

export function CheckoutDialog({ items, subtotal, platformFee, total, onClose, onSuccess, onOpenSettings, onNavigateToView }: CheckoutDialogProps) {
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery" | "pre-order">("pre-order")
  const { addOrder, currentUser, restaurant } = useData()
  const { updateQuantity } = useCart()
  
  // Initialize form fields from current user when available; fall back to empty
  const [customerAddress, setCustomerAddress] = useState(() => currentUser?.address ?? "")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-order fields
  const [preOrderFulfillment, setPreOrderFulfillment] = useState<"pickup" | "delivery">("pickup")
  // Initialize with default valid values for mobile compatibility (first available date and time)
  const [preOrderDate, setPreOrderDate] = useState<string>("2025-12-21") // ISO date - default to first available date
  const [preOrderTime, setPreOrderTime] = useState<string>("13:00") // HH:MM - default to first available time
  const [pickupDate, setPickupDate] = useState<string>("") // ISO date
  const [pickupTime, setPickupTime] = useState<string>("") // HH:MM
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment">("full")
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash">("online")
  // Special instructions with auto-save to localStorage
  const [specialInstructions, setSpecialInstructions] = useState<string>("")
  
  // Validation error states
  const [dateError, setDateError] = useState<string>("")
  const [timeError, setTimeError] = useState<string>("")

  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash")

  // Optional coordinates for delivery address (lng, lat)
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<[number, number] | null>(null)
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  
  // Default coordinates from user's saved coordinates or fallback to Libmanan, Camarines Sur
  const defaultCoordinates: [number, number] = currentUser?.coordinates 
    ? [currentUser.coordinates.lng, currentUser.coordinates.lat]
    : [123.05, 13.7] // Libmanan, Camarines Sur, Bicol

  // Keep address synced from profile on open/switches
  useEffect(() => {
    // Initialize delivery coordinates with user's saved coordinates
    if (currentUser?.coordinates && !deliveryCoordinates) {
      setDeliveryCoordinates([currentUser.coordinates.lng, currentUser.coordinates.lat])
    }
  }, [currentUser, deliveryCoordinates])

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
  // Ensures pre-order date is between December 21-27, 2025 (Christmas week)
  const validatePreOrderDate = (date: string): string => {
    if (!date) return ""
    
    const selectedDate = new Date(date)
    const minDate = new Date("2025-12-21")
    minDate.setHours(0, 0, 0, 0)
    const maxDate = new Date("2025-12-27")
    maxDate.setHours(23, 59, 59, 999)
    
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate < minDate || selectedDate > maxDate) {
      return "Pre-orders are only available for December 21-27, 2025"
    }
    
    return ""
  }

  // Clamp date to valid range (enforces min/max even if browser allows invalid selection)
  const clampPreOrderDate = (date: string): string => {
    if (!date) return "2025-12-21" // Default to first available date
    
    const selectedDate = new Date(date)
    const minDate = new Date("2025-12-21")
    minDate.setHours(0, 0, 0, 0)
    const maxDate = new Date("2025-12-27")
    maxDate.setHours(23, 59, 59, 999)
    
    selectedDate.setHours(0, 0, 0, 0)
    
    // Clamp to valid range
    if (selectedDate < minDate) {
      return "2025-12-21"
    }
    if (selectedDate > maxDate) {
      return "2025-12-27"
    }
    
    // Return date in YYYY-MM-DD format
    return date
  }

  // Helper function to convert 24-hour format to 12-hour format with AM/PM
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Validates that pre-order time is between 1:00 PM and 7:00 PM
  const validatePreOrderTime = (time: string, date: string): string => {
    if (!time || !date) return ""
    
    const [selectedHour, selectedMinute] = time.split(":").map(Number)
    const selectedMinutes = selectedHour * 60 + selectedMinute
    
    // Pre-order hours: 1:00 PM (13:00) to 7:00 PM (19:00)
    const minMinutes = 13 * 60 // 1:00 PM
    const maxMinutes = 19 * 60 // 7:00 PM
    
    if (selectedMinutes < minMinutes || selectedMinutes > maxMinutes) {
      return "Pre-order time must be between 1:00 PM and 7:00 PM"
    }
    
    return ""
  }

  // Clamp time to valid range (enforces min/max even if browser allows invalid selection)
  const clampPreOrderTime = (time: string): string => {
    if (!time) return "13:00" // Default to first available time
    
    const [selectedHour, selectedMinute] = time.split(":").map(Number)
    const selectedMinutes = selectedHour * 60 + selectedMinute
    
    // Pre-order hours: 1:00 PM (13:00) to 7:00 PM (19:00)
    const minMinutes = 13 * 60 // 1:00 PM
    const maxMinutes = 19 * 60 // 7:00 PM
    
    // Clamp to valid range
    if (selectedMinutes < minMinutes) {
      return "13:00"
    }
    if (selectedMinutes > maxMinutes) {
      return "19:00"
    }
    
    // Return time in HH:MM format
    return time
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const originalFile = e.target.files[0]
    
    try {      
      // Compress the image to approximately 100KB
      const compressedFile = await compressImage(originalFile, 100)
      
      // Set the compressed file instead of the original
      setPaymentScreenshot(compressedFile)
      
      // Create immediate preview and persist temporarily in localStorage
      const dataUrl = await fileToDataUrl(compressedFile)
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
        return dataUrl
      })
      const key = "checkout_payment_image"
      const payload = { name: compressedFile.name, type: compressedFile.type, dataUrl }
      window.localStorage.setItem(key, JSON.stringify(payload))
    } catch (err) {
      console.error("Failed to compress or prepare image preview", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentUser?._id) {
        throw new Error("Not authenticated")
      }

      // Validate phone number from user profile
      if (!currentUser?.phone || !isValidPhoneNumber(currentUser.phone)) {
        toast.error("Please update your phone number in profile settings")
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
        menuItemId: item.menuItemId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variantName: item.size || undefined,
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

      // Coordinates logic - store coordinates at time of order creation (isolated per order)
      const effectiveCoordinates = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
        ? (deliveryCoordinates 
            ? { lng: deliveryCoordinates[0], lat: deliveryCoordinates[1] }
            : (currentUser?.coordinates 
                ? { lng: currentUser.coordinates.lng, lat: currentUser.coordinates.lat }
                : undefined))
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
      const normalizedPhone = currentUser.phone
      const customerName = `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim()

      addOrder({
        // Backend enforces and overrides customerId to the authenticated user; provide for types
        customerId: currentUser._id,
        customerName,
        customerPhone: normalizedPhone,
        customerAddress: effectiveAddress,
        customerCoordinates: effectiveCoordinates, // Store coordinates at time of order creation
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
        status: orderType === "pre-order" ? "pre-order-pending" : "pending",
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
      
      // Navigate to the appropriate tab based on order type
      // Pre-orders go to Pre-Orders tab, all other orders go to Active Orders tab
      if (onNavigateToView) {
        if (orderType === "pre-order") {
          onNavigateToView("preorders")
        } else {
          onNavigateToView("activeorders")
        }
      }
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
      <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-7xl max-h-[90vh] md:h-[95vh] overflow-y-auto p-2 md:p-6">
        <DialogHeader className="px-2 md:px-6 pt-2 md:pt-6 pb-2">
          <DialogTitle className="text-lg md:text-fluid-2xl font-semibold">Checkout Details</DialogTitle>
          {/* Order Type Display */}
          <div className="mt-4 text-left">
            <h2 className="text-lg md:text-2xl font-medium text-gray-800 leading-none">
              for
            </h2>
            <h2 className="text-[2.5em] md:text-[3em] font-black text-gray-800 leading-none mt-1">
              {orderType === "dine-in" ? "Dine In" : orderType === "takeaway" ? "Takeout" : orderType === "delivery" ? "Delivery" : "Pre-order"}
            </h2>
            {/* Order Type Selection Buttons */}
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-1 md:flex md:gap-1">
                <Button
                  type="button"
                  variant={orderType === "dine-in" ? "default" : "outline"}
                  className={`flex-1 h-8 text-xs font-medium py-5 ${orderType === "dine-in" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  onClick={() => setOrderType("dine-in")}
                  disabled
                >
                  DINE IN
                </Button>
                <Button
                type="button"
                  variant={orderType === "takeaway" ? "default" : "outline"}
                  className={`flex-1 h-8 text-xs font-medium py-5 ${orderType === "takeaway" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  onClick={() => setOrderType("takeaway")}
                  disabled
                >
                  TAKE OUT
                </Button>
                <Button
                  type="button"
                  variant={orderType === "delivery" ? "default" : "outline"}
                  className={`flex-1 h-8 text-xs font-medium py-5 ${orderType === "delivery" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  onClick={() => setOrderType("delivery")}
                  disabled
                >
                  DELIVERY
                </Button>
                <Button
                  type="button"
                  variant={orderType === "pre-order" ? "default" : "outline"}
                  className={`flex-1 h-8 text-xs font-medium py-5 ${orderType === "pre-order" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  onClick={() => setOrderType("pre-order")}
                >
                  PREORDER
                </Button>
              </div>
            </div>
            <p className="text-xs text-red-500">Currently, only for Christmas week pre-orders are being accepted.</p>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Form Fields */}
          <div className="flex-1 px-2 md:px-6 pb-2 md:pb-6 space-y-3 md:space-y-6">
            {/* Delivery Address - only for delivery orders */}
            {(orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && (
              <div className="space-y-3">
                {/* Show map */}
                <div className="rounded-lg border p-3 bg-white">
                  <AddressMapPicker
                    address={customerAddress}
                    onAddressChange={setCustomerAddress}
                    coordinates={deliveryCoordinates || defaultCoordinates}
                    onCoordinatesChange={setDeliveryCoordinates}
                    mapHeightPx={180}
                    interactive={false}
                    disabled={true}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] text-yellow-600 hover:text-yellow-700 underline mt-[-7px]"
                    onClick={() => {
                      onClose()
                      onOpenSettings?.()
                    }}
                  >
                    Change delivery address
                  </button>
                </div>
              </div>
            )}

            {/* Pre-order fulfillment and payment options */}
            {orderType === "pre-order" && (
              <div className="space-y-3">
                {/* Top Row - Fulfillment Method and Payment Terms */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fulfillment Method</p>
                    <Select value={preOrderFulfillment} onValueChange={(v: PreOrderFulfillment) => setPreOrderFulfillment(v)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Fulfillment Method" className="text-gray-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup" className="text-xs">Pickup</SelectItem>
                        <SelectItem value="delivery" className="text-xs">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
                    <Select value={paymentPlan} onValueChange={(v: PaymentPlan) => setPaymentPlan(v)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Payment Plan" className="text-gray-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full" className="text-xs">Pay in full</SelectItem>
                        <SelectItem value="downpayment" className="text-xs">50% downpayment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Downpayment Method - if downpayment is selected */}
                {paymentPlan === "downpayment" && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Remaining balance payment method</p>
                    <Select value={downpaymentMethod} onValueChange={(v: RemainingPaymentMethod) => setDownpaymentMethod(v)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Balance Payment Method" className="text-gray-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online" className="text-xs">Online</SelectItem>
                        <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Date & Time for Pre-order */}
            {orderType === "pre-order" && (
              <div className="space-y-3">
                <Label className="text-xs md:text-sm text-gray-500">Pickup/Delivery Date & Time</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {/* Provide field-specific label so customers immediately know this input collects the date */}
                    <Label htmlFor="preorder-date" className="block text-[11px] text-gray-500 mb-1">
                      Date
                    </Label>
                    <Input
                      id="preorder-date"
                      type="date"
                      value={preOrderDate}
                      onChange={(e) => {
                        const rawDate = e.target.value
                        // Clamp date to valid range (prevents invalid dates on mobile browsers)
                        const clampedDate = clampPreOrderDate(rawDate)
                        setPreOrderDate(clampedDate)
                        setDateError(validatePreOrderDate(clampedDate))
                        if (preOrderTime) {
                          setTimeError(validatePreOrderTime(preOrderTime, clampedDate))
                        }
                      }}
                      required
                      min="2025-12-21"
                      max="2025-12-27"
                      className="w-full text-xs relative z-[100]"
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  <div>
                    {/* Provide field-specific label so customers immediately know this input collects the time */}
                    <Label htmlFor="preorder-time" className="block text-[11px] text-gray-500 mb-1">
                      Time
                    </Label>
                    <Input
                      id="preorder-time"
                      type="time"
                      value={preOrderTime}
                      onChange={(e) => {
                        const rawTime = e.target.value
                        // Clamp time to valid range (prevents invalid times on mobile browsers)
                        const clampedTime = clampPreOrderTime(rawTime)
                        setPreOrderTime(clampedTime)
                        setTimeError(validatePreOrderTime(clampedTime, preOrderDate))
                      }}
                      required
                      min="13:00"
                      max="19:00"
                      className="w-full text-xs relative z-[100]"
                      placeholder="--:--"
                    />
                  </div>
                </div>
                {/* Error messages displayed below the grid to take full width */}
                {dateError && (
                  <p className="text-sm text-red-500 mt-1">{dateError}</p>
                )}
                {timeError ? (
                  <p className="text-[12px] text-red-500 mt-1">{timeError}</p>
                ) : (
                  <p className="text-[12px] font-medium text-yellow-600 text-muted-foreground">
                    Available dates: December 21 - December 27, 2025
                  </p>
                )}
                {/* Surface the allowed pre-order date window so customers can plan ahead without guessing */}
                  <p className="text-[12px] font-medium text-yellow-600 text-muted-foreground mt-[-10px]">
                    Pre-order hours: 1:00 PM - 7:00 PM
                  </p>
              </div>
            )}

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="special-instructions" className="text-xs md:text-sm opacity-60">Landmark/Special Instructions</Label>
              <div className="relative">
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
                  className="text-sm md:text-base h-8 md:h-auto"
                />
                <p className="absolute -bottom-5 right-0 text-[10px] text-gray-400">
                  {specialInstructions.length}/100
                </p>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-3">
              <h3 className="text-lg mt-5 md:text-2xl font-bold text-gray-800">Payment Options</h3>
              {/* GCash Payment Method */}
              {currentUser?.gcashNumber && (
                <div className="flex items-center space-x-3">
                  <img src="/gcash.png" alt="GCash" className="h-8 w-auto" />
                  <p className="text-xs text-gray-800">
                    Manual GCash payment. Please send payment to {" "}
                    <span className="text-blue-600 font-medium">L** G** (+63) 915-777-0545</span>.
                  </p>
                </div>
              )}

              {/* Notification */}
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-[12px] text-white font-bold">i</span>
                </div>
                <p className="text-[12px] text-yellow-600">
                  Other payment methods will be available soon
                </p>
              </div>

              {/* Payment Proof Upload */}
              {!previewUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <input
                    id="payment-screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="payment-screenshot" className="cursor-pointer">
                    <div className="w-12 h-12 mx-auto mb-3 text-gray-400 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        <path d="M14 7a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      Click to upload payment proof
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Payment proof" 
                      className="w-full rounded border object-contain max-h-32 cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setPaymentModalOpen(true)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="payment-screenshot-change"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label 
                      htmlFor="payment-screenshot-change" 
                      className="flex-1 text-yellow-600 text-sm font-medium py-1 px-4 rounded-lg cursor-pointer text-center transition-colors"
                    >
                      Change Photo
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPaymentScreenshot(null)
                        setPreviewUrl(null)
                        // Clear from localStorage
                        try {
                          window.localStorage.removeItem("checkout_payment_image")
                        } catch {}
                      }}
                      className="text-sm"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="flex-1 px-2 md:px-6 pt-2 md:pt-6 pb-2 md:pb-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-semibold">Order Summary</h3>
              <span className="text-[12px] text-gray-600">Total items: {totalItems}</span>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between py-2 md:py-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm md:text-base">{item.name}</div>
                    {item.size && <div className="text-xs md:text-sm text-gray-600">{item.size}</div>}
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-6 h-6 md:w-8 md:h-8 p-0"
                      onClick={() => {
                        // Decrease quantity by 1
                        const newQuantity = Math.max(0, item.quantity - 1)
                        updateQuantity(item.id, newQuantity)
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
                        updateQuantity(item.id, item.quantity + 1)
                      }}
                    >
                      +
                    </Button>
                    <span className="ml-1 md:ml-3 text-xs md:text-sm">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
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
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 md:mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 md:py-4 rounded-lg text-sm md:text-base"
              disabled={
                isSubmitting || 
                !previewUrl || // Require payment proof image
                (orderType === "pre-order" && (
                  !preOrderDate || 
                  !preOrderTime || 
                  !!dateError || 
                  !!timeError
                ))
              }
            >
              {isSubmitting ? "Placing Order..." : "Confirm order"}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Payment Modal for larger photo view */}
      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen} 
        paymentUrl={previewUrl} 
        title="Payment Proof Preview" 
      />
    </Dialog>
  )
}