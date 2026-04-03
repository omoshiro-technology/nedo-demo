export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions",
  openaiModelDefault: process.env.OPENAI_MODEL_DEFAULT ?? "gpt-5.2",
  openaiModelSummary: process.env.OPENAI_MODEL_SUMMARY ?? "gpt-5.2",
  openaiModelGraph: process.env.OPENAI_MODEL_GRAPH ?? "gpt-5.2",
  openaiModelFast: process.env.OPENAI_MODEL_FAST ?? "gpt-4o-mini",
  openaiModelMid: process.env.OPENAI_MODEL_MID ?? "gpt-4o",
  port: Number(process.env.PORT ?? 3001),

  debugLlmLog: process.env.DEBUG_LLM_LOG === "true",

  chatMode: (process.env.CHAT_MODE ?? "llm") as "llm" | "rag",

  vectorDbType: process.env.VECTOR_DB_TYPE as "pinecone" | "weaviate" | "pgvector" | undefined,
  vectorDbUrl: process.env.VECTOR_DB_URL,
  vectorDbApiKey: process.env.VECTOR_DB_API_KEY,
  vectorDbNamespace: process.env.VECTOR_DB_NAMESPACE,

  knowledgeBaseEnabled: process.env.KNOWLEDGE_BASE_ENABLED === "true",
  knowledgeBaseChunkSize: Number(process.env.KNOWLEDGE_BASE_CHUNK_SIZE ?? 1000),
  knowledgeBaseChunkOverlap: Number(process.env.KNOWLEDGE_BASE_CHUNK_OVERLAP ?? 200),
};
