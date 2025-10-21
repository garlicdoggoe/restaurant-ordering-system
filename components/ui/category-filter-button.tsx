"use client"

import { Button } from "@/components/ui/button"
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
  id, 
  name, 
  icon, 
  isSelected, 
  onClick, 
  count 
}: CategoryFilterButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-4 h-20 w-20 rounded-xl transition-all duration-200",
        "hover:bg-gray-50 active:scale-95",
        isSelected 
          ? "border-2 border-yellow-500 bg-white shadow-sm" 
          : "border-0 bg-white hover:shadow-sm"
      )}
    >
      {/* Icon */}
      <span className="text-2xl leading-none">{icon}</span>
      
      {/* Category name */}
      <span className={cn(
        "text-xs font-medium text-center leading-tight",
        isSelected ? "text-gray-800" : "text-gray-600"
      )}>
        {name}
      </span>
      
      {/* Count badge (optional) */}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center",
          isSelected 
            ? "bg-yellow-500 text-white" 
            : "bg-gray-400 text-white"
        )}>
          {count}
        </span>
      )}
    </Button>
  )
}
