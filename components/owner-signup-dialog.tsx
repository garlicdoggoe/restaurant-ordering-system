"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SignUpButton } from "@clerk/nextjs"

interface OwnerSignupDialogProps {
  children: React.ReactNode
}

export function OwnerSignupDialog({ children }: OwnerSignupDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [ownerCode, setOwnerCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [codeValidated, setCodeValidated] = useState(false)
  
  const validateOwnerCode = useMutation(api.users.validateOwnerCode)

  const handleCodeValidation = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Validate the owner code
      const validation = await validateOwnerCode({ code: ownerCode })
      
      if (!validation.valid) {
        setError(validation.error || "Invalid owner code")
        setIsLoading(false)
        return
      }

      // If code is valid, store it in localStorage for the signup callback to use
      localStorage.setItem('ownerSignupCode', ownerCode)
      console.log("OwnerSignupDialog - Code validated and stored:", ownerCode)
      setCodeValidated(true)
      
    } catch (err: any) {
      console.error("Owner code validation error:", err)
      setError(err.message || "Failed to validate owner code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !codeValidated) {
      // Only reset state and remove code if dialog closes without successful validation
      setOwnerCode("")
      setError("")
      setCodeValidated(false)
      localStorage.removeItem('ownerSignupCode')
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign up as Owner</DialogTitle>
          <DialogDescription>
            {codeValidated 
              ? "Code validated! Click below to complete your owner signup."
              : "Enter the owner access code to create an owner account."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!codeValidated ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="owner-code">Owner Access Code</Label>
                <Input
                  id="owner-code"
                  type="password"
                  placeholder="Enter owner access code"
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCodeValidation()
                    }
                  }}
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCodeValidation}
                disabled={isLoading || !ownerCode.trim()}
              >
                {isLoading ? "Verifying..." : "Validate Code"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <SignUpButton 
              mode="modal"
              forceRedirectUrl="/owner"
              fallbackRedirectUrl="/owner"
            >
              <Button>
                Complete Owner Signup
              </Button>
            </SignUpButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
