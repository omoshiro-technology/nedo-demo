"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MessageSquare, GitBranch, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

const navItems = [
  {
    label: "BRAIN-Room",
    href: "/brain-room",
    icon: MessageSquare,
    description: "AI協議空間",
  },
  {
    label: "ComPath",
    href: "/compath",
    icon: GitBranch,
    description: "意思決定キャンバス",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-gray-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        {!collapsed && (
          <div>
            <h2 className="text-sm font-bold text-gray-900">NEDO Demo</h2>
            <p className="text-xs text-gray-500">製造技能伝承AI</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && (
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs text-gray-400">{item.description}</div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">LIGHTz Inc.</p>
        </div>
      )}
    </aside>
  )
}
