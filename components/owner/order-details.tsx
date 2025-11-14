"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Printer, Check, XCircle, Edit, Plus, Minus, Trash2, History } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { AcceptOrderDialog } from "./accept-order-dialog"
import { DenyOrderDialog } from "./deny-order-dialog"
import { AddOrderItemDialog } from "./add-order-item-dialog"
import { useData, type OrderItem } from "@/lib/data-context"
import Image from "next/image"
import { formatPhoneForDisplay } from "@/lib/phone-validation"
import { PaymentModal } from "@/components/ui/payment-modal"
import { ChangeStatusDialog } from "./change-status-dialog"
import { DeliveryMap } from "@/components/ui/delivery-map"

interface OrderDetailsProps {
  orderId: string
  onClose: () => void
}

export function OrderDetails({ orderId, onClose }: OrderDetailsProps) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showDenyDialog, setShowDenyDialog] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [showModificationHistory, setShowModificationHistory] = useState(false)
  const [editedItems, setEditedItems] = useState<OrderItem[]>([])
  const [showChangeStatusDialog, setShowChangeStatusDialog] = useState(false)
  
  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [remainingPaymentModalOpen, setRemainingPaymentModalOpen] = useState(false)
  const [selectedPaymentUrl, setSelectedPaymentUrl] = useState<string | null>(null)

  const { getOrderById, updateOrderItems, getOrderModifications } = useData()
  const order = getOrderById(orderId)
  const modifications = getOrderModifications(orderId)

  // Determine if order is a delivery order
  const isDeliveryOrder = order && (order.orderType === "delivery" || (order.orderType === "pre-order" && order.preOrderFulfillment === "delivery"))
  
  // Determine coordinates to use: order's stored coordinates (at time of order creation)
  // Use order's customerCoordinates instead of fetching current user coordinates
  const deliveryCoordinates: [number, number] | null = order?.customerCoordinates 
    ? [order.customerCoordinates.lng, order.customerCoordinates.lat] as [number, number]
    : null

  // Initialize edited items when entering edit mode
  const handleEditMode = () => {
    if (order) {
      setEditedItems([...order.items])
      setIsEditMode(true)
    }
  }

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedItems([])
  }

  // Save changes
  const handleSaveChanges = async () => {
    if (!order || editedItems.length === 0) return

    try {
      await updateOrderItems(
        orderId,
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

  // Add item to order
  const handleAddItem = (newItem: OrderItem) => {
    setEditedItems(prev => [...prev, newItem])
    setShowAddItemDialog(false)
  }

  // Update item quantity
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return
    setEditedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  // Remove item from order
  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index))
  }

  // Calculate totals for edited items
  const calculateTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const platformFee = order?.platformFee || 0
    const discount = order?.discount || 0
    const total = subtotal + platformFee - discount
    return { subtotal, platformFee, discount, total }
  }

  const currentItems = isEditMode ? editedItems : (order?.items || [])
  const totals = calculateTotals(currentItems)

  if (!order) {
    return null
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order #{order._id.slice(-6).toUpperCase()}</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {order.customerName} - {formatPhoneForDisplay(order.customerPhone)}
            </p>
            <p className="text-xs text-muted-foreground">
              Ordered: {new Date(order._creationTime ?? order.createdAt).toLocaleString()}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Payment Screenshots Section - Handle both paymentScreenshot and downpaymentProofUrl */}
            {(order.paymentScreenshot || order.downpaymentProofUrl) && (
              <div className="space-y-2">
                <h3 className="font-semibold">
                  {order.paymentScreenshot && order.downpaymentProofUrl 
                    ? "Payment Proofs" 
                    : order.paymentScreenshot 
                    ? "Payment Screenshot" 
                    : "Downpayment Proof"}
                </h3>
                
                {/* Show combined payment proof modal when both are present */}
                {order.paymentScreenshot && order.downpaymentProofUrl ? (
                  <div 
                    className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setSelectedPaymentUrl(order.paymentScreenshot || null)
                      setPaymentModalOpen(true)
                    }}
                  >
                    <Image
                      src={order.paymentScreenshot || "/menu-sample.jpg"}
                      alt="Payment proof"
                      fill
                      className="object-contain bg-muted"
                    />
                    {/* Overlay indicator showing there are multiple proofs */}
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      2 Proofs
                    </div>
                  </div>
                ) : (
                  /* Show individual payment proof when only one is present */
                  <div 
                    className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setSelectedPaymentUrl(order.paymentScreenshot || order.downpaymentProofUrl || null)
                      setPaymentModalOpen(true)
                    }}
                  >
                    <Image
                      src={order.paymentScreenshot || order.downpaymentProofUrl || "/menu-sample.jpg"}
                      alt="Payment proof"
                      fill
                      className="object-contain bg-muted"
                    />
                  </div>
                )}
              </div>
            )}

            {order.remainingPaymentProofUrl && (
              <div className="space-y-2">
                <h3 className="font-semibold">Remaining Payment Screenshot</h3>
                <div 
                  className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setSelectedPaymentUrl(order.remainingPaymentProofUrl || null)
                    setRemainingPaymentModalOpen(true)
                  }}
                >
                  <Image
                    src={order.remainingPaymentProofUrl || "/menu-sample.jpg"}
                    alt="Remaining payment proof"
                    fill
                    className="object-contain bg-muted" />
                </div>
              </div>
            )}

            {/* Pre-order Details Section */}
            {order.orderType === "pre-order" && (order.preOrderFulfillment || order.preOrderScheduledAt) && (
              <div className="space-y-2">
                <h3 className="font-semibold">Pre-Order Details</h3>
                <div className="space-y-2">
                  {/* Fulfillment Method Badge */}
                  {order.preOrderFulfillment && (
                    <Badge 
                      variant="outline" 
                      className={`w-full justify-center text-xs py-1 ${
                        order.preOrderFulfillment === "pickup" 
                          ? "border-blue-200 bg-blue-50 text-blue-800" 
                          : "border-purple-200 bg-purple-50 text-purple-800"
                      }`}
                    >
                      Fulfillment: {order.preOrderFulfillment === "pickup" ? "Pickup" : "Delivery"}
                    </Badge>
                  )}
                  
                  {/* Scheduled Date Badge */}
                  {order.preOrderScheduledAt && (
                    <Badge 
                      variant="outline" 
                      className="w-full justify-center text-xs py-1 border-orange-200 bg-orange-50 text-orange-800"
                    >
                      Scheduled: {new Date(order.preOrderScheduledAt).toLocaleString()}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Ordered Items ({currentItems.length})</h3>
                {!isEditMode && (order.status === "pending" || order.status === "accepted" || order.status === "pre-order-pending") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditMode}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Order
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-3">
                  {currentItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">₱{item.price.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <div className="text-right ml-2">
                          <div className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowAddItemDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className={isEditMode ? "text-blue-600 font-medium" : ""}>
                    ₱{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span>₱{totals.platformFee.toFixed(2)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₱{totals.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className={isEditMode ? "text-blue-600" : ""}>
                    ₱{totals.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type</span>
                  <Badge>{order.orderType}</Badge>
                </div>
                {order.gcashNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GCash Number Used</span>
                    <span className="font-medium text-blue-600">(+63) {order.gcashNumber}</span>
                  </div>
                )}
                {order.customerAddress && isDeliveryOrder && (
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Delivery Address</span>
                      <span className="text-right">{order.customerAddress}</span>
                    </div>
                    {/* Delivery Map */}
                    <div className="mt-2">
                      <DeliveryMap
                        address={order.customerAddress}
                        coordinates={deliveryCoordinates}
                        mapHeightPx={250}
                      />
                    </div>
                  </div>
                )}
                {order.customerAddress && !isDeliveryOrder && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right">{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Mode Controls */}
            {isEditMode && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  disabled={editedItems.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
              </div>
            )}

            {/* Normal Order Actions */}
            {!isEditMode && order.status === "pending" && (
              <>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => setShowAcceptDialog(true)}
                  >
                    <Check className="w-4 h-4" />
                    Accept Order
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive bg-transparent"
                  onClick={() => setShowDenyDialog(true)}
                >
                  <XCircle className="w-4 h-4" />
                  Deny Order
                </Button>
              </>
            )}

            {order.status === "denied" && order.denialReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Order Denied</p>
                <p className="text-xs text-red-700 mt-1">{order.denialReason}</p>
                <Button
                  size="lg"
                  className="mt-2 w-full bg-yellow-400 hover:bg-yellow-600"
                  onClick={() => setShowChangeStatusDialog(true)}
                >
                  Change Status
                </Button>
              </div>
            )}

            {order.status === "accepted" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">Order Accepted</p>
                {order.estimatedPrepTime && (
                  <p className="text-xs text-green-700 mt-1">Estimated prep time: {order.estimatedPrepTime} minutes</p>
                )}
              </div>
            )}

            {/* Modification History */}
            {modifications.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowModificationHistory(!showModificationHistory)}
                >
                  <History className="w-4 h-4" />
                  Modification History ({modifications.length})
                </Button>
                
                {showModificationHistory && (
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {modifications.map((mod: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{mod.modifiedByName}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(mod.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {mod.modificationType.replace('_', ' ')}
                          </Badge>
                        </div>
                        {mod.itemDetails && (
                          <p className="text-muted-foreground mt-1">{mod.itemDetails}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showAcceptDialog && (
        <AcceptOrderDialog
          orderId={orderId}
          onClose={() => setShowAcceptDialog(false)}
          onSuccess={() => {
            setShowAcceptDialog(false)
            onClose()
          }}
        />
      )}

      {showDenyDialog && (
        <DenyOrderDialog
          orderId={orderId}
          onClose={() => setShowDenyDialog(false)}
          onSuccess={() => {
            setShowDenyDialog(false)
            onClose()
          }}
        />
      )}

      {showAddItemDialog && (
        <AddOrderItemDialog
          isOpen={showAddItemDialog}
          onClose={() => setShowAddItemDialog(false)}
          onAddItem={handleAddItem}
        />
      )}

      {/* Payment Modals for larger image views */}
      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen} 
        paymentUrl={selectedPaymentUrl} 
        downpaymentUrl={order?.downpaymentProofUrl || null}
        title={order?.paymentScreenshot && order?.downpaymentProofUrl ? "Payment Proofs" : "Payment Screenshot"} 
      />
      
      <PaymentModal 
        open={remainingPaymentModalOpen} 
        onOpenChange={setRemainingPaymentModalOpen} 
        paymentUrl={selectedPaymentUrl} 
        title="Remaining Payment Screenshot" 
      />

      {/* Change Status Dialog for denied orders */}
      {showChangeStatusDialog && (
        <ChangeStatusDialog
          orderId={orderId}
          onClose={() => setShowChangeStatusDialog(false)}
          onSuccess={() => {
            setShowChangeStatusDialog(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
