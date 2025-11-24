"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PaymentModal } from "@/components/ui/payment-modal"

interface CheckoutPaymentOptionsProps {
  gcashNumber?: string
  previewUrl: string | null
  paymentModalOpen: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onOpenModal: () => void
  onCloseModal: () => void
}

export function CheckoutPaymentOptions({
  gcashNumber,
  previewUrl,
  paymentModalOpen,
  onFileChange,
  onRemoveImage,
  onOpenModal,
  onCloseModal,
}: CheckoutPaymentOptionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg mt-5 md:text-2xl font-bold text-gray-800">Payment Options</h3>
      {/* GCash Payment Method */}
      {gcashNumber && (
        <div className="flex items-center space-x-3">
          <Image src="/gcash.png" alt="GCash" width={100} height={32} className="h-8 w-auto" />
          <p className="text-xs text-gray-800">
            Manual GCash payment. Please send payment to {" "}
            <span className="text-blue-600 font-medium">L** G** (+63) 915-777-0545</span>.
          </p>
        </div>
      )}

      {/* Notification */}
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-[12px] text-white font-bold">i</span>
        </div>
        <p className="text-[12px] text-yellow-600">
          Other payment methods will be available soon
        </p>
      </div>

      {/* Payment Proof Upload */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">
          Payment Proof <span className="text-red-500">*</span>
        </p>
      </div>
      {!previewUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
          <input
            id="payment-screenshot"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <label htmlFor="payment-screenshot" className="cursor-pointer">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-400 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                <path d="M14 7a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Click to upload payment proof
            </p>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-full h-32">
            <Image 
              src={previewUrl} 
              alt="Payment proof" 
              fill
              className="rounded border object-contain cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={onOpenModal}
            />
          </div>
          <div className="flex gap-2">
            <input
              id="payment-screenshot-change"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
            <label 
              htmlFor="payment-screenshot-change" 
              className="flex-1 text-yellow-600 text-sm font-medium py-1 px-4 rounded-lg cursor-pointer text-center transition-colors"
            >
              Change Photo
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemoveImage}
              className="text-sm"
            >
              Remove
            </Button>
          </div>
        </div>
      )}
      
      {/* Payment Modal for larger photo view */}
      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={onCloseModal} 
        paymentUrl={previewUrl} 
        title="Payment Proof Preview" 
      />
    </div>
  )
}

