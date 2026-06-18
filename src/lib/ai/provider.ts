import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { hasNim } from "@/lib/db/env";

const NIM_BASE_URL =
  process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1";

export const nim = createOpenAICompatible({
  name: "nvidia-nim",
  baseURL: NIM_BASE_URL,
  apiKey: process.env.NVIDIA_NIM_API_KEY ?? "missing",
  // NIM's chat endpoints accept response_format: { type: "json_schema", ... }
  // for the Nemotron family. Without this flag the SDK silently drops the
  // schema, leaving the model to guess the shape.
  supportsStructuredOutputs: true,
});

export const REASONING_MODEL =
  process.env.NIM_REASONING_MODEL ?? "nvidia/llama-3.3-nemotron-super-49b-v1";

export const EMBEDDING_MODEL =
  process.env.NIM_EMBEDDING_MODEL ?? "nvidia/nv-embedqa-e5-v5";

/** Caller helper — gracefully degrades when no NIM key is configured. */
export const isNimEnabled = () => hasNim();
