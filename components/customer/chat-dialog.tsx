"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useData } from "@/lib/data-context"
import { cn } from "@/lib/utils"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

interface ChatDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatDialog({ orderId, open, onOpenChange }: ChatDialogProps) {
  const { sendMessage, getOrderById, currentUser } = useData()
  const [message, setMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const order = getOrderById(orderId)
  const messages = useQuery(api.chat.listByOrder as any, { orderId }) ?? []
  const customerId = currentUser?._id || ""
  const customerName = order?.customerName || "Customer"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return

    if (!customerId) return
    sendMessage(orderId, customerId, customerName, "customer", message)
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat - Order #{orderId.slice(-6).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg: any) => (
                <div
                  key={msg._id}
                  className={cn("flex", msg.senderRole === "customer" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg p-3",
                      msg.senderRole === "customer" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={handleSend} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
