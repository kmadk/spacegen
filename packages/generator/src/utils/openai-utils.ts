/**
 * OpenAI API utilities for backend generation
 */

export interface OpenAIParams {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  response_format?: {
    type: "json_object" | "text";
  };
  stream?: boolean;
}

/**
 * Create standardized OpenAI API parameters
 */
export function createOpenAIParams(params: OpenAIParams): any {
  // Adjust defaults based on model capabilities
  const isGPT5 =
    params.model.includes("gpt-4o") || params.model.includes("gpt-5");

  const apiParams: any = {
    model: params.model,
    messages: params.messages,
    response_format: params.response_format || { type: "json_object" },
    stream: params.stream || false,
  };

  // GPT-5 only supports default temperature (1.0), other models support custom values
  if (params.model.includes("gpt-5")) {
    // Don't set temperature for GPT-5, use default (1.0)
  } else {
    apiParams.temperature = params.temperature || 0.1;
  }

  // Use max_completion_tokens for newer models, max_tokens for older models
  const tokenLimit = params.maxTokens || (isGPT5 ? 8000 : 4000);
  if (isGPT5) {
    apiParams.max_completion_tokens = tokenLimit;
  } else {
    apiParams.max_tokens = tokenLimit;
  }

  return apiParams;
}

/**
 * Validate OpenAI API response
 */
export function validateOpenAIResponse(response: any): boolean {
  return !!(
    response &&
    response.choices &&
    response.choices.length > 0 &&
    response.choices[0].message &&
    response.choices[0].message.content
  );
}

/**
 * Parse JSON response safely
 */
export function parseOpenAIJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.warn("Failed to parse OpenAI JSON response:", error);
    return {};
  }
}

/**
 * Truncate text for API limits (adjusted for GPT-5)
 */
export function truncateForAPI(
  text: string,
  maxTokens: number = 6000,
  model?: string,
): string {
  // GPT-5 has better token efficiency, adjust accordingly
  const isGPT5 = model?.includes("gpt-4o") || model?.includes("gpt-5");
  const tokensPerChar = isGPT5 ? 0.3 : 0.25; // GPT-5 is more efficient

  const maxChars = Math.floor(maxTokens / tokensPerChar);
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + "...";
}

/**
 * Build system prompt for backend generation
 */
export function buildSystemPrompt(
  task: "entities" | "relationships" | "endpoints" | "data",
): string {
  const prompts = {
    entities:
      "You are a database schema generator. Analyze design patterns to create appropriate database entities with proper field types and constraints.",
    relationships:
      "You are a database architect. Analyze spatial relationships between UI elements to infer logical data relationships.",
    endpoints:
      "You are a full-stack developer designing REST APIs. Generate appropriate API endpoints based on UI patterns and data models.",
    data: "You are a data architect generating realistic test data. Create diverse, coherent sample data that matches the application context.",
  };

  return (
    prompts[task] +
    " Always return valid JSON following the exact format specified."
  );
}

/**
 * Estimate token count (adjusted for GPT-5)
 */
export function estimateTokenCount(text: string, model?: string): number {
  const isGPT5 = model?.includes("gpt-4o") || model?.includes("gpt-5");
  const tokensPerChar = isGPT5 ? 0.3 : 0.25; // GPT-5 is more efficient
  return Math.ceil(text.length * tokensPerChar);
}

/**
 * Check if API key is valid format
 */
export function validateAPIKey(apiKey: string): boolean {
  return apiKey.startsWith("sk-") && apiKey.length > 20;
}
