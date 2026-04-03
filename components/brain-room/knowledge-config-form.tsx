"use client"
import { useState, useCallback } from "react"
import type { KnowledgeFile } from "@/lib/brain-room/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Upload, Trash2, Plus, Brain, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface KnowledgeConfigFormProps {
  knowledgeFiles: KnowledgeFile[]
  onUpload: (file: KnowledgeFile) => void
  onDelete: (fileId: string) => void
}

export function KnowledgeConfigForm({ knowledgeFiles, onUpload, onDelete }: KnowledgeConfigFormProps) {
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast({
        title: "エラー",
        description: "JSONファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const text = await file.text()
      const knowledgeData: KnowledgeFile = JSON.parse(text)
      
      // バリデーション
      if (!knowledgeData.version || !knowledgeData.name || !Array.isArray(knowledgeData.items)) {
        throw new Error("無効なナレッジファイル形式です")
      }

      // 重複チェック
      const existingFile = knowledgeFiles.find(kf => kf.name === knowledgeData.name)
      if (existingFile) {
        if (!confirm(`「${knowledgeData.name}」は既に存在します。上書きしますか？`)) {
          return
        }
      }

      onUpload(knowledgeData)
      toast({
        title: "成功",
        description: `ナレッジファイル「${knowledgeData.name}」をアップロードしました。`,
      })
    } catch (error) {
      console.error("Failed to upload knowledge file:", error)
      toast({
        title: "エラー",
        description: "ナレッジファイルの読み込みに失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }, [knowledgeFiles, onUpload, toast])

  const handleDelete = useCallback((fileId: string) => {
    const file = knowledgeFiles.find(kf => kf.name === fileId)
    if (!file) return

    if (confirm(`「${file.name}」を削除しますか？`)) {
      onDelete(fileId)
      if (selectedFile?.name === fileId) {
        setSelectedFile(null)
      }
      toast({
        title: "成功",
        description: `ナレッジファイル「${file.name}」を削除しました。`,
      })
    }
  }, [knowledgeFiles, selectedFile, onDelete, toast])

  const handleLoadSampleFile = useCallback(async () => {
    setIsUploading(true)
    try {
      const response = await fetch('/sony-knowledge.json')
      if (!response.ok) {
        throw new Error('サンプルファイルの読み込みに失敗しました')
      }
      
      const knowledgeData: KnowledgeFile = await response.json()
      
      // 重複チェック
      const existingFile = knowledgeFiles.find(kf => kf.name === knowledgeData.name)
      if (existingFile) {
        if (!confirm(`「${knowledgeData.name}」は既に存在します。上書きしますか？`)) {
          return
        }
      }

      onUpload(knowledgeData)
      toast({
        title: "成功",
        description: `サンプルファイル「${knowledgeData.name}」を読み込みました。`,
      })
    } catch (error) {
      console.error("Failed to load sample file:", error)
      toast({
        title: "エラー",
        description: "サンプルファイルの読み込みに失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [knowledgeFiles, onUpload, toast])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 左パネル: ナレッジファイルリスト */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  ナレッジファイル
                </CardTitle>
                <CardDescription>知識データベース</CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="knowledge-upload"
                  disabled={isUploading}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => document.getElementById('knowledge-upload')?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  {isUploading ? "処理中..." : "アップロード"}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleLoadSampleFile}
                  disabled={isUploading}
                  title="SONYの技術者インタビューや経営方針を含むサンプルデータ"
                >
                  <Download className="mr-1 h-4 w-4" />
                  サンプル
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {knowledgeFiles.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ナレッジファイルが登録されていません</p>
                    <p className="text-sm mb-4">JSONファイルをアップロードしてください</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleLoadSampleFile}
                      disabled={isUploading}
                      className="text-xs"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      SONYサンプルを読み込み
                    </Button>
                  </div>
                ) : (
                  knowledgeFiles.map((file) => (
                    <div
                      key={file.name}
                      className={`p-3 rounded-lg cursor-pointer border ${
                        selectedFile?.name === file.name ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.items.length} 件のナレッジ
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(file.name)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 右パネル: ナレッジファイル詳細 */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedFile ? `${selectedFile.name} の詳細` : "ナレッジファイル詳細"}
            </CardTitle>
            <CardDescription>
              {selectedFile ? 
                `${selectedFile.items.length} 件のナレッジアイテムが含まれています` : 
                "左のリストからナレッジファイルを選択してください"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">バージョン</label>
                    <p className="text-sm text-gray-900">{selectedFile.version}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">作成日</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedFile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {selectedFile.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">説明</label>
                    <p className="text-sm text-gray-900">{selectedFile.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ナレッジアイテム</label>
                  <ScrollArea className="h-[40vh] border rounded-lg">
                    <div className="p-4 space-y-3">
                      {selectedFile.items.map((item, index) => (
                        <div key={item.id} className="border-l-4 border-blue-200 pl-4 py-2">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                          </div>
                          {item.summary && (
                            <p className="text-xs text-gray-600 mb-2">{item.summary}</p>
                          )}
                          <p className="text-xs text-gray-800 line-clamp-3">{item.content}</p>
                          {item.keywords && item.keywords.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.keywords.slice(0, 3).map((keyword, i) => (
                                <span 
                                  key={i} 
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                              {item.keywords.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{item.keywords.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>ナレッジファイルの詳細を表示します</p>
                <p className="text-sm">左のリストからファイルを選択してください</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}