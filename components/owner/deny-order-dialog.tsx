"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useData } from "@/lib/data-context"

interface DenyOrderDialogProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export function DenyOrderDialog({ orderId, onClose, onSuccess }: DenyOrderDialogProps) {
  const [selectedReason, setSelectedReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { denialReasons, updateOrder, addDenialReason } = useData()
  const presetReasons = denialReasons.filter((r) => r.isPreset).map((r) => r.reason)

  const handleDeny = async () => {
    const reason = selectedReason === "custom" ? customReason : selectedReason
    setIsSubmitting(true)
    try {
      // Add custom reason to the list if it's new
      if (selectedReason === "custom" && customReason) {
        addDenialReason(customReason)
      }

      updateOrder(orderId, {
        status: "denied",
        denialReason: reason,
      })
      onSuccess()
    } catch (error) {
      console.error("Failed to deny order:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deny Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Select Reason</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {presetReasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="font-normal cursor-pointer">
                    {reason}
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom reason
                </Label>
              </div>
            </RadioGroup>
          </div>

          {selectedReason === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom Reason</Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeny}
              className="flex-1"
              variant="destructive"
              disabled={!selectedReason || (selectedReason === "custom" && !customReason) || isSubmitting}
            >
              {isSubmitting ? "Denying..." : "Confirm Deny"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
