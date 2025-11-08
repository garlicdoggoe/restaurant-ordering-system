"use client"

import { useUser } from "@clerk/nextjs"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Menu, 
  ShoppingCart, 
  Heart, 
  Clock, 
  Inbox, 
  Settings, 
  LogOut,
  User,
  MapPin,
  X,
  Calendar,
  Activity
} from "lucide-react"
import { SignOutButton } from "@clerk/nextjs"
import { formatPhoneForDisplay } from "@/lib/phone-validation"

interface CustomerSidebarProps {
  currentView: "menu" | "orders" | "profile" | "preorders" | "inbox" | "activeorders"
  onViewChange: (view: "menu" | "orders" | "profile" | "preorders" | "inbox" | "activeorders") => void
  cartItemCount: number
  preOrdersCount: number
  activeOrdersCount?: number
  unreadMessageCount?: number
  onToggleCart?: () => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

export function CustomerSidebar({ 
  currentView, 
  onViewChange, 
  cartItemCount, 
  preOrdersCount,
  activeOrdersCount = 0,
  unreadMessageCount = 0,
  onToggleCart,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: CustomerSidebarProps) {
  const { user } = useUser()
  const { restaurant, currentUser } = useData()

  if (!user) return null

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  const navigationItems = [
    {
      id: "menu",
      label: "Menu",
      icon: Menu,
      active: currentView === "menu"
    },
    {
      id: "cart",
      label: "Cart",
      icon: ShoppingCart,
      active: false,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
      onClick: onToggleCart
    },
    {
      id: "preorders",
      label: "Pre-Orders",
      icon: Calendar,
      active: currentView === "preorders",
      badge: preOrdersCount > 0 ? preOrdersCount : undefined
    },
    {
      id: "activeorders",
      label: "Active Orders",
      icon: Activity,
      active: currentView === "activeorders",
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined
    },
    {
      id: "favorites",
      label: "Favorite",
      icon: Heart,
      active: false
    },
    {
      id: "orders",
      label: "Order History",
      icon: Clock,
      active: currentView === "orders"
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: Inbox,
      active: currentView === "inbox",
      badge: unreadMessageCount > 0 ? unreadMessageCount : undefined
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      active: currentView === "profile"
    }
  ]

  const handleNavigation = (item: typeof navigationItems[0]) => {
    if (item.id === "menu" || item.id === "orders" || item.id === "preorders" || item.id === "inbox" || item.id === "activeorders") {
      onViewChange(item.id as "menu" | "orders" | "preorders" | "inbox" | "activeorders")
    } else if (item.id === "settings") {
      onViewChange("profile")
    } else if (item.onClick) {
      item.onClick()
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[45]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-72 xs:w-80 bg-background border-r
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 z-[50]' : '-translate-x-full z-40'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end p-4">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer hover:bg-yellow-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Restaurant name */}
          <div className="px-4 xs:px-6 py-4 border-b">
            <h1 className="text-fluid-2xl font-bold text-foreground">
              {restaurant.name || "Blackpepper Camp's Pizza"}
            </h1>
          </div>

          {/* Navigation menu - scrollable on mobile */}
          <nav className="flex-1 px-4 xs:px-6 py-6 space-y-2 overflow-y-auto min-h-0">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "default" : "ghost"}
                  className={`
                    w-full justify-start gap-3 h-12 cursor-pointer touch-target
                    ${item.active ? 'bg-primary text-primary-foreground' : 'hover:bg-yellow-100 hover:text-foreground'}
                  `}
                  onClick={() => handleNavigation(item)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 text-left text-fluid-base">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-red-500 font-bold">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </nav>

          <Separator />

          {/* User info section */}
          <div className="px-4 xs:px-6 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 xs:h-10 xs:w-10">
                <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fluid-lg truncate">
                  Hello, {user.firstName || "User"}!
                </p>
                {currentUser?.address && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{currentUser.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Logout button */}
            <SignOutButton>
              <Button variant="outline" className="w-full gap-2 cursor-pointer hover:bg-yellow-100 hover:text-foreground touch-target">
                <LogOut className="h-4 w-4" />
                <span className="text-fluid-base">Logout</span>
              </Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </>
  )
}
