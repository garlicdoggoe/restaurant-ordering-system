"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, MapPin, ShoppingBag, Edit, Plus, Minus, Trash2, Check, X } from "lucide-react"
import { type Order, type OrderItem, useData } from "@/lib/data-context"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DeliveryMap } from "@/components/ui/delivery-map"
import { DeliveryMapModal } from "@/components/ui/delivery-map-modal"
import { PaymentModal } from "@/components/ui/payment-modal"
import { AddOrderItemDialog } from "@/components/owner/add-order-item-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { BundleItemsList } from "@/components/shared/bundle-items-list"
import {
  isDeliveryOrder as isDeliveryOrderUtil,
  getOrderTypePrefix,
  getStatusIcon,
  ORDER_STATUS_COLORS,
  getStatusLabel,
} from "@/lib/order-utils"

interface OrderCardBaseProps {
  order: Order
  isExpanded: boolean
  onToggleExpand: () => void
  // Optional cancellation notice to display
  cancellationNotice?: string | null
  // Optional delivery coordinates for map display [lng, lat]
  deliveryCoordinates?: [number, number] | null
  // Children to render as action buttons (customer or owner specific)
  actionButtons?: React.ReactNode
  // Whether to show delivery map (default: true for delivery orders)
  showDeliveryMap?: boolean
  // Optional button to show below status indicator (for owner edit status button)
  statusActionButton?: React.ReactNode
}

