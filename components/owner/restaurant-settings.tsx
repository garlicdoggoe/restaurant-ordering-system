"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useData, type PreorderScheduleDate } from "@/lib/data-context"
import { PhoneInput } from "@/components/ui/phone-input"
import { isValidPhoneNumber } from "@/lib/phone-validation"
import Image from "next/image"

export function RestaurantSettings() {
  const { restaurant, updateRestaurant } = useData()

  const [status, setStatus] = useState<"open" | "closed" | "busy">(restaurant.status)
  // State for allowNewOrders toggle - defaults to true for backward compatibility
  const [allowNewOrders, setAllowNewOrders] = useState<boolean>(restaurant.allowNewOrders ?? true)
  // State for allowAddressSearchBox toggle - defaults to true for backward compatibility
  const [allowAddressSearchBox, setAllowAddressSearchBox] = useState<boolean>(restaurant.allowAddressSearchBox ?? true)
  const [formData, setFormData] = useState({
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    phone: restaurant.phone,
    email: restaurant.email,
    preparationTime: restaurant.averagePrepTime.toString(),
    deliveryTime: restaurant.averageDeliveryTime.toString(),
    platformFee: restaurant.platformFee?.toString() || "10",
    platformFeeEnabled: restaurant.platformFeeEnabled ?? true, // Default to enabled
    feePerKilometer: restaurant.feePerKilometer?.toString() || "15", // Default to 15
    logo: restaurant.logo || "",
    openingTime: restaurant.openingTime || "10:00",
    closingTime: restaurant.closingTime || "18:30",
    preorderNotification: restaurant.preorderNotification || "",
  })
  // Local state for the owner-managed pre-order calendar
  const [preorderRestrictionsEnabled, setPreorderRestrictionsEnabled] = useState(
    restaurant.preorderSchedule?.restrictionsEnabled ?? false,
  )
  const [preorderDates, setPreorderDates] = useState<PreorderScheduleDate[]>(
    (restaurant.preorderSchedule?.dates ?? []).map((entry) => ({
      ...entry,
      endTime: entry.endTime ?? entry.startTime,
    })),
  )
  const [newPreorderDate, setNewPreorderDate] = useState("")
  const [newPreorderStartTime, setNewPreorderStartTime] = useState("13:00")
  const [newPreorderEndTime, setNewPreorderEndTime] = useState("19:00")

  // Update form data when restaurant data changes from Convex
  useEffect(() => {
    // Database now stores only 10-digit numbers (no +63 prefix to strip)
    setFormData({
      name: restaurant.name || "",
      description: restaurant.description || "",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      email: restaurant.email || "",
      preparationTime: restaurant.averagePrepTime?.toString() || "0",
      deliveryTime: restaurant.averageDeliveryTime?.toString() || "0",
      platformFee: restaurant.platformFee?.toString() || "10",
      platformFeeEnabled: restaurant.platformFeeEnabled ?? true, // Default to enabled if not set
      feePerKilometer: restaurant.feePerKilometer?.toString() || "15", // Default to 15 if not set
      logo: restaurant.logo || "",
      openingTime: restaurant.openingTime || "10:00",
      closingTime: restaurant.closingTime || "18:30",
      preorderNotification: restaurant.preorderNotification || "",
    })
    
    // Update status when restaurant data changes
    setStatus(restaurant.status || "open")
    
    // Update allowNewOrders when restaurant data changes - default to true for backward compatibility
    setAllowNewOrders(restaurant.allowNewOrders ?? true)
    
    // Update allowAddressSearchBox when restaurant data changes - default to true for backward compatibility
    setAllowAddressSearchBox(restaurant.allowAddressSearchBox ?? true)

    const schedule = restaurant.preorderSchedule ?? { restrictionsEnabled: false, dates: [] }
    setPreorderRestrictionsEnabled(schedule.restrictionsEnabled)
    setPreorderDates((schedule.dates ?? []).map((entry) => ({
      ...entry,
      endTime: entry.endTime ?? entry.startTime,
    })))
  }, [restaurant])
  // Keep everything sorted so the UI and persistence stay predictable
  const sortedPreorderDates = [...preorderDates].sort((a, b) => a.date.localeCompare(b.date))

  const parseTimeToMinutes = (time: string) => {
    const [hh, mm] = time.split(":").map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return hh * 60 + mm
  }

  const handleAddPreorderDate = () => {
    if (!newPreorderDate || !newPreorderStartTime || !newPreorderEndTime) {
      alert("Please select a date, start time, and end time")
      return
    }

    const startMinutes = parseTimeToMinutes(newPreorderStartTime)
    const endMinutes = parseTimeToMinutes(newPreorderEndTime)
    if (startMinutes === null || endMinutes === null) {
      alert("Invalid time format. Please use HH:MM.")
      return
    }
    if (startMinutes >= endMinutes) {
      alert("End time must be after the start time.")
      return
    }

    // Prevent duplicate dates by overriding the existing entry
    const nextDates = [
      ...preorderDates.filter((entry) => entry.date !== newPreorderDate),
      { date: newPreorderDate, startTime: newPreorderStartTime, endTime: newPreorderEndTime },
    ]
    setPreorderDates(nextDates)
    setNewPreorderDate("")
    setNewPreorderStartTime("13:00")
    setNewPreorderEndTime("19:00")
  }

  const handlePreorderStartTimeChange = (date: string, newTime: string) => {
    const entry = preorderDates.find((item) => item.date === date)
    if (!entry) return
    const newMinutes = parseTimeToMinutes(newTime)
    const endMinutes = parseTimeToMinutes(entry.endTime)
    if (newMinutes === null || endMinutes === null) return
    if (newMinutes >= endMinutes) {
      alert("Start time must be earlier than the end time.")
      return
    }
    setPreorderDates((prev) =>
      prev.map((item) => (item.date === date ? { ...item, startTime: newTime } : item)),
    )
  }

  const handlePreorderEndTimeChange = (date: string, newTime: string) => {
    const entry = preorderDates.find((item) => item.date === date)
    if (!entry) return
    const newMinutes = parseTimeToMinutes(newTime)
    const startMinutes = parseTimeToMinutes(entry.startTime)
    if (newMinutes === null || startMinutes === null) return
    if (newMinutes <= startMinutes) {
      alert("End time must be later than the start time.")
      return
    }
    setPreorderDates((prev) =>
      prev.map((item) => (item.date === date ? { ...item, endTime: newTime } : item)),
    )
  }

  const handleRemovePreorderDate = (date: string) => {
    setPreorderDates((prev) => prev.filter((entry) => entry.date !== date))
  }

  const savePreorderSchedule = () => {
    // Persist the entire structure in one mutation so the owner always writes a consistent snapshot
    const payload = {
      restrictionsEnabled: preorderRestrictionsEnabled,
      dates: sortedPreorderDates,
    }
    updateRestaurant({ preorderSchedule: payload })
    alert("Pre-order schedule saved successfully.")
  }

  const savePreorderNotification = () => {
    updateRestaurant({
      preorderNotification: formData.preorderNotification,
    })
    alert("Pre-order notification saved successfully.")
  }

  // Function to check if restaurant should be open based on current time
  const isWithinOperatingHours = () => {
    if (!formData.openingTime || !formData.closingTime) return true
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Convert to minutes for easier comparison
    
    const [openHour, openMin] = formData.openingTime.split(':').map(Number)
    const [closeHour, closeMin] = formData.closingTime.split(':').map(Number)
    
    const openingMinutes = openHour * 60 + openMin
    const closingMinutes = closeHour * 60 + closeMin
    
    return currentTime >= openingMinutes && currentTime <= closingMinutes
  }

  // Function to save operating hours immediately
  const saveOperatingHours = () => {
    updateRestaurant({
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      status: status, // Use the current local status state
    })
  }

  // Function to sync status with operating hours
  const syncStatusWithOperatingHours = () => {
    // First save any pending operating hours changes
    saveOperatingHours()
    
    const shouldBeOpen = isWithinOperatingHours()
    const newStatus = shouldBeOpen ? "open" : "closed"
    
    setStatus(newStatus)
    updateRestaurant({ status: newStatus })
    
    alert(`Restaurant status updated to "${newStatus}" based on operating hours`)
  }

  const handleStatusChange = (newStatus: "open" | "closed" | "busy") => {
    setStatus(newStatus)
    updateRestaurant({ status: newStatus })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (only images)
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      // Create preview URL for immediate display
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, logo: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate phone number
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      alert("Please enter a valid phone number")
      return
    }

    // Store only the 10-digit number in the database (without +63 prefix)
    const normalizedPhone = formData.phone || ""

    updateRestaurant({
      name: formData.name,
      description: formData.description,
      address: formData.address,
      phone: normalizedPhone,
      email: formData.email,
      logo: formData.logo,
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      averagePrepTime: Number.parseInt(formData.preparationTime),
      averageDeliveryTime: Number.parseInt(formData.deliveryTime),
      platformFee: Number.parseFloat(formData.platformFee),
      platformFeeEnabled: formData.platformFeeEnabled,
      feePerKilometer: Number.parseFloat(formData.feePerKilometer),
      preorderNotification: formData.preorderNotification,
      allowAddressSearchBox: allowAddressSearchBox,
    })

    alert("Restaurant profile updated successfully!")
  }

  // Display helper so owners instantly know which day they configured
  const formatFriendlyDate = (value: string) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-fluid-2xl font-bold">Restaurant Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Status</CardTitle>
          <CardDescription>
            Control your restaurant&apos;s availability and operating hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operating Hours Section */}
          <div className="space-y-3">
            <h4 className="font-medium">Operating Hours</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening-time">Opening Time</Label>
                <Input
                  id="opening-time"
                  type="time"
                  value={formData.openingTime}
                  onChange={(e) => {
                    const newFormData = { ...formData, openingTime: e.target.value }
                    setFormData(newFormData)
                    // Auto-save operating hours when changed (without affecting status)
                    updateRestaurant({
                      openingTime: e.target.value,
                      closingTime: formData.closingTime,
                      status: status, // Use the current local status state
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-time">Closing Time</Label>
                <Input
                  id="closing-time"
                  type="time"
                  value={formData.closingTime}
                  onChange={(e) => {
                    const newFormData = { ...formData, closingTime: e.target.value }
                    setFormData(newFormData)
                    // Auto-save operating hours when changed (without affecting status)
                    updateRestaurant({
                      openingTime: formData.openingTime,
                      closingTime: e.target.value,
                      status: status, // Use the current local status state
                    })
                  }}
                />
              </div>
            </div>
            
            {/* Current Time Status */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Current time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm font-medium">
                {isWithinOperatingHours() ? (
                  <span className="text-green-600">✓ Within operating hours</span>
                ) : (
                  <span className="text-red-600">✗ Outside operating hours</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Operating hours auto-save when changed
              </p>
            </div>
          </div>

          {/* Manual Status Control */}
          <div className="space-y-3">
            <h4 className="font-medium">Manual Status Control</h4>
            <div className="flex gap-3">
              <Badge
                variant={status === "open" ? "default" : "outline"}
                className="cursor-pointer px-6 py-2 bg-green-500 hover:bg-green-600"
                onClick={() => handleStatusChange("open")}
              >
                Open
              </Badge>
              <Badge
                variant={status === "busy" ? "default" : "outline"}
                className="cursor-pointer px-6 py-2 bg-yellow-500 hover:bg-yellow-600"
                onClick={() => handleStatusChange("busy")}
              >
                Busy
              </Badge>
              <Badge
                variant={status === "closed" ? "default" : "outline"}
                className="cursor-pointer px-6 py-2 bg-red-500 hover:bg-red-600"
                onClick={() => handleStatusChange("closed")}
              >
                Closed
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={syncStatusWithOperatingHours}
                className="text-xs"
              >
                Sync with Operating Hours
              </Button>
              <p className="text-xs text-muted-foreground">
                You can manually override the operating hours status above
              </p>
            </div>
          </div>

          {/* Order Acceptance Toggle */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-new-orders" className="text-base font-medium">
                  Allow New Orders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle to temporarily disable order placement. Affects all order types including pre-orders.
                </p>
              </div>
              <Switch
                id="allow-new-orders"
                checked={allowNewOrders}
                onCheckedChange={(checked) => {
                  setAllowNewOrders(checked)
                  // Auto-save immediately when toggled
                  updateRestaurant({
                    allowNewOrders: checked,
                  })
                }}
                className={allowNewOrders ? "" : "data-[state=checked]:bg-destructive"}
              />
            </div>
            {!allowNewOrders && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ New orders are currently disabled. Customers cannot place orders or pre-orders.
                </p>
              </div>
            )}
          </div>

          {/* Address Search Box Toggle */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-address-search-box" className="text-base font-medium">
                  Show Address Search Box
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toggle to show or hide the address search box in the map picker. When disabled, customers can zoom and click on the map to select their address.
                </p>
              </div>
              <Switch
                id="allow-address-search-box"
                checked={allowAddressSearchBox}
                onCheckedChange={(checked) => {
                  setAllowAddressSearchBox(checked)
                  // Auto-save immediately when toggled
                  updateRestaurant({
                    allowAddressSearchBox: checked,
                  })
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-order Schedule</CardTitle>
          <CardDescription>
            Choose whether pre-orders are limited to selected days or open on any date. For each allowed day, set the start and end time window for pickups/deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Restrict pre-orders to specific days</p>
              <p className="text-xs text-muted-foreground">
                When disabled, customers can schedule pre-orders on any day and time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="preorder-restrictions"
                checked={preorderRestrictionsEnabled}
                onCheckedChange={setPreorderRestrictionsEnabled}
              />
              <Label htmlFor="preorder-restrictions" className="text-sm font-medium cursor-pointer">
                {preorderRestrictionsEnabled ? "Restrictions enabled" : "No restrictions"}
              </Label>
            </div>
          </div>

          {preorderRestrictionsEnabled && (
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <p className="text-sm font-medium">Add an available pre-order day</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="preorder-new-date">Date</Label>
                  <Input
                    id="preorder-new-date"
                    type="date"
                    value={newPreorderDate}
                    onChange={(e) => setNewPreorderDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preorder-new-start-time">Start time</Label>
                  <Input
                    id="preorder-new-start-time"
                    type="time"
                    value={newPreorderStartTime}
                    onChange={(e) => setNewPreorderStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preorder-new-end-time">End time</Label>
                  <Input
                    id="preorder-new-end-time"
                    type="time"
                    value={newPreorderEndTime}
                    onChange={(e) => setNewPreorderEndTime(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" className="w-full" onClick={handleAddPreorderDate}>
                    Add day
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The latest value you add for a date replaces any previous time for that same date.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Configured days</p>
            {sortedPreorderDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {preorderRestrictionsEnabled
                  ? "No days added yet. Add at least one date to enforce restrictions."
                  : "Dates are ignored because restrictions are disabled."}
              </p>
            ) : (
              sortedPreorderDates.map((entry) => (
                <div
                  key={entry.date}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold">{formatFriendlyDate(entry.date)}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) => handlePreorderStartTimeChange(entry.date, e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={entry.endTime}
                      onChange={(e) => handlePreorderEndTimeChange(entry.date, e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePreorderDate(entry.date)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
            {sortedPreorderDates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Customers can pick any time inside each start/end window. All times use the 24-hour format.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={savePreorderSchedule}>
              Save Pre-order Schedule
            </Button>
          </div>

          <Separator />

          {/* Pre-order Notification */}
          <div className="space-y-2">
            <Label htmlFor="preorder-notification">Pre-order Notification Message</Label>
            <Textarea
              id="preorder-notification"
              value={formData.preorderNotification}
              onChange={(e) => {
                setFormData({ ...formData, preorderNotification: e.target.value })
              }}
              placeholder="Enter a notification message to display to customers during checkout (e.g., 'Currently, only for Christmas week pre-orders are being accepted.')"
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This message will be displayed to customers when they select the pre-order option during checkout.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={savePreorderNotification}>
                Save Notification
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Profile</CardTitle>
          <CardDescription>
            Update your restaurant information. Form fields display current data from the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Restaurant Logo</Label>
              
              {/* Current logo display */}
              {formData.logo && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                  <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-50 relative">
                    <Image 
                      src={formData.logo || "/logo-placeholder.png"} 
                      alt="Restaurant logo" 
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              
              {/* Logo upload button */}
              <div className="space-y-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500">
                  Upload a logo image (JPG, PNG, GIF). Max size: 5MB
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhoneInput
                id="phone"
                label="Phone"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
              />

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prep-time">Average Preparation Time (min)</Label>
                <Input
                  id="prep-time"
                  type="number"
                  value={formData.preparationTime}
                  onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-time">Average Delivery Time (min)</Label>
                <Input
                  id="delivery-time"
                  type="number"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="platform-fee">Platform Fee (₱)</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="platform-fee-enabled" className="text-sm font-normal cursor-pointer">
                      {formData.platformFeeEnabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id="platform-fee-enabled"
                      checked={formData.platformFeeEnabled}
                      onCheckedChange={(checked) => {
                        setFormData({ ...formData, platformFeeEnabled: checked })
                        // Auto-save the toggle state immediately
                        updateRestaurant({
                          platformFeeEnabled: checked,
                          platformFee: Number.parseFloat(formData.platformFee),
                        })
                      }}
                    />
                  </div>
                </div>
                <Input
                  id="platform-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.platformFee}
                  onChange={(e) => setFormData({ ...formData, platformFee: e.target.value })}
                  disabled={!formData.platformFeeEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee-per-kilometer">Delivery Fee per Kilometer (₱)</Label>
                <Input
                  id="fee-per-kilometer"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.feePerKilometer}
                  onChange={(e) => setFormData({ ...formData, feePerKilometer: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Fee charged per kilometer for distances over 1km. First 0.5km is free, 0.5-1km is ₱20.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
