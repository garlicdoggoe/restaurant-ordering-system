"use client"

import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, User, Mail, Phone, MapPin, Shield, CreditCard, Settings, Bell, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SignupCallback } from "@/components/signup-callback"
import { PhoneInput, GcashInput } from "@/components/ui/phone-input"
import { isValidPhoneNumber, formatPhoneForDisplay } from "@/lib/phone-validation"
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
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "preferences">("profile")

  // Form state
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gcashNumber, setGcashNumber] = useState("")

  // Coordinates state managed locally and passed to AddressMapPicker
  const [selectedLngLat, setSelectedLngLat] = useState<[number, number] | null>(null)

  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)

  // Initialize and keep form data in sync with server state
  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || "")
      setAddress(currentUser.address || "")
      setGcashNumber(currentUser.gcashNumber || "")
      // Load saved coordinates into state and form field
      const saved = (currentUser as any)?.coordinates as { lng: number; lat: number } | undefined
      if (saved && typeof saved.lng === 'number' && typeof saved.lat === 'number') {
        const asTuple: [number, number] = [saved.lng, saved.lat]
        setSelectedLngLat(asTuple)
      }
    }
  }, [currentUser])

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

      await updateProfile({
        phone: normalizedPhone,
        address: address.trim(),
        coordinates: selectedLngLat ? { lng: selectedLngLat[0], lat: selectedLngLat[1] } : undefined,
        gcashNumber: normalizedGcash,
      })

      toast.success("Profile updated successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-4 xs:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-fluid-2xl font-bold">Profile Settings</h1>
          <p className="text-fluid-sm text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
      </div>

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
              onClick={() => setActiveSection(section.id as any)}
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
                  <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-fluid-lg">{user.fullName || "User"}</h3>
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
                        value={user.firstName || ""}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Managed by your account provider
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user.lastName || ""}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Managed by your account provider
                      </p>
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

                  <AddressMapPicker
                    address={address}
                    onAddressChange={setAddress}
                    coordinates={selectedLngLat}
                    onCoordinatesChange={setSelectedLngLat}
                  />

                  <GcashInput
                    id="gcashNumber"
                    label="GCash Number"
                    value={gcashNumber}
                    onChange={setGcashNumber}
                    onUsePhoneNumber={() => setGcashNumber(phone)}
                    phoneNumber={phone}
                  />
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
          <p className="text-gray-500">Preferences coming soon...</p>
        </div>
      )}
    </div>
  )
}