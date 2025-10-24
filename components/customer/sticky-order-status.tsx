"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  ChevronUp,
  ChevronDown,
  Pizza
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { OrderTracking } from "./order-tracking"
import { CookingAnimation } from "@/components/ui/cooking-animation"

interface StickyOrderStatusProps {
  customerId: string
}

// Component for displaying estimated prep time
function PrepTimeDisplay({ estimatedPrepTime, orderStatus, orderType }: { estimatedPrepTime?: number; orderStatus: string; orderType: string }) {
  if (!estimatedPrepTime || orderStatus === "ready" || orderStatus === "in-transit" || orderType === "pre-order") return null

  // Calculate time range: <estimatedPrepTime - 5> - <estimatedPrepTime>
  const minTime = Math.max(0, estimatedPrepTime - 5)
  const maxTime = estimatedPrepTime

  return (
    <div className="text-xs text-gray-600 mt-1">
      <Clock className="w-3 h-3 inline mr-1" />
      Estimated: {minTime}-{maxTime} minutes
    </div>
  )
}

export function StickyOrderStatus({ customerId }: StickyOrderStatusProps) {
  const { getCustomerActiveOrder } = useData()
  const [isVisible, setIsVisible] = useState(true)
  const [showToggle, setShowToggle] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrollingDown, setIsScrollingDown] = useState(false)

  // Scroll detection hook
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Scrolling down and past 100px
      if (!isScrollingDown) {
        setIsScrollingDown(true)
        setIsVisible(false)
        setShowToggle(true)
      }
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up
      if (isScrollingDown) {
        setIsScrollingDown(false)
        setIsVisible(true)
        setShowToggle(false)
      }
    }
    
    setLastScrollY(currentScrollY)
  }, [lastScrollY, isScrollingDown])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const activeOrder = customerId ? getCustomerActiveOrder(customerId) : undefined

  // Don't show for pre-orders in pending status or inactive statuses
  if (!customerId || !activeOrder || 
      (activeOrder.orderType === "pre-order" && activeOrder.status === "pending") ||
      !["pending", "accepted", "ready", "in-transit"].includes(activeOrder.status)) {
    return null
  }

  // Status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="w-10 h-10 text-yellow-600" />,
          title: "Waiting for store to check the order",
          description: "Your order has been received and is awaiting confirmation from the store.",
          bgColor: "bg-white",
          borderColor: "border-yellow-400",
          textColor: "text-yellow-800"
        }
      case "accepted":
        return {
          icon: <CookingAnimation size="md" />,
          title: "Order being prepared",
          description: "Your order has been accepted and is now being prepared by our kitchen team.",
          bgColor: "bg-white",
          borderColor: "border-yellow-400",
          textColor: "text-orange-800"
        }
      case "ready":
        return {
          icon: <CheckCircle className="w-10 h-10 text-green-600" />,
          title: "Order is ready",
          description: "Your order is ready for pickup",
          bgColor: "bg-white",
          borderColor: "border-yellow-400",
          textColor: "text-green-800"
        }
      case "in-transit":
        return {
          icon: <Truck className="w-10 h-10 text-blue-600" />,
          title: "Rider is on the way",
          description: "Your order is on its way! The rider is heading to your location.",
          bgColor: "bg-white",
          borderColor: "border-yellow-400",
          textColor: "text-blue-800"
        }
      default:
        return {
          icon: <Clock className="w-10 h-10 text-gray-600" />,
          title: "Order Status",
          description: "Your order status is being updated.",
          bgColor: "bg-white",
          borderColor: "border-yellow-400",
          textColor: "text-gray-800"
        }
    }
  }

  const statusConfig = getStatusConfig(activeOrder.status)

  const handleToggle = () => {
    setIsVisible(!isVisible)
    setShowToggle(false)
  }

  return (
    <>
      {/* Sticky Order Status Component */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div 
          className={`transform transition-transform duration-300 ease-in-out ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <Card 
            className={`mx-4 mb-4 ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-t-xl shadow-lg`}
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {statusConfig.icon}
                </div>
                
                {/* Status Text */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-fluid-xs mb-[-5px] ${statusConfig.textColor}`}>
                    {statusConfig.title}
                  </h3>
                  <p className="text-[12px] text-gray-600 mt-1 line-clamp-2">
                    {statusConfig.description}
                  </p>
                  {/* Estimated prep time for all orders */}
                  <PrepTimeDisplay estimatedPrepTime={activeOrder.estimatedPrepTime} orderStatus={activeOrder.status} orderType={activeOrder.orderType} />
                </div>
              </div>
              
              {/* Progress indicator for accepted status - positioned under status text
              {activeOrder.status === "accepted" && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2 relative">
                    <div className="bg-orange-500 h-2 rounded-full animate-pulse relative" style={{ width: '33%' }}>
                      <span className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 text-sm">🍕</span>
                    </div>
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Toggle Button */}
      {showToggle && (
        <Button
          onClick={handleToggle}
          className="lg:hidden fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-yellow-400 border-2 border-yellow-500"
          size="icon"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      )}

      {/* Full Order Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {activeOrder && (
            <OrderTracking orderId={activeOrder._id} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
