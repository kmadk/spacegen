import { z } from 'zod';

export const AIConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).default('openai'),
  apiKey: z.string(),
  model: z.string().default('gpt-4-turbo-preview'),
  maxTokens: z.number().int().positive().default(4000),
  temperature: z.number().min(0).max(2).default(0.1),
  timeout: z.number().int().positive().default(60000),
  baseUrl: z.string().url().optional()
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

// Common AI response structure
export interface AIResponse {
  id: string;
  model: string;
  provider: 'openai' | 'anthropic';
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: AIChoice[];
  metadata?: Record<string, unknown>;
}

export interface AIChoice {
  message: AIMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  index: number;
  logprobs?: any;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: AIFunctionCall;
  tool_calls?: AIToolCall[];
}

export interface AIFunctionCall {
  name: string;
  arguments: string;
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: AIFunctionCall;
}

export interface AIFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIFunctionParameter>;
    required?: string[];
  };
}

export interface AIFunctionParameter {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  items?: AIFunctionParameter;
  properties?: Record<string, AIFunctionParameter>;
}

// Streaming response types
export interface AIStreamChunk {
  id: string;
  model: string;
  provider: 'openai' | 'anthropic';
  created: number;
  choices: AIStreamChoice[];
}

export interface AIStreamChoice {
  delta: AIStreamDelta;
  index: number;
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
}

export interface AIStreamDelta {
  role?: 'assistant';
  content?: string;
  function_call?: Partial<AIFunctionCall>;
  tool_calls?: Partial<AIToolCall>[];
}

// Provider-specific configurations
export interface OpenAIConfig extends Omit<AIConfig, 'provider'> {
  provider: 'openai';
  organizationId?: string;
  baseUrl?: string;
}

export interface AnthropicConfig extends Omit<AIConfig, 'provider'> {
  provider: 'anthropic';
  version?: string;
  baseUrl?: string;
}

// Common prompt templates for FIR
export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'schema_generation' | 'api_generation' | 'code_analysis' | 'design_analysis';
  template: string;
  variables: string[];
  examples?: AIPromptExample[];
}

export interface AIPromptExample {
  input: Record<string, any>;
  output: string;
  description?: string;
}

// AI task types specific to FIR
export interface AISchemaGenerationTask {
  type: 'schema_generation';
  input: {
    designElements: any[];
    patterns: any[];
    context: string;
  };
  config: {
    databaseType: 'postgresql' | 'mysql' | 'sqlite';
    includeRelationships: boolean;
    includeIndexes: boolean;
    includeSpatialTypes: boolean;
  };
}

export interface AIAPIGenerationTask {
  type: 'api_generation';
  input: {
    schema: any;
    patterns: any[];
    requirements: string[];
  };
  config: {
    framework: 'express' | 'fastify' | 'nextjs';
    includeAuth: boolean;
    includeValidation: boolean;
    includeDocs: boolean;
  };
}

export interface AICodeAnalysisTask {
  type: 'code_analysis';
  input: {
    code: string;
    language: string;
    context: string;
  };
  config: {
    analysisType: 'quality' | 'security' | 'performance' | 'patterns';
    includeRecommendations: boolean;
  };
}

export interface AIDesignAnalysisTask {
  type: 'design_analysis';
  input: {
    designFile: any;
    elements: any[];
  };
  config: {
    detectPatterns: boolean;
    inferEntities: boolean;
    suggestRelationships: boolean;
    analyzeLayout: boolean;
  };
}

export type AITask = 
  | AISchemaGenerationTask 
  | AIAPIGenerationTask 
  | AICodeAnalysisTask 
  | AIDesignAnalysisTask;

// AI response parsing
export interface AIParseableResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  raw: string;
  confidence?: number;
}

// Error types
export interface AIError {
  code: string;
  message: string;
  type: 'rate_limit' | 'invalid_request' | 'authentication' | 'server_error' | 'context_length' | 'content_filter';
  provider: 'openai' | 'anthropic';
  retryable: boolean;
  retryAfter?: number;
}

// Batch processing
export interface AIBatchRequest {
  id: string;
  requests: AIBatchItem[];
  metadata?: Record<string, unknown>;
}

export interface AIBatchItem {
  id: string;
  messages: AIMessage[];
  functions?: AIFunction[];
  temperature?: number;
  max_tokens?: number;
}

export interface AIBatchResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: AIBatchResult[];
  created: number;
  completed?: number;
  failed_count: number;
  success_count: number;
}

export interface AIBatchResult {
  id: string;
  status: 'success' | 'failed';
  response?: AIResponse;
  error?: AIError;
}