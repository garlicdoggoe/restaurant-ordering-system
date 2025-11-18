"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { useData } from "@/lib/data-context"
import { PhoneInput } from "@/components/ui/phone-input"
import { isValidPhoneNumber } from "@/lib/phone-validation"
import Image from "next/image"

// Source for barangay list: DILG Region V (Camarines Sur - Libmanan)
const LIBMANAN_BARANGAYS = [
  "Aslong",
  "Awayan",
  "Bagacay",
  "Bagadion",
  "Bagamelon",
  "Bagumbayan",
  "Bahao",
  "Bahay",
  "Beguito Nuevo",
  "Beguito Viejo",
  "Bigajo Norte",
  "Bigajo Sur",
  "Bikal",
  "Busak",
  "Caima",
  "Calabnigan",
  "Camambugan",
  "Cambalidio",
  "Candami",
  "Candato",
  "Cawayan",
  "Concepcion",
  "Cuyapi",
  "Danawan",
  "Duang Niog",
  "Handong",
  "Ibid",
  "Inalahan",
  "Labao",
  "Libod I",
  "Libod II",
  "Loba-loba",
  "Mabini",
  "Malansad Nuevo",
  "Malansad Viejo",
  "Malbogon",
  "Malinao",
  "Mambalite",
  "Mambayawas",
  "Mambulo Nuevo",
  "Mambulo Viejo",
  "Mancawayan",
  "Mandacanan",
  "Mantalisay",
  "Padlos",
  "Pag-Oring Nuevo",
  "Pag-Oring Viejo",
  "Palangon",
  "Palong",
  "Patag",
  "Planza",
  "Poblacion",
  "Potot",
  "Puro-Batia",
  "Rongos",
  "Salvacion",
  "San Isidro",
  "San Juan",
  "San Pablo",
  "San Vicente",
  "Sibujo",
  "Sigamot",
  "Station-Church Site",
  "Taban-Fundado",
  "Tampuhan",
  "Tanag",
  "Tarum",
  "Tinalmud Nuevo",
  "Tinalmud Viejo",
  "Tinangkihan",
  "Udoc",
  "Umalo",
  "Uson",
  "Villasocorro",
  "Villadima (Santa Cruz)",
]

export function RestaurantSettings() {
  const { restaurant, updateRestaurant, deliveryFees: dbDeliveryFees, bulkUpdateDeliveryFees } = useData()

  const [status, setStatus] = useState<"open" | "closed" | "busy">(restaurant.status)
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
    logo: restaurant.logo || "",
    openingTime: restaurant.openingTime || "10:00",
    closingTime: restaurant.closingTime || "18:30",
  })
  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({})

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
      logo: restaurant.logo || "",
      openingTime: restaurant.openingTime || "10:00",
      closingTime: restaurant.closingTime || "18:30",
    })
    
    // Update status when restaurant data changes
    setStatus(restaurant.status || "open")

    // Initialize delivery fees state from DB, ensure all barangays exist in the map
    const initialFees: Record<string, string> = {}
    const feesFromDb: Record<string, number> = {}
    dbDeliveryFees.forEach((f) => {
      if (f && typeof f.barangay === "string" && typeof f.fee === "number") {
        feesFromDb[f.barangay] = f.fee
      }
    })
    LIBMANAN_BARANGAYS.forEach((b) => {
      const value = feesFromDb[b]
      initialFees[b] = typeof value === "number" ? String(value) : ""
    })
    setDeliveryFees(initialFees)
  }, [restaurant, dbDeliveryFees])

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
    })

    alert("Restaurant profile updated successfully!")
  }

  const handleFeeChange = (barangay: string, value: string) => {
    // Allow only numbers and one decimal point
    const sanitized = value.replace(/[^0-9.]/g, "")
    setDeliveryFees((prev) => ({ ...prev, [barangay]: sanitized }))
  }

  const saveDeliveryFees = () => {
    const feesArray = LIBMANAN_BARANGAYS.reduce(
      (acc, b) => {
        const raw = deliveryFees[b]
        if (raw === undefined || raw === null || raw.trim() === "") return acc
        const num = Number.parseFloat(raw)
        if (!Number.isNaN(num)) acc.push({ barangay: b, fee: num })
        return acc
      },
      [] as { barangay: string; fee: number }[]
    )
    bulkUpdateDeliveryFees(feesArray)
    alert("Delivery fees saved.")
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
            </div>

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Fees by Barangay (Libmanan)</CardTitle>
          <CardDescription>
            Set a delivery fee per barangay. Leave blank to keep it unset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-muted-foreground">
            <div>Barangay</div>
            <div>Delivery Fee</div>
          </div>
          <ScrollArea className="h-96 w-full rounded-md border p-2">
            <div className="grid grid-cols-2 gap-3">
              {LIBMANAN_BARANGAYS.map((b) => (
                <div key={b} className="contents">
                  <div className="py-1 flex items-center">
                    <span className="text-sm">{b}</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      value={(deliveryFees as Record<string, string>)[b] ?? ""}
                      onChange={(e) => handleFeeChange(b, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button type="button" onClick={saveDeliveryFees}>
              Save Delivery Fees
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
