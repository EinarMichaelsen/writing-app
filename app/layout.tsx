import type React from "react"
import "@/styles/globals.css"
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import type { Metadata } from "next"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ['latin'] })

const monaSans = localFont({
  src: [
    {
      path: '../public/fonts/MonaSans-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/MonaSans-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    // Add other weights/styles as needed
  ],
  variable: '--font-mona-sans',
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
    <html lang="en" suppressHydrationWarning className={cn(inter.className, monaSans.className)}>
      <body>{children}</body>
    </html>
  )
}

import './globals.css'