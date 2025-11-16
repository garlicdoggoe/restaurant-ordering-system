"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string // Text that must be typed (default: "confirm")
  onConfirm: () => void | Promise<void>
  confirmButtonLabel?: string
  confirmButtonClassName?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "confirm",
  onConfirm,
  confirmButtonLabel = "Confirm",
  confirmButtonClassName = "bg-green-600 hover:bg-green-700",
}: ConfirmDialogProps) {
  const [typedText, setTypedText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if the typed text matches the confirmation text (case-insensitive)
  const isConfirmed = typedText.toLowerCase().trim() === confirmText.toLowerCase()

  const handleConfirm = async () => {
    if (!isConfirmed) return

    setIsSubmitting(true)
    try {
      await onConfirm()
      // Reset on success
      setTypedText("")
      onOpenChange(false)
    } catch (error) {
      console.error("Confirmation action failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset typed text when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTypedText("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-mono font-bold text-primary">"{confirmText}"</span> to confirm:
            </label>
            <Input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={`Type "${confirmText}" here`}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !isSubmitting) {
                  handleConfirm()
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmed || isSubmitting}
            className={confirmButtonClassName}
          >
            {isSubmitting ? "Processing..." : confirmButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

