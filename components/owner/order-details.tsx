"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, Printer, Check, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { AcceptOrderDialog } from "./accept-order-dialog"
import { DenyOrderDialog } from "./deny-order-dialog"
import { useData } from "@/lib/data-context"
import Image from "next/image"

interface OrderDetailsProps {
  orderId: string
  onClose: () => void
}

export function OrderDetails({ orderId, onClose }: OrderDetailsProps) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showDenyDialog, setShowDenyDialog] = useState(false)

  const { getOrderById } = useData()
  const order = getOrderById(orderId)

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
              {order.customerName} - {order.customerPhone}
            </p>
            <p className="text-xs text-muted-foreground">
              Ordered: {new Date(order._creationTime ?? order.createdAt).toLocaleString()}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {order.paymentScreenshot && (
              <div className="space-y-2">
                <h3 className="font-semibold">Payment Screenshot</h3>
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={order.paymentScreenshot || "/menu-sample.jpg"}
                    alt="Payment proof"
                    fill
                    className="object-contain bg-muted"
                  />
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Ordered Items ({order.items.length})</h3>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                {order.donation > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Donation for disable people</span>
                    <span>${order.donation.toFixed(2)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
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
                {order.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Address</span>
                    <span className="text-right">{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {order.status === "pending" && (
              <>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#2d1b4e] hover:bg-[#2d1b4e]/90"
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
    </>
  )
}
