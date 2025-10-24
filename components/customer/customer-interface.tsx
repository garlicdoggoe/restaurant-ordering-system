"use client"

import { useState } from "react"
import { CustomerSidebar } from "./customer-sidebar"
import { MenuBrowser } from "./menu-browser"
import { Cart } from "./cart"
import { OrderHistory } from "./order-history"
import { UserProfileSettings } from "./user-profile-settings"
import { OrderTracking } from "./order-tracking"
import { StickyOrderStatus } from "./sticky-order-status"
import { useData } from "@/lib/data-context"
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { X, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type CustomerView = "menu" | "orders" | "profile"

export function CustomerInterface() {
  const [currentView, setCurrentView] = useState<CustomerView>("menu")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { getCustomerActiveOrder, orders, currentUser } = useData()
  const { cartItems, addToCart: addToCartContext, updateQuantity, clearCart, getCartItemCount } = useCart()
  const customerId = currentUser?._id || ""
  const activeOrder = customerId ? getCustomerActiveOrder(customerId) : undefined

  const addToCart = (item: any) => {
    if (activeOrder) {
      toast.info("You have an active order", {
        description: "Please wait for your current order to be completed, denied, or cancelled before adding new items.",
        duration: 3000,
      })
      return
    }
    // Use the cart context's addToCart method
    addToCartContext(item)
  }

  // Customer pre-orders (pending or accepted pre-orders)
  const customerPreOrders = orders.filter((o) => o.customerId === customerId && o.orderType === "pre-order" && (o.status === "pending" || o.status === "accepted"))

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile cart toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 right-4 z-50 cursor-pointer hover:bg-yellow-100 bg-white rounded-lg shadow-md"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingCart className="h-6 w-6" />
        {cartItems.length > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
            {cartItems.length}
          </Badge>
        )}
      </Button>

      {/* Left Sidebar */}
      <CustomerSidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        cartItemCount={activeOrder ? 0 : getCartItemCount()}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
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
                  <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} onOpenSettings={() => setCurrentView("profile")} />
                )}
              </div>
            </div>
          </div>
        ) : currentView === "orders" ? (
          <div className="p-3 xs:p-6">
            <OrderHistory onBackToMenu={() => setCurrentView("menu")} />
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
      <div className={`
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
            <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} onOpenSettings={() => setCurrentView("profile")} />
          </div>
        </div>
      </div>

      {/* Sticky Order Status - Mobile Only */}
      <StickyOrderStatus customerId={customerId} />

    </div>
  )
}
