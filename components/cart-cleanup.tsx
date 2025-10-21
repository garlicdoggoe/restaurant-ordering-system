"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useCart } from "@/lib/cart-context"

/**
 * Component that handles cart cleanup when user signs out
 * This ensures cart data is cleared from localStorage when user logs out
 */
export function CartCleanup() {
  const { isSignedIn, isLoaded } = useUser()
  const { clearCartFromStorage } = useCart()

  useEffect(() => {
    // Only run when user state is loaded
    if (!isLoaded) return

    // If user is not signed in, clear the cart from localStorage
    // This handles both sign out and initial load when not authenticated
    if (!isSignedIn) {
      clearCartFromStorage()
    }
  }, [isSignedIn, isLoaded, clearCartFromStorage])

  // This component doesn't render anything
  return null
}
