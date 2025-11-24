"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useData, type PreorderSchedule, type PreorderScheduleDate } from "@/lib/data-context"
import { useCart } from "@/lib/cart-context"
import { useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { calculateDeliveryFee, isWithinDeliveryCoverage } from "@/lib/order-utils"
import { isValidPhoneNumber } from "@/lib/phone-validation"
import { compressImage } from "@/lib/image-compression"
import { getTodayIsoDate, DEFAULT_PREORDER_TIME, formatTimeRange12h, timeToMinutes } from "@/lib/time-utils"
import { validatePreOrderDate, validatePreOrderTime, clampPreOrderDate, clampPreOrderTime } from "@/lib/checkout-validation"
import { CheckoutDeliveryAddress } from "@/components/customer/checkout-delivery-address"
import { CheckoutPreorderOptions } from "@/components/customer/checkout-preorder-options"
import { CheckoutDateTime } from "@/components/customer/checkout-date-time"
import { CheckoutPaymentOptions } from "@/components/customer/checkout-payment-options"
import { CheckoutOrderSummary } from "@/components/customer/checkout-order-summary"

interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  size?: string
  variantId?: string
  selectedChoices?: Record<string, { name: string; price: number; menuItemId?: string }>
  bundleItems?: Array<{ menuItemId: string; variantId?: string; name: string; price: number }>
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
  onCloseCart?: () => void
}


