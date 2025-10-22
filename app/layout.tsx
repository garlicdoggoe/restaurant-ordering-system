import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Blackpepper Camp's Pizza - Order Management System",
  description: "Blackpepper Camp's Pizza - Order Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} antialiased`}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
