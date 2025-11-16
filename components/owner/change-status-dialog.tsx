"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useData, type OrderStatus } from "@/lib/data-context"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { canEditOrderStatus, ORDER_STATUS_LABELS } from "@/lib/order-utils"

interface ChangeStatusDialogProps {
  orderId: string
  currentStatus?: OrderStatus // Current order status to initialize the dialog
  onClose: () => void
  onSuccess: () => void
}

// All possible order statuses that can be selected in the dialog
// Note: Some statuses (completed, cancelled, delivered) cannot be selected as they are final states
const ALL_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pre-order-pending", label: ORDER_STATUS_LABELS["pre-order-pending"] },
  { value: "pending", label: ORDER_STATUS_LABELS["pending"] },
  { value: "accepted", label: ORDER_STATUS_LABELS["accepted"] },
  { value: "ready", label: ORDER_STATUS_LABELS["ready"] },
  { value: "in-transit", label: ORDER_STATUS_LABELS["in-transit"] },
  { value: "denied", label: ORDER_STATUS_LABELS["denied"] },
]

export function ChangeStatusDialog({ orderId, currentStatus, onClose, onSuccess }: ChangeStatusDialogProps) {
  // Initialize with current status if provided, otherwise default to "pending"
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus || "pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { updateOrder, getOrderById } = useData()

  // Get current order to check if editing is allowed
  const order = getOrderById(orderId)
  const canEditStatus = canEditOrderStatus(order?.status)

  // Update selected status when currentStatus prop changes or order is loaded
  useEffect(() => {
    if (currentStatus) {
      setSelectedStatus(currentStatus)
    } else {
      // Try to get order status from context if not provided
      const order = getOrderById(orderId)
      if (order) {
        setSelectedStatus(order.status)
      }
    }
  }, [currentStatus, orderId, getOrderById])

  // Prevent editing if order is in final state
  useEffect(() => {
    if (!canEditStatus && order) {
      toast.error("Cannot edit status", {
        description: `Orders that are ${order.status} cannot have their status changed.`,
      })
      onClose()
    }
  }, [canEditStatus, order, onClose])

  // Handle button click - show confirmation dialog first
  const handleStatusChangeClick = () => {
    // Double-check before showing confirmation
    if (!canEditStatus) {
      toast.error("Cannot edit status", {
        description: "This order cannot have its status changed.",
      })
      return
    }
    setShowConfirmDialog(true)
  }

  // Actually perform the status change after confirmation
  const handleConfirmStatusChange = async () => {
    if (!canEditStatus) {
      toast.error("Cannot edit status", {
        description: "This order cannot have its status changed.",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await updateOrder(orderId, {
        status: selectedStatus,
        // Clear denial reason when changing to a non-denied status
        denialReason: selectedStatus !== "denied" ? undefined : undefined,
      })
      
      // Get human-readable status label
      const statusLabel = ORDER_STATUS_LABELS[selectedStatus] || selectedStatus
      
      toast.success("Order status updated!", {
        description: `Order has been changed to ${statusLabel} status.`,
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
            {canEditStatus 
              ? "Select the new status for this order." 
              : "This order cannot have its status changed as it is already in a final state (cancelled, completed, or delivered)."}
          </p>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
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
              onClick={handleStatusChangeClick}
              disabled={isSubmitting || !canEditStatus}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirm Status Change"
        description={`Are you sure you want to change the order status to "${ALL_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus}"? This action will notify the customer.`}
        confirmText="confirm"
        onConfirm={handleConfirmStatusChange}
        confirmButtonLabel="Confirm Change"
        confirmButtonClassName="bg-green-600 hover:bg-green-700"
      />
    </Dialog>
  )
}
