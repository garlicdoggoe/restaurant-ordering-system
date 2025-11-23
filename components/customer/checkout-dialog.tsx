"use client"

import type React from "react"

import { useEffect, useMemo, useState, Suspense } from "react"
import { ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
// Switched order type controls to dropdown Select components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useData, type PreOrderFulfillment, type PaymentPlan, type RemainingPaymentMethod, type PreorderSchedule, type PreorderScheduleDate } from "@/lib/data-context"
import { useCart } from "@/lib/cart-context"
import { useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { calculateDeliveryFee, isWithinDeliveryCoverage } from "@/lib/order-utils"
import dynamic from "next/dynamic"
import { isValidPhoneNumber } from "@/lib/phone-validation"

// Dynamically import AddressMapPicker with error handling and loading state
// Using default export from address-map-picker
const AddressMapPicker = dynamic(
  () => import("@/components/ui/address-map-picker").catch((_err) => {
    // Return a fallback component if import fails
    // Note: Dynamic import errors are handled gracefully with fallback UI
    return { default: () => (
      <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">
        Map unavailable. Please refresh the page.
      </div>
    ) };
  }),
  { 
    ssr: false,
    loading: () => <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">Loading map...</div>
  }
)
import { PaymentModal } from "@/components/ui/payment-modal"
import { compressImage } from "@/lib/image-compression"
import Image from "next/image"
import { BundleItemsList } from "@/components/shared/bundle-items-list"

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

const DEFAULT_PREORDER_TIME = "13:00"
const HOURS_12 = Array.from({ length: 12 }, (_v, idx) => String(idx + 1).padStart(2, "0"))
const MINUTES_60 = Array.from({ length: 60 }, (_v, idx) => String(idx).padStart(2, "0"))
const PERIODS: Array<"AM" | "PM"> = ["AM", "PM"]

const getTodayIsoDate = () => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

const timeToMinutes = (value: string | undefined) => {
  if (!value) return null
  const [hh, mm] = value.split(":").map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}

const to12HourParts = (value?: string) => {
  if (!value) {
    return { hour: "12", minute: "00", period: "PM" as "AM" | "PM" }
  }
  const [hhStr, mm] = value.split(":")
  let hh = Number(hhStr)
  const period = hh >= 12 ? "PM" : "AM"
  hh = hh % 12
  if (hh === 0) hh = 12
  return {
    hour: String(hh).padStart(2, "0"),
    minute: mm ?? "00",
    period,
  }
}

const to24HourString = (hour: string, minute: string, period: "AM" | "PM") => {
  let hh = Number(hour)
  if (period === "PM" && hh !== 12) {
    hh += 12
  }
  if (period === "AM" && hh === 12) {
    hh = 0
  }
  const minuteClean = minute.padStart(2, "0")
  return `${String(hh).padStart(2, "0")}:${minuteClean}`
}

const formatTime12h = (value?: string) => {
  if (!value) return ""
  const { hour, minute, period } = to12HourParts(value)
  const minuteClean = minute ?? "00"
  return `${Number(hour)}:${minuteClean} ${period}`
}

const formatTimeRange12h = (start?: string, end?: string) => {
  if (!start || !end) return ""
  return `${formatTime12h(start)} - ${formatTime12h(end)}`
}

interface NumericDropdownInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  optionLabel?: (value: string) => string
  disabled?: boolean
  ariaLabel: string
  size?: "sm" | "md"
}

const NumericDropdownInput = ({
  value,
  onChange,
  options,
  optionLabel,
  disabled,
  ariaLabel,
  size = "md",
}: NumericDropdownInputProps) => {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    setInternal(value)
  }, [value])

  const sanitize = (input: string) => input.replace(/[^0-9]/g, "").slice(0, 2)

  const commitValue = (next: string) => {
    const fallback = options[0] ?? "00"
    const normalized = next ? sanitize(next).padStart(2, "0") : fallback
    setInternal(normalized)
    onChange(normalized)
  }

  const inputClasses =
    size === "sm"
      ? "w-16 h-8 text-center text-xs px-2"
      : "w-20 text-center"

  const triggerClasses =
    size === "sm"
      ? "h-8 w-8"
      : "w-10 h-10"

  const iconClasses = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  const menuClasses = size === "sm" ? "text-xs" : ""

  return (
    <div className="flex items-center gap-1">
      <Input
        value={internal}
        onChange={(e) => setInternal(sanitize(e.target.value))}
        onBlur={() => commitValue(internal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitValue((e.currentTarget as HTMLInputElement).value)
          }
        }}
        disabled={disabled}
        inputMode="numeric"
        aria-label={ariaLabel}
        className={inputClasses}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={`${ariaLabel} options`}
            className={triggerClasses}
          >
            <ChevronDown className={iconClasses} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-60 overflow-y-auto p-0 text-xs">
          {options.map((option) => (
            <DropdownMenuItem
              key={`${ariaLabel}-${option}`}
              onSelect={() => commitValue(option)}
              className={menuClasses}
            >
              {optionLabel ? optionLabel(option) : option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface TimePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const TimePicker = ({ id, value, onChange, disabled }: TimePickerProps) => {
  const { hour, minute, period } = to12HourParts(value)

  const updateValue = (next: Partial<{ hour: string; minute: string; period: "AM" | "PM" }>) => {
    const merged = {
      hour,
      minute,
      period,
      ...next,
    }
    onChange(to24HourString(merged.hour, merged.minute, merged.period as "AM" | "PM"))
  }

  return (
    <div className="flex flex-wrap gap-1.5" id={id}>
      <NumericDropdownInput
        value={hour}
        onChange={(val) => updateValue({ hour: val })}
        options={HOURS_12}
        optionLabel={(val) => `${Number(val)}`}
        disabled={disabled}
        ariaLabel="Hour"
        size="sm"
      />
      <NumericDropdownInput
        value={minute}
        onChange={(val) => updateValue({ minute: val })}
        options={MINUTES_60}
        disabled={disabled}
        ariaLabel="Minute"
        size="sm"
      />
      <Select value={period} onValueChange={(val: "AM" | "PM") => updateValue({ period: val })} disabled={disabled}>
        <SelectTrigger className="w-18 h-8 text-xs">
          <SelectValue className="text-xs" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((option) => (
            <SelectItem key={`period-${option}`} value={option} className="text-xs">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
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
    restrictionsActive ? scheduledDates[0]?.date ?? "" : getTodayIsoDate(),
  )
  const [preOrderTime, setPreOrderTime] = useState<string>(() =>
    restrictionsActive ? scheduledDates[0]?.startTime ?? "" : DEFAULT_PREORDER_TIME,
  )
  const selectedScheduleEntry = useMemo(() => {
    if (!restrictionsActive) return undefined
    return scheduledDates.find((entry) => entry.date === preOrderDate) ?? scheduledDates[0]
  }, [restrictionsActive, scheduledDates, preOrderDate])
  // Initialize as undefined to require explicit selection
  const [paymentPlan, setPaymentPlan] = useState<"full" | "downpayment" | undefined>(undefined)
  const [downpaymentMethod, setDownpaymentMethod] = useState<"online" | "cash">("online")
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
      if (!selectedScheduleEntry) return
      // Only update date if it doesn't match the selected entry
      if (preOrderDate !== selectedScheduleEntry.date) {
        setPreOrderDate(selectedScheduleEntry.date)
        // When date changes, also reset time to the start time of the new date
        setPreOrderTime(selectedScheduleEntry.startTime)
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
        // Only reset if time is invalid - don't reset if user is typing a valid time
        setPreOrderTime(selectedScheduleEntry.startTime)
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

  // Validation + normalization helpers respect the owner's schedule
  const validatePreOrderDate = (date: string): string => {
    if (!date || !restrictionsEnabled) return ""
    if (!hasConfiguredDates) {
      return "Owner has not published any pre-order dates."
    }
    const allowed = scheduledDates.some((entry) => entry.date === date)
    return allowed ? "" : "Please choose one of the published pre-order dates."
  }

  const clampPreOrderDate = (date: string): string => {
    if (!date) return getTodayIsoDate()
    return date
  }

  const validatePreOrderTime = (time: string, date: string): string => {
    if (!time || !restrictionsEnabled) return ""
    const entry = scheduledDates.find((d) => d.date === date)
    if (!entry) {
      return "Choose an available date first."
    }
    const selectedMinutes = timeToMinutes(time)
    const startMinutes = timeToMinutes(entry.startTime)
    const endMinutes = timeToMinutes(entry.endTime)
    if (selectedMinutes === null || startMinutes === null || endMinutes === null) {
      return "Invalid time format."
    }
    if (selectedMinutes < startMinutes || selectedMinutes > endMinutes) {
      return `Time must be between ${formatTime12h(entry.startTime)} and ${formatTime12h(entry.endTime)}`
    }
    return ""
    }

  const clampPreOrderTime = (time: string): string => {
    if (!time) return DEFAULT_PREORDER_TIME
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
        
        if (restrictionsEnabledButEmpty) {
          setIsSubmitting(false)
          toast.error("Pre-orders are temporarily unavailable", {
            description: "No published schedule is available right now.",
          })
          return
        }
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
        remainingPaymentMethod: orderType === "pre-order" && paymentPlan === "downpayment" ? (downpaymentMethod === "online" ? "online" : "cash") : undefined,
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

  // Calculate total items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

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
      if (timeError) {
        missing.push("Valid pre-order time")
      }
      if (preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage) {
        missing.push("Delivery address within coverage area")
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
            {(orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && (
              <div className="space-y-3">
                {/* Show map */}
                <div className="rounded-lg border p-3 bg-white">
                  <Suspense fallback={<div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Loading map...</div>}>
                    <AddressMapPicker
                      address={customerAddress}
                      onAddressChange={setCustomerAddress}
                      coordinates={deliveryCoordinates || defaultCoordinates}
                      onCoordinatesChange={setDeliveryCoordinates}
                      mapHeightPx={180}
                      interactive={false}
                      disabled={true}
                      showSearchBox={restaurant?.allowAddressSearchBox ?? true}
                    />
                  </Suspense>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[12px] text-yellow-600 hover:text-yellow-700 underline mt-[-7px]"
                    onClick={() => {
                      onClose()
                      onCloseCart?.()
                      onOpenSettings?.()
                    }}
                  >
                    Change delivery address
                  </button>
                </div>
                {/* Warning message for regular delivery orders when address is out of coverage */}
                {orderType === "delivery" && !isAddressWithinDeliveryCoverage && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-red-500">
                      Delivery not available. Your address is outside coverage (Libmanan, Sipocot, Cabusao only).
                    </p>
                    <p className="text-xs text-gray-600">
                      <button
                        type="button"
                        className="text-yellow-600 hover:text-yellow-700 underline"
                        onClick={() => {
                          onClose()
                          onCloseCart?.()
                          onOpenSettings?.()
                        }}
                      >
                        change delivery address
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pre-order fulfillment and payment options */}
            {orderType === "pre-order" && (
              <div className="space-y-3">
                {/* Top Row - Fulfillment Method and Payment Terms */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Fulfillment Method <span className="text-red-500">*</span>
                    </p>
                    <Select 
                      value={preOrderFulfillment ?? ""} 
                      onValueChange={(v: PreOrderFulfillment) => {
                        setPreOrderFulfillment(v)
                      }}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select" className="text-gray-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup" className="text-xs">Pickup</SelectItem>
                        <SelectItem value="delivery" className="text-xs">
                          Delivery
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Payment Terms <span className="text-red-500">*</span>
                    </p>
                    <Select value={paymentPlan ?? ""} onValueChange={(v: PaymentPlan) => setPaymentPlan(v)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select" className="text-gray-500" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full" className="text-xs">Pay in full</SelectItem>
                        <SelectItem value="downpayment" className="text-xs">50% downpayment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Warning message spans full width - show when delivery is selected and address is out of coverage */}
                {preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-red-500">
                      Your address is outside delivery coverage.
                    </p>
                  </div>
                )}
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
                <Label className="text-xs md:text-sm text-gray-500">Order Date & Time</Label>

                {restrictionsEnabled ? (
                  hasConfiguredDates ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="preorder-date-select" className="block text-[12px] text-gray-500 mb-1">
                          Available dates
                        </Label>
                        <Select
                          value={preOrderDate}
                          onValueChange={(value) => {
                            setPreOrderDate(value)
                            const entry = scheduledDates.find((d) => d.date === value)
                            if (entry) {
                              setPreOrderTime(entry.startTime)
                              setTimeError("")
                            }
                            setDateError(validatePreOrderDate(value))
                          }}
                        >
                          <SelectTrigger id="preorder-date-select" className="w-full text-xs">
                            <SelectValue placeholder="Choose a date" />
                          </SelectTrigger>
                          <SelectContent>
                            {scheduledDates.map((entry) => (
                              <SelectItem key={entry.date} value={entry.date} className="text-xs">
                                {formatScheduleLabel(entry)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preorder-time-window" className="block text-[12px] text-gray-500">
                          Preferred time within the window
                        </Label>
                        <TimePicker
                          id="preorder-time-window"
                          value={preOrderTime}
                          onChange={(value) => {
                            setPreOrderTime(value)
                            setTimeError(validatePreOrderTime(value, preOrderDate))
                          }}
                          disabled={!selectedScheduleEntry}
                        />
                        {selectedScheduleEntry && (
                          <p className="text-[12px] text-muted-foreground">
                            Allowed window: {formatTimeRange12h(selectedScheduleEntry.startTime, selectedScheduleEntry.endTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      The restaurant has not published any pre-order dates yet. Please check back later or contact the store
                      for updates.
                    </div>
                  )
                ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="preorder-date" className="block text-[11px] text-gray-500 mb-1">
                      Date
                    </Label>
                    <Input
                      id="preorder-date"
                      type="date"
                      value={preOrderDate}
                      onChange={(e) => {
                        const rawDate = e.target.value
                          const normalizedDate = clampPreOrderDate(rawDate)
                          setPreOrderDate(normalizedDate)
                          setDateError(validatePreOrderDate(normalizedDate))
                      }}
                      required
                      className="w-full text-xs relative z-[100]"
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preorder-time" className="block text-[11px] text-gray-500 mb-1">
                      Time
                    </Label>
                      <TimePicker
                      id="preorder-time"
                      value={preOrderTime}
                        onChange={(value) => {
                          const normalizedTime = clampPreOrderTime(value)
                          setPreOrderTime(normalizedTime)
                          setTimeError(validatePreOrderTime(normalizedTime, preOrderDate))
                      }}
                    />
                  </div>
                </div>
                )}

                {dateError && <p className="text-sm text-red-500 mt-1">{dateError}</p>}
                {timeError && <p className="text-[12px] text-red-500 mt-1">{timeError}</p>}

                {!restrictionsEnabled && !timeError && (
                  <p className="text-[12px] font-medium text-yellow-600 text-muted-foreground">
                    Pre-orders are open for any date and time while restrictions are disabled.
                  </p>
                )}
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
                  <Image src="/gcash.png" alt="GCash" width={100} height={32} className="h-8 w-auto" />
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
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">
                  Payment Proof <span className="text-red-500">*</span>
                </p>
              </div>
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
                  <div className="relative w-full h-32">
                    <Image 
                      src={previewUrl} 
                      alt="Payment proof" 
                      fill
                      className="rounded border object-contain cursor-pointer hover:opacity-90 transition-opacity" 
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
              {(orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && isAddressWithinDeliveryCoverage && (
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
                <span>₱{(subtotal + platformFee + ((orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")) && isAddressWithinDeliveryCoverage ? deliveryFee : 0)).toFixed(2)}</span>
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
              disabled={
                isSubmitting || 
                !previewUrl || // Require payment proof image
                (orderType === "pre-order" && (
                  !preOrderFulfillment || // Require fulfillment method selection
                  !paymentPlan || // Require payment terms selection
                  restrictionsEnabledButEmpty ||
                  !preOrderDate || 
                  !preOrderTime || 
                  !!dateError || 
                  !!timeError ||
                  (preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage)
                )) ||
                (orderType === "delivery" && !isAddressWithinDeliveryCoverage)
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