"use client"

import { useState } from "react"
import { OwnerSidebar } from "./owner-sidebar"
import { OwnerHeader } from "./owner-header"
import { OrdersView } from "./orders-view"
import { HistoricalOrdersView } from "./historical-orders-view"
import { MenuView } from "./menu-view"
import { RestaurantSettings } from "./restaurant-settings"
import { VouchersView } from "./vouchers-view"
import { PromotionsView } from "./promotions-view"
import { ChatView } from "./chat-view" // Added chat view import
import { HistoryLogView } from "./history-log-view" // Added history log view import
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export type OwnerView = "orders" | "history" | "menu" | "settings" | "vouchers" | "promotions" | "chat" | "history-log" // Added chat, history & history-log to view types

export function OwnerDashboard({ initialOrderId }: { initialOrderId?: string }) {
  const [currentView, setCurrentView] = useState<OwnerView>("orders")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Query unread message count
  const unreadMessageCount = useQuery(api.chat.getUnreadCount) ?? 0

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[45]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <OwnerSidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={setIsMobileMenuOpen}
        unreadMessageCount={unreadMessageCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <OwnerHeader />

        <main className="flex-1 overflow-y-auto p-3 xs:p-6">
          {currentView === "orders" && <OrdersView initialOrderId={initialOrderId} />}
          {currentView === "history" && <HistoricalOrdersView />}
          {currentView === "menu" && <MenuView />}
          {currentView === "settings" && <RestaurantSettings />}
          {currentView === "vouchers" && <VouchersView />}
          {currentView === "promotions" && <PromotionsView />}
          {currentView === "chat" && <ChatView />} {/* Added chat view */}
          {currentView === "history-log" && <HistoryLogView />} {/* Added history log view */}
        </main>
      </div>
    </div>
  )
}
