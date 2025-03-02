import type React from "react"
import "@/styles/globals.css"
import { Mona_Sans as FontSans } from "next/font/google"
import type { Metadata } from "next"
import { cn } from "@/lib/utils"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
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
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>{children}</body>
    </html>
  )
}



import './globals.css'