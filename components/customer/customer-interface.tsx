"use client"

import { useState } from "react"
import { CustomerHeader } from "./customer-header"
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
    <div className="min-h-screen bg-background">
      <CustomerHeader currentView={currentView} onViewChange={setCurrentView} cartItemCount={pendingOrder ? 0 : getCartItemCount()} />

      {currentView === "menu" ? (
        <div className="w-full p-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <MenuBrowser onAddToCart={addToCart} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              {pendingOrder ? (
                <PendingOrder orderId={pendingOrder._id} />
              ) : (
                <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <OrderHistory />
      )}
    </div>
  )
}
