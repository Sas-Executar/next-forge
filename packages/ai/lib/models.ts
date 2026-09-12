import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { keys } from "../keys";

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models: { chat: LanguageModel; embeddings: EmbeddingModel } = {
  chat: openai("gpt-4o-mini"),
  embeddings: openai.embedding("text-embedding-3-small"),
};
