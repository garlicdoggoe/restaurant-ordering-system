"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Send, Image as ImageIcon, MessageSquare } from "lucide-react"
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

export function OwnerChatDialog({ orderId, open, onOpenChange }: OwnerChatDialogProps) {
  const { sendMessage, getOrderById, restaurant, currentUser, updateOrder } = useData()
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const order = getOrderById(orderId)
  const messagesQuery = useQuery(api.chat.listByOrder, { orderId })
  const messages: ChatMessage[] = useMemo(() => messagesQuery ?? [], [messagesQuery])
  const ownerId = currentUser?._id || ""

  // Mutations for file upload
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  // Mutation to mark messages as read
  const markAsRead = useMutation(api.chat.markAsRead)

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

  const handleSend = () => {
    if (!message.trim() || !ownerId) return

    sendMessage(orderId, ownerId, restaurant.name, "owner", message)
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ownerId) return

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploading(true)
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl({})
      
      // Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await uploadResponse.json()

      // Send the storageId as the message - it will be resolved to URL in rendering
      // StorageIds are sent as-is and resolved client-side using useQuery
      sendMessage(orderId, ownerId, restaurant.name, "owner", storageId)
    } catch (error) {
      console.error("Failed to upload image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Handle quick reply selection
  const handleQuickReply = (reply: string) => {
    setMessage(reply)
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

  // Helper function to check if text is a storageId (not a URL)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isStorageId = (text: string) => {
    // StorageIds are alphanumeric strings without spaces - exclude text messages
    return text && !text.startsWith('http') && !text.startsWith('/') && !text.includes('.') && text.length > 20 && !text.includes(' ')
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
      <DialogContent className="w-[70vw] h-[70vh] max-w-none flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Chat with {order.customerName}</DialogTitle>
              <button
                type="button"
                className="text-sm text-blue-600 underline hover:text-blue-800 cursor-pointer"
                onClick={() => setDetailsDialogOpen(true)}
                aria-label="Open order details"
              >
                Order #{orderId.slice(-6).toUpperCase()}
              </button>
            </div>
            <div className="flex items-center gap-4">
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

        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 pr-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((msg: ChatMessage) => (
                <div key={msg._id} className={cn("flex", msg.senderRole === "owner" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg p-3",
                      msg.senderRole === "owner"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border-2 border-border",
                    )}
                  >
                    <p className="text-sm font-medium mb-1">{msg.senderRole === "owner" ? "You" : msg.senderName}</p>
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
                      <p className="text-sm">{parseMessage(msg.message)}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          {/* Quick replies dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isUploading}>
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
            disabled={isUploading}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isUploading}
          />
          <Button onClick={handleSend} size="icon" disabled={isUploading || !message.trim()}>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {orderId && (
            <OrderDetails orderId={orderId} onClose={() => setDetailsDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
