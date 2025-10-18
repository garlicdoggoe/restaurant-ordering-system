"use client"

import { CustomerInterface } from "@/components/customer/customer-interface"
import { SignupCallback } from "@/components/signup-callback"
import { ProfileCompletion } from "@/components/user-profile-completion"
import { useData } from "@/lib/data-context"

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
  
  // Show profile completion if user is not authenticated or profile is incomplete
  if (!currentUser || !currentUser.profileComplete) {
    return <ProfileCompletion />
  }
  
  return <CustomerInterface />
}
