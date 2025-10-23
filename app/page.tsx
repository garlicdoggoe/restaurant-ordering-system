"use client"

import { SignIn } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to customer portal by default
  useEffect(() => {
    if (isSignedIn) {
      router.push('/customer')
    }
  }, [isSignedIn, router])

  // Show loading state while checking authentication
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Redirecting...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Blackpepper Camp's Pizza</h1>
          <p className="text-lg text-muted-foreground">Please sign in to continue</p>
        </div>
        
        <div className="flex justify-center">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary hover:bg-primary/90',
                card: 'shadow-lg',
              }
            }}
            redirectUrl="/customer"
            fallbackRedirectUrl="/customer"
          />
        </div>
      </div>
    </div>
  )
}
