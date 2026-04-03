"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "BRAIN-Room", href: "/brain-room" },
  { label: "ComPath", href: "/compath" },
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2 shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-sm font-bold text-gray-900 tracking-tight">NEDO Demo</span>
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <span className="text-xs text-gray-400">LIGHTz Inc.</span>
    </header>
  )
}
