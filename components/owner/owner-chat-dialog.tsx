"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Send, Image as ImageIcon, MessageSquare, X } from "lucide-react"
import { useData, type ChatMessage } from "@/lib/data-context"
import { cn } from "@/lib/utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OrderDetails } from "./order-details"
import Image from "next/image"
import type { Id } from "@/convex/_generated/dataModel"
import { compressImage } from "@/lib/image-compression"
import { isImageUrl, ChatImageMessage } from "@/lib/chat-utils"

interface OwnerChatDialogProps {
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Quick reply templates for owner
const QUICK_REPLIES = [
  "We updated your order.",
  "Please see the changes above.",
  "Thank you for your order!",
  "Your order is being prepared.",
  "We'll notify you when it's ready.",
]

export function OwnerChatDialog({ orderId, open, onOpenChange }: OwnerChatDialogProps) {
  const { sendMessage, getOrderById, restaurant, currentUser, updateOrder } = useData()
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  // Local image caching - store image file and preview before sending
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Detect mobile devices to apply additional padding for browser toolbar
  const [isMobile, setIsMobile] = useState(false)

  const order = getOrderById(orderId)
  const messagesQuery = useQuery(api.chat.listByOrder, { orderId })
  const messages: ChatMessage[] = useMemo(() => messagesQuery ?? [], [messagesQuery])
  const ownerId = currentUser?._id || ""
  // Check if chat is allowed for this order (defaults to true for backward compatibility)
  const allowChat = order?.allowChat !== false

  // Mutations for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const getUrlFromStorageId = useMutation(api.files.getUrlFromStorageId)
  // Mutation to mark messages as read
  const markAsRead = useMutation(api.chat.markAsRead)

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

  // Cleanup: Revoke object URL when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
      }
    }
  }, [pendingImagePreview])

  // Clear pending image when dialog closes
  useEffect(() => {
    if (!open) {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
      }
      setPendingImageFile(null)
      setPendingImagePreview(null)
    }
  }, [open, pendingImagePreview])

  // Mark messages as read when dialog opens
  useEffect(() => {
    if (open && orderId) {
      // Mark all messages in this order as read when dialog opens
      markAsRead({ orderId }).catch((error) => {
        console.error("Failed to mark messages as read:", error)
      })
    }
  }, [open, orderId, markAsRead])

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

  const handleSend = async () => {
    if (!message.trim() && !pendingImageFile) return
    if (!ownerId) return
    // Prevent sending if chat is disallowed
    if (!allowChat) return

    // If there's a pending image, upload it first
    if (pendingImageFile) {
      setIsUploading(true)
      try {
        // Compress the image before uploading to reduce file size
        // This helps reduce storage costs and improves upload/download speeds
        const compressedFile = await compressImage(pendingImageFile)
        
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
          // Send image message first
          sendMessage(orderId, ownerId, restaurant.name, "owner", imageUrl)
        } else {
          throw new Error("Failed to get image URL")
        }

        // Clean up pending image
        if (pendingImagePreview) {
          URL.revokeObjectURL(pendingImagePreview)
        }
        setPendingImageFile(null)
        setPendingImagePreview(null)
      } catch (error) {
        console.error("Failed to upload image:", error)
        alert("Failed to upload image. Please try again.")
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // If there's text, send it as a separate message (after image if image was sent)
    if (message.trim()) {
      sendMessage(orderId, ownerId, restaurant.name, "owner", message)
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle image selection - cache locally and create preview (don't upload yet)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    // Revoke previous preview URL if exists to prevent memory leaks
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview)
    }

    // Store file locally and create preview URL
    setPendingImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setPendingImagePreview(previewUrl)

    // Clear file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Remove pending image (cancel before sending)
  const handleRemovePendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview)
    }
    setPendingImageFile(null)
    setPendingImagePreview(null)
  }

  // Handle quick reply selection
  const handleQuickReply = (reply: string) => {
    setMessage(reply)
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

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    accepted: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    denied: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!w-[85vw] md:!h-auto md:!max-w-2xl md:!max-h-[80vh] md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 !flex !flex-col p-3 md:p-6 rounded-none md:rounded-lg">
        <DialogHeader className="p-0 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-sm md:text-fluid-lg">Chat with {order.customerName}</DialogTitle>
              <button
                type="button"
                className="text-xs md:text-sm text-blue-600 underline hover:text-blue-800 cursor-pointer"
                onClick={() => setDetailsDialogOpen(true)}
                aria-label="Open order details"
              >
                Order #{orderId.slice(-6).toUpperCase()}
              </button>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Customer can send images</span>
                <Switch
                  checked={!!order.allowCustomerImages}
                  onCheckedChange={(checked) => {
                    updateOrder(orderId, { allowCustomerImages: checked })
                  }}
                />
              </div>
              <Badge variant="outline" className={statusColors[order.status as keyof typeof statusColors]}>
                {order.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-1 md:pr-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-fluid-sm">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg: ChatMessage) => (
                <div key={msg._id} className={cn("flex min-w-0", msg.senderRole === "owner" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[70%] min-w-0 rounded-lg p-3 overflow-hidden",
                      msg.senderRole === "owner"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border-2 border-border",
                    )}
                  >
                    <p className="text-xs md:text-fluid-sm font-medium mb-1 break-words">{msg.senderRole === "owner" ? "You" : msg.senderName}</p>
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
                      <p className="text-xs md:text-fluid-sm break-words whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{parseMessage(msg.message)}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t flex-shrink-0">
          {/* Show message if chat is disallowed */}
          {!allowChat && (
            <div className="p-2 bg-yellow-50 border-b border-yellow-200 text-xs md:text-sm text-yellow-800">
              Chat is disabled for this order. Existing messages are visible but no new messages can be sent.
            </div>
          )}
          
          {/* Image preview thumbnail - shown above input when image is selected */}
          {pendingImagePreview && (
            <div className="px-3 pt-3 pb-2 flex items-start gap-2">
              <div className="relative">
                <Image
                  src={pendingImagePreview}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="rounded border object-cover"
                  style={{ width: "64px", height: "64px" }}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                  onClick={handleRemovePendingImage}
                  disabled={isUploading}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
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
            {/* Quick replies dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={isUploading || !allowChat}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {QUICK_REPLIES.map((reply, index) => (
                  <DropdownMenuItem key={index} onClick={() => handleQuickReply(reply)}>
                    {reply}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Image upload button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !allowChat}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={!allowChat}
          />

          <Input
            placeholder={allowChat ? "Type your message..." : "Chat is disabled for this order"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-xs md:text-fluid-sm"
            disabled={isUploading || !allowChat}
          />
          <Button onClick={handleSend} size="icon" disabled={isUploading || (!message.trim() && !pendingImageFile) || !allowChat}>
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

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none md:!inset-auto md:!top-[50%] md:!left-[50%] md:!-translate-x-1/2 md:!-translate-y-1/2 md:!w-auto md:!h-auto md:!max-w-lg md:!max-h-[90vh] sm:max-w-lg overflow-hidden p-0 md:p-6 rounded-none md:rounded-lg !flex !flex-col !bg-white md:!bg-background">
          <DialogHeader className="p-4 pb-0 md:p-0 flex-shrink-0 bg-transparent">
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {orderId && (
              <OrderDetails orderId={orderId} onClose={() => setDetailsDialogOpen(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
