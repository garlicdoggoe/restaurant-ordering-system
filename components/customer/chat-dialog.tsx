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
    // Find the scrollable viewport element within the ScrollArea
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      } else {
        // Fallback: try scrolling the ref element itself
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
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

  // Helper function to linkify URLs in message text
  const linkifyMessage = (text: string) => {
    // Match URLs starting with http:// or https://
    const urlPattern = /(https?:\/\/[^\s]+)/g
    // Match paths starting with /
    const pathPattern = /(\/[^\s]+)/g
    
    // Split text and replace URLs/paths with links
    const parts: (string | React.JSX.Element)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    
    // First, find all URL and path matches
    const matches: Array<{ index: number; length: number; url: string }> = []
    
    // Find http(s) URLs
    while ((match = urlPattern.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length, url: match[0] })
    }
    
    // Find paths starting with /
    while ((match = pathPattern.exec(text)) !== null) {
      // Avoid matching paths that are already part of http URLs
      const isPartOfUrl = matches.some(
        m => match !== null && match.index >= m.index && match.index < m.index + m.length
      )
      if (!isPartOfUrl) {
        matches.push({ index: match.index, length: match[0].length, url: match[0] })
      }
    }
    
    // Sort matches by index
    matches.sort((a, b) => a.index - b.index)
    
    // Build the parts array with text and links
    matches.forEach((m) => {
      // Add text before the match
      if (m.index > lastIndex) {
        parts.push(text.substring(lastIndex, m.index))
      }
      // Add the link
      parts.push(
        <a
          key={m.index}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {m.url}
        </a>
      )
      lastIndex = m.index + m.length
    })
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!w-[85vw] md:!h-auto md:!max-w-2xl md:!max-h-[80vh] md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 !flex !flex-col p-3 md:p-6 rounded-none md:rounded-lg">
        <DialogHeader className="p-0 flex-shrink-0">
          <DialogTitle className="text-sm md:text-fluid-lg">Chat - Order #{orderId.slice(-6).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-1 md:pr-4 overflow-y-auto">
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
                    <p className="text-xs md:text-fluid-sm">{linkifyMessage(msg.message)}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-3 md:pt-4 border-t flex-shrink-0">
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
