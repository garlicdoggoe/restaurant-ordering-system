import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, User } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Foodies Restaurant</h1>
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
              <Link href="/owner" className="block">
                <Button className="w-full" size="lg">
                  Owner Dashboard
                </Button>
              </Link>
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
              <Link href="/customer" className="block">
                <Button className="w-full" size="lg" variant="secondary">
                  Start Ordering
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
