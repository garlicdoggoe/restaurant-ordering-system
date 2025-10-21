"use client"

import type React from "react"
import { Suspense } from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { useAuth } from "@clerk/nextjs"
import { DataProvider } from "@/lib/data-context"
import { CartProvider } from "@/lib/cart-context"
import { CartCleanup } from "@/components/cart-cleanup"
import { Toaster } from "sonner"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Suspense>
        <DataProvider>
          <CartProvider>
            <CartCleanup />
            {children}
            <Toaster position="top-right" />
          </CartProvider>
        </DataProvider>
      </Suspense>
    </ConvexProviderWithClerk>
  )
}


