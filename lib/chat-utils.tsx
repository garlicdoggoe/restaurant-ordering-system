"use client"

import type React from "react"
import Image from "next/image"

/**
 * Helper function to check if message is an image URL
 * Only treat URLs as images if they are:
 * 1. Convex storage URLs (contain /api/storage/)
 * 2. URLs ending in image file extensions
 * Regular links should be treated as text and linkified
 */
export function isImageUrl(text: string): boolean {
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

/**
 * Component to render image message from URL (similar to order-tracking.tsx)
 * Messages now store URLs directly, so we can use them immediately
 */
export function ChatImageMessage({ 
  message, 
  onImageClick 
}: { 
  message: string
  onImageClick?: (url: string) => void 
}) {
  // Check if it's a valid URL (http/https) or a Convex storage URL
  const isUrl = message && (message.startsWith('http://') || message.startsWith('https://'))
  
  if (!isUrl) {
    // Not a URL, treat as regular text
    return (
      <p className="text-xs md:text-fluid-sm break-words whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{message}</p>
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

