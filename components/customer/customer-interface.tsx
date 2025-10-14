"use client"

import { useState } from "react"
import { CustomerHeader } from "./customer-header"
import { MenuBrowser } from "./menu-browser"
import { Cart } from "./cart"
import { OrderHistory } from "./order-history"

export type CustomerView = "menu" | "orders"

export function CustomerInterface() {
  const [currentView, setCurrentView] = useState<CustomerView>("menu")
  const [cartItems, setCartItems] = useState<any[]>([])

  const addToCart = (item: any) => {
    const existingItem = cartItems.find((i) => i.id === item.id)
    if (existingItem) {
      setCartItems(cartItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }])
    }
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter((i) => i.id !== itemId))
    } else {
      setCartItems(cartItems.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
    }
  }

  const clearCart = () => {
    setCartItems([])
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader currentView={currentView} onViewChange={setCurrentView} cartItemCount={cartItems.length} />

      <div className="container mx-auto p-6">
        {currentView === "menu" ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MenuBrowser onAddToCart={addToCart} />
            </div>
            <div className="lg:col-span-1">
              <Cart items={cartItems} onUpdateQuantity={updateQuantity} onClearCart={clearCart} />
            </div>
          </div>
        ) : (
          <OrderHistory />
        )}
      </div>
    </div>
  )
}
