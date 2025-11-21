"use client"

import React, { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Check } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useData } from "@/lib/data-context"
import Image from "next/image"
import { compressImage } from "@/lib/image-compression"

interface PaymentProofUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  onSuccess?: () => void
}

export function PaymentProofUploadDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: PaymentProofUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const { updateOrder } = useData()

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - only images
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    // Validate file size - limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    try {
      // Compress the image before storing and uploading
      // This reduces file size while maintaining acceptable quality
      // Target 100KB for payment proof images
      const compressedFile = await compressImage(file, 100)
      
      // Set the compressed file instead of the original
      setSelectedFile(compressedFile)

      // Create preview URL from compressed file
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)
    } catch (error) {
      console.error("Failed to compress image:", error)
      alert("Failed to process image. Please try again.")
    }
  }

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select an image file")
      return
    }

    setIsUploading(true)
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl({})
      
      // Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      })
      
      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }
      
      const { storageId } = await uploadResponse.json()
      
      // Update order with the storage ID - Convex will resolve to URL
      updateOrder(orderId, { remainingPaymentProofUrl: storageId })
      
      // Reset state
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // Close dialog and call success callback
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to upload payment proof:", error)
      alert("Failed to upload payment proof. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Remaining Payment Proof</DialogTitle>
          <DialogDescription>
            Upload proof of payment for the remaining balance. Please upload a clear image of your payment receipt or screenshot.
            <br />
            <span className="text-blue-600 font-medium">GCash# (+63) 915-777-0545</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input Section */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="payment-proof-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="payment-proof-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={previewUrl}
                    alt="Payment proof preview"
                    fill
                    className="object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile()
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    Click to upload payment proof
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, or JPEG
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <span className="mr-2">Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                <span>Upload Proof</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
