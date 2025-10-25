"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentUrl: string | null
  downpaymentUrl?: string | null
  title?: string
}

/**
 * Reusable payment modal component for displaying payment screenshots/proofs
 * Used across order tracking, historical orders, and checkout dialogs
 * Now supports displaying both paymentScreenshot and downpaymentProofUrl when both are present
 */
export function PaymentModal({ 
  open, 
  onOpenChange, 
  paymentUrl, 
  downpaymentUrl,
  title = "Payment Proof" 
}: PaymentModalProps) {
  // Determine if we have multiple payment proofs to display
  const hasMultipleProofs = paymentUrl && downpaymentUrl
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {hasMultipleProofs ? (
          // Display both payment proofs when both are available
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Initial Payment</h4>
              <Image 
                src={paymentUrl} 
                alt="Initial Payment Proof" 
                width={400} 
                height={300} 
                className="w-full rounded border object-contain" 
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Downpayment Proof</h4>
              <Image 
                src={downpaymentUrl} 
                alt="Downpayment Proof" 
                width={400} 
                height={300} 
                className="w-full rounded border object-contain" 
              />
            </div>
          </div>
        ) : paymentUrl ? (
          // Display single payment proof
          <Image 
            src={paymentUrl} 
            alt="Payment Proof" 
            width={400} 
            height={300} 
            className="w-full rounded border object-contain" 
          />
        ) : (
          <p className="text-sm text-muted-foreground">No payment proof available.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
