"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { MenuCategoryTabs } from "./menu-category-tabs"
import { MenuItemGrid } from "./menu-item-grid"
import { PromotionBanner } from "./promotion-banner"
import { useData } from "@/lib/data-context"

interface MenuBrowserProps {
  onAddToCart: (item: any) => void
}

export function MenuBrowser({ onAddToCart }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { categories: ctxCategories, menuItems: ctxMenuItems, promotions } = useData()

  // Debug logging to help understand the data
  console.log("Customer - Categories from database:", ctxCategories)
  console.log("Customer - Menu items:", ctxMenuItems)
  console.log("Customer - Promotions:", promotions)

  // Build categories with fallback data (same logic as menu-view.tsx)
  const availableCategories = ctxCategories.length > 0 ? ctxCategories : [
    { _id: "1", name: "Pasta", icon: "🍝", order: 1 },
    { _id: "2", name: "Pizza", icon: "🍕", order: 2 },
    { _id: "3", name: "Steak", icon: "🥩", order: 3 },
    { _id: "4", name: "Rice", icon: "🍚", order: 4 },
    { _id: "5", name: "Noodle", icon: "🍜", order: 5 },
    { _id: "6", name: "Salad", icon: "🥗", order: 6 },
  ]

  const categories = useMemo(
    () => [
      { 
        id: "all", 
        name: "All Items", 
        icon: "🍽️",
        count: ctxMenuItems.length 
      },
      ...availableCategories.map((cat) => ({
        id: cat.name.toLowerCase(),
        name: cat.name,
        icon: cat.icon,
        count: ctxMenuItems.filter(item => 
          item.category.toLowerCase() === cat.name.toLowerCase()
        ).length
      }))
    ],
    [ctxCategories, ctxMenuItems, availableCategories],
  )

  const menuItems = useMemo(
    () =>
      ctxMenuItems.map((m) => ({
        id: m._id,
        name: m.name,
        description: m.description,
        price: m.price,
        image: m.image || "/menu-sample.jpg",
        category: m.category.toLowerCase(),
        available: m.available,
      })),
    [ctxMenuItems],
  )

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filtering: match "all" or check if item category matches selected category
      const matchesCategory = selectedCategory === "all" || 
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      
      // Search filtering: check if item name or description contains search query
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Only show available items
      return matchesCategory && matchesSearch && item.available
    })
  }, [menuItems, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      <PromotionBanner />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for dishes..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <MenuCategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Filter summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {menuItems.length} menu items
        {selectedCategory !== "all" && (
          <span> in {categories.find(cat => cat.id === selectedCategory)?.name}</span>
        )}
        {searchQuery && (
          <span> matching "{searchQuery}"</span>
        )}
      </div>

      <MenuItemGrid items={filteredItems} onAddToCart={onAddToCart} />
    </div>
  )
}
