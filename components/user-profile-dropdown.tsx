"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useData } from "@/lib/data-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings, MapPin, Phone, Mail } from "lucide-react"
import { formatPhoneForDisplay } from "@/lib/phone-validation"
import { SignOutButton } from "@clerk/nextjs"

export function UserProfileDropdown() {
  const { user } = useUser()
  const { currentUser } = useData()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  // Use Convex database names, fallback to Clerk user data if not available
  const displayFirstName = currentUser?.firstName || user.firstName || ""
  const displayLastName = currentUser?.lastName || user.lastName || ""
  const displayFullName = currentUser?.firstName && currentUser?.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : user.fullName || "User"
  const initials = `${displayFirstName?.[0] || ''}${displayLastName?.[0] || ''}`.toUpperCase()

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.imageUrl} alt={displayFullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.imageUrl} alt={displayFullName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {displayFullName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={currentUser?.role === "owner" ? "default" : "secondary"}>
                    {currentUser?.role === "owner" ? "Owner" : "Customer"}
                  </Badge>
                  {currentUser?.profileComplete && (
                    <Badge variant="outline" className="text-xs">
                      Profile Complete
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.emailAddresses[0]?.emailAddress}</span>
                </div>
                
                {currentUser?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{formatPhoneForDisplay(currentUser.phone)}</span>
                  </div>
                )}
                
                {currentUser?.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{currentUser.address}</span>
                  </div>
                )}
              </div>

              {/* Profile Status */}
              {!currentUser?.profileComplete && currentUser?.role === "customer" && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    Complete your profile to access all features
                  </p>
                </div>
              )}

              <DropdownMenuSeparator />
              
              {/* Actions */}
              <div className="space-y-1">
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/profile')
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>View Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <SignOutButton>
                  <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </SignOutButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
