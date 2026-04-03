/**
 * RAG Chat Strategy
 * ベクトルDBから取得したナレッジを活用してチャット回答を生成
 */
import type {
  ChatStrategy,
  ChatRequest,
  ChatResponse,
  KnowledgeSource
} from "../../domain/chat/ChatStrategy";
import type {
  KnowledgeRetriever,
  RetrievedKnowledge
} from "../../infrastructure/vectordb/KnowledgeRetriever";
import { buildChatPrompt } from "./buildChatPrompt";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";

const SYSTEM_PROMPT = `あなたは構造化ノードと要約を補助する対話アシスタントです。

## ナレッジの活用
- 提供された【参考ナレッジ】を優先的に活用して回答してください
- 参考ナレッジに該当する情報がない場合のみ、一般知識で補完してください
- 回答には参照したナレッジの番号を[1][2]のように明記してください

## 最重要ルール: 質問禁止、選択肢提示のみ

**原則: 質問形式は使わない。選択肢を提示する形式のみ。**

**禁止:**
- 「〜ですか？」「〜でしょうか？」という質問形式
- 「教えてください」「確認させてください」
- 質問した後に自分で回答案を出す（質問の意味がない）

**許可:**
- 選択肢の提示（必ず改行して箇条書き）
- 条件分岐の提示: 「Aの場合は〜、Bの場合は〜」

**会話の進め方:**
- 得られた情報から判断して**具体的な提案**をする
- 情報が不足していても、一般的なケースを前提に提案する
- 複数パターンがある場合は選択肢として提示（質問ではない）

**選択肢の書式（厳守）:**
- 選択肢は必ず改行して箇条書き（一行に詰め込まない）
- 丸数字（①②③）で始める

❌ 悪い例:
\`\`\`
確認：主目的は「防衛」と「事業化」のどちら？（①防衛 ②事業化 ③どちらでも）

現時点で取れる方針案：
1. ...
\`\`\`

✅ 良い例:
\`\`\`
センシング×AIの出願方針案をお伝えします。

①品質重視の場合
- ...

②コスト重視の場合
- ...
\`\`\`

## 基本姿勢
- 過剰な謝罪や前置きは不要
- 短く明快な回答と候補を提示`;

export class RAGChatStrategy implements ChatStrategy {
  constructor(private retriever: KnowledgeRetriever) {}

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    // 1. ユーザーの質問からベクトルDB検索
    const lastUserMessage = request.messages.filter((m) => m.role === "user").pop();
    const query = lastUserMessage?.content || "";

    console.log(`[RAG] Searching knowledge base for: "${query.slice(0, 100)}..."`);
    const relevantKnowledge = await this.retriever.search(query, {
      topK: 5,
      minSimilarity: 0.35  // 閾値を0.35に設定（ハイブリッドスコアに対応）
    });
    console.log(`[RAG] Found ${relevantKnowledge.length} relevant documents`);

    // 2. 取得したナレッジをコンテキストに追加
    const ragContext = this.buildRAGContext(relevantKnowledge);
    if (ragContext) {
      console.log(`[RAG] Adding ${relevantKnowledge.length} documents to context`);
      relevantKnowledge.forEach((k, i) => {
        console.log(`  [${i + 1}] ${k.title} (similarity: ${k.similarity.toFixed(3)})`);
      });
    } else {
      console.log(`[RAG] No relevant documents found (all below similarity threshold)`);
    }
    const userContent = buildChatPrompt(request.messages, request.context);
    const enhancedContent = ragContext
      ? `${userContent}\n\n【参考ナレッジ】\n${ragContext}`
      : userContent;

    // 3. LLMで回答生成
    const reply = await generateChatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userContent: enhancedContent,
      temperature: 0.3,
      maxTokens: 2048
    });

    // 4. 参照元情報と共に返却
    const sources: KnowledgeSource[] = relevantKnowledge.map((k) => ({
      id: k.id,
      title: k.title,
      excerpt: k.excerpt,
      similarity: k.similarity
    }));

    return { reply, sources: sources.length > 0 ? sources : undefined };
  }

  private buildRAGContext(knowledge: RetrievedKnowledge[]): string {
    if (knowledge.length === 0) {
      return "";
    }

    return knowledge
      .map((k, i) => `[${i + 1}] ${k.title}\n${k.content}`)
      .join("\n\n");
  }
}
