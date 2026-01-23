declare const process: {env: Record<string, string | undefined>};

// --- GLOBAL API SWITCHER ---
/**
 * Determines whether to use the server-side Vertex AI proxy (`/generate-content`).
 * If `true`, uses the proxy. If `false` or undefined, uses the client-side @google/genai SDK directly.
 */
export const useVertexAi = process.env.USE_VERTEX_AI;

// --- MODEL CONFIGURATION ---
/**
 * The default model to use for text generation.
 * Can be overridden by the `DEFAULT_TEXT_MODEL` environment variable.
 */
export const DEFAULT_TEXT_MODEL =
  process.env.DEFAULT_TEXT_MODEL || 'gemini-2.5-pro';
/**
 * The default model to use for image generation.
 * Can be overridden by the `DEFAULT_IMAGE_MODEL` environment variable.
 */
export const DEFAULT_IMAGE_MODEL =
  process.env.DEFAULT_IMAGE_MODEL || 'gemini-2.5-flash-image';
/**
 * A list of supported models for image generation.
 * Can be overridden by the `SUPPORTED_IMAGE_MODEL` environment variable.
 */
export const SUPPORTED_IMAGE_MODELS: string[] = (process.env
  .SUPPORTED_IMAGE_MODEL as unknown as string[]) || [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
];

/**
 * The prompt used to guide the AI in generating descriptive prompts for image generation.
 * This helps create on-brand lifestyle photos based on provided visual elements.
 */
export const PROMPT_HELPER_PROMPT = `You are a creative director specializing in brand identity. Analyze the provided image, which could be a brand style guide, a mood board, or a sample advertisement. Based on the visual elements (colors, typography, imagery, composition, overall mood), generate a concise and descriptive prompt for an AI image generator. This prompt should be used to create a new, on-brand lifestyle photo featuring a product. The prompt should be a single paragraph of text. Do not add any extra commentary, labels, or quotation marks, just return the raw prompt text.
CRITICAL: don't describe the product, only focus on the gesture, the background and the mood, the fond etc.`;

/**
 * The name of the application folder used for storing templates.
 */
export const APP_FOLDER_NAME = 'Banana Milkshake Templates';
/**
 * The filename used for saving template JSON data.
 */
export const TEMPLATE_JSON_FILENAME = 'template.json';
