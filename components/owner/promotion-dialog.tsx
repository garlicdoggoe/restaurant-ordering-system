"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Upload, X } from "lucide-react"
import { useData, type Promotion, type DiscountType } from "@/lib/data-context"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { compressImage } from "@/lib/image-compression"
import Image from "next/image"

interface PromotionDialogProps {
  promotion?: Promotion
  onClose: () => void
}

export function PromotionDialog({ promotion, onClose }: PromotionDialogProps) {
  const [formData, setFormData] = useState({
    title: promotion?.title || "",
    description: promotion?.description || "",
    discountType: promotion?.discountType || "percentage",
    discountValue: promotion?.discountValue?.toString() || "",
    startDate: promotion?.startDate ? new Date(promotion.startDate).toISOString().split("T")[0] : "",
    endDate: promotion?.endDate ? new Date(promotion.endDate).toISOString().split("T")[0] : "",
    active: promotion?.active ?? true,
  })

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addPromotion, updatePromotion } = useData()
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  // Resolve storageId to URL for existing promotion image preview
  const isStorageId = promotion?.image && 
    !promotion.image.startsWith('http') && 
    !promotion.image.startsWith('/') && 
    !promotion.image.includes('.') && 
    promotion.image.length > 20

  const existingImageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId: promotion.image as Id<"_storage"> } : "skip"
  )

  // Initialize preview with existing promotion image
  useEffect(() => {
    if (promotion?.image) {
      if (promotion.image.startsWith("http") || promotion.image.startsWith("/")) {
        // Direct URL
        setPreviewUrl(promotion.image)
      } else if (existingImageUrl) {
        // Resolved storageId URL
        setPreviewUrl(existingImageUrl)
      }
    }
  }, [promotion?.image, existingImageUrl])

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    try {
      setIsUploading(true)

      // Compress the image to approximately 100KB
      const compressedFile = await compressImage(file, 100)

      // Set the compressed file
      setUploadedImage(compressedFile)

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
    } catch (error) {
      console.error("Failed to process image:", error)
      alert("Failed to process image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // Handle image removal
  const handleRemoveImage = () => {
    setUploadedImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Upload image to Convex storage if a new image was selected
      let imageStorageId: string | undefined = undefined
      if (uploadedImage) {
        try {
          const uploadUrl = await generateUploadUrl({})
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": uploadedImage.type || "image/jpeg" },
            body: uploadedImage,
          })

          if (!uploadResponse.ok) {
            throw new Error("Upload failed")
          }

          const { storageId } = await uploadResponse.json()
          imageStorageId = storageId as string
        } catch (error) {
          console.error("Failed to upload image:", error)
          alert("Failed to upload image. Please try again.")
          setIsSubmitting(false)
          return
        }
      } else if (promotion?.image) {
        // Keep existing image (could be storageId or URL - store as-is)
        // If it's already a storageId, use it; if it's a URL, we'll need to handle that
        // For now, we assume existing image is already stored correctly
        imageStorageId = promotion.image
      }

      const data: Omit<Promotion, "_id"> = {
        title: formData.title,
        description: formData.description,
        image: imageStorageId, // Store storageId (optional - can be undefined)
        discountType: formData.discountType as "percentage" | "fixed",
        discountValue: Number.parseFloat(formData.discountValue),
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
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
            <Label htmlFor="image">Image (Optional)</Label>
            <div className="space-y-2">
              {previewUrl ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                  <Image
                    src={previewUrl}
                    alt="Promotion preview"
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload an image
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "Processing..." : "Select Image"}
                  </Button>
                </div>
              )}
              <Input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploading || isSubmitting}
              />
            </div>
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
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
