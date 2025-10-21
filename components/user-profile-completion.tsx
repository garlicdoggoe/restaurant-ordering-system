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

      // Normalize phone numbers before saving (add +63 prefix to 10-digit numbers)
      const normalizedPhone = phone.trim() ? `+63${phone}` : ""
      const normalizedGcash = gcashNumber.trim() ? `+63${gcashNumber}` : ""

      // Update existing user profile
      await updateProfile({
        phone: normalizedPhone,
        address: address.trim(),
        gcashNumber: normalizedGcash,
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
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, City, State 12345"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            
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
