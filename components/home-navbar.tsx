"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { UtensilsCrossed } from "lucide-react"
import { useData } from "@/lib/data-context"

/**
 * HomeNavbar - Sticky navigation bar for the home page
 * Displays restaurant branding and sign in/sign up buttons
 * Mobile responsive with horizontal layout on desktop
 */
export function HomeNavbar() {
  const { restaurant } = useData()

  return (
    <header className="border-b bg-background sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left side: Restaurant branding */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Restaurant logo or default icon */}
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {restaurant.logo ? (
              <Image 
                src={restaurant.logo} 
                alt={`${restaurant.name} logo`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
            )}
          </div>
          {/* Restaurant name - truncate on small screens */}
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base sm:text-lg truncate">
              {restaurant.name || "Blackpepper Camp's Pizza"}
            </h1>
          </div>
        </div>

        {/* Right side: Authentication buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <SignInButton 
            mode="modal"
            forceRedirectUrl="/customer"
            fallbackRedirectUrl="/customer"
          >
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              Login
            </Button>
          </SignInButton>
          <SignUpButton 
            mode="modal"
            forceRedirectUrl="/customer"
            fallbackRedirectUrl="/customer"
          >
            <Button 
              size="sm"
              className="text-xs sm:text-sm px-3 sm:px-4 bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Sign up
            </Button>
          </SignUpButton>
        </div>
      </div>
    </header>
  )
}

