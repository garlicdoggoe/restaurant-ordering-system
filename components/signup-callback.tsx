"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function SignupCallback() {
  const { user, isLoaded } = useUser()
  const currentUser = useQuery(api.users.getCurrentUser)
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    console.log("SignupCallback useEffect - isLoaded:", isLoaded, "user:", user, "currentUser:", currentUser)
    
    // Wait until Clerk is loaded and Convex user query has resolved (undefined -> loading, null -> not found)
    if (!isLoaded || !user || currentUser === undefined) {
      console.log("SignupCallback - Skipping: not loaded or no user")
      return
    }

    // If a user doc exists (not null), do nothing to avoid overwriting fields on reload
    if (currentUser !== null) {
      console.log("SignupCallback - Skipping: user already exists with role:", currentUser.role)
      return
    }

    console.log("SignupCallback - Proceeding with user creation")
    
    // Create user in Convex when they first sign up
    const createUser = async () => {
      try {
        // Check if this is an owner signup by looking for the stored validation token
        // Only access localStorage on the client side to prevent SSR errors
        // The token is a secure server-generated one-time token, not the actual code
        let ownerToken: string | null = null
        let isOwnerSignup = false
        
        if (typeof window !== 'undefined') {
          ownerToken = localStorage.getItem('ownerSignupToken')
          isOwnerSignup = !!ownerToken
        }

        // Clean up the stored token after retrieving (only if we found it and we're on client side)
        if (typeof window !== 'undefined' && ownerToken) {
          localStorage.removeItem('ownerSignupToken')
        }

        // Only pass fields we actually know at signup time; do not send undefineds
        // SECURITY: Server will validate the ownerToken before allowing owner role
        await upsertUser({
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: isOwnerSignup ? "owner" : "customer",
          ownerToken: ownerToken || undefined, // Only send token if we have one
        })
      } catch (error) {
        console.error("Failed to create user:", error)
      }
    }

    createUser()
  }, [isLoaded, user, currentUser, upsertUser])

  // This component doesn't render anything
  return null
}
