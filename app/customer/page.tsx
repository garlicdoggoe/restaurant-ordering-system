"use client"

import { CustomerInterface } from "@/components/customer/customer-interface"
import { SignupCallback } from "@/components/signup-callback"
import { ProfileCompletion } from "@/components/user-profile-completion"
import { useData } from "@/lib/data-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CustomerPage() {
  return (
    <>
      <SignupCallback />
      <CustomerPageContent />
    </>
  )
}

function CustomerPageContent() {
  const { currentUser } = useData()
  const router = useRouter()
  
  // Redirect owners to owner page
  useEffect(() => {
    if (currentUser && currentUser.role === "owner") {
      router.push("/owner")
    }
  }, [currentUser, router])
  
  // Show loading if user is not authenticated yet
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          <p className="text-gray-600">Please wait while we verify your access.</p>
        </div>
      </div>
    )
  }
  
  // Show profile completion if user is a customer with incomplete profile
  if (currentUser.role === "customer" && !currentUser.profileComplete) {
    return <ProfileCompletion />
  }
  
  return <CustomerInterface />
}
