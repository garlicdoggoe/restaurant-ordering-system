"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useData } from "@/lib/data-context"
import { ChatDialog } from "./chat-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MessageSquare, Ban } from "lucide-react"

interface PendingOrderProps {
  orderId: string
}

export function PendingOrder({ orderId }: PendingOrderProps) {
  const { getOrderById, updateOrder } = useData()
  const order = getOrderById(orderId)
  const [chatOpen, setChatOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (!order) return null

  const createdTs = (order._creationTime ?? order.createdAt) || 0

  return (
    <>
    <Card className="sticky top-24 border-yellow-500 border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pending Order #{order._id.slice(-6).toUpperCase()}</CardTitle>
            <p className="text-sm text-muted-foreground">Placed at {new Date(createdTs).toLocaleString()}</p>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* GCash Number Display */}
        {order.gcashNumber && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              💳 GCash Number Used: (+63) {order.gcashNumber}
            </p>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₱{order.subtotal.toFixed(2)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>₱{order.tax.toFixed(2)}</span>
            </div>
          )}
          {order.donation > 0 && (
            <div className="flex justify-between">
              <span>Donation</span>
              <span>₱{order.donation.toFixed(2)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-₱{order.discount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>₱{order.total.toFixed(2)}</span>
        </div>

        {order.paymentScreenshot && (
          <div className="text-xs text-muted-foreground">
            Payment screenshot provided
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Your order is pending confirmation from the restaurant. You will be notified once it is accepted.
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat with Restaurant
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="text-red-600 hover:text-red-700"
          >
            <Ban className="w-4 h-4 mr-2" />
            Cancel Order
          </Button>
        </div>
      </CardContent>
    </Card>

    <ChatDialog orderId={order._id} open={chatOpen} onOpenChange={setChatOpen} />

    <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this order? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            updateOrder(order._id, { status: "cancelled" })
            setCancelOpen(false)
          }}>Yes, cancel order</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}


