"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PreOrderFulfillment, PaymentPlan, RemainingPaymentMethod } from "@/lib/data-context"

interface CheckoutPreorderOptionsProps {
  preOrderFulfillment: PreOrderFulfillment | undefined
  paymentPlan: PaymentPlan | undefined
  downpaymentMethod: RemainingPaymentMethod | undefined
  isAddressWithinDeliveryCoverage: boolean
  onFulfillmentChange: (value: PreOrderFulfillment) => void
  onPaymentPlanChange: (value: PaymentPlan) => void
  onDownpaymentMethodChange: (value: RemainingPaymentMethod) => void
}

export function CheckoutPreorderOptions({
  preOrderFulfillment,
  paymentPlan,
  downpaymentMethod,
  isAddressWithinDeliveryCoverage,
  onFulfillmentChange,
  onPaymentPlanChange,
  onDownpaymentMethodChange,
}: CheckoutPreorderOptionsProps) {
  return (
    <div className="space-y-3">
      {/* Top Row - Fulfillment Method and Payment Terms */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Fulfillment Method <span className="text-red-500">*</span>
          </p>
          <Select 
            value={preOrderFulfillment ?? ""} 
            onValueChange={onFulfillmentChange}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select" className="text-gray-500" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup" className="text-xs">Pickup</SelectItem>
              <SelectItem value="delivery" className="text-xs">
                Delivery
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Payment Terms <span className="text-red-500">*</span>
          </p>
          <Select value={paymentPlan ?? ""} onValueChange={onPaymentPlanChange}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select" className="text-gray-500" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full" className="text-xs">Pay in full</SelectItem>
              <SelectItem value="downpayment" className="text-xs">50% downpayment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Warning message spans full width - show when delivery is selected and address is out of coverage */}
      {preOrderFulfillment === "delivery" && !isAddressWithinDeliveryCoverage && (
        <div className="mt-1 space-y-1">
          <p className="text-xs text-red-500">
            Your address is outside delivery coverage.
          </p>
        </div>
      )}
      {/* Downpayment Method - if downpayment is selected */}
      {paymentPlan === "downpayment" && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            Remaining balance payment method <span className="text-red-500">*</span>
          </p>
          <Select value={downpaymentMethod ?? ""} onValueChange={onDownpaymentMethodChange}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select" className="text-gray-500" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online" className="text-xs">Online</SelectItem>
              <SelectItem value="cash" className="text-xs">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

