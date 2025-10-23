"use client"

import React from "react"
import Lottie from "lottie-react"
import cookingAnimation from "@/img/cooking.json"

interface CookingAnimationProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CookingAnimation({ className = "", size = "md" }: CookingAnimationProps) {
  // Size configurations for different animation sizes
  const sizeConfig = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 80, height: 80 }
  }

  const config = sizeConfig[size]

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Lottie
        animationData={cookingAnimation}
        loop={true}
        autoplay={true}
        style={{
          width: config.width,
          height: config.height,
        }}
        className="drop-shadow-sm"
      />
    </div>
  )
}
