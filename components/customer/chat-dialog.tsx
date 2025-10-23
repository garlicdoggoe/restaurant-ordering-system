"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useData, type ChatMessage } from "@/lib/data-context"
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
  const messages: ChatMessage[] = useQuery(api.chat.listByOrder, { orderId }) ?? []
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
      <DialogContent className="w-[85vw] max-w-full md:max-w-2xl max-h-[80vh] md:h-[600px] flex flex-col p-3 md:p-6">
        <DialogHeader className="p-0">
          <DialogTitle className="text-sm md:text-fluid-lg">Chat - Order #{orderId.slice(-6).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 pr-1 md:pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-fluid-sm">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg: ChatMessage) => (
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
                    <p className="text-xs md:text-fluid-sm font-medium mb-1">{msg.senderName}</p>
                    <p className="text-xs md:text-fluid-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-3 md:pt-4 border-t">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-xs md:text-fluid-base touch-target h-8 md:h-auto"
          />
          <Button onClick={handleSend} size="icon" className="touch-target w-8 h-8 md:w-10 md:h-10">
            <Send className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