export function CheckoutDialog({ items, subtotal, platformFee, onClose, onSuccess, onOpenSettings, onNavigateToView, onCloseCart }: CheckoutDialogProps) {
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery" | "pre-order">("pre-order")
  const { addOrder, currentUser, restaurant } = useData()
  const { updateQuantity } = useCart()

  // Mirror the owner's configured schedule so we can enforce it client-side
  const preorderSchedule: PreorderSchedule = useMemo(() => {
    return (
    restaurant?.preorderSchedule ?? {
      restrictionsEnabled: false,
      dates: [] as PreorderScheduleDate[],
    }
    )
  }, [restaurant?.preorderSchedule])
  const scheduledDates = useMemo(
    () => [...(preorderSchedule.dates ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [preorderSchedule],
  )
  const restrictionsEnabled = preorderSchedule.restrictionsEnabled
  const hasConfiguredDates = scheduledDates.length > 0
  const restrictionsActive = restrictionsEnabled && hasConfiguredDates
  const restrictionsEnabledButEmpty = restrictionsEnabled && !hasConfiguredDates
  
  // Initialize form fields from current user when available; fall back to empty
  const [customerAddress, setCustomerAddress] = useState(() => currentUser?.address ?? "")
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const calculateDistance = useAction(api.users.calculateDistance)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Pre-order fields
  // Initialize as undefined to require explicit selection
  const [preOrderFulfillment, setPreOrderFulfillment] = useState<"pickup" | "delivery" | undefined>(undefined)
  const [preOrderDate, setPreOrderDate] = useState<string>(() =>
    restrictionsActive ? "" : getTodayIsoDate(),
  )
  const [preOrderTime, setPreOrderTime] = useState<string>(() =>
    restrictionsActive ? "" : DEFAULT_PREORDER_TIME,
  )
  const selectedScheduleEntry = useMemo(() => {
    if (!restrictionsActive) return undefined
    return scheduledDates.find((entry) => entry.date === preOrderDate) ?? scheduledDates[0]
  }, [restrictionsActive, scheduledDates, preOrderDate])
  // Initialize as undefined to require explicit selection
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment" | undefined>(undefined)
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash" | undefined>(undefined)
  // Special instructions with auto-save to localStorage
  const [specialInstructions, setSpecialInstructions] = useState<string>("")
  
  // Validation error states
  const [dateError, setDateError] = useState<string>("")
  const [timeError, setTimeError] = useState<string>("")

  // Optional coordinates for delivery address (lng, lat)
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<[number, number] | null>(null)
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  
  // Default coordinates from user's saved coordinates or fallback to Libmanan, Camarines Sur
  const defaultCoordinates: [number, number] = currentUser?.coordinates 
    ? [currentUser.coordinates.lng, currentUser.coordinates.lat]
    : [123.05, 13.7] // Libmanan, Camarines Sur, Bicol

  // Check if user's address is within delivery coverage
  const isAddressWithinDeliveryCoverage = useMemo(() => {
    if (!currentUser?.coordinates) return false
    return isWithinDeliveryCoverage(currentUser.coordinates)
  }, [currentUser?.coordinates])

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

  // Calculate delivery fee when delivery is selected and coordinates are available
  useEffect(() => {
    const isDelivery = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
    
    if (!isDelivery) {
      setDeliveryFee(0)
      setIsCalculatingDistance(false)
      return
    }

    // Need both restaurant and customer coordinates to calculate distance
    if (!restaurant?.coordinates || !deliveryCoordinates) {
      setDeliveryFee(0)
      setIsCalculatingDistance(false)
      return
    }

    // Calculate distance and delivery fee
    const calculateFee = async () => {
      setIsCalculatingDistance(true)
      try {
        if (!restaurant.coordinates) {
          console.error("Restaurant coordinates not available")
          setDeliveryFee(0)
          setIsCalculatingDistance(false)
          return
        }
        
        const distanceInMeters = await calculateDistance({
          customerCoordinates: { lng: deliveryCoordinates[0], lat: deliveryCoordinates[1] },
          restaurantCoordinates: restaurant.coordinates,
        })
        
        const feePerKm = restaurant.feePerKilometer ?? 15
        const calculatedFee = calculateDeliveryFee(distanceInMeters, feePerKm)
        setDeliveryFee(calculatedFee)
      } catch (error) {
        // Log only error message to avoid exposing sensitive coordinate or route data
        console.error("Failed to calculate delivery fee:", error instanceof Error ? error.message : "Unknown error")
        setDeliveryFee(0)
      } finally {
        setIsCalculatingDistance(false)
      }
    }

    void calculateFee()
  }, [orderType, preOrderFulfillment, deliveryCoordinates, restaurant?.coordinates, restaurant?.feePerKilometer, calculateDistance])

  // Keep the date/time inputs synchronized with whatever the owner configured
  // Note: We intentionally exclude preOrderTime from dependencies to avoid resetting
  // the time while the user is typing. We only validate/reset when date or schedule changes.
  useEffect(() => {
    if (restrictionsEnabledButEmpty) {
      if (preOrderDate !== "") {
        setPreOrderDate("")
      }
      if (preOrderTime !== "") {
        setPreOrderTime("")
      }
      setDateError("Pre-orders are temporarily unavailable. Please check back soon.")
      setTimeError("")
      return
    }

    if (restrictionsActive) {
      // Don't auto-select a date - require user to explicitly choose
      // Only validate and reset if date is set
      if (!preOrderDate) {
        // No date selected - clear time and errors
        setPreOrderTime("")
        setDateError("")
        setTimeError("")
        return
      }
      
      if (!selectedScheduleEntry) {
        // Date is set but doesn't match any schedule entry - validate it
        const dateError = validateDate(preOrderDate)
        setDateError(dateError)
        setPreOrderTime("")
        return
      }
      
      // Only validate and reset time if it's outside the allowed window
      // This check runs when schedule changes, but not on every time change
      const startMinutes = timeToMinutes(selectedScheduleEntry.startTime)
      const endMinutes = timeToMinutes(selectedScheduleEntry.endTime)
      const currentMinutes = timeToMinutes(preOrderTime)
      if (
        startMinutes !== null &&
        endMinutes !== null &&
        currentMinutes !== null &&
        (currentMinutes < startMinutes || currentMinutes > endMinutes)
      ) {
        // Only reset if time is invalid - reset to empty to require user selection
        setPreOrderTime("")
      }
      setDateError("")
      setTimeError("")
      return
    }

    if (!preOrderDate) {
      setPreOrderDate(getTodayIsoDate())
    }
    if (!preOrderTime) {
      setPreOrderTime(DEFAULT_PREORDER_TIME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    restrictionsActive,
    restrictionsEnabledButEmpty,
    scheduledDates,
    preOrderDate,
    selectedScheduleEntry,
    // preOrderTime intentionally excluded from dependencies to prevent resetting while user types
  ])

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

  // Human-friendly label for each scheduled day (date + time window)
  const formatScheduleLabel = (entry: PreorderScheduleDate) => {
    const parsed = new Date(entry.date)
    const friendlyDate = Number.isNaN(parsed.getTime())
      ? entry.date
      : parsed.toLocaleDateString("en-PH", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
    return `${friendlyDate} • ${formatTimeRange12h(entry.startTime, entry.endTime)}`
  }

  // Validation helpers using imported functions
  const validateDate = (date: string): string => {
    return validatePreOrderDate(date, restrictionsEnabled, hasConfiguredDates, scheduledDates)
  }

  const validateTime = (time: string, date: string): string => {
    return validatePreOrderTime(time, date, restrictionsEnabled, scheduledDates)
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

      // Check if new orders are allowed (client-side validation for UX)
      // Server-side validation in orders.create mutation is authoritative and cannot be bypassed
      if (restaurant?.allowNewOrders === false) {
        setIsSubmitting(false)
        toast.error("New orders are currently disabled. Please try again later.")
        return
      }

      // Validate phone number from user profile
      if (!currentUser?.phone || !isValidPhoneNumber(currentUser.phone)) {
        toast.error("Please update your phone number in profile settings")
        setIsSubmitting(false)
        return
      }

      // Check if trying to place delivery order with out-of-scope address
      const wantsDelivery = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
      if (wantsDelivery && !isAddressWithinDeliveryCoverage) {
        setIsSubmitting(false)
        toast.error("Delivery not available", {
          description: "Your address is outside delivery coverage. Delivery is only available in Libmanan, Sipocot, and Cabusao, Camarines Sur. Please change your address or select Pickup.",
          duration: 5000,
        })
        return
      }

      // Validate pre-order fields if it's a pre-order
      if (orderType === "pre-order") {
        // Validate that fulfillment method and payment terms are selected
        if (!preOrderFulfillment) {
          setIsSubmitting(false)
          toast.error("Please select a fulfillment method")
          return
        }
        if (!paymentPlan) {
          setIsSubmitting(false)
          toast.error("Please select payment terms")
          return
        }
        
        // Validate downpayment method when payment plan is downpayment
        if (paymentPlan === "downpayment" && !downpaymentMethod) {
          setIsSubmitting(false)
          toast.error("Please select remaining balance payment method")
          return
        }
        
        if (restrictionsEnabledButEmpty) {
          setIsSubmitting(false)
          toast.error("Pre-orders are temporarily unavailable", {
            description: "No published schedule is available right now.",
          })
          return
        }
        const dateValidationError = validateDate(preOrderDate)
        const timeValidationError = validateTime(preOrderTime, preOrderDate)
        
        if (dateValidationError || timeValidationError) {
          setDateError(dateValidationError)
          setTimeError(timeValidationError)
          setIsSubmitting(false)
          toast.error("Please fix the validation errors before submitting")
          return
        }
      }

      // Transform cart items to order items
      // IMPORTANT: price should be the total price (unitPrice * quantity), not just unit price
      // Also include variantId and selectedChoices so server can validate prices correctly
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        name: item.name,
        price: item.price * item.quantity, // Total price = unit price * quantity
        quantity: item.quantity,
        variantId: item.variantId || undefined,
        variantName: item.size || undefined,
        unitPrice: item.price, // Include unit price for reference
        selectedChoices: item.selectedChoices || undefined,
        bundleItems: item.bundleItems || undefined,
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

      // Calculate final total including delivery fee (only if address is within coverage)
      const effectiveDeliveryFee = wantsDelivery && isAddressWithinDeliveryCoverage ? deliveryFee : 0
      const finalTotal = subtotal + platformFee + effectiveDeliveryFee

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
        deliveryFee: wantsDelivery && isAddressWithinDeliveryCoverage ? effectiveDeliveryFee : undefined,
        discount: 0,
        total: finalTotal,
        orderType,
        preOrderFulfillment: orderType === "pre-order" ? preOrderFulfillment : undefined,
        preOrderScheduledAt,
        paymentPlan: orderType === "pre-order" ? paymentPlan : undefined,
        downpaymentAmount: orderType === "pre-order" && paymentPlan === "downpayment" ? finalTotal * 0.5 : undefined,
        downpaymentProofUrl: undefined,
        remainingPaymentMethod: orderType === "pre-order" && paymentPlan === "downpayment" && downpaymentMethod ? (downpaymentMethod === "online" ? "online" : "cash") : undefined,
        status: orderType === "pre-order" ? "pre-order-pending" : "pending",
        paymentScreenshot: paymentScreenshotStorageId,
        specialInstructions: specialInstructions.trim() || undefined, 
      })

      toast.success("Order placed successfully!", {
        description: `Your order for ₱${finalTotal.toFixed(2)} has been placed and is being processed.`,
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
      // Log only error message to avoid exposing sensitive order data
      console.error("Failed to create order:", error instanceof Error ? error.message : "Unknown error")
      toast.error("Failed to place order", {
        description: "Please try again or contact support if the problem persists.",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to get missing field messages
  const getMissingFields = (): string[] => {
    const missing: string[] = []
    
    // Payment proof is always required
    if (!previewUrl) {
      missing.push("Payment proof")
    }
    
    // Pre-order specific validations
    if (orderType === "pre-order") {
      if (!preOrderFulfillment) {
        missing.push("Fulfillment method")
      }
      if (!paymentPlan) {
        missing.push("Payment terms")
      }
      if (restrictionsEnabledButEmpty) {
        missing.push("Pre-order schedule (temporarily unavailable)")
      }
      if (!preOrderDate) {
        missing.push("Pre-order date")
      }
      if (!preOrderTime) {
        missing.push("Pre-order time")
      }
      if (dateError) {
        missing.push("Valid pre-order date")
      }
      if (!preOrderTime || preOrderTime === "") {
        missing.push("Preferred time within the window")
      }
      if (timeError) {
        missing.push("Valid pre-order time")
      }
      if (preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage) {
        missing.push("Delivery address within coverage area")
      }
      // Validate downpayment method when payment plan is downpayment
      if (paymentPlan === "downpayment" && !downpaymentMethod) {
        missing.push("Remaining balance payment method")
      }
    }
    
    // Delivery order validation
    if (orderType === "delivery" && !isAddressWithinDeliveryCoverage) {
      missing.push("Delivery address within coverage area")
    }
    
    return missing
  }

  const missingFields = getMissingFields()

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
            {restaurant.preorderNotification && (
              <p className="text-xs text-red-500 pt-4">{restaurant.preorderNotification}</p>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Form Fields */}
          <div className="flex-1 px-2 md:px-6 pb-2 md:pb-6 space-y-3 md:space-y-6">
            {/* Delivery Address - only for delivery orders */}
            <CheckoutDeliveryAddress
              customerAddress={customerAddress}
              deliveryCoordinates={deliveryCoordinates}
              defaultCoordinates={defaultCoordinates}
              isAddressWithinDeliveryCoverage={isAddressWithinDeliveryCoverage}
              orderType={orderType}
              preOrderFulfillment={preOrderFulfillment}
              allowAddressSearchBox={restaurant?.allowAddressSearchBox ?? true}
              onClose={onClose}
              onCloseCart={onCloseCart}
              onOpenSettings={onOpenSettings}
            />

            {/* Pre-order fulfillment and payment options */}
            {orderType === "pre-order" && (
              <CheckoutPreorderOptions
                preOrderFulfillment={preOrderFulfillment}
                paymentPlan={paymentPlan}
                downpaymentMethod={downpaymentMethod}
                isAddressWithinDeliveryCoverage={isAddressWithinDeliveryCoverage}
                onFulfillmentChange={setPreOrderFulfillment}
                onPaymentPlanChange={setPaymentPlan}
                onDownpaymentMethodChange={setDownpaymentMethod}
              />
            )}

            {/* Date & Time for Pre-order */}
            {orderType === "pre-order" && (
              <CheckoutDateTime
                restrictionsEnabled={restrictionsEnabled}
                hasConfiguredDates={hasConfiguredDates}
                scheduledDates={scheduledDates}
                selectedScheduleEntry={selectedScheduleEntry}
                preOrderDate={preOrderDate}
                preOrderTime={preOrderTime}
                dateError={dateError}
                timeError={timeError}
                onDateChange={setPreOrderDate}
                onTimeChange={setPreOrderTime}
                onDateErrorChange={setDateError}
                onTimeErrorChange={setTimeError}
                validatePreOrderDate={validateDate}
                validatePreOrderTime={validateTime}
                clampPreOrderDate={clampPreOrderDate}
                clampPreOrderTime={clampPreOrderTime}
                formatScheduleLabel={formatScheduleLabel}
              />
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
            <CheckoutPaymentOptions
              gcashNumber={currentUser?.gcashNumber}
              previewUrl={previewUrl}
              paymentModalOpen={paymentModalOpen}
              onFileChange={handleFileChange}
              onRemoveImage={() => {
                setPaymentScreenshot(null)
                setPreviewUrl(null)
                try {
                  window.localStorage.removeItem("checkout_payment_image")
                } catch {}
              }}
              onOpenModal={() => setPaymentModalOpen(true)}
              onCloseModal={() => setPaymentModalOpen(false)}
            />
          </div>

          {/* Right Column - Order Summary */}
          <CheckoutOrderSummary
            items={items}
            subtotal={subtotal}
            platformFee={platformFee}
            deliveryFee={deliveryFee}
            isCalculatingDistance={isCalculatingDistance}
            orderType={orderType}
            preOrderFulfillment={preOrderFulfillment}
            isAddressWithinDeliveryCoverage={isAddressWithinDeliveryCoverage}
            isSubmitting={isSubmitting}
            missingFields={missingFields}
            isSubmitDisabled={
              isSubmitting || 
              !previewUrl || // Require payment proof image
              (orderType === "pre-order" && (
                !preOrderFulfillment || // Require fulfillment method selection
                !paymentPlan || // Require payment terms selection
                (paymentPlan === "downpayment" && !downpaymentMethod) || // Require downpayment method when downpayment is selected
                restrictionsEnabledButEmpty ||
                !preOrderDate || 
                !preOrderTime || 
                preOrderTime === "" || // Require time to be selected (not placeholder)
                !!dateError || 
                !!timeError ||
                (preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage)
              )) ||
              (orderType === "delivery" && !isAddressWithinDeliveryCoverage)
            }
            onQuantityChange={updateQuantity}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}