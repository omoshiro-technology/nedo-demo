import type { KnowledgeFile, KnowledgeItem } from "@/lib/types"

export interface SearchResult {
  item: KnowledgeItem
  score: number
  matchedKeywords: string[]
}

export interface KnowledgeSearchResponse {
  results: Array<{
    id: string
    title: string
    content: string
    summary?: string
    score: number
    matchedKeywords: string[]
  }>
  totalFound: number
}

// Simple text-based search function
function searchKnowledge(
  query: string, 
  knowledgeFiles: KnowledgeFile[], 
  maxResults: number = 5
): SearchResult[] {
  const queryLower = query.toLowerCase()
  const queryTokens = queryLower.split(/\s+/).filter(token => token.length > 1)
  
  const allItems: Array<{ item: KnowledgeItem, sourceFile: string }> = []
  
  // Collect all knowledge items from all files
  knowledgeFiles.forEach(file => {
    file.items.forEach(item => {
      allItems.push({ item, sourceFile: file.name })
    })
  })
  
  const results: SearchResult[] = []
  
  allItems.forEach(({ item }) => {
    let score = 0
    const matchedKeywords: string[] = []
    
    // Search in title (high weight)
    const titleLower = item.title.toLowerCase()
    queryTokens.forEach(token => {
      if (titleLower.includes(token)) {
        score += 10
        if (!matchedKeywords.includes(token)) {
          matchedKeywords.push(token)
        }
      }
    })
    
    // Search in content (medium weight)
    const contentLower = item.content.toLowerCase()
    queryTokens.forEach(token => {
      if (contentLower.includes(token)) {
        score += 5
        if (!matchedKeywords.includes(token)) {
          matchedKeywords.push(token)
        }
      }
    })
    
    // Search in summary (medium weight)
    if (item.summary) {
      const summaryLower = item.summary.toLowerCase()
      queryTokens.forEach(token => {
        if (summaryLower.includes(token)) {
          score += 4
          if (!matchedKeywords.includes(token)) {
            matchedKeywords.push(token)
          }
        }
      })
    }
    
    // Search in keywords (high weight)
    if (item.keywords) {
      item.keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase()
        queryTokens.forEach(token => {
          if (keywordLower.includes(token)) {
            score += 8
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword)
            }
          }
        })
      })
    }
    
    // Search in category (medium weight)
    if (item.category) {
      const categoryLower = item.category.toLowerCase()
      queryTokens.forEach(token => {
        if (categoryLower.includes(token)) {
          score += 6
          if (!matchedKeywords.includes(token)) {
            matchedKeywords.push(token)
          }
        }
      })
    }
    
    // Only include items with positive score
    if (score > 0) {
      results.push({
        item,
        score,
        matchedKeywords
      })
    }
  })
  
  // Sort by score (descending) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

// Direct function call for knowledge search (no tool wrapper)
export function performKnowledgeSearch(
  query: string, 
  knowledgeFiles: KnowledgeFile[], 
  maxResults: number = 5
): KnowledgeSearchResponse {
  console.log(`[Knowledge Search] Searching for: "${query}" in ${knowledgeFiles.length} files`)
  
  try {
    const searchResults = searchKnowledge(query, knowledgeFiles, maxResults)
    
    console.log(`[Knowledge Search] Found ${searchResults.length} results`)
    
    const mappedResults = searchResults.map(result => ({
      id: result.item.id,
      title: result.item.title,
      content: result.item.content,
      summary: result.item.summary,
      score: result.score,
      matchedKeywords: result.matchedKeywords,
    }))
    
    console.log(`[Knowledge Search] Returning results:`, mappedResults.map(r => ({ id: r.id, title: r.title })))
    
    // CRITICAL: Store results immediately in global variable to avoid Mastra tool result loss
    if (!global.knowledgeSearchAccumulator) {
      global.knowledgeSearchAccumulator = []
    }
    global.knowledgeSearchAccumulator.push(...mappedResults)
    console.log(`[Knowledge Search] Accumulated total: ${global.knowledgeSearchAccumulator.length} results`)
    
    return {
      results: mappedResults,
      totalFound: searchResults.length,
    }
  } catch (error) {
    console.error("Knowledge search error:", error)
    return {
      results: [],
      totalFound: 0,
    }
  }
}

// Helper function to format search results for agent context
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "関連する知識が見つかりませんでした。"
  }
  
  return results.map((result, index) => {
    const { item, matchedKeywords } = result
    
    let formatted = `\n[知識 ${index + 1}] ${item.title}`
    if (item.summary) {
      formatted += `\n概要: ${item.summary}`
    }
    formatted += `\n内容: ${item.content}`
    
    if (matchedKeywords.length > 0) {
      formatted += `\nキーワード: ${matchedKeywords.join(", ")}`
    }
    
    if (item.source) {
      formatted += `\n出典: ${item.source}`
    }
    
    return formatted
  }).join("\n---")
}