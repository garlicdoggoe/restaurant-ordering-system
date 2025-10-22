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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"])
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
    { _id: "3", name: "Rice Meals", icon: "🍚", order: 3 },
    { _id: "4", name: "Bilao", icon: "🍜", order: 4 },
    { _id: "5", name: "Bundles", icon: "🍽️", order: 5 },
    { _id: "6", name: "Burger", icon: "🍔", order: 6 },
    { _id: "7", name: "Snacks", icon: "🍟", order: 7 },
    { _id: "8", name: "Chillers", icon: "🍮", order: 8 },
    { _id: "9", name: "Salad", icon: "🥗", order: 9 },
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
      // Category filtering: match "all" or check if item category matches any selected category
      const matchesCategory = selectedCategories.includes("all") || 
        selectedCategories.some(cat => item.category.toLowerCase() === cat.toLowerCase())
      
      // Search filtering: check if item name or description contains search query
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Only show available items
      return matchesCategory && matchesSearch && item.available
    })
  }, [menuItems, selectedCategories, searchQuery])

  // Group items by category when multiple categories are selected
  const groupedItems = useMemo(() => {
    if (selectedCategories.includes("all") || selectedCategories.length <= 1) {
      return { "All Items": filteredItems }
    }

    const groups: { [key: string]: typeof filteredItems } = {}
    filteredItems.forEach(item => {
      const categoryName = availableCategories.find(cat => 
        cat.name.toLowerCase() === item.category.toLowerCase()
      )?.name || item.category
      
      if (!groups[categoryName]) {
        groups[categoryName] = []
      }
      groups[categoryName].push(item)
    })
    
    return groups
  }, [filteredItems, selectedCategories, availableCategories])

  const handleToggleCategory = (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedCategories(["all"])
    } else {
      setSelectedCategories(prev => {
        const newSelection = prev.includes(categoryId) 
          ? prev.filter(id => id !== categoryId)
          : [...prev.filter(id => id !== "all"), categoryId]
        
        // If no categories selected, default to "all"
        return newSelection.length === 0 ? ["all"] : newSelection
      })
    }
  }

  return (
    <div className="space-y-6">
      <PromotionBanner />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
        <Input
          placeholder="What do you want to eat today?"
          className="pl-12 pr-4 py-6 rounded-full border-0 bg-white shadow-sm focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/30"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <MenuCategoryTabs
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
      />

      {/* Filter summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {menuItems.length} menu items
        {!selectedCategories.includes("all") && selectedCategories.length > 0 && (
          <span> in {selectedCategories.map(id => categories.find(cat => cat.id === id)?.name).join(", ")}</span>
        )}
        {searchQuery && (
          <span> matching &quot;{searchQuery}&quot;</span>
        )}
      </div>

      {/* Render grouped items */}
      {Object.entries(groupedItems).map(([categoryName, items]) => (
        <div key={categoryName} className="space-y-4">
          {Object.keys(groupedItems).length > 1 && (
            <h2 className="text-xl font-bold text-foreground">{categoryName}</h2>
          )}
          <MenuItemGrid items={items} onAddToCart={onAddToCart} />
        </div>
      ))}
    </div>
  )
}
