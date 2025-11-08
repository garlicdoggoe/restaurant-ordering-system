"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu, ShoppingCart } from "lucide-react"
import type { CustomerView } from "./customer-interface"

interface CustomerTopNavProps {
  currentView: CustomerView
  cartItemCount: number
  onToggleSidebar: () => void
  onToggleCart: () => void
}

// Map current view to page title
const pageTitles: Record<CustomerView, string> = {
  menu: "Menu",
  preorders: "Pre-Orders",
  activeorders: "Active Orders",
  orders: "Order History",
  inbox: "Inbox",
  profile: "Profile Settings"
}

export function CustomerTopNav({
  currentView,
  cartItemCount,
  onToggleSidebar,
  onToggleCart
}: CustomerTopNavProps) {
  const pageTitle = pageTitles[currentView]

  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Burger menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer hover:bg-yellow-100"
          onClick={onToggleSidebar}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Center: Page title */}
        <h1 className="text-fluid-lg font-semibold text-foreground text-center flex-1">
          {pageTitle}
        </h1>

        {/* Right: Cart button with badge */}
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer hover:bg-yellow-100"
          onClick={onToggleCart}
        >
          <ShoppingCart className="h-6 w-6" />
          {cartItemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
              {cartItemCount}
            </Badge>
          )}
        </Button>
      </div>
    </nav>
  )
}

