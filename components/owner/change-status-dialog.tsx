"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { toast } from "sonner"

interface ChangeStatusDialogProps {
  orderId: string
  onClose: () => void
  onSuccess: () => void
}

export function ChangeStatusDialog({ orderId, onClose, onSuccess }: ChangeStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "accepted">("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { updateOrder } = useData()

  const handleStatusChange = async () => {
    setIsSubmitting(true)
    try {
      await updateOrder(orderId, {
        status: selectedStatus,
        // Clear denial reason when changing status
        denialReason: undefined,
      })
      
      const statusText = selectedStatus === "pending" ? "pending" : "preparing"
      toast.success("Order status updated!", {
        description: `Order has been changed to ${statusText} status.`,
        duration: 3000,
      })
      
      onSuccess()
    } catch (error) {
      console.error("Failed to update order status:", error)
      toast.error("Failed to update order status")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Order Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the new status for this order:
          </p>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as "pending" | "accepted")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Preparing</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
