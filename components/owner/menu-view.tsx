"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { MenuItemCard } from "./menu-item-card"
import { MenuItemDialog } from "./menu-item-dialog"
import { CategoryFilter, Category } from "@/components/ui/category-filter"
import { useData, type MenuItem } from "@/lib/data-context"

export function MenuView() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const { categories, menuItems } = useData()

  // NOTE: Skip console logging menu data to keep production console clean.

  // Reset dialog state when closing
  const handleCloseDialog = () => {
    setShowAddDialog(false)
    setEditingItem(null)
  }

  // Build categories with item counts for better filtering experience
  // Use database categories if available, otherwise use fallback categories
  const availableCategories = categories.length > 0 ? categories : [
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

  const allCategories: Category[] = [
    { 
      id: "all", 
      name: "All Items", 
      icon: "🍽️",
      count: menuItems.length 
    },
    ...availableCategories.map((cat) => ({
      id: cat.name.toLowerCase(),
      name: cat.name,
      icon: cat.icon,
      count: menuItems.filter(item => 
        item.category.toLowerCase() === cat.name.toLowerCase()
      ).length
    })),
  ]

  const filteredItems = menuItems.filter((item) => {
    // Category filtering: match "all" or check if item category matches selected category
    const matchesCategory = selectedCategory === "all" || 
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    
    // Search filtering: check if item name or description contains search query
    const matchesSearch = searchQuery === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-fluid-2xl font-bold">Menu Management</h1>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2 w-full lg:w-auto">
          <Plus className="w-4 h-4" />
          Add Menu Item
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <CategoryFilter
        categories={allCategories}
        selectedCategories={selectedCategory}
        onToggleCategory={setSelectedCategory}
        mode="buttons"
        allowMultiple={false}
      />

      {/* Filter summary */}
      <div className="text-fluid-sm text-muted-foreground">
        Showing {filteredItems.length} of {menuItems.length} menu items
        {selectedCategory !== "all" && (
          <span> in {allCategories.find(cat => cat.id === selectedCategory)?.name}</span>
        )}
        {searchQuery && (
          <span> matching &quot;{searchQuery}&quot;</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {filteredItems.map((item) => (
          <MenuItemCard key={item._id} item={item} onEdit={() => setEditingItem(item)} />
        ))}
      </div>

      {filteredItems.length === 0 && <div className="text-center py-12 text-muted-foreground">No menu items found</div>}

      {(showAddDialog || editingItem) && (
        <MenuItemDialog
          item={editingItem ?? undefined}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  )
}
