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
import { compressImage } from "@/lib/image-compression"

interface ChatDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Component to render image message from URL (similar to order-tracking.tsx)
function ChatImageMessage({ message, onImageClick }: { message: string; onImageClick?: (url: string) => void }) {
  // Messages now store URLs directly, so we can use them immediately
  // Check if it's a valid URL (http/https) or a Convex storage URL
  const isUrl = message && (message.startsWith('http://') || message.startsWith('https://'))
  
  if (!isUrl) {
    // Not a URL, treat as regular text
    return (
      <p className="text-xs md:text-fluid-sm break-all whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>{message}</p>
    )
  }
  
  // Use the URL directly (like order-tracking.tsx does with payment proof URLs)
  return (
    <div className="relative rounded max-h-64 max-w-full cursor-zoom-in" onClick={onImageClick ? () => onImageClick(message) : undefined}>
      <Image
        src={message}
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
  // Detect mobile devices to apply additional padding for browser toolbar
  const [isMobile, setIsMobile] = useState(false)

  const order = getOrderById(orderId)
  const messagesQuery = useQuery(api.chat.listByOrder, { orderId })
  const messages: ChatMessage[] = useMemo(() => messagesQuery ?? [], [messagesQuery])
  const customerId = currentUser?._id || ""
  const customerName = order?.customerName || "Customer"
  const allowCustomerImages = !!order?.allowCustomerImages
  // Check if chat is allowed for this order (defaults to true for backward compatibility)
  const allowChat = order?.allowChat !== false

  // Mutations for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const getUrlFromStorageId = useMutation(api.files.getUrlFromStorageId)
  // Mutation to mark messages as read
  const markAsRead = useMutation(api.chat.markAsRead)
  
  // Track the last message timestamp that was marked as read to avoid unnecessary calls
  // This helps us only mark new messages as read when they arrive while dialog is open
  const lastMarkedTimestampRef = useRef<number | null>(null)

  // Detect mobile devices on component mount
  useEffect(() => {
    // Check if device is mobile by:
    // 1. Touch capability (touch devices)
    // 2. Screen width (smaller than tablet breakpoint)
    // 3. User agent patterns for mobile devices (iOS, Android, etc.)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth < 768 // md breakpoint
    const userAgent = navigator.userAgent || navigator.vendor || (window as { opera?: string }).opera || ""
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    // Consider it mobile if it has touch AND (small screen OR mobile user agent)
    const isMobileDevice = hasTouch && (isSmallScreen || isMobileUserAgent)
    setIsMobile(isMobileDevice)
  }, [])

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
  // 1. Chat is disallowed for this order (allowChat is false)
  // 2. OR order is in a final status (completed, delivered, or cancelled) AND we're on a succeeding day (next day or later) compared to the order creation day
  // This allows customers to message on the same day the order was created, even if store is closed
  const isMessagingDisabled = (): boolean => {
    // First check if chat is disallowed
    if (!allowChat) return true
    
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

  // Helper function to check if message is an image URL
  // Only treat URLs as images if they are:
  // 1. Convex storage URLs (contain /api/storage/)
  // 2. URLs ending in image file extensions
  // Regular links should be treated as text and linkified
  const isImageUrl = (text: string) => {
    if (!text) return false
    
    // Must be an HTTP(S) URL
    if (!text.startsWith('http://') && !text.startsWith('https://')) {
      return false
    }
    
    // Check if it's a Convex storage URL (these are always images)
    // Convex storage URLs look like: https://outstanding-dalmatian-605.convex.cloud/api/storage/...
    if (text.includes('/api/storage/')) {
      return true
    }
    
    // Check if it ends with an image file extension
    // This handles direct image URLs like https://example.com/image.jpg
    const imageExtensions = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i
    if (imageExtensions.test(text)) {
      return true
    }
    
    // Not an image URL, treat as regular link
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
      // Compress the image before uploading to reduce file size
      // This helps reduce storage costs and improves upload/download speeds
      const compressedFile = await compressImage(file)
      
      // Generate upload URL
      const uploadUrl = await generateUploadUrl({})
      
      // Upload compressed file to Convex storage
      // Note: compressedFile.type will be "image/jpeg" as compression converts to JPEG
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      })
      const { storageId } = await uploadResponse.json()
      
      // Immediately resolve storage ID to URL and store the URL directly
      // This allows the image to be displayed directly without needing to resolve it later
      const imageUrl = await getUrlFromStorageId({ storageId: storageId as Id<"_storage"> })
      
      if (imageUrl) {
        // Store the URL directly in the chat message (like order-tracking.tsx does)
        sendMessage(orderId, customerId, customerName, "customer", imageUrl)
      } else {
        throw new Error("Failed to get image URL")
      }
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
      <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!w-[85vw] md:!h-auto md:!max-w-2xl md:!max-h-[80vh] md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 !flex !flex-col p-3 md:p-6 rounded-none md:rounded-lg">
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

        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-1 md:pr-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-fluid-sm">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg: ChatMessage) => (
                <div
                  key={msg._id}
                  className={cn("flex min-w-0", msg.senderRole === "customer" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg p-3 overflow-hidden",
                      msg.senderRole === "customer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border-2 border-border",
                    )}
                  >
                    <p className="text-xs md:text-fluid-sm font-medium mb-1 break-words">{msg.senderRole === "customer" ? "You" : msg.senderName}</p>
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
                      <p className="text-xs md:text-fluid-sm break-all whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>{parseMessage(msg.message)}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t flex-shrink-0">
          <div 
            className={cn(
              "flex gap-2 pt-3 md:pt-4"
            )}
            style={{
              // Use CSS safe area inset for mobile devices to handle notched devices and browser UI
              // Add additional padding (56px) for the browser toolbar (address bar + bottom navigation)
              // This prevents the browser toolbar from covering the input section on mobile devices
              paddingBottom: typeof window !== 'undefined' && isMobile 
                ? `calc(env(safe-area-inset-bottom) + 74px)`
                : undefined
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
          <div className="flex-1 relative">
            <Input
              placeholder={
                !allowChat 
                  ? "Chat is disabled for this order" 
                  : messagingDisabled 
                    ? "Messaging is disabled for this order" 
                    : "Type your message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-xs md:text-fluid-sm pr-12"
              disabled={isUploading || messagingDisabled}
              maxLength={100}
            />
            {/* Character counter indicator */}
            {/* Shows current character count out of 100, changes color when approaching limit */}
            <span className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 text-xs",
              message.length >= 90 ? "text-destructive" : "text-muted-foreground"
            )}>
              {message.length}/100
            </span>
          </div>
          <Button onClick={handleSend} size="icon" disabled={isUploading || !message.trim() || messagingDisabled}>
            <Send className="w-4 h-4" />
          </Button>
          </div>
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

            {/* Dialogs */}
      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 md:!w-auto md:!h-auto md:!max-w-lg md:!max-h-[90vh] sm:max-w-lg overflow-hidden p-0 md:p-6 rounded-none md:rounded-lg !flex !flex-col !bg-white md:!bg-background">
          <DialogHeader className="p-4 pb-0 md:p-0 flex-shrink-0 bg-transparent">
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {orderId && (
              <OrderTracking orderId={orderId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
