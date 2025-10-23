"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useData } from "@/lib/data-context"

export function PromotionBanner() {
  const { promotions } = useData()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Debug logging
  console.log("PromotionBanner - All promotions:", promotions)
  console.log("PromotionBanner - Current time:", new Date())

  const now = Date.now()
  
  // First try strict date filtering
  const activePromotions = promotions.filter((p) => {
    const isActive = p.active && p.startDate <= now && p.endDate >= now
    console.log(`Promotion "${p.title}": active=${p.active}, startDate=${new Date(p.startDate)}, endDate=${new Date(p.endDate)}, isActive=${isActive}`)
    return isActive
  })

  console.log("PromotionBanner - Active promotions:", activePromotions)

  // If no active promotions found, try showing all active promotions regardless of date
  let promotionsToShow = activePromotions
  if (activePromotions.length === 0) {
    const allActivePromotions = promotions.filter((p) => p.active)
    console.log("PromotionBanner - No date-filtered promotions, showing all active:", allActivePromotions)
    promotionsToShow = allActivePromotions
  }

  // Hooks must run unconditionally. Effects guard on conditions internally.
  // Auto-rotate effect
  useEffect(() => {
    if (!isAutoPlaying || promotionsToShow.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotionsToShow.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, promotionsToShow.length])

  // Keep index in bounds when list size changes
  useEffect(() => {
    if (currentIndex >= promotionsToShow.length) setCurrentIndex(0)
  }, [promotionsToShow.length, currentIndex])

  // After hooks: render branches
  if (promotionsToShow.length === 0) {
    console.log("PromotionBanner - No promotions found at all, returning null")
    // Temporary: Show first promotion regardless of status for debugging
    if (promotions.length > 0) {
      console.log("PromotionBanner - DEBUG: Showing first promotion regardless of status")
      const debugPromotion = promotions[0]
      return (
      <Card className="overflow-hidden bg-gradient-to-r from-red-100 to-orange-100 border-red-200">
        <div className="p-4 lg:p-6 flex flex-col lg:flex-row items-center gap-4">
          <div className="flex-1">
            <Badge className="mb-2 gap-1 bg-red-500">
              <Sparkles className="w-3 h-3" />
              DEBUG: {debugPromotion.title}
            </Badge>
            <h2 className="text-fluid-2xl font-bold mb-1">{debugPromotion.description}</h2>
            <p className="text-fluid-sm text-muted-foreground">
              Status: {debugPromotion.active ? "Active" : "Inactive"} | 
              Start: {new Date(debugPromotion.startDate).toLocaleDateString()} | 
              End: {new Date(debugPromotion.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden">
            <Image src={debugPromotion.image || "/menu-sample.jpg"} alt={debugPromotion.title} fill className="object-cover" />
          </div>
        </div>
      </Card>
      )
    }
    return null
  }

  if (promotionsToShow.length === 1) {
    const single = promotionsToShow[0]
    return (
      <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <div className="p-4 lg:p-6 flex flex-col lg:flex-row items-center gap-4">
          <div className="flex-1">
            <Badge className="mb-2 gap-1">
              <Sparkles className="w-3 h-3" />
              {single.title}
            </Badge>
            <h2 className="text-fluid-2xl font-bold mb-1">{single.description}</h2>
            <p className="text-fluid-sm text-muted-foreground">
              Valid until {new Date(single.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden">
            <Image src={single.image || "/menu-sample.jpg"} alt={single.title} fill className="object-cover" />
          </div>
        </div>
      </Card>
    )
  }

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

  const current = promotionsToShow[currentIndex]

  return (
    <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 relative">
      <div className="p-4 lg:p-6 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="gap-1">
              <Sparkles className="w-3 h-3" />
              {current.title}
            </Badge>
          </div>
          <h2 className="text-fluid-2xl font-bold mb-1">{current.description}</h2>
          <p className="text-fluid-sm text-muted-foreground">
            Valid until {new Date(current.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden">
          <Image src={current.image || "/menu-sample.jpg"} alt={current.title} fill className="object-cover" />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between pointer-events-none">
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
