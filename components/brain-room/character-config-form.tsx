"use client"
import { useState, useEffect } from "react"
import type { Character, CharacterSet, KnowledgeFile } from "@/lib/brain-room/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserSquare2, AlertCircle, Save, Trash2, PlusCircle, Copy, FilePlus2, Brain } from "lucide-react"
import { KnowledgeConfigForm } from "@/components/brain-room/knowledge-config-form"

interface CharacterConfigFormProps {
  onSave: (set: CharacterSet) => void
  onDelete: (setId: string) => void
  onLoad: (setId: string) => void
  characterSets: CharacterSet[]
  knowledgeFiles: KnowledgeFile[]
  onUploadKnowledge: (file: KnowledgeFile) => void
  onDeleteKnowledge: (fileId: string) => void
}

const DEFAULT_CHARACTERS: Character[] = [
  { id: Date.now(), name: "キャラクター 1", personality: "", speakingStyle: "", background: "" },
]

export function CharacterConfigForm({ onSave, onDelete, onLoad, characterSets, knowledgeFiles, onUploadKnowledge, onDeleteKnowledge }: CharacterConfigFormProps) {
  const [editingSet, setEditingSet] = useState<Omit<CharacterSet, "createdAt" | "blobUrl">>({
    id: "",
    name: "",
    characters: DEFAULT_CHARACTERS,
  })
  const [errors, setErrors] = useState<Record<number, string[]>>({})
  const [activeCharId, setActiveCharId] = useState<number>(DEFAULT_CHARACTERS[0].id)

  const isEditing = !!editingSet.id && !editingSet.isPreset

  const handleSelectSet = (set: CharacterSet) => {
    setEditingSet({ ...set })
    setActiveCharId(set.characters[0]?.id || 0)
  }

  const handleNewSet = () => {
    const newId = `user-${Date.now()}`
    const newChar = { id: Date.now(), name: "新規キャラクター 1", personality: "", speakingStyle: "", background: "" }
    setEditingSet({
      id: newId,
      name: "新しいキャラクターセット",
      characters: [newChar],
    })
    setActiveCharId(newChar.id)
  }

  const handleCopySet = (set: CharacterSet) => {
    const newId = `user-${Date.now()}`
    const newCharacters = set.characters.map((c, i) => ({ ...c, id: Date.now() + i }))
    setEditingSet({
      id: newId,
      name: `${set.name}のコピー`,
      characters: newCharacters,
    })
    setActiveCharId(newCharacters[0]?.id || 0)
  }

  const handleInputChange = (id: number, field: keyof Omit<Character, "id">, value: string) => {
    setEditingSet((prev) => ({
      ...prev,
      characters: prev.characters.map((char) => (char.id === id ? { ...char, [field]: value } : char)),
    }))
    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  const handleAddCharacter = () => {
    if (editingSet.characters.length >= 5) {
      alert("キャラクターは最大5人までです。")
      return
    }
    const newChar = {
      id: Date.now(),
      name: `新規キャラクター ${editingSet.characters.length + 1}`,
      personality: "",
      speakingStyle: "",
      background: "",
    }
    setEditingSet((prev) => ({
      ...prev,
      characters: [...prev.characters, newChar],
    }))
    setActiveCharId(newChar.id)
  }

  const handleRemoveCharacter = (id: number) => {
    if (editingSet.characters.length <= 2) {
      alert("キャラクターは最低2人必要です。")
      return
    }
    setEditingSet((prev) => ({
      ...prev,
      characters: prev.characters.filter((char) => char.id !== id),
    }))
    if (activeCharId === id) {
      setActiveCharId(editingSet.characters[0]?.id || 0)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<number, string[]> = {}
    let isValid = true

    if (!editingSet.name.trim()) {
      alert("キャラクターセット名を入力してください。")
      isValid = false
    }

    if (editingSet.characters.length < 2) {
      alert("キャラクターは最低2人設定してください。")
      isValid = false
    }

    editingSet.characters.forEach((char) => {
      const charErrors: string[] = []
      if (!char.name.trim()) charErrors.push("名前は必須です")
      if (!char.personality.trim()) charErrors.push("人格・個性は必須です")
      if (!char.speakingStyle.trim()) charErrors.push("話し方は必須です")
      if (!char.background.trim()) charErrors.push("背景は必須です")
      if (charErrors.length > 0) {
        newErrors[char.id] = charErrors
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSave = () => {
    if (!validate()) return
    const setToSave: CharacterSet = {
      ...editingSet,
      createdAt: new Date().toISOString(),
    }
    onSave(setToSave)
  }

  useEffect(() => {
    if (characterSets.length > 0 && !editingSet.id) {
      handleSelectSet(characterSets[0])
    }
  }, [characterSets])

  const activeCharacter = editingSet.characters.find((c) => c.id === activeCharId)

  return (
    <Tabs defaultValue="characters" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="characters" className="flex items-center gap-2">
          <UserSquare2 className="h-4 w-4" />
          キャラクター設定
        </TabsTrigger>
        <TabsTrigger value="knowledge" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          ナレッジ管理
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="characters" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 左パネル: セットリスト */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>キャラクターセット</CardTitle>
                <CardDescription>セットを選択</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleNewSet}>
                <FilePlus2 className="mr-1 h-4 w-4" />
                新規作成
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {characterSets.map((set) => (
                  <div
                    key={set.id}
                    className={`p-3 rounded-lg cursor-pointer border ${
                      editingSet.id === set.id ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleSelectSet(set)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{set.name}</p>
                        <p className="text-xs text-gray-500">
                          {set.isPreset ? "プリセット" : `作成日: ${new Date(set.createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopySet(set)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!set.isPreset && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(set.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 右パネル: 編集フォーム */}
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  {editingSet.isPreset ? "プリセット詳細" : isEditing ? "セットの編集" : "新規セットの作成"}
                </CardTitle>
                <CardDescription>
                  {editingSet.isPreset
                    ? "プリセットは編集できません。コピーして使用してください。"
                    : "キャラクター情報を編集します。"}
                </CardDescription>
              </div>
              <Button onClick={() => onLoad(editingSet.id)} disabled={!editingSet.id}>
                このセットで開始
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="setName" className="block text-sm font-medium text-gray-700 mb-1">
                セット名
              </label>
              <Input
                id="setName"
                value={editingSet.name}
                onChange={(e) => setEditingSet((p) => ({ ...p, name: e.target.value }))}
                disabled={editingSet.isPreset}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">キャラクター</label>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {editingSet.characters.map((char) => (
                  <Button
                    key={char.id}
                    variant={activeCharId === char.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCharId(char.id)}
                    className="flex items-center gap-1"
                  >
                    <UserSquare2 className="h-4 w-4" />
                    {char.name || "無名"}
                    {errors[char.id] && <AlertCircle className="h-3 w-3 text-red-500" />}
                  </Button>
                ))}
                {!editingSet.isPreset && (
                  <Button variant="ghost" size="sm" onClick={handleAddCharacter}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    追加
                  </Button>
                )}
              </div>

              {activeCharacter && (
                <div className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">{activeCharacter.name} の設定</h4>
                    {!editingSet.isPreset && (
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveCharacter(activeCharacter.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        このキャラクターを削除
                      </Button>
                    )}
                  </div>
                  {errors[activeCharacter.id] && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {errors[activeCharacter.id].map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <label className="text-sm font-medium">名前</label>
                    <Input
                      value={activeCharacter.name}
                      onChange={(e) => handleInputChange(activeCharacter.id, "name", e.target.value)}
                      disabled={editingSet.isPreset}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">人格・個性</label>
                    <Textarea
                      value={activeCharacter.personality}
                      onChange={(e) => handleInputChange(activeCharacter.id, "personality", e.target.value)}
                      rows={3}
                      disabled={editingSet.isPreset}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">話し方</label>
                    <Textarea
                      value={activeCharacter.speakingStyle}
                      onChange={(e) => handleInputChange(activeCharacter.id, "speakingStyle", e.target.value)}
                      rows={3}
                      disabled={editingSet.isPreset}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">背景</label>
                    <Textarea
                      value={activeCharacter.background}
                      onChange={(e) => handleInputChange(activeCharacter.id, "background", e.target.value)}
                      rows={3}
                      disabled={editingSet.isPreset}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {!editingSet.isPreset && (
              <Button onClick={handleSave} className="w-full" size="lg">
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "変更を保存" : "新規セットとして保存"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
        </div>
      </TabsContent>
      
      <TabsContent value="knowledge" className="mt-6">
        <KnowledgeConfigForm
          knowledgeFiles={knowledgeFiles}
          onUpload={onUploadKnowledge}
          onDelete={onDeleteKnowledge}
        />
      </TabsContent>
    </Tabs>
  )
}
