"use client"

import { useState } from "react"
import { CustomerSidebar } from "./customer-sidebar"
import { MenuBrowser } from "./menu-browser"
import { Cart } from "./cart"
import { OrderHistory } from "./order-history"
import { PendingOrder } from "./pending-order"
import { useData } from "@/lib/data-context"
import { useCart } from "@/lib/cart-context"
import { toast } from "sonner"

export type CustomerView = "menu" | "orders"

export function CustomerInterface() {
  const [currentView, setCurrentView] = useState<CustomerView>("menu")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { getCustomerPendingOrder, orders, currentUser } = useData()
  const { cartItems, addToCart: addToCartContext, updateQuantity, clearCart, getCartItemCount } = useCart()
  const customerId = currentUser?._id || ""
  const pendingOrder = customerId ? getCustomerPendingOrder(customerId) : undefined

  const addToCart = (item: any) => {
    if (pendingOrder) {
      toast.info("You have a pending order", {
        description: "Please wait for the restaurant to accept or deny before adding new items.",
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
      {/* Left Sidebar */}
      <CustomerSidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        cartItemCount={pendingOrder ? 0 : getCartItemCount()}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {currentView === "menu" ? (
          <div className="flex h-full">
            {/* Menu Content */}
            <div className="flex-1 p-6 min-w-0 overflow-x-auto">
              <MenuBrowser onAddToCart={addToCart} />
            </div>
            
            {/* Right Cart Sidebar - Desktop */}
            <div className="hidden lg:block w-96 border-l bg-background flex-shrink-0">
              <div className="sticky top-0 max-h-screen overflow-y-auto p-6">
                {pendingOrder ? (
                  <PendingOrder orderId={pendingOrder._id} />
                ) : (
                  <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <OrderHistory onBackToMenu={() => setCurrentView("menu")} />
          </div>
        )}
      </div>

      {/* Mobile Cart Overlay */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setIsCartOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-96 bg-background border-l" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {pendingOrder ? (
                <PendingOrder orderId={pendingOrder._id} />
              ) : (
                <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
