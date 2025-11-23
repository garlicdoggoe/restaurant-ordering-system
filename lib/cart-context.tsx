"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

// Cart item interface
export interface CartItem {
  id: string // unique cart line id (may include variant)
  menuItemId: string // original menu item id
  name: string
  price: number
  quantity: number
  // Optional variant display info
  size?: string
  variantId?: string
  // Selected choices from choice groups - stores choice data directly (maps choiceGroupId -> { name: string, price: number })
  selectedChoices?: Record<string, { name: string; price: number }>
  // Bundle items - for bundle menu items, stores the actual items included (selected from choice groups + fixed items)
  bundleItems?: Array<{ menuItemId: string; variantId?: string; name: string; price: number }>
}

// Cart context interface
interface CartContextType {
  cartItems: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  clearCartFromStorage: () => void
  getCartItemCount: () => number
  getCartTotal: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Local storage key for cart persistence
const CART_STORAGE_KEY = "bpcp-cart"

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Load cart from localStorage on component mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        // Validate that the parsed data is an array of cart items
        if (Array.isArray(parsedCart)) {
          setCartItems(parsedCart)
        }
      }
    } catch {
      // If there's an error parsing, clear the localStorage
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [])

  // Save cart to localStorage whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [cartItems])

  // Add item to cart or increase quantity if already exists
  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id)
      if (existingItem) {
        // If item already exists, increase quantity
        return prevItems.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      } else {
        // If item doesn't exist, add it with quantity 1
        return [...prevItems, { ...item, quantity: 1 }]
      }
    })
  }, [])

  // Update quantity of an item in the cart
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      setCartItems(prevItems => prevItems.filter(i => i.id !== itemId))
    } else {
      // Update the quantity
      setCartItems(prevItems => 
        prevItems.map(i => 
          i.id === itemId 
            ? { ...i, quantity }
            : i
        )
      )
    }
  }, [])

  // Remove an item from the cart
  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prevItems => prevItems.filter(i => i.id !== itemId))
  }, [])

  // Clear all items from the cart
  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  // Clear cart from localStorage (for sign out)
  const clearCartFromStorage = useCallback(() => {
    setCartItems([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [])

  // Get total number of items in cart
  const getCartItemCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }, [cartItems])

  // Get total price of all items in cart
  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [cartItems])

  const value: CartContextType = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearCartFromStorage,
    getCartItemCount,
    getCartTotal,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
