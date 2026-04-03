"use client"
import type { SummaryNode, Message } from "@/lib/brain-room/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string
  isLoading: boolean
  node: SummaryNode | null
  theme: string
  messages: Message[]
}

export function MarkdownModal({
  isOpen,
  onClose,
  title,
  content,
  isLoading,
  node,
  theme,
  messages,
}: MarkdownModalProps) {
  const { toast } = useToast()

  const handleDownload = () => {
    if (!node || !content) return

    const reportContent = `# ${title}

**メインテーマ**: ${theme}
**生成日時**: ${new Date().toLocaleString("ja-JP")}

---

${content}

---

## 関連する発言

${node.relatedMessages
  .map((index) => {
    const message = messages[index]
    return message ? `**${message.characterName}**: ${message.text}` : ""
  })
  .filter(Boolean)
  .join("\n\n")}
`

    const blob = new Blob([reportContent], { type: "text/markdown; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // 日本語対応のファイル名生成（ファイルシステムで使えない文字のみ置き換え）
    const sanitizedLabel = node.label.replace(/[<>:"/\\|?*]/g, "_")
    const dateStr = new Date().toISOString().split("T")[0]
    a.download = `topic_report_${sanitizedLabel}_${dateStr}.md`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "ダウンロード完了",
      description: "トピック詳細レポートをダウンロードしました。",
    })
  }

  const handleCopy = async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "コピー完了",
        description: "レポート内容をクリップボードにコピーしました。",
      })
    } catch (error) {
      toast({
        title: "コピー失敗",
        description: "クリップボードへのコピーに失敗しました。",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end gap-2 -mt-2 mb-4">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={isLoading || !content}>
            <Download className="h-4 w-4 mr-1" />
            ダウンロード
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={isLoading || !content}>
            <Copy className="h-4 w-4 mr-1" />
            コピー
          </Button>
        </div>

        <div className="flex-1 min-h-0 mt-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto mb-4" />
                <p className="text-gray-600">レポートを生成中...</p>
              </div>
            </div>
          ) : content ? (
            <ScrollArea className="h-full w-full rounded-md border">
              <div className="p-6 prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-800">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-700">{children}</h3>,
                    p: ({ children }) => <p className="mb-3 text-gray-600 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-600">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                        <code className="text-sm font-mono text-gray-800">{children}</code>
                      </pre>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">レポートの生成に失敗しました。</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
