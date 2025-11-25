"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

interface AuthPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * AuthPromptDialog - Dialog component that prompts users to sign in or sign up
 * Displayed when non-authenticated users try to add items to cart
 */
export function AuthPromptDialog({ open, onOpenChange }: AuthPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Sign in to continue</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Please sign in or create an account to add items to your cart and place orders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <SignUpButton 
            mode="modal"
            forceRedirectUrl="/customer"
            fallbackRedirectUrl="/customer"
          >
            <Button className="w-full h-10 sm:h-12 bg-yellow-500 hover:bg-yellow-600 text-white">
              Sign up
            </Button>
          </SignUpButton>
          <SignInButton 
            mode="modal"
            forceRedirectUrl="/customer"
            fallbackRedirectUrl="/customer"
          >
            <Button variant="outline" className="w-full h-10 sm:h-12">
              Login
            </Button>
          </SignInButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}

