"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { CategoryFilter, Category } from "@/components/ui/category-filter"
import { MenuItemGrid } from "./menu-item-grid"
import { PromotionBanner } from "./promotion-banner"
import { useData } from "@/lib/data-context"
import type { CartItem } from "@/lib/cart-context"

interface MenuBrowserProps {
  onAddToCart: (item: Omit<CartItem, "quantity">, quantity?: number, suppressToast?: boolean) => void
}

export function MenuBrowser({ onAddToCart }: MenuBrowserProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"])
  const [searchQuery, setSearchQuery] = useState("")
  const { categories: ctxCategories, menuItems: ctxMenuItems, promotions } = useData()

  // NOTE: Avoid logging menu data here; rely on React DevTools or network tab for debugging.

  // Build categories with fallback data (same logic as menu-view.tsx) - memoized to prevent dependency changes
  const availableCategories = useMemo(() => ctxCategories.length > 0 ? ctxCategories : [
    { _id: "1", name: "Pasta", icon: "🍝", order: 1 },
    { _id: "2", name: "Pizza", icon: "🍕", order: 2 },
    { _id: "3", name: "Rice Meals", icon: "🍚", order: 3 },
    { _id: "4", name: "Bilao", icon: "🍜", order: 4 },
    { _id: "5", name: "Bundles", icon: "🍽️", order: 5 },
    { _id: "6", name: "Burger", icon: "🍔", order: 6 },
    { _id: "7", name: "Snacks", icon: "🍟", order: 7 },
    { _id: "8", name: "Chillers", icon: "🍮", order: 8 },
    { _id: "9", name: "Salad", icon: "🥗", order: 9 },
  ], [ctxCategories])

  const categories: Category[] = useMemo(
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
    [ctxMenuItems, availableCategories],
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
      // If there's a search query, search across all items regardless of category filter
      if (searchQuery.trim() !== "") {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        // Only show available items that match search
        return matchesSearch && item.available
      }
      
      // When no search query, apply category filtering as normal
      // Category filtering: match "all" or check if item category matches any selected category
      const matchesCategory = selectedCategories.includes("all") || 
        selectedCategories.some(cat => item.category.toLowerCase() === cat.toLowerCase())
      
      // Only show available items that match category
      return matchesCategory && item.available
    })
  }, [menuItems, selectedCategories, searchQuery])

  // Group items by category when multiple categories are selected or when searching
  const groupedItems = useMemo(() => {
    // When searching, always group by actual category to show results clearly
    const isSearching = searchQuery.trim() !== ""
    
    // If not searching and only one category selected, show as single group
    if (!isSearching && (selectedCategories.includes("all") || selectedCategories.length <= 1)) {
      return { "All Items": filteredItems }
    }

    // Group items by their actual categories
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
  }, [filteredItems, selectedCategories, availableCategories, searchQuery])

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
    <div id="onboarding-view-menu" className="space-y-4 lg:space-y-6">
      <PromotionBanner />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
        <Input
          id="onboarding-search-input"
          placeholder="What do you want to eat today?"
          className="pl-12 pr-4 py-3 lg:py-4 rounded-full border-0 bg-white shadow-sm focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/30 text-[clamp(1rem,1.5vw,1.125rem)] touch-target"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div id="onboarding-category-filter">
        <CategoryFilter
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          mode="buttons"
          title="Category"
          allowMultiple={true}
        />
      </div>

      {/* Filter summary */}
      <div className="text-fluid-sm text-muted-foreground" id="onboarding-menu-grid">
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
            <h2 className="text-fluid-xl font-bold text-foreground">{categoryName}</h2>
          )}
          <div>
            <MenuItemGrid items={items} onAddToCart={onAddToCart} />
          </div>
        </div>
      ))}
    </div>
  )
}
