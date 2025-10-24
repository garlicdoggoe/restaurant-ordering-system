"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryFilterButton } from "@/components/ui/category-filter-button"
import { cn } from "@/lib/utils"

export interface Category {
  id: string
  name: string
  icon: string
  count?: number
}

export interface CategoryFilterProps {
  categories: Category[]
  selectedCategories: string | string[] // Support both single and multiple selection
  onToggleCategory: (categoryId: string) => void
  mode?: "tabs" | "buttons" | "select" // Different display modes
  title?: string // Optional title for the filter section
  className?: string
  allowMultiple?: boolean // Whether to allow multiple category selection
}

/**
 * Reusable category filter component that supports multiple display modes:
 * - tabs: Horizontal tabs (good for owner interface)
 * - buttons: Scrollable horizontal buttons (good for customer interface)
 * - select: Dropdown select (good for compact spaces)
 */
export function CategoryFilter({
  categories,
  selectedCategories,
  onToggleCategory,
  mode = "buttons",
  title,
  className,
  allowMultiple = false
}: CategoryFilterProps) {
  // Normalize selectedCategories to always be an array for internal logic
  const selectedArray = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories]
  
  // Handle category selection logic
  const handleCategorySelect = (categoryId: string) => {
    if (allowMultiple) {
      // Multiple selection logic
      if (categoryId === "all") {
        onToggleCategory("all")
      } else {
        // If "all" is selected, deselect it and select the specific category
        if (selectedArray.includes("all")) {
          onToggleCategory(categoryId)
        } else {
          onToggleCategory(categoryId)
        }
      }
    } else {
      // Single selection logic
      onToggleCategory(categoryId)
    }
  }

  // Render tabs mode (used in owner interface)
  if (mode === "tabs") {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h3 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-gray-800">
            {title}
          </h3>
        )}
        
        <Tabs 
          value={selectedArray[0] || "all"} 
          onValueChange={handleCategorySelect}
        >
          <TabsList className="bg-muted">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="gap-2 flex-shrink-0"
              >
                <span>{category.icon}</span>
                {category.name}
                {category.count !== undefined && (
                  <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                    {category.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    )
  }

  // Render buttons mode (used in customer interface)
  if (mode === "buttons") {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h3 className="text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-gray-800">
            {title}
          </h3>
        )}
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2 pt-2">
            {categories.map((category) => {
              const isSelected = selectedArray.includes(category.id)
              return (
                <div key={category.id} className="relative flex-shrink-0">
                  <CategoryFilterButton
                    id={category.id}
                    name={category.name}
                    icon={category.icon}
                    isSelected={isSelected}
                    onClick={() => handleCategorySelect(category.id)}
                    count={category.count}
                  />
                </div>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    )
  }

  // Render select mode (used in compact spaces like historical orders)
  if (mode === "select") {
    return (
      <div className={cn("space-y-2", className)}>
        {title && (
          <label className="text-sm font-medium text-gray-700">
            {title}
          </label>
        )}
        
        <Select 
          value={selectedArray[0] || "all"} 
          onValueChange={handleCategorySelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  {category.count !== undefined && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({category.count})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return null
}
