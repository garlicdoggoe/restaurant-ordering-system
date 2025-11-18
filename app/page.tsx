import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthButtons } from "@/components/auth-buttons"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Blackpepper Camp&apos;s Pizza</h1>
          <p className="text-md text-muted-foreground">Sign in / Sign up to continue</p>
        </div>
        {/* <div className="grid md:grid-cols-2 gap-6"> */}
          {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-primary" />


              </div>
              <CardTitle className="text-xl">Restaurant Owner</CardTitle>
              <CardDescription className="text-md">Manage your restaurant, menu, orders, and more</CardDescription>


            </CardHeader>
            <CardContent>

              <AuthButtons userType="owner" />
            </CardContent>
          </Card> */}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="text-4xl mt-5">👋</div>
              <CardTitle className="text-xl">Hello, there!</CardTitle>
              <CardDescription className="text-md mb-[-20px]">Hungry? Ordering your favorite meals has never been easier. Discover, order, and track in just a few taps.</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthButtons userType="customer" />
            </CardContent>
          </Card>
        {/* </div> */}
      </div>
    </div>
  )
}