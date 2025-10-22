"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useData, type Promotion, type DiscountType } from "@/lib/data-context"

interface PromotionDialogProps {
  promotion?: Promotion
  onClose: () => void
}

export function PromotionDialog({ promotion, onClose }: PromotionDialogProps) {
  const [formData, setFormData] = useState({
    title: promotion?.title || "",
    description: promotion?.description || "",
    image: promotion?.image || "",
    discountType: promotion?.discountType || "percentage",
    discountValue: promotion?.discountValue?.toString() || "",
    startDate: promotion?.startDate ? new Date(promotion.startDate).toISOString().split("T")[0] : "",
    endDate: promotion?.endDate ? new Date(promotion.endDate).toISOString().split("T")[0] : "",
    active: promotion?.active ?? true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addPromotion, updatePromotion } = useData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = {
        title: formData.title,
        description: formData.description,
        image: formData.image || "/menu-sample.jpg",
        discountType: formData.discountType as "percentage" | "fixed",
        discountValue: Number.parseFloat(formData.discountValue),
        startDate: new Date(formData.startDate).getTime(),
        endDate: new Date(formData.endDate).getTime(),
        active: formData.active,
      }

      if (promotion) {
        updatePromotion(promotion._id, data)
      } else {
        addPromotion(data)
      }

      onClose()
    } catch (error) {
      console.error("Failed to save promotion:", error)
      alert("Failed to save promotion. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{promotion ? "Edit Promotion" : "Create Promotion"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Weekend Special"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Get 15% off on all pizzas this weekend!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="/menu-sample.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-type">Discount Type</Label>
              <select
                id="discount-type"
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-value">
                Discount Value {formData.discountType === "percentage" ? "(%)" : "(₱)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                step="0.01"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
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
              {isSubmitting ? "Saving..." : promotion ? "Update Promotion" : "Create Promotion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
