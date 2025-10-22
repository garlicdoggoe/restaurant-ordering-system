"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PhoneInput, GcashInput } from "@/components/ui/phone-input"
import AddressMapPicker from "@/components/ui/address-map-picker"
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/phone-validation"

interface ProfileCompletionProps {
  onComplete?: () => void
}

export function ProfileCompletion({ onComplete }: ProfileCompletionProps) {
  const { user } = useUser()
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gcashNumber, setGcashNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLngLat, setSelectedLngLat] = useState<[number, number] | null>(null)

  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)

  // If user profile is already complete, don't show this component
  if (currentUser?.profileComplete) {
    return null
  }

  // Debug logging
  console.log("ProfileCompletion - currentUser:", currentUser)
  console.log("ProfileCompletion - user:", user)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!user) {
        throw new Error("User not found")
      }

      // ProfileCompletion should only update existing users, not create new ones
      // New user creation is handled by SignupCallback component
      if (!currentUser) {
        throw new Error("User not found in database. Please refresh the page.")
      }

      // Validate required fields and phone numbers before submission
      if (!address.trim()) {
        toast.error("Address is required")
        setIsSubmitting(false)
        return
      }

      if (!selectedLngLat) {
        toast.error("Please select your location on the map")
        setIsSubmitting(false)
        return
      }

      // Validate phone numbers
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

      // Update existing user profile
      await updateProfile({
        phone: normalizedPhone,
        address: address.trim(),
        gcashNumber: normalizedGcash,
        coordinates: selectedLngLat ? { lng: selectedLngLat[0], lat: selectedLngLat[1] } : undefined,
      })

      toast.success("Profile completed successfully!")
      onComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your contact information to continue using the service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PhoneInput
              id="phone"
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              required
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
              required
              onUsePhoneNumber={() => setGcashNumber(phone)}
              phoneNumber={phone}
            />


            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Profile...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
