"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useData } from "@/lib/data-context"

interface VoucherDialogProps {
  voucher?: any
  onClose: () => void
}

export function VoucherDialog({ voucher, onClose }: VoucherDialogProps) {
  const [formData, setFormData] = useState({
    code: voucher?.code || "",
    type: voucher?.type || "percentage",
    value: voucher?.value?.toString() || "",
    minOrderAmount: voucher?.minOrderAmount?.toString() || "",
    maxDiscount: voucher?.maxDiscount?.toString() || "",
    expiresAt: voucher?.expiresAt ? new Date(voucher.expiresAt).toISOString().split("T")[0] : "",
    usageLimit: voucher?.usageLimit?.toString() || "",
    active: voucher?.active ?? true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addVoucher, updateVoucher } = useData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = {
        code: formData.code.toUpperCase(),
        type: formData.type as "percentage" | "fixed",
        value: Number.parseFloat(formData.value),
        minOrderAmount: formData.minOrderAmount ? Number.parseFloat(formData.minOrderAmount) : 0,
        maxDiscount: formData.maxDiscount ? Number.parseFloat(formData.maxDiscount) : undefined,
        expiresAt: new Date(formData.expiresAt).getTime(),
        usageLimit: formData.usageLimit ? Number.parseInt(formData.usageLimit) : 0,
        usageCount: voucher?.usageCount || 0,
        active: formData.active,
      }

      if (voucher) {
        updateVoucher(voucher._id, data)
      } else {
        addVoucher(data)
      }

      onClose()
    } catch (error) {
      console.error("Failed to save voucher:", error)
      alert("Failed to save voucher. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{voucher ? "Edit Voucher" : "Create Voucher"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Voucher Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-type">Discount Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-value">Discount Value {formData.type === "percentage" ? "(%)" : "($)"}</Label>
              <Input
                id="discount-value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-order">Min Order Amount ($)</Label>
              <Input
                id="min-order"
                type="number"
                step="0.01"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {formData.type === "percentage" && (
            <div className="space-y-2">
              <Label htmlFor="max-discount">Max Discount Amount ($)</Label>
              <Input
                id="max-discount"
                type="number"
                step="0.01"
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                placeholder="Optional"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expires-at">Expires On</Label>
            <Input
              id="expires-at"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage-limit">Usage Limit</Label>
            <Input
              id="usage-limit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              placeholder="0 for unlimited"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : voucher ? "Update Voucher" : "Create Voucher"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
