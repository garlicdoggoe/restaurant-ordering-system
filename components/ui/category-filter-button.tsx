"use client"

import { cn } from "@/lib/utils"

interface CategoryFilterButtonProps {
  id: string
  name: string
  icon: string
  isSelected: boolean
  onClick: () => void
  count?: number
}

export function CategoryFilterButton({ 
  name, 
  icon, 
  isSelected, 
  onClick, 
  count 
}: CategoryFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 px-4 py-3 min-w-[80px] rounded-xl transition-all duration-200",
        "hover:bg-gray-50 active:scale-95 cursor-pointer border-2",
        isSelected 
          ? "border-yellow-500 bg-white shadow-sm" 
          : "border-transparent bg-white hover:shadow-sm"
      )}
    >
      {/* Icon */}
      <span className="text-2xl leading-none">{icon}</span>
      
      {/* Category name */}
      <span className={cn(
        "text-[clamp(0.75rem,0.8vw,0.875rem)] font-medium text-center leading-tight whitespace-nowrap",
        isSelected ? "text-gray-800" : "text-gray-600"
      )}>
        {name}
      </span>
      
      {/* Count badge (optional) */}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1 text-[clamp(0.625rem,0.7vw,0.75rem)] px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium",
          isSelected 
            ? "bg-yellow-500 text-white" 
            : "bg-gray-400 text-white"
        )}>
          {count}
        </span>
      )}
    </button>
  )
}
