"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamically import AddressMapPicker with error handling and loading state
const AddressMapPickerDynamic = dynamic(
  () => import("@/components/ui/address-map-picker").catch(() => {
    return { 
      default: () => (
        <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">
          Map unavailable. Please refresh the page.
        </div>
      ) 
    }
  }),
  { 
    ssr: false,
    loading: () => <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">Loading map...</div>
  }
)

interface CheckoutDeliveryAddressProps {
  customerAddress: string
  deliveryCoordinates: [number, number] | null
  defaultCoordinates: [number, number]
  isAddressWithinDeliveryCoverage: boolean
  orderType: "dine-in" | "takeaway" | "delivery" | "pre-order"
  preOrderFulfillment?: "pickup" | "delivery"
  allowAddressSearchBox?: boolean
  onClose: () => void
  onCloseCart?: () => void
  onOpenSettings?: () => void
}

export function CheckoutDeliveryAddress({
  customerAddress,
  deliveryCoordinates,
  defaultCoordinates,
  isAddressWithinDeliveryCoverage,
  orderType,
  preOrderFulfillment,
  allowAddressSearchBox = true,
  onClose,
  onCloseCart,
  onOpenSettings,
}: CheckoutDeliveryAddressProps) {
  const wantsDelivery = orderType === "delivery" || (orderType === "pre-order" && preOrderFulfillment === "delivery")
  
  if (!wantsDelivery) return null

  return (
    <div className="space-y-3">
      {/* Show map */}
      <div className="rounded-lg border p-3 bg-white">
        <Suspense fallback={<div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Loading map...</div>}>
          <AddressMapPickerDynamic
            address={customerAddress}
            onAddressChange={() => {}} // Read-only in checkout
            coordinates={deliveryCoordinates || defaultCoordinates}
            onCoordinatesChange={() => {}} // Read-only in checkout
            mapHeightPx={180}
            interactive={false}
            disabled={true}
            showSearchBox={allowAddressSearchBox}
          />
        </Suspense>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="text-[12px] text-yellow-600 hover:text-yellow-700 underline mt-[-7px]"
          onClick={() => {
            onClose()
            onCloseCart?.()
            onOpenSettings?.()
          }}
        >
          Change delivery address
        </button>
      </div>
      {/* Warning message for regular delivery orders when address is out of coverage */}
      {orderType === "delivery" && !isAddressWithinDeliveryCoverage && (
        <div className="mt-1 space-y-1">
          <p className="text-xs text-red-500">
            Delivery not available. Your address is outside coverage (Libmanan, Sipocot, Cabusao only).
          </p>
          <p className="text-xs text-gray-600">
            <button
              type="button"
              className="text-yellow-600 hover:text-yellow-700 underline"
              onClick={() => {
                onClose()
                onCloseCart?.()
                onOpenSettings?.()
              }}
            >
              change delivery address
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

