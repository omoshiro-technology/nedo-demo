import type { MessageTagType } from "@/lib/types"

interface MessageTagProps {
  tag: MessageTagType
}

const tagConfig = {
  気づき: { iconPath: "/icons/awareness.svg", color: "bg-white border border-blue-300 text-blue-800" },
  合意: { iconPath: "/icons/agreement.svg", color: "bg-white border border-red-300 text-red-800" },
  重要な情報: { iconPath: "/icons/importantInfo.svg", color: "bg-white border border-orange-300 text-orange-800" },
  迷走中: { iconPath: "/icons/goingOffTrack.svg", color: "bg-white border border-yellow-400 text-yellow-800" },
  戻って考える: { iconPath: "/icons/thinkAgein.svg", color: "bg-white border border-indigo-300 text-indigo-800" },
  問題提起: { iconPath: "/icons/raisingIssues.svg", color: "bg-white border border-green-300 text-green-800" },
}

export function MessageTag({ tag }: MessageTagProps) {
  const config = tagConfig[tag]
  if (!config) return null

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
      <img
        src={config.iconPath || "/placeholder.svg"}
        alt={tag}
        width={14}
        height={14}
        className="flex-shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
      {tag}
    </div>
  )
}
