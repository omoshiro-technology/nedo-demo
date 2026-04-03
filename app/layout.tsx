import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AppHeader } from "@/components/shell/app-header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NEDO Demo - 製造技能伝承AI",
  description: "熟達者思考AIによる壁打ち型 製造技能伝承ソリューション",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="flex flex-col h-screen overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
