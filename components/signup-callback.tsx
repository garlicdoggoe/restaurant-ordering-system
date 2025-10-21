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
        // Check if this is an owner signup by looking for the stored code
        const ownerSignupCode = localStorage.getItem('ownerSignupCode')
        const isOwnerSignup = ownerSignupCode === "IchiroCocoiNami17?"
        
        console.log("SignupCallback - ownerSignupCode:", ownerSignupCode)
        console.log("SignupCallback - isOwnerSignup:", isOwnerSignup)
        
        // Clean up the stored code after checking (only if we found it)
        if (ownerSignupCode) {
          localStorage.removeItem('ownerSignupCode')
          console.log("SignupCallback - Cleaned up localStorage code")
        }

        // Only pass fields we actually know at signup time; do not send undefineds
        await upsertUser({
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: isOwnerSignup ? "owner" : "customer",
        })
        
        console.log("SignupCallback - User created with role:", isOwnerSignup ? "owner" : "customer")
      } catch (error) {
        console.error("Failed to create user:", error)
      }
    }

    createUser()
  }, [isLoaded, user, currentUser, upsertUser])

  // This component doesn't render anything
  return null
}
