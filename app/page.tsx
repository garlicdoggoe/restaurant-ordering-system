"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, User, LogIn, UserPlus } from "lucide-react"
import { AuthButtons } from "@/components/auth-buttons"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Blackpepper Camp's Pizza
          </h1>
          <p className="text-xl text-muted-foreground">Sign in to access your portal</p>
        </div>

        {/* Authentication Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Restaurant Owner Card */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 group">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Store className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold">Restaurant Owner</CardTitle>
              <CardDescription className="text-base">
                Manage your restaurant, menu, orders, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Authentication buttons for owners */}
              <AuthButtons userType="owner" />
            </CardContent>
          </Card>

          {/* Customer Card */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-secondary/20 group">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-10 h-10 text-secondary" />
              </div>
              <CardTitle className="text-2xl font-semibold">Customer</CardTitle>
              <CardDescription className="text-base">
                Browse menu, place orders, and track your deliveries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Authentication buttons for customers */}
              <AuthButtons userType="customer" />
            </CardContent>
          </Card>
        </div>

        {/* Footer note */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Choose your role to access the appropriate portal
          </p>
        </div>
      </div>
    </div>
  )
}