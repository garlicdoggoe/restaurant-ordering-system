"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, UtensilsCrossed, Settings, Ticket, Megaphone, LogOut, HelpCircle, MessageSquare, History } from "lucide-react" // Added MessageSquare icon & History icon
import type { OwnerView } from "./owner-dashboard"

interface OwnerSidebarProps {
  currentView: OwnerView
  onViewChange: (view: OwnerView) => void
}

export function OwnerSidebar({ currentView, onViewChange }: OwnerSidebarProps) {
  const menuItems = [
    { id: "orders" as OwnerView, icon: Home, label: "Orders" },
    { id: "history" as OwnerView, icon: History, label: "History" },
    { id: "menu" as OwnerView, icon: UtensilsCrossed, label: "Menu" },
    { id: "chat" as OwnerView, icon: MessageSquare, label: "Chat" }, // Added chat menu item
    { id: "vouchers" as OwnerView, icon: Ticket, label: "Vouchers" },
    { id: "promotions" as OwnerView, icon: Megaphone, label: "Promotions" },
    { id: "settings" as OwnerView, icon: Settings, label: "Settings" },
  ]

  return (
    <aside className="w-20 bg-[#2D2D3D] text-white flex flex-col items-center py-6 space-y-8">
      <div className="w-10 h-10 bg-[#4A3F5C] rounded-lg flex items-center justify-center">
        <UtensilsCrossed className="w-6 h-6" />
      </div>

      <nav className="flex-1 flex flex-col items-center space-y-4">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="icon"
            className={cn(
              "w-12 h-12 rounded-xl transition-colors",
              currentView === item.id
                ? "bg-[#4A3F5C] text-white hover:bg-[#3d3349]"
                : "text-gray-400 hover:text-white hover:bg-white/10",
            )}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <item.icon className="w-6 h-6" />
          </Button>
        ))}
      </nav>

      <div className="flex flex-col items-center space-y-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          title="Help"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </Button>
      </div>
    </aside>
  )
}
