"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * VisuallyHidden component for screen reader accessibility
 * Hides content visually while keeping it accessible to screen readers
 */
function VisuallyHidden({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "clip-path-inset-50",
        className
      )}
      {...props}
    />
  )
}

export { VisuallyHidden }
