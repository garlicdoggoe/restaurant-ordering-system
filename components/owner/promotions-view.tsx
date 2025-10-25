"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { useData } from "@/lib/data-context"
import { PromotionDialog } from "./promotion-dialog"
import Image from "next/image"

export function PromotionsView() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<any>(null)

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
        {promotions.map((promotion) => {
          const now = Date.now()
          const isExpired = promotion.endDate < now
          const isUpcoming = promotion.startDate > now

          return (
            <Card key={promotion._id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={promotion.image || "/menu-sample.jpg"}
                      alt={promotion.title}
                      fill
                      className="object-cover"
                    />
                  </div>

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
                          onClick={() => {
                            setEditingPromotion(promotion)
                            setShowDialog(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleToggleActive(promotion._id)}
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
                          onClick={() => handleDelete(promotion._id)}
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
                      <div>
                        <p className="text-muted-foreground">Valid Period</p>
                        <p className="font-medium">
                          {new Date(promotion.startDate).toLocaleDateString()} -{" "}
                          {new Date(promotion.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

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
          promotion={editingPromotion}
          onClose={() => {
            setShowDialog(false)
            setEditingPromotion(null)
          }}
        />
      )}
    </div>
  )
}
