"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"

export function OwnerHeader() {
  return (
    <header className="h-16 border-b bg-background px-6 flex items-center justify-end">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-destructive text-[10px]">
            3
          </Badge>
        </Button>

        <UserProfileDropdown />
      </div>
    </header>
  )
}
