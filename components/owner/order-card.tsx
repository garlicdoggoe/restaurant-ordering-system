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
    status: "dine-in" | "served" | "wait-list" | "takeaway"
    time: string
  }
  onClick: () => void
}

const statusStyles = {
  "dine-in": "bg-[#FFD93D] text-[#8B6914] border-[#FFD93D]",
  served: "bg-[#4CAF50] text-white border-[#4CAF50]",
  "wait-list": "bg-[#FF6B6B] text-white border-[#FF6B6B]",
  takeaway: "bg-[#4DD0E1] text-[#006064] border-[#4DD0E1]",
}

const statusLabels = {
  "dine-in": "Dine in",
  served: "Served",
  "wait-list": "Wait list",
  takeaway: "Take away",
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

        <Badge variant="outline" className={cn("w-full justify-center", statusStyles[order.status])}>
          {statusLabels[order.status]}
        </Badge>
      </CardContent>
    </Card>
  )
}
