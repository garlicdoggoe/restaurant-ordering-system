"use client"

import { OwnerDashboard } from "@/components/owner/owner-dashboard"
import { SignupCallback } from "@/components/signup-callback"
import { useData } from "@/lib/data-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OwnerPage() {
  return (
    <>
      <SignupCallback />
      <OwnerPageContent />
    </>
  )
}

function OwnerPageContent() {
  const { currentUser } = useData()
  const router = useRouter()
  
  // Redirect customers to customer page
  useEffect(() => {
    if (currentUser && currentUser.role === "customer") {
      router.push("/customer")
    }
  }, [currentUser, router])
  
  // Show loading or access denied if user is not authenticated or doesn\'t have owner role
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
  
  if (currentUser.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don\'t have permission to access this page.</p>
        </div>
      </div>
    )
  }
  
  return <OwnerDashboard />
}
