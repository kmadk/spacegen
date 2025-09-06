/**
 * OpenAI API utilities to handle different model parameter requirements
 */

export interface OpenAIRequestParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  response_format?: { type: 'json_object' };
}

/**
 * Create OpenAI API parameters with model-specific token parameter handling
 */
export function createOpenAIParams(params: OpenAIRequestParams): any {
  const { model, messages, temperature, maxTokens, response_format } = params;
  
  const apiParams: any = {
    model,
    messages,
    response_format
  };

  // Model-specific parameter handling
  if (model?.includes('gpt-5') || model?.includes('o1')) {
    // GPT-5 uses max_completion_tokens and only supports temperature = 1 (default)
    apiParams.max_completion_tokens = maxTokens;
    // GPT-5 doesn't support custom temperature - omit parameter to use default (1)
  } else {
    // GPT-4 and older use max_tokens and support custom temperature
    apiParams.max_tokens = maxTokens;
    apiParams.temperature = temperature;
  }

  return apiParams;
}