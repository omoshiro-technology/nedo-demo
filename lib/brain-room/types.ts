export interface Character {
  id: number
  name: string
  personality: string
  speakingStyle: string
  background: string
  department?: string
}

export interface CharacterSet {
  id: string
  name: string
  characters: Character[]
  createdAt: string
  blobUrl?: string
  isPreset?: boolean // プリセットかどうかを識別するフラグ
}

export type MessageTagType = "気づき" | "合意" | "重要な情報" | "迷走中" | "戻って考える" | "問題提起"

export interface Message {
  characterId: number
  characterName: string
  text: string
  tag?: MessageTagType
}

export interface SummaryNode {
  id: string
  label: string
  children: string[]
  relatedMessages: number[]
  summary?: string
}

export interface TopicData {
  name: string
  content: string
  x: number
  y: number
  size: number
  importance: number
  island_image: string
  related_topics: string[]
  related_message_indices?: number[]
}

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  summary?: string
  keywords?: string[]
  category?: string
  source?: string
  url?: string
  createdAt: string
  updatedAt?: string
  metadata?: Record<string, any>
}

export interface KnowledgeFile {
  version: string
  name: string
  description?: string
  items: KnowledgeItem[]
  createdAt: string
  updatedAt?: string
}

export interface Message {
  characterId: number
  characterName: string
  text: string
  tag?: MessageTagType
  usedKnowledgeIds?: string[]
  isUser?: boolean
}
