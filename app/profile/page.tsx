"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Shield, CreditCard, Settings, Bell, Lock, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SignupCallback } from "@/components/signup-callback"
import { PhoneInput, GcashInput } from "@/components/ui/phone-input"
import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from "@/lib/phone-validation"

export default function ProfilePage() {
  return (
    <>
      <SignupCallback />
      <ProfilePageContent />
    </>
  )
}

function ProfilePageContent() {
  const { user } = useUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "preferences">("profile")
  
  // Form state
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gcashNumber, setGcashNumber] = useState("")
  
  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)
  
  // Initialize and keep form data in sync with server state
  // Mirrors the data handling approach in `components/owner/restaurant-settings.tsx`
  useEffect(() => {
    if (currentUser) {
      // Database now stores only 10-digit numbers (no +63 prefix to strip)
      setPhone(currentUser.phone || "")
      setAddress(currentUser.address || "")
      setGcashNumber(currentUser.gcashNumber || "")
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
      // Validate phone numbers before submission
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

      // Store only the 10-digit numbers in the database (without +63 prefix)
      const normalizedPhone = phone.trim() || ""
      const normalizedGcash = gcashNumber.trim() || ""

      await updateProfile({
        phone: normalizedPhone,
        address: address.trim(),
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-sm text-gray-500">Manage your account information and preferences</p>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-1/5 bg-white border-r border-gray-200 p-6">
          {/* Navigation Items */}
          <nav className="space-y-2">
            {/* Profile Navigation */}
            <div className="mt-6">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">SETTINGS</div>
              <div className="space-y-1">
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSection === "profile" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveSection("profile")}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profile</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSection === "security" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveSection("security")}
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Security</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSection === "notifications" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveSection("notifications")}
                >
                  <Bell className="w-4 h-4" />
                  <span className="text-sm">Notifications</span>
                </div>
                <div 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSection === "preferences" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveSection("preferences")}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Preferences</span>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {activeSection === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Summary Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Profile Summary</h3>
                        <p className="text-xs text-gray-500">Account overview</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-base">{user.fullName || "User"}</h3>
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
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate text-gray-600">{user.emailAddresses[0]?.emailAddress}</span>
                      </div>
                      
                      {currentUser?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{formatPhoneForDisplay(currentUser.phone)}</span>
                        </div>
                      )}
                      
                      {currentUser?.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate text-gray-600">{currentUser.address}</span>
                        </div>
                      )}
                      
                      {currentUser?.gcashNumber && (
                        <div className="flex items-center gap-2 text-sm">
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
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Edit Profile</h3>
                        <p className="text-xs text-gray-500">Update your contact information</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            type="text"
                            placeholder="123 Main St, City, State 12345"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                        
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
                  </div>
                </div>
              </div>
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
      </div>
    </div>
  )
}