export function OrderCardBase({
  order,
  isExpanded,
  onToggleExpand,
  cancellationNotice,
  deliveryCoordinates,
  actionButtons,
  showDeliveryMap = true,
  statusActionButton,
}: OrderCardBaseProps) {
  // Calculate total item count by quantity so we can surface it up front
  const totalItemCount = order.items.reduce((sum: number, item) => sum + item.quantity, 0)
  
  // Determine order type prefix
  const orderTypePrefix = getOrderTypePrefix(order.orderType)
  
  // Get delivery fee from order (already calculated and stored)
  const isDeliveryOrder = isDeliveryOrderUtil(order)

  // Determine coordinates for map: use provided coordinates > order's stored coordinates > null
  // Order's customerCoordinates are stored at order creation time (isolated per order)
  const mapCoordinates = deliveryCoordinates || 
    (order.customerCoordinates 
      ? [order.customerCoordinates.lng, order.customerCoordinates.lat] as [number, number]
      : null)

  // Track which proof is currently previewed inside the reusable payment modal
  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    open: boolean
    title: string
    paymentUrl: string | null
    downpaymentUrl: string | null
  }>({
    open: false,
    title: "",
    paymentUrl: null,
    downpaymentUrl: null,
  })

  // Track map modal state
  const [mapModalOpen, setMapModalOpen] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedItems, setEditedItems] = useState<OrderItem[]>([])
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  
  // Scheduled date edit state
  const [isEditingScheduledDate, setIsEditingScheduledDate] = useState(false)
  const [editedScheduledDate, setEditedScheduledDate] = useState<string>("")
  
  // Confirmation dialog states
  const [showConfirmItemsDialog, setShowConfirmItemsDialog] = useState(false)
  const [showConfirmScheduleDialog, setShowConfirmScheduleDialog] = useState(false)

  // Get updateOrderItems, updateOrder, and other functions from data context
  const { updateOrderItems, updateOrder, currentUser, restaurant, sendMessage } = useData()
  
  // Mutations for creating modification logs
  const createOrderModificationMut = useMutation(api.order_modifications.create)

  // Determine if order can be edited (same conditions as order-details.tsx)
  const canEditOrder = order.status === "pending" || order.status === "accepted" || order.status === "pre-order-pending"

  // Helper to open the modal with context-specific data
  const showPaymentModal = (config: { title: string; paymentUrl: string | null; downpaymentUrl?: string | null }) => {
    setPaymentModalConfig({
      open: true,
      title: config.title,
      paymentUrl: config.paymentUrl,
      downpaymentUrl: config.downpaymentUrl ?? null,
    })
  }

  // Payment proof display combinations reused in multiple spots
  const hasPrimaryProofs = Boolean(order.paymentScreenshot || order.downpaymentProofUrl)
  const hasRemainingProof = Boolean(order.remainingPaymentProofUrl)
  const balanceSettled = Boolean(order.remainingPaymentProofUrl)

  // Scheduled label for pre-orders
  const scheduledLabel = order.preOrderScheduledAt
    ? new Date(order.preOrderScheduledAt).toLocaleString()
    : null

  // Text label for fulfillment mode so we can surface it in collapsed view immediately
  const fulfillmentLabel = (() => {
    if (order.orderType === "delivery") return "Delivery"
    if (order.orderType === "dine-in") return "Dine-in"
    if (order.orderType === "takeaway") return "Takeaway"
    if (order.orderType === "pre-order") {
      return order.preOrderFulfillment === "delivery" ? "Pre-order Delivery" : "Pre-order Pickup"
    }
    return "Pickup"
  })()

  // Helper to convert timestamp to datetime-local string format
  const timestampToDatetimeLocal = (timestamp: number | undefined): string => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    // Format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Helper to convert datetime-local string to timestamp
  const datetimeLocalToTimestamp = (datetimeLocal: string): number | null => {
    if (!datetimeLocal) return null
    const date = new Date(datetimeLocal)
    return isNaN(date.getTime()) ? null : date.getTime()
  }

  // Handle scheduled date edit
  const handleEditScheduledDate = () => {
    if (order.preOrderScheduledAt) {
      setEditedScheduledDate(timestampToDatetimeLocal(order.preOrderScheduledAt))
    } else {
      // If no scheduled date exists, set to current date/time
      setEditedScheduledDate(timestampToDatetimeLocal(Date.now()))
    }
    setIsEditingScheduledDate(true)
  }

  const handleCancelScheduledDateEdit = () => {
    setIsEditingScheduledDate(false)
    setEditedScheduledDate("")
  }

  // Show confirmation dialog before saving scheduled date
  const handleSaveScheduledDateClick = () => {
    const newScheduledTimestamp = datetimeLocalToTimestamp(editedScheduledDate)
    const oldScheduledTimestamp = order.preOrderScheduledAt || null
    
    // Only proceed if the date actually changed
    if (newScheduledTimestamp === oldScheduledTimestamp) {
      setIsEditingScheduledDate(false)
      setEditedScheduledDate("")
      return
    }
    
    setShowConfirmScheduleDialog(true)
  }

  // Actually save the scheduled date after confirmation
  const handleSaveScheduledDate = async () => {
    const newScheduledTimestamp = datetimeLocalToTimestamp(editedScheduledDate)
    const oldScheduledTimestamp = order.preOrderScheduledAt || null
    
    // Only proceed if the date actually changed
    if (newScheduledTimestamp === oldScheduledTimestamp) {
      setIsEditingScheduledDate(false)
      setEditedScheduledDate("")
      return
    }
    
    try {
      // Update the order
      await updateOrder(order._id, {
        preOrderScheduledAt: newScheduledTimestamp || undefined,
      })
      
      // Create modification log entry
      if (currentUser) {
        const previousValue = JSON.stringify({
          preOrderScheduledAt: oldScheduledTimestamp,
        })
        const newValue = JSON.stringify({
          preOrderScheduledAt: newScheduledTimestamp,
        })
        
        // Format dates in a way that won't be auto-linked by chat linkify function
        // Use a format without leading slashes to avoid path pattern matching
        const formatDateForChat = (timestamp: number | null): string => {
          if (!timestamp) return "Not set"
          const date = new Date(timestamp)
          // Format as: "MM-DD-YYYY at HH:MM AM/PM" (using dashes instead of slashes to avoid any path matching)
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          const year = date.getFullYear()
          const hours = date.getHours()
          const minutes = String(date.getMinutes()).padStart(2, "0")
          const ampm = hours >= 12 ? "PM" : "AM"
          const displayHours = hours % 12 || 12
          return `${month}-${day}-${year} at ${displayHours}:${minutes} ${ampm}`
        }
        
        const oldDateStr = formatDateForChat(oldScheduledTimestamp)
        const newDateStr = formatDateForChat(newScheduledTimestamp)
        
        await createOrderModificationMut({
          orderId: order._id as Id<"orders">,
          modifiedBy: currentUser._id,
          modifiedByName: `${currentUser.firstName} ${currentUser.lastName}`,
          modificationType: "order_edited",
          previousValue,
          newValue,
          itemDetails: `Scheduled date changed from ${oldDateStr} to ${newDateStr}`,
        })
        
        // Send automated chat message to customer
        const restaurantName = restaurant?.name || `${currentUser.firstName} ${currentUser.lastName}`
        const dateMessage = newScheduledTimestamp
          ? `Your order scheduled date has been updated to ${newDateStr}.`
          : "Your order scheduled date has been removed."
        
        sendMessage(
          order._id,
          currentUser._id,
          restaurantName,
          "owner",
          dateMessage
        )
      }
      
      setIsEditingScheduledDate(false)
      setEditedScheduledDate("")
    } catch (error) {
      console.error("Failed to update scheduled date:", error)
    }
  }

  // Edit mode handlers
  const handleEditMode = () => {
    setEditedItems([...order.items])
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedItems([])
  }

  // Show confirmation dialog before saving items
  const handleSaveChangesClick = () => {
    if (editedItems.length === 0) return
    setShowConfirmItemsDialog(true)
  }

  // Actually save the changes after confirmation
  const handleSaveChanges = async () => {
    if (editedItems.length === 0) return

    try {
      await updateOrderItems(
        order._id,
        editedItems,
        "order_edited",
        `Modified ${editedItems.length} items`
      )
      setIsEditMode(false)
      setEditedItems([])
    } catch (error) {
      console.error("Failed to update order:", error)
    }
  }

  const handleAddItem = (newItem: OrderItem) => {
    setEditedItems(prev => [...prev, newItem])
    setShowAddItemDialog(false)
  }

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return
    setEditedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index))
  }

  // Calculate totals for edited items
  const calculateTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const platformFee = order.platformFee || 0
    const deliveryFee = order.deliveryFee || 0
    const discount = order.discount || 0
    const total = subtotal + platformFee + deliveryFee - discount
    return { subtotal, platformFee, deliveryFee, discount, total }
  }

  // Use edited items when in edit mode, otherwise use original items
  const currentItems = isEditMode ? editedItems : order.items
  const totals = calculateTotals(currentItems)

  return (
    <Card className="h-fit">
      {/* Header doubles as the expand/collapse control so we no longer use a dialog */}
      <CardHeader 
        className="p-3 xs:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex flex-col mt-[-15px] mb-[-20px] lg:mt-0 lg:mb-0">
          {/* Top Section: Order ID/Name, Status, and Date */}
          <div className="flex items-start justify-between mb-2">
            {/* Left: Order name and ID */}
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold mb-1">
                {orderTypePrefix} #{order._id.slice(-6).toUpperCase()}
              </CardTitle>
              {/* Date below order ID */}
              <p className="text-xs text-muted-foreground">
                {new Date(order._creationTime ?? 0).toLocaleString()}
              </p>
            </div>
            {/* Right: Status with icon and chevron */}
            <div className="flex items-center gap-2">
              <Badge className={`${ORDER_STATUS_COLORS[order.status] || "text-yellow-600"} flex items-center gap-1 text-xs !bg-transparent !border-0 !p-0 hover:!bg-transparent`} variant="outline">
                {getStatusIcon(order.status)}
                <span className="capitalize">{getStatusLabel(order.status)}</span>
              </Badge>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Status Action Button - shown below status indicator (e.g., Edit Status for owners) */}
          {statusActionButton && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {statusActionButton}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 xs:p-4 space-y-4 border-t">
        {/* Summary content is always visible so owners no longer need a modal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Order Items</h4>
            {!isEditMode && (
              <span className="text-xs text-muted-foreground">{totalItemCount} items</span>
            )}
            <div className="flex items-center gap-2">
              {!isEditMode && canEditOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditMode()
                  }}
                  className="gap-2 h-7 text-xs"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <Separator className="mb-3" />
          {isEditMode ? (
            <div className="space-y-3">
              {currentItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{item.name}</div>
                    {item.variantName && (
                      <div className="text-xs text-muted-foreground">Size: {item.variantName}</div>
                    )}
                    {item.selectedChoices && Object.keys(item.selectedChoices).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(item.selectedChoices).map(([groupId, choice]) => (
                          <div key={groupId}>• {choice.name}</div>
                        ))}
                      </div>
                    )}
                    {item.bundleItems && item.bundleItems.length > 0 && (
                      <BundleItemsList bundleItems={item.bundleItems} compact={true} showPrices={true} />
                    )}
                    <div className="text-xs text-muted-foreground">₱{item.price.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-6 h-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuantityChange(index, item.quantity - 1)
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-xs">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-6 h-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuantityChange(index, item.quantity + 1)
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-6 h-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveItem(index)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="text-right ml-2 min-w-[60px]">
                      <div className="font-medium text-xs">₱{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAddItemDialog(true)
                }}
              >
                <Plus className="w-3 h-3" />
                Add Item
              </Button>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelEdit()
                  }} 
                  className="flex-1 text-xs h-8"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSaveChangesClick()
                  }}
                  disabled={editedItems.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentItems.map((item, idx: number) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    {(item.variantName || item.size) && (
                      <div className="text-xs text-muted-foreground">
                        {item.variantName || item.size}
                      </div>
                    )}
                    {item.selectedChoices && Object.keys(item.selectedChoices).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(item.selectedChoices).map(([groupId, choice]) => (
                          <div key={groupId}>• {choice.name}</div>
                        ))}
                      </div>
                    )}
                    {item.bundleItems && item.bundleItems.length > 0 && (
                      <BundleItemsList bundleItems={item.bundleItems} compact={true} showPrices={true} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                    <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span className={isEditMode ? "text-blue-600" : ""}>
              Total: ₱{totals.total.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{fulfillmentLabel}</span>
          </div>
        </div>

        {/* Quick payment + schedule summary for collapsed view */}
        {(order.paymentPlan || scheduledLabel) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {order.paymentPlan && (
              <div className="rounded-md border p-2 space-y-1">
                <p className="text-muted-foreground text-[11px] uppercase tracking-wide">Payment Plan</p>
                <p className="font-semibold">
                  {order.paymentPlan === "full" ? "Full payment" : "Downpayment"}
                </p>
                {order.paymentPlan === "downpayment" && (
                  <p className={`text-[13px] font-medium ${balanceSettled ? "text-green-600" : "text-amber-600"}`}>
                    {balanceSettled ? "Balance paid" : "Balance pending"}
                  </p>
                )}
              </div>
            )}

            {(scheduledLabel || (canEditOrder && !isExpanded)) && (
              <div className="rounded-md border p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wide">Scheduled for</p>
                  {!isEditingScheduledDate && canEditOrder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditScheduledDate()
                      }}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      <Edit className="w-2.5 h-2.5 mr-0.5" />
                      {order.preOrderScheduledAt ? "Edit" : "Add"}
                    </Button>
                  )}
                </div>
                {isEditingScheduledDate ? (
                  <div className="space-y-1.5">
                    <Input
                      type="datetime-local"
                      value={editedScheduledDate}
                      onChange={(e) => {
                        e.stopPropagation()
                        setEditedScheduledDate(e.target.value)
                      }}
                      className="text-xs h-7"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelScheduledDateEdit()
                        }}
                        className="flex-1 h-6 text-[10px] px-1"
                      >
                        <X className="w-2.5 h-2.5 mr-0.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveScheduledDateClick()
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-6 text-[10px] px-1"
                      >
                        <Check className="w-2.5 h-2.5 mr-0.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  scheduledLabel ? (
                    <p className="font-semibold leading-tight">{scheduledLabel}</p>
                  ) : (
                    canEditOrder && (
                      <p className="text-muted-foreground italic text-xs">No scheduled date</p>
                    )
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Delivery map is part of the base summary for delivery orders */}
        {isDeliveryOrder && showDeliveryMap && order.customerAddress && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Delivery Location</h4>
              {/* Make map clickable to open enlarged modal */}
              <div 
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation() // Prevent card expansion when clicking map
                  setMapModalOpen(true)
                }}
                title="Click to view enlarged map"
              >
                <DeliveryMap
                  address={order.customerAddress}
                  coordinates={mapCoordinates}
                  mapHeightPx={200}
                />
              </div>
            </div>
          </>
        )}

        {/* Expanded content contains the more detailed breakdown plus payment proof */}
        {isExpanded && (
          <>
            {/* Cancellation notice - only relevant while expanded */}
            {cancellationNotice && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <p className="font-medium text-amber-800">
                  ⚠️ {cancellationNotice}
                </p>
              </div>
            )}

            <Separator />

            {/* Payment Breakdown Section */}
            <div>
              <div className="space-y-1 lg:space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className={isEditMode ? "text-blue-600 font-medium" : ""}>
                    ₱{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee</span>
                  <span>₱{totals.platformFee.toFixed(2)}</span>
                </div>
                {totals.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    <span>₱{totals.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount{order.voucherCode ? ` (${order.voucherCode})` : ""}</span>
                    <span>-₱{totals.discount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-sm mb-2">
                <span>TOTAL</span>
                <span className={isEditMode ? "text-blue-600" : ""}>
                  ₱{totals.total.toFixed(2)}
                </span>
              </div>
              {/* Partial payment breakdown */}
              {order.paymentPlan === "downpayment" && order.downpaymentAmount && (
                <>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>50% Downpayment</span>
                      <span className="text-green-600">-₱{order.downpaymentAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-sm">
                    <span>Remaining balance</span>
                    <span className={isEditMode ? "text-blue-600" : ""}>
                      ₱{(totals.total - order.downpaymentAmount).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Payment Proofs Section */}
            {(hasPrimaryProofs || hasRemainingProof) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Payment Proofs</h4>
                <div className="grid gap-3">
                  {hasPrimaryProofs && (
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => showPaymentModal({
                        title: order.paymentScreenshot && order.downpaymentProofUrl ? "Payment Proofs" : "Payment Screenshot",
                        paymentUrl: order.paymentScreenshot || order.downpaymentProofUrl || null,
                        downpaymentUrl: order.paymentScreenshot && order.downpaymentProofUrl ? order.downpaymentProofUrl : null,
                      })}
                    >
                      <Image
                        src={order.paymentScreenshot || order.downpaymentProofUrl || "/menu-sample.jpg"}
                        alt="Payment proof"
                        fill
                        className="object-contain bg-muted"
                      />
                      {order.paymentScreenshot && order.downpaymentProofUrl && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          2 Proofs
                        </div>
                      )}
                    </div>
                  )}
                  {hasRemainingProof && (
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => showPaymentModal({
                        title: "Remaining Payment Screenshot",
                        paymentUrl: order.remainingPaymentProofUrl || null,
                      })}
                    >
                      <Image
                        src={order.remainingPaymentProofUrl || "/menu-sample.jpg"}
                        alt="Remaining payment proof"
                        fill
                        className="object-contain bg-muted"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Order Details Section */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Order Details</h4>
              <Separator className="mb-2" />
              <div className="space-y-2 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scheduled for</span>
                    {!isEditingScheduledDate && canEditOrder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditScheduledDate()
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {order.preOrderScheduledAt ? "Edit" : "Add"}
                      </Button>
                    )}
                  </div>
                  {isEditingScheduledDate ? (
                    <div className="space-y-2">
                      <Input
                        type="datetime-local"
                        value={editedScheduledDate}
                        onChange={(e) => {
                          e.stopPropagation()
                          setEditedScheduledDate(e.target.value)
                        }}
                        className="text-xs h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelScheduledDateEdit()
                          }}
                          className="flex-1 h-7 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveScheduledDateClick()
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-7 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    order.preOrderScheduledAt ? (
                      <span>{new Date(order.preOrderScheduledAt).toLocaleString()}</span>
                    ) : (
                      canEditOrder && (
                        <span className="text-muted-foreground italic">No scheduled date</span>
                      )
                    )
                  )}
                </div>
                {order.customerAddress && isDeliveryOrder && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right max-w-[60%]">{order.customerAddress}</span>
                  </div>
                )}
                {order.paymentPlan && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment terms</span>
                    <span>{order.paymentPlan === "full" ? "Full payment" : "Partial payment"}</span>
                  </div>
                )}
                {order.paymentPlan === "downpayment" && order.remainingPaymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining balance payment method</span>
                    <span className="capitalize">{order.remainingPaymentMethod}</span>
                  </div>
                )}
                {order.gcashNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GCash number</span>
                    <span>(+63) {order.gcashNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions Section */}
            {order.specialInstructions && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Special Instructions</h4>
                  <p className="text-xs text-muted-foreground">{order.specialInstructions}</p>
                </div>
              </>
            )}
          </>
        )}

        {/* Action Buttons - Always visible after the summary for quick actions */}
        {actionButtons && (
          <>
            <Separator />
            <div className="space-y-2 pt-2">
              {actionButtons}
            </div>
          </>
        )}
      </CardContent>

      {/* Shared payment modal so thumbnails can be tapped anywhere */}
      <PaymentModal
        open={paymentModalConfig.open}
        onOpenChange={(open) => setPaymentModalConfig((prev) => ({ ...prev, open }))}
        paymentUrl={paymentModalConfig.paymentUrl}
        downpaymentUrl={paymentModalConfig.downpaymentUrl}
        title={paymentModalConfig.title || "Payment Proof"}
      />

      {/* Map modal for enlarged, interactive map view */}
      {isDeliveryOrder && showDeliveryMap && order.customerAddress && (
        <DeliveryMapModal
          open={mapModalOpen}
          onOpenChange={setMapModalOpen}
          address={order.customerAddress}
          coordinates={mapCoordinates}
        />
      )}

      {/* Add Item Dialog for edit mode */}
      {showAddItemDialog && (
        <AddOrderItemDialog
          isOpen={showAddItemDialog}
          onClose={() => setShowAddItemDialog(false)}
          onAddItem={handleAddItem}
        />
      )}

      {/* Confirmation Dialog for Order Items Edit */}
      <ConfirmDialog
        open={showConfirmItemsDialog}
        onOpenChange={setShowConfirmItemsDialog}
        title="Confirm Order Items Changes"
        description={`Are you sure you want to save the changes to ${editedItems.length} order item(s)? This action will notify the customer and create a modification log entry.`}
        confirmText="confirm"
        onConfirm={handleSaveChanges}
        confirmButtonLabel="Confirm Changes"
        confirmButtonClassName="bg-green-600 hover:bg-green-700"
      />

      {/* Confirmation Dialog for Scheduled Date Edit */}
      <ConfirmDialog
        open={showConfirmScheduleDialog}
        onOpenChange={setShowConfirmScheduleDialog}
        title="Confirm Scheduled Date Change"
        description={`Are you sure you want to update the scheduled date? This action will notify the customer and create a modification log entry.`}
        confirmText="confirm"
        onConfirm={handleSaveScheduledDate}
        confirmButtonLabel="Confirm Change"
        confirmButtonClassName="bg-green-600 hover:bg-green-700"
      />
    </Card>
  )
}
