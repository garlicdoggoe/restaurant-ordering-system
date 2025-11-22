"use client"

import { useState, useEffect } from "react"
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
import dynamic from "next/dynamic"
const AddressMapPicker = dynamic(() => import("@/components/ui/address-map-picker"), { ssr: false })
import { isValidPhoneNumber } from "@/lib/phone-validation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ProfileCompletionProps {
  onComplete?: () => void
}

export function ProfileCompletion({ onComplete }: ProfileCompletionProps) {
  const { user } = useUser()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gcashNumber, setGcashNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLngLat, setSelectedLngLat] = useState<[number, number] | null>(null)
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false)
  const [showOutOfScopeDialog, setShowOutOfScopeDialog] = useState(false)

  // Get current user profile
  const currentUser = useQuery(api.users.getCurrentUser)
  const updateProfile = useMutation(api.users.updateUserProfile)

  // Initialize form with existing user data or Clerk user data
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || "")
      setLastName(currentUser.lastName || "")
    } else if (user) {
      // Fallback to Clerk user data if Convex user doesn't exist yet
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
    }
  }, [currentUser, user])

  // If user profile is already complete, don't show this component
  if (currentUser?.profileComplete) {
    return null
  }

  // NOTE: Avoid logging user data here; rely on Convex dashboard/Clerk dev tools for debugging.

  // Function to proceed with profile submission
  const proceedWithSubmission = async () => {
    try {
      if (!user) {
        throw new Error("User not found")
      }

      // ProfileCompletion should only update existing users, not create new ones
      // New user creation is handled by SignupCallback component
      if (!currentUser) {
        throw new Error("User not found in database. Please refresh the page.")
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone,
        address: address.trim(),
        gcashNumber: normalizedGcash,
        coordinates: selectedLngLat ? { lng: selectedLngLat[0], lat: selectedLngLat[1] } : undefined,
      })

      toast.success("Profile completed successfully!")
      setShowOutOfScopeDialog(false)
      onComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
      setShowOutOfScopeDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate required fields before submission
    if (!firstName.trim()) {
      toast.error("First name is required")
      setIsSubmitting(false)
      return
    }

    if (!lastName.trim()) {
      toast.error("Last name is required")
      setIsSubmitting(false)
      return
    }

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

    // Check if location is out of scope - show confirmation dialog instead of blocking
    if (!isLocationValid) {
      setShowOutOfScopeDialog(true)
      setIsSubmitting(false)
      return
    }

    // Continue with submission if location is valid
    await proceedWithSubmission()
  }

  // Handle confirmation to proceed with out-of-scope address
  const handleConfirmOutOfScope = async () => {
    setIsSubmitting(true)
    setShowOutOfScopeDialog(false)
    await proceedWithSubmission()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-xs">
            Please provide the correct information so we can ensure a seamless ordering experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <PhoneInput
              id="phone"
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              required
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
            
            <AddressMapPicker
              address={address}
              onAddressChange={setAddress}
              coordinates={selectedLngLat}
              onCoordinatesChange={setSelectedLngLat}
              onLocationValid={setIsLocationValid}
            />
            
            {/* Disable button if required fields are empty or location is not selected */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                isSubmitting || 
                !firstName.trim() || 
                !lastName.trim() || 
                !phone.trim() || 
                !gcashNumber.trim() || 
                !address.trim() || 
                !selectedLngLat
              }
            >
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

      {/* Confirmation Dialog for Out-of-Scope Address */}
      <AlertDialog open={showOutOfScopeDialog} onOpenChange={setShowOutOfScopeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Address Outside Delivery Coverage</AlertDialogTitle>
            <AlertDialogDescription>
              The address you selected is outside the delivery coverage area. 
              Delivery is currently only available in Libmanan, Sipocot, and Cabusao, Camarines Sur.
              <br /><br />
              You can still save this address, but you won&apos;t be able to place delivery orders 
              to this location. Would you like to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOutOfScope}>
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
