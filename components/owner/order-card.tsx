"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface OrderCardProps {
  order: {
    id: string
    tableNumber: string
    image: string
    type: "dine-in" | "takeaway" | "delivery" | "pre-order"
    time: string
  }
  onClick: () => void
}

const typeStyles: Record<"dine-in" | "takeaway" | "delivery" | "pre-order", string> = {
  "dine-in": "bg-[#FFD93D] text-[#8B6914] border-[#FFD93D]",
  takeaway: "bg-[#4DD0E1] text-[#006064] border-[#4DD0E1]",
  delivery: "bg-[#B39DDB] text-[#311B92] border-[#B39DDB]",
  "pre-order": "bg-[#C5E1A5] text-[#33691E] border-[#C5E1A5]",
}

const typeLabels: Record<"dine-in" | "takeaway" | "delivery" | "pre-order", string> = {
  "dine-in": "Dine in",
  takeaway: "Take away",
  delivery: "Delivery",
  "pre-order": "Pre-order",
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Table {order.tableNumber}</h3>
            <p className="text-sm text-muted-foreground">Order #{order.id.slice(-6).toUpperCase()}</p>
          </div>
          <span className="text-xs text-muted-foreground">{order.time}</span>
        </div>

        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
          <Image src={order.image || "/menu-sample.jpg"} alt="Order" fill className="object-cover" />
        </div>

        <Badge variant="outline" className={cn("w-full justify-center", typeStyles[order.type])}>
          {typeLabels[order.type]}
        </Badge>
      </CardContent>
    </Card>
  )
}
