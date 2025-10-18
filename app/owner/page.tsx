"use client"

import { OwnerDashboard } from "@/components/owner/owner-dashboard"
import { SignupCallback } from "@/components/signup-callback"
import { useData } from "@/lib/data-context"

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
  
  // Only show dashboard if user is authenticated and has owner role
  if (!currentUser || currentUser.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }
  
  return <OwnerDashboard />
}
