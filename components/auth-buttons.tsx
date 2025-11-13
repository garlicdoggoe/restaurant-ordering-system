"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { OwnerSignupDialog } from './owner-signup-dialog'

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
      <div className="space-y-3">
        <OwnerSignupDialog>
          <Button className="w-full" size="lg">
            Sign up
          </Button>
        </OwnerSignupDialog>
        <SignInButton 
          mode="modal"
          forceRedirectUrl="/owner"
          fallbackRedirectUrl="/owner"
        >
          <Button className="w-full" size="lg" variant="outline">
            Login
          </Button>
        </SignInButton>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SignUpButton 
        mode="modal"
        forceRedirectUrl="/customer"
        fallbackRedirectUrl="/customer"
      >
        <Button className="w-full" size="lg">
          Sign up
        </Button>
      </SignUpButton>
      <SignInButton 
        mode="modal"
        forceRedirectUrl="/customer"
        fallbackRedirectUrl="/customer"
      >
        <Button className="w-full" size="lg" variant="outline">
          Login
        </Button>
      </SignInButton>
    </div>
  )
}
