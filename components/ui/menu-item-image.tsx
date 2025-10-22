"use client"

import Image from "next/image"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

interface MenuItemImageProps {
  src?: string
  alt: string
  fill?: boolean
  className?: string
  width?: number
  height?: number
}

export function MenuItemImage({ src, alt, fill, className, width, height }: MenuItemImageProps) {
  // Convert storage ID to URL if src is a storage ID (not a full URL or local path)
  // This is kept as fallback for existing items that might have storage IDs
  const isStorageId = src && 
    !src.startsWith('http') && 
    !src.startsWith('/') && 
    !src.includes('.') && 
    src.length > 20 // Storage IDs are typically longer than 20 characters
  
  const imageUrl = useQuery(api.files.getUrl, 
    isStorageId ? { storageId: src as any } : "skip"
  )

  // Use the converted URL, fallback to original src, or default image
  const finalSrc = imageUrl || src || "/menu-sample.jpg"

  if (fill) {
    return (
      <Image 
        src={finalSrc} 
        alt={alt} 
        fill 
        className={className}
      />
    )
  }

  return (
    <Image 
      src={finalSrc} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className}
    />
  )
}
