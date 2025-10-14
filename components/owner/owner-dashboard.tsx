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

export type OwnerView = "orders" | "history" | "menu" | "settings" | "vouchers" | "promotions" | "chat" // Added chat & history to view types

export function OwnerDashboard() {
  const [currentView, setCurrentView] = useState<OwnerView>("orders")

  return (
    <div className="flex h-screen bg-muted/30">
      <OwnerSidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <OwnerHeader />

        <main className="flex-1 overflow-y-auto p-6">
          {currentView === "orders" && <OrdersView />}
          {currentView === "history" && <HistoricalOrdersView />}
          {currentView === "menu" && <MenuView />}
          {currentView === "settings" && <RestaurantSettings />}
          {currentView === "vouchers" && <VouchersView />}
          {currentView === "promotions" && <PromotionsView />}
          {currentView === "chat" && <ChatView />} {/* Added chat view */}
        </main>
      </div>
    </div>
  )
}
