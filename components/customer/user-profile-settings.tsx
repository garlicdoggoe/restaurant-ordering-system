"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, User, Mail, Phone, MapPin, Shield, CreditCard, Settings, Bell, Lock } from "lucide-react"
import { toast } from "sonner"
import { SignupCallback } from "@/components/signup-callback"
import { PhoneInput, GcashInput } from "@/components/ui/phone-input"
import { isValidPhoneNumber, formatPhoneForDisplay } from "@/lib/phone-validation"
import { useStartOnboarding } from "@/components/customer/onboarding-trigger"
import { Play } from "lucide-react"
import dynamic from "next/dynamic"
const AddressMapPicker = dynamic(() => import("@/components/ui/address-map-picker"), { ssr: false })

export function UserProfileSettings() {
  return (
    <>
      <SignupCallback />
      <UserProfileSettingsContent />
    </>
  )
}

function UserProfileSettingsContent() {
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "preferences">("profile")

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gcashNumber, setGcashNumber] = useState("")

  // Coordinates state managed locally and passed to AddressMapPicker
  const [selectedLngLat, setSelectedLngLat] = useState<[number, number] | null>(null)

  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)
  const calculateDistance = useAction(api.users.calculateDistance)
  const restaurant = useQuery(api.restaurant.get)

  // Initialize and keep form data in sync with server state
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || "")
      setLastName(currentUser.lastName || "")
      setPhone(currentUser.phone || "")
      setAddress(currentUser.address || "")
      setGcashNumber(currentUser.gcashNumber || "")
      // Load saved coordinates into state and form field
      const saved = (currentUser as { coordinates?: { lng: number; lat: number } })?.coordinates
      if (saved && typeof saved.lng === 'number' && typeof saved.lat === 'number') {
        const asTuple: [number, number] = [saved.lng, saved.lat]
        setSelectedLngLat(asTuple)
      }
    }
  }, [currentUser])

  // Automatically calculate distance if user has coordinates but no distance value
  // This fixes the issue where users in production have coordinates but distance wasn't calculated
  useEffect(() => {
    // Only calculate if:
    // 1. User data is loaded
    // 2. User has coordinates
    // 3. Restaurant data is loaded and has coordinates
    // 4. User doesn't have a distance value (undefined or null)
    const userCoords = currentUser?.coordinates
    const restaurantCoords = restaurant?.coordinates
    
    if (
      userCoords &&
      restaurantCoords &&
      (currentUser.distance === undefined || currentUser.distance === null)
    ) {
      const calculateDistanceOnLoad = async () => {
        try {
          const calculatedDistance = await calculateDistance({
            customerCoordinates: {
              lng: userCoords.lng,
              lat: userCoords.lat,
            },
            restaurantCoordinates: restaurantCoords,
          })

          // Only update profile if distance was successfully calculated
          // If calculation failed (returned null), don't update to avoid overwriting
          if (calculatedDistance !== null && calculatedDistance !== undefined) {
            await updateProfile({
              distance: calculatedDistance,
            })
          }
        } catch (error) {
          // Log error but don't show toast to user - this is a background operation
          // Log only error message to avoid exposing sensitive coordinate data
          console.error("Failed to auto-calculate distance:", error instanceof Error ? error.message : "Unknown error")
        }
      }

      // Run calculation in background
      calculateDistanceOnLoad()
    }
  }, [currentUser?.coordinates, currentUser?.distance, restaurant?.coordinates, calculateDistance, updateProfile])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (phone.trim() && !isValidPhoneNumber(phone)) {
        toast.error("Please enter a valid phone number")
        setIsSubmitting(false)
        return
      }

      if (gcashNumber.trim() && !isValidPhoneNumber(gcashNumber)) {
        toast.error("Please enter a valid GCash number")
        setIsSubmitting(false)
        return
      }

      const normalizedPhone = phone.trim() || ""
      const normalizedGcash = gcashNumber.trim() || ""

      // Calculate distance if coordinates are provided and restaurant coordinates exist
      let calculatedDistance: number | null | undefined = undefined
      if (selectedLngLat && restaurant?.coordinates) {
        try {
          calculatedDistance = await calculateDistance({
            customerCoordinates: { lng: selectedLngLat[0], lat: selectedLngLat[1] },
            restaurantCoordinates: restaurant.coordinates,
          })
        } catch (error) {
          // Log only error message to avoid exposing sensitive coordinate data
          console.error("Failed to calculate distance:", error instanceof Error ? error.message : "Unknown error")
          // Set to null if calculation failed
          calculatedDistance = null
        }
      } else if (!selectedLngLat) {
        // No coordinates selected, distance should be null
        calculatedDistance = null
      }

      await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: normalizedPhone,
        address: address.trim(),
        coordinates: selectedLngLat ? { lng: selectedLngLat[0], lat: selectedLngLat[1] } : undefined,
        gcashNumber: normalizedGcash,
        distance: calculatedDistance, // Pass calculated distance to mutation (undefined if coordinates not changed)
      })

      toast.success("Profile updated successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use Convex database names, fallback to Clerk user data if not available
  const displayFirstName = currentUser?.firstName || user.firstName || ""
  const displayLastName = currentUser?.lastName || user.lastName || ""
  const displayFullName = currentUser?.firstName && currentUser?.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : user.fullName || "User"
  const initials = `${displayFirstName?.[0] || ''}${displayLastName?.[0] || ''}`.toUpperCase()

  return (
    <div id="onboarding-view-settings" className="max-w-4xl mx-auto space-y-4 xs:space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "security", label: "Security", icon: Shield },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "preferences", label: "Preferences", icon: Settings },
        ].map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection(section.id as "profile" | "security" | "notifications" | "preferences")}
              className={`flex-shrink-0 gap-2 touch-target ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-fluid-sm">{section.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Profile Section */}
      {activeSection === "profile" && (
        <div className="space-y-4 xs:space-y-6">
          {/* Profile Summary Card */}
          <Card>
            <CardHeader className="p-4 xs:p-6">
              <CardTitle className="text-fluid-lg">Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 xs:p-6 space-y-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={user.imageUrl} alt={displayFullName} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-fluid-lg">{displayFullName}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={currentUser?.role === "owner" ? "default" : "secondary"} className="text-xs">
                    {currentUser?.role === "owner" ? "Owner" : "Customer"}
                  </Badge>
                  {currentUser?.profileComplete && (
                    <Badge variant="outline" className="text-xs">
                      Complete
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-fluid-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate text-gray-600">{user.emailAddresses[0]?.emailAddress}</span>
                </div>
                {currentUser?.phone && (
                  <div className="flex items-center gap-2 text-fluid-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{formatPhoneForDisplay(currentUser.phone)}</span>
                  </div>
                )}
                {currentUser?.address && (
                  <div className="flex items-center gap-2 text-fluid-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate text-gray-600">{currentUser.address}</span>
                  </div>
                )}
                {currentUser?.gcashNumber && (
                  <div className="flex items-center gap-2 text-fluid-sm">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{formatPhoneForDisplay(currentUser.gcashNumber)}</span>
                  </div>
                )}
              </div>

              {!currentUser?.profileComplete && currentUser?.role === "customer" && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    Complete your profile to access all features
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader className="p-4 xs:p-6">
              <CardTitle className="text-fluid-lg">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-4 xs:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information (Read-only from Clerk) */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.emailAddresses[0]?.emailAddress || ""}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      Managed by your account provider
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Contact Information (Editable) */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                    Contact Information
                  </h4>

                  <PhoneInput
                    id="phone"
                    label="Phone Number"
                    value={phone}
                    onChange={setPhone}
                  />

                  <GcashInput
                    id="gcashNumber"
                    label="GCash Number"
                    value={gcashNumber}
                    onChange={setGcashNumber}
                    onUsePhoneNumber={() => setGcashNumber(phone)}
                    phoneNumber={phone}
                  />
                  
                  <AddressMapPicker
                    address={address}
                    onAddressChange={setAddress}
                    coordinates={selectedLngLat}
                    onCoordinatesChange={setSelectedLngLat}
                    showSearchBox={restaurant?.allowAddressSearchBox ?? true}
                    restaurantCoordinates={restaurant?.coordinates}
                    showRoute={true}
                  />

                  {/* Display distance from restaurant */}
                  {currentUser?.distance !== undefined && currentUser.distance !== null ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>
                        Distance from restaurant: <span className="font-semibold">{(currentUser.distance / 1000).toFixed(2)} km</span>
                      </span>
                    </div>
                  ) : currentUser?.coordinates ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Distance calculation unavailable</span>
                    </div>
                  ) : null}

                </div>

                <Separator />

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "security" && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Security Settings</h3>
              <p className="text-xs text-gray-500">Manage your account security</p>
            </div>
          </div>
          <p className="text-gray-500">Security settings coming soon...</p>
        </div>
      )}

      {activeSection === "notifications" && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notification Settings</h3>
              <p className="text-xs text-gray-500">Manage your notification preferences</p>
            </div>
          </div>
          <p className="text-gray-500">Notification settings coming soon...</p>
        </div>
      )}

      {activeSection === "preferences" && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Preferences</h3>
              <p className="text-xs text-gray-500">Customize your experience</p>
            </div>
          </div>
          
          {/* Onboarding Tour Section */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Onboarding Tour</h4>
              <p className="text-xs text-gray-600 mb-4">
                Restart the interactive tour to learn how to use the application features.
              </p>
              <RestartOnboardingButton />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// Component to restart onboarding tour
function RestartOnboardingButton() {
  const startOnboarding = useStartOnboarding()
  const [isLoading, setIsLoading] = useState(false)

  const handleRestart = async () => {
    setIsLoading(true)
    try {
      await startOnboarding()
    } catch (error) {
      toast.error("Failed to start onboarding tour", {
        description: error instanceof Error ? error.message : "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleRestart}
      disabled={isLoading}
      variant="outline"
      className="w-full gap-2"
    >
      <Play className="h-4 w-4" />
      <span>{isLoading ? "Starting..." : "Restart Onboarding Tour"}</span>
    </Button>
  )
}
