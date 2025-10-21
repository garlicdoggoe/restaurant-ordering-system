"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { CategoryFilterButton } from "@/components/ui/category-filter-button"

interface MenuCategoryTabsProps {
  categories: Array<{ id: string; name: string; icon: string; count?: number }>
  selectedCategories: string[]
  onToggleCategory: (categoryId: string) => void
}

export function MenuCategoryTabs({ categories, selectedCategories, onToggleCategory }: MenuCategoryTabsProps) {
  return (
    <div className="space-y-3">
      {/* Category title */}
      <h3 className="text-lg font-semibold text-gray-800">Category</h3>
      
      {/* Horizontal scrollable category buttons */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2 pt-2">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.id)
            return (
              <div key={category.id} className="relative flex-shrink-0">
                <CategoryFilterButton
                  id={category.id}
                  name={category.name}
                  icon={category.icon}
                  isSelected={isSelected}
                  onClick={() => onToggleCategory(category.id)}
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
