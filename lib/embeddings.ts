import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HF_TOKEN);

const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.HF_TOKEN) {
    throw new Error("HF_TOKEN is not configured");
  }

  const result = await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: text,
    normalize: true,
  });

  if (!Array.isArray(result)) {
    throw new Error("Invalid embedding response from Hugging Face");
  }

  return Array.from(result as number[]);
}