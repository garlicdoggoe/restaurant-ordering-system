"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Home, UtensilsCrossed, Settings, Ticket, Megaphone, LogOut, HelpCircle, MessageSquare, History, FileText, Menu, X } from "lucide-react" // Added MessageSquare icon & History icon & FileText icon & Menu & X
import type { OwnerView } from "./owner-dashboard"

interface OwnerSidebarProps {
  currentView: OwnerView
  onViewChange: (view: OwnerView) => void
  isMobileMenuOpen: boolean
  onMobileMenuToggle: (open: boolean) => void
  unreadMessageCount?: number
}

export function OwnerSidebar({ currentView, onViewChange, isMobileMenuOpen, onMobileMenuToggle, unreadMessageCount = 0 }: OwnerSidebarProps) {
  const menuItems = [
    { id: "orders" as OwnerView, icon: Home, label: "Orders" },
    { id: "history" as OwnerView, icon: History, label: "History" },
    { id: "menu" as OwnerView, icon: UtensilsCrossed, label: "Menu" },
    { id: "chat" as OwnerView, icon: MessageSquare, label: "Chat", badge: unreadMessageCount > 0 ? unreadMessageCount : undefined }, // Added chat menu item with badge
    { id: "history-log" as OwnerView, icon: FileText, label: "History Log" }, // Added history log menu item
    { id: "vouchers" as OwnerView, icon: Ticket, label: "Vouchers" },
    { id: "promotions" as OwnerView, icon: Megaphone, label: "Promotions" },
    { id: "settings" as OwnerView, icon: Settings, label: "Settings" },
  ]

  const handleNavigation = (view: OwnerView) => {
    onViewChange(view)
    onMobileMenuToggle(false) // Close mobile menu after navigation
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-[60] cursor-pointer hover:bg-yellow-100 bg-white rounded-lg shadow-md"
        onClick={() => onMobileMenuToggle(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-72 xs:w-80 bg-[#2D2D3D] text-white flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-20
      `}>
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end p-4">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer hover:bg-yellow-100 text-white hover:text-black"
              onClick={() => onMobileMenuToggle(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Logo section */}
          <div className="px-4 xs:px-6 py-4 lg:py-6 flex items-center justify-center lg:justify-center">
            <div className="w-10 h-10 bg-[#4A3F5C] rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <span className="ml-3 lg:hidden text-lg font-bold">Owner Dashboard</span>
          </div>

          {/* Navigation menu */}
          <nav className="flex-1 px-4 xs:px-6 py-6 space-y-2 overflow-y-auto min-h-0 lg:space-y-4">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 lg:h-12 lg:w-12 lg:justify-center lg:rounded-xl transition-colors cursor-pointer touch-target relative",
                  currentView === item.id
                    ? "bg-[#fbbf24] text-black hover:bg-[#f59e0b]"
                    : "text-gray-400 hover:text-white hover:bg-white/10",
                )}
                onClick={() => handleNavigation(item.id)}
                title={item.label}
              >
                <item.icon className="h-5 w-5 lg:h-6 lg:w-6" />
                <span className="lg:hidden text-fluid-base">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto lg:absolute lg:top-0 lg:right-0 lg:ml-0 text-red-500 font-bold bg-red-100 border-red-200">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="px-4 xs:px-6 py-4 lg:py-6 flex flex-col lg:items-center space-y-2 lg:space-y-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 lg:h-12 lg:w-12 lg:justify-center lg:rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer touch-target"
              title="Help"
            >
              <HelpCircle className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="lg:hidden text-fluid-base">Help</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 lg:h-12 lg:w-12 lg:justify-center lg:rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer touch-target"
              title="Logout"
            >
              <LogOut className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="lg:hidden text-fluid-base">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
