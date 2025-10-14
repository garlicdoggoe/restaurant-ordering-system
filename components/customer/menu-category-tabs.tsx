"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface MenuCategoryTabsProps {
  categories: Array<{ id: string; name: string; icon: string; count?: number }>
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
}

export function MenuCategoryTabs({ categories, selectedCategory, onSelectCategory }: MenuCategoryTabsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => onSelectCategory(category.id)}
            className={cn("gap-2 flex-shrink-0", selectedCategory === category.id && "shadow-md")}
          >
            <span>{category.icon}</span>
            {category.name}
            {category.count !== undefined && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
                {category.count}
              </span>
            )}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
