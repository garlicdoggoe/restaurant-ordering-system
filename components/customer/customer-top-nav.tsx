"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Menu, ShoppingCart, X } from "lucide-react"
import type { CustomerView } from "./customer-interface"
import { useState, useEffect, useRef } from "react"

interface CustomerTopNavProps {
  currentView: CustomerView
  cartItemCount: number
  unreadMessageCount: number
  mostRecentUnreadOrderId: string | null
  onToggleSidebar: () => void
  onToggleCart: () => void
  onNavigateToInbox: (orderId: string) => void
  onNavigateToInboxTab?: () => void
  onNotificationVisibilityChange?: (isVisible: boolean) => void
}

// Map current view to page title
const pageTitles: Record<CustomerView, string> = {
  menu: "Menu",
  preorders: "Pre-Orders",
  activeorders: "Active Orders",
  orders: "Order History",
  inbox: "Inbox",
  profile: "Profile Settings"
}

export function CustomerTopNav({
  currentView,
  cartItemCount,
  unreadMessageCount,
  mostRecentUnreadOrderId,
  onToggleSidebar,
  onToggleCart,
  onNavigateToInbox,
  onNavigateToInboxTab,
  onNotificationVisibilityChange
}: CustomerTopNavProps) {
  const pageTitle = pageTitles[currentView]
  // State to control notification banner visibility (can be dismissed)
  const [isNotificationVisible, setIsNotificationVisible] = useState(true)
  // Track previous unread count to detect new messages
  const prevUnreadCountRef = useRef(unreadMessageCount)
  // Track previous view to detect navigation from inbox
  const prevViewRef = useRef<CustomerView>(currentView)

  // Reset notification visibility when new messages arrive
  // This ensures the notification appears again when user receives new messages after dismissing it
  useEffect(() => {
    // If unread count increased, show notification again
    if (unreadMessageCount > prevUnreadCountRef.current) {
      setIsNotificationVisible(true)
    }
    // Update the ref to track the current count
    prevUnreadCountRef.current = unreadMessageCount
  }, [unreadMessageCount])

  // Reset notification visibility when navigating away from inbox
  // This ensures the notification shows again when user navigates away from inbox if there are unread messages
  useEffect(() => {
    // If we were on inbox and now we're not, reset visibility
    if (prevViewRef.current === "inbox" && currentView !== "inbox" && unreadMessageCount > 0) {
      setIsNotificationVisible(true)
    }
    // Update the ref to track the current view
    prevViewRef.current = currentView
  }, [currentView, unreadMessageCount])

  // Determine if notification should be shown
  // Only show if there are unread messages, we have an order ID, and user hasn't dismissed it
  // Also don't show if we're already on the inbox view
  const shouldShowNotification = 
    unreadMessageCount > 0 && 
    mostRecentUnreadOrderId !== null && 
    isNotificationVisible &&
    currentView !== "inbox"

  // Notify parent component about notification visibility changes for padding adjustment
  useEffect(() => {
    onNotificationVisibilityChange?.(shouldShowNotification)
  }, [shouldShowNotification, onNotificationVisibilityChange])

  // Handle notification click - navigate to inbox tab (not a specific order chat)
  const handleNotificationClick = () => {
    // Navigate to inbox tab without opening a specific order
    if (onNavigateToInboxTab) {
      onNavigateToInboxTab()
    } else {
      // Fallback: if callback not provided, navigate to inbox with most recent order
      // This maintains backward compatibility but shouldn't be needed
      if (mostRecentUnreadOrderId) {
        onNavigateToInbox(mostRecentUnreadOrderId)
      }
    }
    setIsNotificationVisible(false) // Hide notification after clicking
  }

  return (
    <>
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Burger menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer hover:bg-yellow-100"
            onClick={onToggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Center: Page title */}
          <h1 className="text-fluid-lg mt-[2px] font-semibold text-foreground text-center flex-1">
            {pageTitle}
          </h1>

          {/* Right: Cart button with badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative cursor-pointer hover:bg-yellow-100"
            onClick={onToggleCart}
          >
            <ShoppingCart className="h-6 w-6" />
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[11px] font-bold bg-destructive text-destructive-foreground">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </nav>

      {/* Message Notification Banner - appears below nav bar when there are unread messages */}
      {shouldShowNotification && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-blue-600 text-white shadow-md">
          <div 
            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-blue-700 transition-colors h-12"
            onClick={handleNotificationClick}
          >
            {/* Left: Message text in single line */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {unreadMessageCount === 1 
                  ? "You have 1 new message - Tap to view" 
                  : `You have ${unreadMessageCount} new messages - Tap to view`}
              </p>
            </div>

            {/* Right: Close button */}
            <div className="flex items-center flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-blue-700 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation() // Prevent triggering the parent click handler
                  setIsNotificationVisible(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

