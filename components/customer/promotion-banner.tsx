"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useData } from "@/lib/data-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

// Component to resolve storageId to URL and display promotion image
function PromotionBannerImage({ image, alt }: { image?: string; alt: string }) {
  // Resolve storageId to URL if needed
  const isStorageId = image && 
    !image.startsWith('http') && 
    !image.startsWith('/') && 
    !image.includes('.') && 
    image.length > 20

  const imageUrl = useQuery(
    api.files.getUrl,
    isStorageId ? { storageId: image as any } : "skip"
  )

  // Final image source: resolved URL, original URL, or undefined (no image)
  const finalImageSrc = imageUrl || (image?.startsWith('http') || image?.startsWith('/') ? image : undefined)

  if (!finalImageSrc) return null

  return (
    <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden self-center lg:self-auto mx-auto lg:mx-0">
      <Image src={finalImageSrc} alt={alt} fill className="object-cover" />
    </div>
  )
}

export function PromotionBanner() {
  const { promotions } = useData()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  
  // Touch/swipe state for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)


  const now = Date.now()
  
  // First try strict date filtering
  // If dates are provided, check them; otherwise, only check if promotion is active
  const activePromotions = promotions.filter((p) => {
    if (!p.active) return false
    
    // If no dates provided, promotion is active if it's marked as active
    if (p.startDate === undefined && p.endDate === undefined) {
      return true
    }
    
    // Check start date if provided
    const startValid = p.startDate === undefined || p.startDate <= now
    // Check end date if provided
    const endValid = p.endDate === undefined || p.endDate >= now
    
    const isActive = startValid && endValid
    return isActive
  })

  // If no active promotions found, try showing all active promotions regardless of date
  let promotionsToShow = activePromotions
  if (activePromotions.length === 0) {
    const allActivePromotions = promotions.filter((p) => p.active)
    promotionsToShow = allActivePromotions
  }

  // Hooks must run unconditionally. Effects guard on conditions internally.
  // Auto-rotate effect - cycles through promotions automatically
  useEffect(() => {
    if (!isAutoPlaying || promotionsToShow.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotionsToShow.length)
    }, 15000) // 15 seconds between each promotion
    
    return () => clearInterval(interval)
  }, [isAutoPlaying, promotionsToShow.length])

  // Keep index in bounds when list size changes
  useEffect(() => {
    if (currentIndex >= promotionsToShow.length) setCurrentIndex(0)
  }, [promotionsToShow.length, currentIndex])

  // After hooks: render branches
  if (promotionsToShow.length === 0) {
    // Temporary: Show first promotion regardless of status for debugging
    if (promotions.length > 0) {
      const debugPromotion = promotions[0]
      return (
      <Card className="overflow-hidden bg-gradient-to-r from-red-100 to-orange-100 border-red-200 min-h-[180px] lg:min-h-0">
        <div className="p-4 lg:p-6 flex flex-col lg:flex-row items-start lg:items-center gap-4 min-h-[180px] lg:min-h-0">
          <div className="flex-1">
            <Badge className="mb-2 gap-1 bg-red-500">
              <Sparkles className="w-3 h-3" />
              DEBUG: {debugPromotion.title}
            </Badge>
            <h2 className="text-lg lg:text-fluid-2xl font-medium mb-1">{debugPromotion.description}</h2>
            <p className="text-xs lg:text-fluid-sm text-muted-foreground">
              Status: {debugPromotion.active ? "Active" : "Inactive"} | 
              Start: {debugPromotion.startDate ? new Date(debugPromotion.startDate).toLocaleDateString() : "No start date"} | 
              End: {debugPromotion.endDate ? new Date(debugPromotion.endDate).toLocaleDateString() : "No end date"}
            </p>
          </div>
          {/* Center image on mobile; revert to left on desktop to align with row layout */}
          <PromotionBannerImage image={debugPromotion.image} alt={debugPromotion.title} />
        </div>
      </Card>
      )
    }
    return null
  }

  if (promotionsToShow.length === 1) {
    const single = promotionsToShow[0]
    return (
      <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 min-h-[180px] lg:min-h-0">
        <div className="p-3 lg:p-6 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 min-h-[180px] lg:min-h-0">
          <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
            <Badge className="mb-1.5 lg:mb-2 gap-1 whitespace-normal shrink lg:whitespace-nowrap lg:shrink-0 text-[10px] lg:text-xs max-w-full">
              <Sparkles className="w-2.5 h-2.5 lg:w-3 lg:h-3 shrink-0" />
              <div className="mt-0.5 lg:mt-1 break-words">{single.title}</div>
            </Badge>
            <h2 className="text-xs lg:text-fluid-2xl font-medium mb-1 break-words leading-tight lg:leading-normal">{single.description}</h2>
            {single.endDate && (
              <p className="text-[10px] lg:text-fluid-sm text-muted-foreground break-words leading-tight">
                Valid until {new Date(single.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          {/* Center image on mobile; revert to left on desktop to align with row layout */}
          <PromotionBannerImage image={single.image} alt={single.title} />
        </div>
      </Card>
    )
  }

  // Restart auto-play after user interaction stops
  useEffect(() => {
    if (!isAutoPlaying && promotionsToShow.length > 1) {
      // Restart auto-play after 8 seconds of no interaction
      const timeout = setTimeout(() => {
        setIsAutoPlaying(true)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [isAutoPlaying, promotionsToShow.length])

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + promotionsToShow.length) % promotionsToShow.length)
    setIsAutoPlaying(false)
  }
  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % promotionsToShow.length)
    setIsAutoPlaying(false)
  }
  const goTo = (idx: number) => {
    setCurrentIndex(idx)
    setIsAutoPlaying(false)
  }

  // Touch/swipe handlers for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goNext()
    }
    if (isRightSwipe) {
      goPrev()
    }
  }

  const current = promotionsToShow[currentIndex]

  return (
    <Card 
      className="overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 relative min-h-[180px] lg:min-h-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="p-3 lg:p-6 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 min-h-[180px] lg:min-h-0">
        <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1.5 lg:mb-2 flex-wrap">
            <Badge className="gap-1 whitespace-normal shrink lg:whitespace-nowrap lg:shrink-0 text-[10px] lg:text-xs max-w-full">
              <Sparkles className="w-2.5 h-2.5 lg:w-3 lg:h-3 shrink-0" />
              <div className="mt-0.5 lg:mt-1 break-words">{current.title}</div>
            </Badge>
          </div>
          <h2 className="text-xs lg:text-fluid-2xl font-medium mb-1 break-words leading-tight lg:leading-normal">{current.description}</h2>
          {current.endDate && (
            <p className="text-[10px] lg:text-fluid-sm text-muted-foreground break-words leading-tight">
              Valid until {new Date(current.endDate).toLocaleDateString()}
            </p>
          )}
        </div>
        {/* Center image on mobile; revert to left on desktop to align with row layout */}
        <PromotionBannerImage image={current.image} alt={current.title} />
      </div>

      {/* Controls - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-2 right-2 justify-between pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto h-8 w-8 bg-white/90 hover:bg-white shadow touch-target"
          onClick={goPrev}
          aria-label="Previous promotion"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto h-8 w-8 bg-white/90 hover:bg-white shadow touch-target"
          onClick={goNext}
          aria-label="Next promotion"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {promotionsToShow.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Go to promotion ${idx + 1}`}
            className="px-2 py-2 lg:px-1.5 lg:py-1.5"
          >
            <span
              className={
                "block rounded-full " +
                (idx === currentIndex
                  ? "bg-primary h-2 w-2 lg:h-2 lg:w-2"
                  : "bg-white/70 h-1.5 w-1.5 lg:h-2 lg:w-2")
              }
            />
          </button>
        ))}
      </div>
    </Card>
  )
}
