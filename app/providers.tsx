"use client"

import type React from "react"
import { Suspense } from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { DataProvider } from "@/lib/data-context"
import { Toaster } from "sonner"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <Suspense>
        <DataProvider>
          {children}
          <Toaster position="top-right" />
        </DataProvider>
      </Suspense>
    </ConvexProvider>
  )
}


