import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, User } from "lucide-react"
import { AuthButtons } from "@/components/auth-buttons"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Blackpepper Camp's Pizza</h1>
          <p className="text-xl text-muted-foreground">Choose your portal to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Restaurant Owner</CardTitle>
              <CardDescription>Manage your restaurant, menu, orders, and more</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthButtons userType="owner" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Customer</CardTitle>
              <CardDescription>Browse menu, place orders, and track your orders</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthButtons userType="customer" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
