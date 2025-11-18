"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Image as ImageIcon } from "lucide-react"
import { useData, type ChatMessage } from "@/lib/data-context"
import { cn } from "@/lib/utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { OrderTracking } from "./order-tracking"
import Image from "next/image"

interface ChatDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Component to render image message, resolving storageId to URL if needed
function ChatImageMessage({ message, onImageClick }: { message: string; onImageClick?: (url: string) => void }) {
  // StorageIds are alphanumeric strings without spaces - exclude text messages
  const isStorageId = message && !message.startsWith('http') && !message.startsWith('/') && !message.includes('.') && message.length > 20 && !message.includes(' ')
  const imageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId: message as Id<"_storage"> } : "skip"
  )
  
  const finalUrl = imageUrl || message
  
  return (
    <div className="relative rounded max-h-64 max-w-full cursor-zoom-in" onClick={onImageClick ? () => onImageClick(finalUrl) : undefined}>
      <Image
        src={finalUrl}
        alt="Attachment"
        width={400}
        height={256}
        className="rounded object-contain"
        style={{ maxHeight: "256px", maxWidth: "100%" }}
      />
    </div>
  )
}

export function ChatDialog({ orderId, open, onOpenChange }: ChatDialogProps) {
  const { sendMessage, getOrderById, currentUser } = useData()
  const [message, setMessage] = useState("")
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  // Comprehensive visualViewport state tracking for dynamic footer positioning
  // This tracks all visualViewport properties to handle mobile browser UI changes,
  // keyboard appearance, scrolling, and system UI overlays (Android nav bar, iOS home indicator)
  const [viewportState, setViewportState] = useState<{
    offsetTop: number
    offsetLeft: number
    height: number
    width: number
    scale: number
    keyboardHeight: number
  }>({
    offsetTop: 0,
    offsetLeft: 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    scale: 1,
    keyboardHeight: 0,
  })

  // Track visualViewport changes to dynamically position the chat footer
  // This ensures the footer stays visible when keyboard opens, browser UI changes, or viewport scrolls
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      // Fallback for browsers without visualViewport support
      const updateFallback = () => {
        setViewportState({
          offsetTop: 0,
          offsetLeft: 0,
          height: window.innerHeight,
          width: window.innerWidth,
          scale: 1,
          keyboardHeight: 0,
        })
      }
      updateFallback()
      window.addEventListener("resize", updateFallback)
      return () => window.removeEventListener("resize", updateFallback)
    }

    const vv = window.visualViewport

    const updateViewport = () => {
      if (!vv) return

      // Calculate keyboard height more accurately
      // The keyboard height is the difference between layout viewport and visual viewport
      // We account for offsetTop which indicates scrolling/positioning changes
      const layoutHeight = window.innerHeight
      const visualHeight = vv.height
      const offsetTop = vv.offsetTop || 0
      
      // Keyboard height calculation: difference between layout and visual viewport
      // Account for offsetTop which can indicate viewport has been scrolled/positioned
      // Scale factor is important for zoomed views
      const keyboardHeight = Math.max(
        0,
        (layoutHeight - visualHeight - offsetTop) / (vv.scale || 1)
      )

      setViewportState({
        offsetTop: vv.offsetTop || 0,
        offsetLeft: vv.offsetLeft || 0,
        height: visualHeight,
        width: vv.width || window.innerWidth,
        scale: vv.scale || 1,
        keyboardHeight,
      })
    }

    // Initial update
    updateViewport()

    // Listen to all visualViewport events that affect positioning
    vv.addEventListener("resize", updateViewport)
    vv.addEventListener("scroll", updateViewport)
    
    // Also listen to window resize as fallback
    window.addEventListener("resize", updateViewport)

    return () => {
      vv.removeEventListener("resize", updateViewport)
      vv.removeEventListener("scroll", updateViewport)
      window.removeEventListener("resize", updateViewport)
    }
  }, [])
  // Detect iOS devices to apply additional padding for Safari address bar

  const order = getOrderById(orderId)
  const messagesQuery = useQuery(api.chat.listByOrder, { orderId })
  const messages: ChatMessage[] = useMemo(() => messagesQuery ?? [], [messagesQuery])
  const customerId = currentUser?._id || ""
  const customerName = order?.customerName || "Customer"
  const allowCustomerImages = !!order?.allowCustomerImages

  // Mutations for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  // Mutation to mark messages as read
  const markAsRead = useMutation(api.chat.markAsRead)
  
  // Track the last message timestamp that was marked as read to avoid unnecessary calls
  // This helps us only mark new messages as read when they arrive while dialog is open
  const lastMarkedTimestampRef = useRef<number | null>(null)


  // Mark messages as read when dialog opens
  useEffect(() => {
    if (open && orderId) {
      // Mark all messages in this order as read when dialog opens
      markAsRead({ orderId }).catch((error) => {
        console.error("Failed to mark messages as read:", error)
      })
      // Reset the last marked timestamp when dialog opens
      lastMarkedTimestampRef.current = null
    } else if (!open) {
      // Reset when dialog closes
      lastMarkedTimestampRef.current = null
    }
  }, [open, orderId, markAsRead])

  // Continuously mark messages as read while dialog is open
  // This ensures that new messages arriving while the user is viewing the chat are marked as read
  useEffect(() => {
    if (!open || !orderId || messages.length === 0) return

    // Get the latest message timestamp
    const latestTimestamp = Math.max(...messages.map((m) => m.timestamp))
    
    // Only mark as read if there are new messages (timestamp has increased)
    if (lastMarkedTimestampRef.current === null || latestTimestamp > lastMarkedTimestampRef.current) {
      markAsRead({ orderId }).catch((error) => {
        console.error("Failed to mark messages as read:", error)
      })
      lastMarkedTimestampRef.current = latestTimestamp
    }
  }, [open, orderId, messages, markAsRead])

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

  // Helper function to check if we're on a different calendar day than the order creation day
  // Returns true if current date is on a succeeding day (next day or later) compared to order creation date
  const isOnSucceedingDay = (): boolean => {
    if (!order) return false

    // Get the order's creation date
    const orderDate = new Date(order.createdAt)
    
    // Get current date
    const now = new Date()
    
    // Compare dates (year, month, day) ignoring time
    // Create date objects for comparison with time set to midnight
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Return true if current day is after the order creation day
    return currentDay > orderDay
  }

  // Check if messaging should be disabled
  // Disable messaging if:
  // 1. Order is in a final status (completed, delivered, or cancelled)
  // 2. AND we're on a succeeding day (next day or later) compared to the order creation day
  // This allows customers to message on the same day the order was created, even if store is closed
  const isMessagingDisabled = (): boolean => {
    if (!order) return false
    
    const finalStatuses: Array<"completed" | "delivered" | "cancelled"> = ["completed", "delivered", "cancelled"]
    const isFinalStatus = finalStatuses.includes(order.status as "completed" | "delivered" | "cancelled")
    
    if (!isFinalStatus) {
      // Order is not in a final status, allow messaging regardless of day
      return false
    }
    
    // Order is in final status, check if we're on a succeeding day
    // If we're on the same day as order creation, allow messaging
    // If we're on a succeeding day, disable messaging
    return isOnSucceedingDay()
  }

  // Compute whether messaging is disabled
  const messagingDisabled = isMessagingDisabled()

  const handleSend = () => {
    if (!message.trim()) return

    if (!customerId) return
    
    // Prevent sending if messaging is disabled
    if (messagingDisabled) return
    
    sendMessage(orderId, customerId, customerName, "customer", message)
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Helper function to check if message is an image URL or storageId
  const isImageUrl = (text: string) => {
    // Check if it's an HTTP(S) URL ending in image extension
    if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(text)) {
      return true
    }
    // Check if it's a storageId (not starting with http, no dots, long string, no spaces)
    // StorageIds from Convex are typically long alphanumeric strings without spaces
    // Text messages contain spaces, so exclude them
    if (text && !text.startsWith('http') && !text.startsWith('/') && !text.includes('.') && text.length > 20 && !text.includes(' ')) {
      return true
    }
    return false
  }

  // Handle image upload (only if allowed)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowCustomerImages) return
    if (messagingDisabled) return // Prevent upload if messaging is disabled
    const file = e.target.files?.[0]
    if (!file || !customerId) return

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploading(true)
    try {
      const uploadUrl = await generateUploadUrl({})
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await uploadResponse.json()
      sendMessage(orderId, customerId, customerName, "customer", storageId)
    } catch (err) {
      console.error("Failed to upload image:", err)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Helper function to parse message and replace "View details:" with a button
  // Also adds "View details" button for denial messages
  const parseMessage = (text: string) => {
    const parts: (string | React.ReactNode)[] = []
    
    // Check if message contains "View details:" pattern
    // Pattern: "View details: /customer?orderId=..." or "View details: ..."
    const viewDetailsPattern = /View details:\s*([^\s]+)?/i
    
    if (viewDetailsPattern.test(text)) {
      const match = text.match(viewDetailsPattern)
      
      if (match && match.index !== undefined) {
        // Add text before "View details:"
        if (match.index > 0) {
          parts.push(text.substring(0, match.index))
        }
        
        // Add button instead of "View details:" text
        parts.push(
          <Button
            key="view-details-btn"
            variant="link"
            size="sm"
            className="h-auto p-0 text-blue-600 underline hover:text-blue-800 inline"
            onClick={() => setDetailsDialogOpen(true)}
          >
            View details
          </Button>
        )
        
        // Add remaining text after the match
        const afterMatch = match.index + match[0].length
        if (afterMatch < text.length) {
          parts.push(text.substring(afterMatch))
        }
        
        return parts.length > 0 ? parts : text
      }
    }
    
    // Check if message is a denial message - add "View details" button after the message
    const denialPattern = /Order denied\./i
    if (denialPattern.test(text)) {
      // First, linkify any URLs in the message
      const linkifiedParts = linkifyMessage(text)
      const linkifiedArray = Array.isArray(linkifiedParts) ? linkifiedParts : [linkifiedParts]
      
      // Add the linkified message parts
      parts.push(...linkifiedArray)
      
      // Add a space and then the "View details" button
      parts.push(" ")
      parts.push(
        <Button
          key="view-details-denial-btn"
          variant="link"
          size="sm"
          className="h-auto p-0 text-blue-600 underline hover:text-blue-800 inline ml-1"
          onClick={() => setDetailsDialogOpen(true)}
        >
          View details
        </Button>
      )
      
      return parts.length > 0 ? parts : text
    }
    
    // If no special patterns, use linkifyMessage for URLs
    return linkifyMessage(text)
  }

  // Helper function to linkify URLs in message text
  const linkifyMessage = (text: string) => {
    // Match URLs starting with http:// or https://
    const urlPattern = /(https?:\/\/[^\s]+)/g
    // Match paths starting with /
    const pathPattern = /(\/[^\s]+)/g
    
    // Split text and replace URLs/paths with links
    const parts: (string | React.ReactNode)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    
    // First, find all URL and path matches
    const matches: Array<{ index: number; length: number; url: string }> = []
    
    // Find http(s) URLs
    urlPattern.lastIndex = 0
    while ((match = urlPattern.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length, url: match[0] })
    }
    
    // Find paths starting with /
    pathPattern.lastIndex = 0
    while ((match = pathPattern.exec(text)) !== null) {
      // Avoid matching paths that are already part of http URLs
      const isPartOfUrl = matches.some(
        m => match !== null && match.index >= m.index && match.index < m.index + m.length
      )
      if (!isPartOfUrl && match !== null) {
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
      {/* Use dynamic viewport height so Android browsers don't clip the footer (chat input + send button). */}
      <DialogContent
        className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!w-[85vw] md:!h-auto md:!max-w-2xl md:!max-h-[80vh] md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 !flex !flex-col p-3 md:p-6 rounded-none md:rounded-lg"
        style={{ minHeight: "100dvh" }}
      >
        <DialogHeader className="p-0 flex-shrink-0">
          <DialogTitle className="text-sm md:text-fluid-lg">
            Chat -
            <button
              type="button"
              className="ml-1 underline text-blue-600 hover:text-blue-800 cursor-pointer"
              onClick={() => setDetailsDialogOpen(true)}
              aria-label="Open order details"
            >
              Order #{orderId.slice(-6).toUpperCase()}
            </button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea
          ref={scrollRef}
          className="flex-1 min-h-0 pr-1 md:pr-4 overflow-y-auto"
          style={{
            // Add padding to account for keyboard height and ensure content is scrollable
            // when keyboard is visible. This prevents content from being hidden behind the footer.
            paddingBottom: `${viewportState.keyboardHeight}px`,
          }}
        >
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
                      msg.senderRole === "customer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border-2 border-border",
                    )}
                  >
                    <p className="text-xs md:text-fluid-sm font-medium mb-1">{msg.senderRole === "customer" ? "You" : msg.senderName}</p>
                    {/* Render image if message is an image URL or storageId */}
                    {isImageUrl(msg.message) ? (
                      <ChatImageMessage
                        message={msg.message}
                        onImageClick={(url) => {
                          setPreviewImageUrl(url)
                          setImagePreviewOpen(true)
                        }}
                      />
                    ) : (
                      <p className="text-xs md:text-fluid-sm">{parseMessage(msg.message)}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div 
          className={cn(
            "flex gap-2 pt-3 md:pt-4 border-t flex-shrink-0"
          )}
          style={{
            // Dynamic positioning based on visualViewport to keep footer visible
            // Calculate bottom offset: keyboard height + safe area insets + base padding
            // The keyboardHeight accounts for virtual keyboard appearance
            // offsetTop is considered in keyboardHeight calculation to handle viewport scrolling
            // This ensures the footer stays within visible viewport bounds on all mobile browsers
            // (iOS Safari, Chrome Android, etc.)
            paddingBottom: `calc(${viewportState.keyboardHeight}px + env(safe-area-inset-bottom, 0px) + 8px)`,
            // Ensure footer doesn't exceed a reasonable portion of viewport height
            // This prevents the footer from taking up too much space on very small viewports
            maxHeight: viewportState.height > 0 && viewportState.height < 500
              ? `${Math.min(viewportState.height * 0.4, 120)}px` 
              : undefined,
          }}
        >
          {/* Image upload button (visible only if allowed) */}
          {allowCustomerImages && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || messagingDisabled}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={messagingDisabled}
              />
            </>
          )}
          <Input
            placeholder={messagingDisabled ? "Messaging is disabled for this order" : "Type your message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-xs md:text-fluid-sm"
            disabled={isUploading || messagingDisabled}
          />
          <Button onClick={handleSend} size="icon" disabled={isUploading || !message.trim() || messagingDisabled}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto flex items-center justify-center">
          {previewImageUrl && (
            <div className="relative w-full h-full max-w-[90vw] max-h-[80vh]">
              <Image
                src={previewImageUrl}
                alt="Preview"
                width={1280}
                height={720}
                className="object-contain rounded"
                style={{ maxWidth: "90vw", maxHeight: "80vh" }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {orderId && (
            <OrderTracking orderId={orderId} />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
