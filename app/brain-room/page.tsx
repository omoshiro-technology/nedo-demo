"use client"

import { useState, useEffect, useCallback } from "react"
import { CharacterConfigForm } from "@/components/brain-room/character-config-form"
import { DiscussionInterface } from "@/components/brain-room/discussion-interface"
import type { Character, CharacterSet, KnowledgeFile } from "@/lib/brain-room/types"
import { useToast } from "@/components/ui/use-toast"
import { PRESET_CHARACTER_SETS } from "@/lib/brain-room/preset-character-sets"

const DEFAULT_CHARACTERS: Character[] = Array.from({ length: 3 }, (_, i) => ({
  id: Date.now() + i,
  name: `キャラクター ${i + 1}`,
  personality: "",
  speakingStyle: "",
  background: "",
}))

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS)
  const [characterSets, setCharacterSets] = useState<CharacterSet[]>([])
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([])
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const savedSetsJSON = localStorage.getItem("character-sets")
        const userSets = savedSetsJSON ? JSON.parse(savedSetsJSON) : []
        const allSets = [...PRESET_CHARACTER_SETS, ...userSets]
        setCharacterSets(allSets)

        const savedKnowledgeJSON = localStorage.getItem("knowledge-files")
        const knowledgeData = savedKnowledgeJSON ? JSON.parse(savedKnowledgeJSON) : []
        setKnowledgeFiles(knowledgeData)

        const currentSetId = localStorage.getItem("current-character-set")
        if (currentSetId) {
          const currentSet = allSets.find((set) => set.id === currentSetId)
          if (currentSet) {
            setCharacters(currentSet.characters)
            setIsConfigured(true)
          }
        }
      } catch (error) {
        console.error("Failed to load from localStorage", error)
        toast({
          title: "読み込みエラー",
          description: "設定の読み込みに失敗しました。",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadConfiguration()
  }, [toast])

  const saveUserSetsToLocal = (userSets: CharacterSet[]) => {
    localStorage.setItem("character-sets", JSON.stringify(userSets))
  }

  const saveKnowledgeFilesToLocal = (files: KnowledgeFile[]) => {
    localStorage.setItem("knowledge-files", JSON.stringify(files))
  }

  const handleUploadKnowledge = useCallback((file: KnowledgeFile) => {
    const updatedFiles = knowledgeFiles.filter(f => f.name !== file.name)
    updatedFiles.push(file)
    setKnowledgeFiles(updatedFiles)
    saveKnowledgeFilesToLocal(updatedFiles)
  }, [knowledgeFiles])

  const handleDeleteKnowledge = useCallback((fileId: string) => {
    const updatedFiles = knowledgeFiles.filter(f => f.name !== fileId)
    setKnowledgeFiles(updatedFiles)
    saveKnowledgeFilesToLocal(updatedFiles)
  }, [knowledgeFiles])

  const handleSaveSet = useCallback(
    async (set: CharacterSet) => {
      try {
        const userSets = characterSets.filter((s) => !s.isPreset)
        const existingIndex = userSets.findIndex((s) => s.id === set.id)

        const updatedSet = { ...set }
        let updatedUserSets: CharacterSet[]

        // Blobに保存 (プリセットでない場合のみ)
        if (!updatedSet.isPreset) {
          const response = await fetch("/api/save-character-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedSet),
          })
          if (!response.ok) throw new Error("Failed to save character set to blob")
          const { url } = await response.json()
          updatedSet.blobUrl = url
        }

        if (existingIndex > -1) {
          // 更新
          updatedUserSets = [...userSets]
          updatedUserSets[existingIndex] = updatedSet
          toast({ title: "成功", description: `キャラクターセット「${set.name}」を更新しました。` })
        } else {
          // 新規作成
          updatedUserSets = [...userSets, updatedSet]
          toast({ title: "成功", description: `キャラクターセット「${set.name}」を保存しました。` })
        }

        saveUserSetsToLocal(updatedUserSets)
        setCharacterSets([...PRESET_CHARACTER_SETS, ...updatedUserSets])
        setCharacters(updatedSet.characters)
        localStorage.setItem("current-character-set", updatedSet.id)
        setIsConfigured(true)
      } catch (error) {
        console.error("Failed to save character set", error)
        toast({ title: "エラー", description: "キャラクターセットの保存に失敗しました。", variant: "destructive" })
      }
    },
    [characterSets, toast],
  )

  const handleDeleteSet = useCallback(
    (setId: string) => {
      const setToDelete = characterSets.find((s) => s.id === setId)
      if (!setToDelete || setToDelete.isPreset) {
        toast({ title: "エラー", description: "このキャラクターセットは削除できません。", variant: "destructive" })
        return
      }

      if (!window.confirm(`「${setToDelete.name}」を本当に削除しますか？`)) {
        return
      }

      const updatedUserSets = characterSets.filter((s) => !s.isPreset && s.id !== setId)
      saveUserSetsToLocal(updatedUserSets)
      setCharacterSets([...PRESET_CHARACTER_SETS, ...updatedUserSets])

      // 削除したセットが現在選択中のものだった場合
      if (localStorage.getItem("current-character-set") === setId) {
        localStorage.removeItem("current-character-set")
        setIsConfigured(false)
        setCharacters(DEFAULT_CHARACTERS)
      }

      toast({ title: "成功", description: `キャラクターセット「${setToDelete.name}」を削除しました。` })
    },
    [characterSets, toast],
  )

  const handleLoadSet = useCallback(
    async (setId: string) => {
      const selectedSet = characterSets.find((set) => set.id === setId)
      if (selectedSet) {
        setCharacters(selectedSet.characters)
        setIsConfigured(true)
        localStorage.setItem("current-character-set", setId)

        // 板金プレス工程設計チーム選択時にナレッジも自動ロード
        if (setId === "preset-sheetmetal-press") {
          const hasPress = knowledgeFiles.some(f => f.name === "板金プレス工程設計 熟練技能ナレッジベース")
          if (!hasPress) {
            try {
              const res = await fetch('/sheetmetal-press-knowledge.json')
              if (res.ok) {
                const data = await res.json()
                handleUploadKnowledge(data)
              }
            } catch {}
          }
        }

        toast({
          title: "読み込み完了",
          description: `キャラクターセット「${selectedSet.name}」を読み込みました。`,
        })
      }
    },
    [characterSets, knowledgeFiles, handleUploadKnowledge, toast],
  )

  const handleResetConfig = useCallback(() => {
    setIsConfigured(false)
    localStorage.removeItem("current-character-set")
    toast({
      title: "設定画面へ",
      description: "キャラクターセットの管理または新規作成を行います。",
    })
  }, [toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">BRAIN-Room</h1>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {isConfigured ? (
          <DiscussionInterface
            characters={characters}
            onResetConfig={handleResetConfig}
            characterSets={characterSets}
            onLoadCharacterSet={handleLoadSet}
            knowledgeFiles={knowledgeFiles}
          />
        ) : (
          <CharacterConfigForm
            onSave={handleSaveSet}
            onDelete={handleDeleteSet}
            onLoad={handleLoadSet}
            characterSets={characterSets}
            knowledgeFiles={knowledgeFiles}
            onUploadKnowledge={handleUploadKnowledge}
            onDeleteKnowledge={handleDeleteKnowledge}
          />
        )}
      </main>
    </div>
  )
}
