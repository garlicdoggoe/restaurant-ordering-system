import type { Category } from "./data-context"

/**
 * Default fallback categories used when no categories are available from the database.
 * These categories are used across the application as a fallback to ensure
 * category filtering always works, even when the database is empty or categories
 * haven't been set up yet.
 */
export const DEFAULT_CATEGORIES: Category[] = [
    { _id: "1", name: "Pizza", icon: "🍕", order: 1 },
    { _id: "2", name: "Bilao", icon: "🍜", order: 2 },
    { _id: "3", name: "Bundles", icon: "🍽️", order: 3 },
    { _id: "4", name: "Pasta", icon: "🍝", order: 4 },
    { _id: "5", name: "Rice Meals", icon: "🍚", order: 5 },
    { _id: "6", name: "Burger", icon: "🍔", order: 6 },
    { _id: "7", name: "Snacks", icon: "🍟", order: 7 },
    { _id: "8", name: "Chillers", icon: "🍮", order: 8 },
    { _id: "9", name: "Salad", icon: "🥗", order: 9 },
]

