import type React from "react"
import "@/styles/globals.css"
import { Inter } from 'next/font/google'
import type { Metadata } from "next"
import { cn } from "@/lib/utils"
import { Analytics } from '@vercel/analytics/react'

// Use only Inter font from Google Fonts
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans', 
})

export const metadata: Metadata = {
  title: "WriteMind - AI-Powered Writing Assistant",
  description:
    "Revolutionize your writing process with our AI-powered editor that helps you focus on creativity while enhancing your workflow.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

import './globals.css'