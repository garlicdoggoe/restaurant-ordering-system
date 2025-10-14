"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useData } from "@/lib/data-context"

interface AcceptOrderDialogProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export function AcceptOrderDialog({ orderId, onClose, onSuccess }: AcceptOrderDialogProps) {
  const [preparationTime, setPreparationTime] = useState("30")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { updateOrder } = useData()

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      updateOrder(orderId, {
        status: "accepted",
        estimatedPrepTime: Number.parseInt(preparationTime),
      })
      onSuccess()
    } catch (error) {
      console.error("Failed to accept order:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prep-time">Estimated Preparation Time (minutes)</Label>
            <Input
              id="prep-time"
              type="number"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAccept} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Accepting..." : "Confirm Accept"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
