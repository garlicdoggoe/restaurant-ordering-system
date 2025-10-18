"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserButton } from "@clerk/nextjs"
import { ShoppingCart, History, UtensilsCrossed } from "lucide-react"
import { useData } from "@/lib/data-context"
import type { CustomerView } from "./customer-interface"

interface CustomerHeaderProps {
  currentView: CustomerView
  onViewChange: (view: CustomerView) => void
  cartItemCount: number
}

export function CustomerHeader({ currentView, onViewChange, cartItemCount }: CustomerHeaderProps) {
  const { restaurant } = useData()
  
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Restaurant logo or default icon */}
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
            {restaurant.logo ? (
              <img 
                src={restaurant.logo} 
                alt={`${restaurant.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg">{restaurant.name || "Foodies Restaurant"}</h1>
            <p className="text-xs text-muted-foreground">
              {restaurant.description || "Order delicious food"}
            </p>
            {restaurant.openingTime && restaurant.closingTime && (
              <p className="text-xs text-muted-foreground">
                Hours: {restaurant.openingTime} - {restaurant.closingTime}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant={currentView === "menu" ? "default" : "ghost"}
            onClick={() => onViewChange("menu")}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Menu
            {cartItemCount > 0 && (
              <Badge className="ml-1 bg-destructive text-destructive-foreground">{cartItemCount}</Badge>
            )}
          </Button>

          <Button
            variant={currentView === "orders" ? "default" : "ghost"}
            onClick={() => onViewChange("orders")}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            My Orders
          </Button>

          <UserButton />
        </div>
      </div>
    </header>
  )
}
