"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

interface AuthButtonsProps {
  userType: 'owner' | 'customer'
}

export function AuthButtons({ userType }: AuthButtonsProps) {
  const router = useRouter()
  const { isSignedIn } = useAuth()

  // Handle redirect after authentication
  useEffect(() => {
    if (isSignedIn) {
      const redirectUrl = userType === 'owner' ? '/owner' : '/customer'
      router.push(redirectUrl)
    }
  }, [isSignedIn, router, userType])

  if (userType === 'owner') {
    return (
      <SignInButton 
        mode="modal"
        signUpForceRedirectUrl="/owner"
        signUpFallbackRedirectUrl="/owner"
      >
        <Button className="w-full" size="lg">
          Owner Dashboard
        </Button>
      </SignInButton>
    )
  }

  return (
    <SignUpButton 
      mode="modal"
      forceRedirectUrl="/customer"
      fallbackRedirectUrl="/customer"
    >
      <Button className="w-full" size="lg" variant="secondary">
        Start Ordering
      </Button>
    </SignUpButton>
  )
}
