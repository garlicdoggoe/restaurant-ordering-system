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
    if (!isLoaded || !user || currentUser) return

    // Create user in Convex when they first sign up
    const createUser = async () => {
      try {
        await upsertUser({
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: "customer", // Default role for new signups
          phone: undefined,
          address: undefined,
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
