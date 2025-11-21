"use client"

import { useState, useEffect, useRef } from "react"
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
import { TotalMonitoringView } from "./total-monitoring-view" // Added total monitoring view import for pre-order aggregation
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export type OwnerView = "orders" | "history" | "menu" | "settings" | "vouchers" | "promotions" | "chat" | "history-log" | "total-monitoring" // Added chat, history & history-log & total-monitoring to view types

export function OwnerDashboard({ initialOrderId }: { initialOrderId?: string }) {
  const [currentView, setCurrentView] = useState<OwnerView>("orders")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Track previous view to detect when owner leaves orders view
  const previousViewRef = useRef<OwnerView>(currentView)

  // Query unread message count
  const unreadMessageCount = useQuery(api.chat.getUnreadCount) ?? 0
  
  // Query new orders count (orders created after owner last viewed orders page)
  const newOrdersCount = useQuery(api.orders.getNewOrdersCount) ?? 0
  
  // Mutation to mark orders as viewed when owner leaves orders view
  const markOrdersAsViewed = useMutation(api.orders.markOrdersAsViewed)
  
  // Mark orders as viewed when owner navigates away from orders view
  useEffect(() => {
    // If owner was on orders view and now navigated to a different view, mark orders as viewed
    if (previousViewRef.current === "orders" && currentView !== "orders") {
      markOrdersAsViewed().catch((error) => {
        // Silently handle errors (e.g., if user is not authenticated)
        console.error("Failed to mark orders as viewed:", error)
      })
    }
    
    // Update previous view reference
    previousViewRef.current = currentView
  }, [currentView, markOrdersAsViewed])

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
        newOrdersCount={newOrdersCount}
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
          {currentView === "total-monitoring" && <TotalMonitoringView />} {/* Added total monitoring view */}
        </main>
      </div>
    </div>
  )
}
