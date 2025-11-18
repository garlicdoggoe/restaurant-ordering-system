"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { useData, type Promotion } from "@/lib/data-context"
import { PromotionDialog } from "./promotion-dialog"
import Image from "next/image"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// Component to resolve storageId to URL and display promotion image
function PromotionImage({ image, alt }: { image?: string; alt: string }) {
  // Resolve storageId to URL if needed
  const isStorageId = image && 
    !image.startsWith('http') && 
    !image.startsWith('/') && 
    !image.includes('.') && 
    image.length > 20

  const imageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId: image as Id<"_storage"> } : "skip"
  )

  // Final image source: resolved URL, original URL, or undefined (no image)
  const finalImageSrc = imageUrl || (image?.startsWith('http') || image?.startsWith('/') ? image : undefined)

  if (!finalImageSrc) return null

  return (
    <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
      <Image
        src={finalImageSrc}
        alt={alt}
        fill
        className="object-cover"
      />
    </div>
  )
}

// Component for individual promotion card
function PromotionCard({ 
  promotion, 
  onEdit, 
  onToggleActive, 
  onDelete 
}: { 
  promotion: Promotion
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const now = Date.now()
  // Handle optional dates - only check if dates are provided
  const isExpired = promotion.endDate !== undefined && promotion.endDate < now
  const isUpcoming = promotion.startDate !== undefined && promotion.startDate > now

  return (
    <Card key={promotion._id}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <PromotionImage image={promotion.image} alt={promotion.title} />

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold">{promotion.title}</h3>
                  {promotion.active && !isExpired && !isUpcoming && (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                  {!promotion.active && <Badge variant="secondary">Inactive</Badge>}
                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                  {isUpcoming && <Badge className="bg-blue-500">Upcoming</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{promotion.description}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onEdit}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onToggleActive}
                  title={promotion.active ? "Deactivate" : "Activate"}
                >
                  {promotion.active ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="text-destructive bg-transparent"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">Discount</p>
                <p className="font-medium">
                  {promotion.discountType === "percentage"
                    ? `${promotion.discountValue}%`
                    : `₱${promotion.discountValue}`}{" "}
                  off
                </p>
              </div>
              {(promotion.startDate || promotion.endDate) && (
                <div>
                  <p className="text-muted-foreground">Valid Period</p>
                  <p className="font-medium">
                    {promotion.startDate 
                      ? new Date(promotion.startDate).toLocaleDateString() 
                      : "No start date"} -{" "}
                    {promotion.endDate 
                      ? new Date(promotion.endDate).toLocaleDateString() 
                      : "No end date"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PromotionsView() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  const { promotions, updatePromotion, deletePromotion } = useData()

  const handleToggleActive = (promotionId: string) => {
    const promotion = promotions.find((p) => p._id === promotionId)
    if (promotion) {
      updatePromotion(promotionId, { active: !promotion.active })
    }
  }

  const handleDelete = (promotionId: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return
    deletePromotion(promotionId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-fluid-2xl font-bold">Promotions</h1>
        <Button className="gap-2 w-full lg:w-auto" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4" />
          Create Promotion
        </Button>
      </div>

      <div className="grid gap-4">
        {promotions.map((promotion) => (
          <PromotionCard
            key={promotion._id}
            promotion={promotion}
            onEdit={() => {
              setEditingPromotion(promotion)
              setShowDialog(true)
            }}
            onToggleActive={() => handleToggleActive(promotion._id)}
            onDelete={() => handleDelete(promotion._id)}
          />
        ))}

        {promotions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No promotions created yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showDialog && (
        <PromotionDialog
          promotion={editingPromotion ?? undefined}
          onClose={() => {
            setShowDialog(false)
            setEditingPromotion(null)
          }}
        />
      )}
    </div>
  )
}
