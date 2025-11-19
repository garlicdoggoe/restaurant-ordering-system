import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "./providers"
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from "@vercel/analytics/next"
import { NextStepProvider, NextStep } from "nextstepjs"
import { customerOnboardingSteps } from "@/lib/onboarding-steps"

// Configure Gilroy font family with all weights and styles
const gilroy = localFont({
  src: [
    {
      path: "../fonts/gilroy/Gilroy-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-ThinItalic.ttf",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-UltraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-UltraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-RegularItalic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Heavy.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-HeavyItalic.ttf",
      weight: "900",
      style: "italic",
    },
    {
      path: "../fonts/gilroy/Gilroy-Black.ttf",
      weight: "950",
      style: "normal",
    },
    {
      path: "../fonts/gilroy/Gilroy-BlackItalic.ttf",
      weight: "950",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap", // Optimize font loading performance
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
        <body className={`${gilroy.variable} antialiased`}>
          <NextStepProvider>
            <NextStep steps={customerOnboardingSteps}>
              <Providers>{children}</Providers>
            </NextStep>
          </NextStepProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
