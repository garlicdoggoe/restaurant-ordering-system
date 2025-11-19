"use client"

import { useState, useMemo } from "react"
import { CustomerSidebar } from "./customer-sidebar"
import { CustomerTopNav } from "./customer-top-nav"
import { MenuBrowser } from "./menu-browser"
import { Cart } from "./cart"
import { OrderHistory } from "./order-history"
import { PreOrdersView } from "./pre-orders-view"
import { ActiveOrdersView } from "./active-orders-view"
import { UserProfileSettings } from "./user-profile-settings"
import { InboxView } from "./inbox-view"
import { OrderTracking } from "./order-tracking"
import { StickyOrderStatus } from "./sticky-order-status"
import { WebsiteInquiryView } from "./website-inquiry-view"
import { OnboardingTrigger } from "./onboarding-trigger"
import { OnboardingHelper } from "./onboarding-helper"
import { useData } from "@/lib/data-context"
import { useCart, type CartItem } from "@/lib/cart-context"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export type CustomerView = "menu" | "orders" | "profile" | "preorders" | "inbox" | "activeorders" | "inquiry"

export function CustomerInterface() {
  const [currentView, setCurrentView] = useState<CustomerView>("menu")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // State to track orderId to auto-open chat when navigating to inbox
  const [orderIdToOpen, setOrderIdToOpen] = useState<string | null>(null)
  const { getCustomerActiveOrder, orders, currentUser } = useData()
  const { cartItems, addToCart: addToCartContext, updateQuantity, clearCart, getCartItemCount } = useCart()
  const customerId = currentUser?._id || ""
  const activeOrder = customerId ? getCustomerActiveOrder(customerId) : undefined

  // Query unread message count
  const unreadMessageCount = useQuery(api.chat.getUnreadCount) ?? 0

  // Get all customer orders to find the most recent unread message
  const allCustomerOrders = useMemo(() => 
    orders.filter((o) => o.customerId === customerId), 
    [orders, customerId]
  )
  const allOrderIds = useMemo(() => 
    allCustomerOrders.map((o) => o._id as string), 
    [allCustomerOrders]
  )
  
  // Get per-order unread stats to find the order with most recent unread message
  const perOrderStatsQuery = useQuery(
    api.chat.getPerOrderUnreadAndLast, 
    allOrderIds.length ? { orderIds: allOrderIds } : "skip"
  )
  const perOrderStats = useMemo(() => perOrderStatsQuery ?? [], [perOrderStatsQuery])
  
  // Find the order with the most recent unread message
  // Filter orders with unread messages and find the one with the latest lastMessage timestamp
  const mostRecentUnreadOrderId = useMemo(() => {
    const unreadOrders = perOrderStats.filter((stat) => stat.unreadCount > 0)
    if (unreadOrders.length === 0) return null
    
    // Sort by last message timestamp (most recent first)
    const sorted = unreadOrders.sort((a, b) => {
      const timestampA = a.lastMessage?.timestamp ?? 0
      const timestampB = b.lastMessage?.timestamp ?? 0
      return timestampB - timestampA
    })
    
    return sorted[0]?.orderId ?? null
  }, [perOrderStats])

  // Function to navigate to inbox and open chat for a specific order
  const navigateToInboxWithOrder = (orderId: string) => {
    setOrderIdToOpen(orderId)
    setCurrentView("inbox")
  }

  const addToCart = (item: Omit<CartItem, "quantity">, quantity: number = 1, suppressToast: boolean = false) => {
    if (activeOrder) {
      toast.info("You have an active order", {
        description: "Please wait for your current order to be completed, denied, or cancelled before adding new items.",
        duration: 3000,
      })
      return
    }
    
    // Add the item(s) to cart multiple times if quantity > 1
    // addToCartContext adds 1 at a time, so we call it 'quantity' times
    for (let i = 0; i < quantity; i++) {
      addToCartContext(item)
    }
    
    // Only show toast if not suppressed
    if (!suppressToast) {
      // Show a single toast notification with the item name and quantity
      // If item already existed in cart, show total quantity; otherwise just show added quantity
      const quantityText = quantity > 1 ? `${quantity}` : ""
      toast.success("Added to cart", {
        description: `${quantityText ? `${quantityText} ` : ""}${item.name || "Item"} has been added to your cart.`,
        duration: 3000,
      })
    }
  }

  // Customer pre-orders (pre-order-pending, pending, or accepted pre-orders)
  const customerPreOrders = orders.filter((o) => o.customerId === customerId && o.orderType === "pre-order" && (o.status === "pre-order-pending" || o.status === "pending" || o.status === "accepted"))
  const preOrdersCount = customerPreOrders.length

  // Active orders count - regular orders: pending, accepted, ready, in-transit, denied
  // Pre-orders: accepted, ready, in-transit, denied (exclude pending)
  const activeOrdersCount = orders.filter((o) => {
    if (o.customerId !== customerId) return false
    const regularActiveStatuses = ["pending", "accepted", "ready", "in-transit", "denied"]
    const preOrderActiveStatuses = ["accepted", "ready", "in-transit", "denied"]
    if (o.orderType === "pre-order") {
      return preOrderActiveStatuses.includes(o.status)
    } else {
      return regularActiveStatuses.includes(o.status)
    }
  }).length

  const cartItemCount = activeOrder ? 0 : getCartItemCount()

  // State to track notification visibility for dynamic padding adjustment
  const [isNotificationVisible, setIsNotificationVisible] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Onboarding Trigger - Auto-starts tour for new customers */}
      <OnboardingTrigger />
      
      {/* Onboarding Helper - Manages visibility and navigation during tour */}
      <OnboardingHelper
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
      />
      
      {/* Top Navigation Bar - Mobile Only */}
      <CustomerTopNav
        currentView={currentView}
        cartItemCount={cartItemCount}
        unreadMessageCount={unreadMessageCount}
        mostRecentUnreadOrderId={mostRecentUnreadOrderId}
        onToggleSidebar={() => setIsMobileMenuOpen(true)}
        onToggleCart={() => setIsCartOpen(true)}
        onNavigateToInbox={navigateToInboxWithOrder}
        onNavigateToInboxTab={() => setCurrentView("inbox")}
        onNotificationVisibilityChange={setIsNotificationVisible}
      />

      {/* Left Sidebar */}
      <CustomerSidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        cartItemCount={cartItemCount}
        preOrdersCount={preOrdersCount}
        activeOrdersCount={activeOrdersCount}
        unreadMessageCount={unreadMessageCount}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      {/* 
        Dynamic padding calculation:
        - Mobile: pt-14 (56px) for nav bar base padding
        - When notification is visible: pt-[104px] (56px nav + 48px notification = h-12)
        - Desktop: no padding (lg:pt-0)
        Notification banner is h-12 (48px) for consistent single-line display
        Padding automatically adjusts based on notification visibility state
      */}
      <div 
        className={`flex-1 min-w-0 lg:pt-0 transition-[padding-top] duration-200 ease-in-out ${
          isNotificationVisible ? 'pt-[104px]' : 'pt-14'
        }`}
      >
        {currentView === "menu" ? (
          <div className="flex h-full">
            {/* Menu Content */}
            <div className="flex-1 p-4 lg:p-6 min-w-0 overflow-x-auto">
              <MenuBrowser onAddToCart={addToCart} />
            </div>
            
            {/* Right Cart Sidebar - Desktop */}
            <div className="hidden lg:block w-96 border-l bg-background flex-shrink-0">
              <div className="sticky top-0 max-h-screen overflow-y-auto p-6">
                {activeOrder ? (
                  <OrderTracking orderId={activeOrder._id} />
                ) : (
                  <Cart 
                    items={cartItems} 
                    onUpdateQuantity={updateQuantity} 
                    onClearCart={clearCart} 
                    onOpenSettings={() => setCurrentView("profile")}
                    onNavigateToView={(view) => {
                      setCurrentView(view)
                      setIsCartOpen(false)
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ) : currentView === "orders" ? (
          <div className="p-3 xs:p-6">
            <OrderHistory 
              onBackToMenu={() => setCurrentView("menu")} 
              onNavigateToInbox={navigateToInboxWithOrder}
            />
          </div>
        ) : currentView === "preorders" ? (
          <div className="p-3 xs:p-6">
            <PreOrdersView 
              onNavigateToInbox={navigateToInboxWithOrder}
            />
          </div>
        ) : currentView === "activeorders" ? (
          <div className="p-3 xs:p-6">
            <ActiveOrdersView 
              onBackToMenu={() => setCurrentView("menu")} 
              onNavigateToInbox={navigateToInboxWithOrder}
            />
          </div>
        ) : currentView === "inbox" ? (
          <div className="p-3 xs:p-6">
            <InboxView orderIdToOpen={orderIdToOpen} onOrderOpened={() => setOrderIdToOpen(null)} />
          </div>
        ) : currentView === "inquiry" ? (
          <div className="p-3 xs:p-6">
            <WebsiteInquiryView />
          </div>
        ) : (
          <div className="p-3 xs:p-6">
            <UserProfileSettings />
          </div>
        )}
      </div>

      {/* Mobile Cart Overlay */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setIsCartOpen(false)} />
      )}

      {/* Mobile Cart Drawer */}
      <div 
        id="onboarding-cart-mobile"
        className={`
        lg:hidden fixed right-0 top-0 h-full w-80 xs:w-96 bg-background border-l z-50
        transform transition-transform duration-300 ease-in-out
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Close button for mobile cart */}
          <div className="flex justify-end p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer hover:bg-yellow-100"
              onClick={() => setIsCartOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Cart content */}
          <div className="flex-1 overflow-y-auto p-3 xs:p-6">
            <Cart 
              items={cartItems} 
              onUpdateQuantity={updateQuantity} 
              onClearCart={clearCart} 
              onOpenSettings={() => setCurrentView("profile")}
              onNavigateToView={(view) => {
                setCurrentView(view)
                setIsCartOpen(false)
              }}
            />
          </div>
        </div>
      </div>

      {/* Sticky Order Status - Mobile Only */}
      <StickyOrderStatus customerId={customerId} />

    </div>
  )
}
