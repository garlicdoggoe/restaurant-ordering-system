"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { HomeNavbar } from "@/components/home-navbar"
import { MenuBrowser } from "@/components/customer/menu-browser"
import type { CartItem } from "@/lib/cart-context"

/**
 * HomePage - Main landing page that displays the menu
 * - Shows menu browser for non-authenticated users
 * - Redirects authenticated users to /customer page
 * - Includes sticky navigation bar with sign in/sign up buttons
 */
export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to customer page
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/customer")
    }
  }, [isLoaded, isSignedIn, router])

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    )
  }

  // If signed in, the redirect will happen, but show loading in the meantime
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Redirecting...</h1>
        </div>
      </div>
    )
  }

  // For non-authenticated users, show the menu browser
  // Note: onAddToCart is a no-op here since MenuItemGrid will handle auth checks
  // and show the auth prompt dialog before calling this function
  const handleAddToCart = (item: Omit<CartItem, "quantity">, quantity?: number, suppressToast?: boolean) => {
    // This function should not be called for non-authenticated users
    // MenuItemGrid will check auth and show auth prompt dialog instead
    // But we provide it to satisfy the MenuBrowser interface
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeNavbar />
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <MenuBrowser onAddToCart={handleAddToCart} />
      </main>
    </div>
  )
}