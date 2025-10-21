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
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SignupCallback } from "@/components/signup-callback"

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
  
  // Form state
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  
  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)
  
  // Initialize and keep form data in sync with server state
  // Mirrors the data handling approach in `components/owner/restaurant-settings.tsx`
  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || "")
      setAddress(currentUser.address || "")
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
      await updateProfile({
        phone: phone.trim(),
        address: address.trim(),
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{user.fullName || "User"}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={currentUser?.role === "owner" ? "default" : "secondary"}>
                      {currentUser?.role === "owner" ? "Owner" : "Customer"}
                    </Badge>
                    {currentUser?.profileComplete && (
                      <Badge variant="outline" className="text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{user.emailAddresses[0]?.emailAddress}</span>
                  </div>
                  
                  {currentUser?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{currentUser.phone}</span>
                    </div>
                  )}
                  
                  {currentUser?.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{currentUser.address}</span>
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
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Edit Profile
                </CardTitle>
                <CardDescription>
                  Update your contact information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information (Read-only from Clerk) */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
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
                        <p className="text-xs text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">
                        Managed by your account provider
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information (Editable) */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Contact Information
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    
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
        </div>
      </div>
    </div>
  )
}
