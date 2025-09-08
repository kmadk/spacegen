import { BaseAdapter } from '../base/base-adapter';
import { APIError } from '../base/errors';
import {
  OpenAIConfig,
  AIResponse,
  AIMessage,
  AIFunction,
  AIStreamChunk,
  AIBatchRequest,
  AIBatchResponse,
  AIError,
  AIParseableResponse
} from './types';

/**
 * OpenAI API adapter for AI-powered analysis and generation
 */
export class OpenAIAdapter extends BaseAdapter {
  protected readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...(config.organizationId && { 'OpenAI-Organization': config.organizationId })
      }
    });

    this.config = config;
    this.log('info', 'OpenAI adapter initialized', { model: config.model });
  }

  /**
   * Create chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      functions?: AIFunction[];
      function_call?: 'none' | 'auto' | { name: string };
      stream?: boolean;
      stop?: string | string[];
      presence_penalty?: number;
      frequency_penalty?: number;
      logit_bias?: Record<string, number>;
      user?: string;
    } = {}
  ): Promise<AIResponse> {
    this.log('info', 'Creating chat completion', { 
      messagesCount: messages.length, 
      model: options.model || this.config.model 
    });

    const payload = {
      model: options.model || this.config.model,
      messages,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.max_tokens || this.config.maxTokens,
      stream: options.stream || false,
      ...this.filterUndefined({
        functions: options.functions,
        function_call: options.function_call,
        stop: options.stop,
        presence_penalty: options.presence_penalty,
        frequency_penalty: options.frequency_penalty,
        logit_bias: options.logit_bias,
        user: options.user
      })
    };

    return await this.withRetry(async () => {
      const response = await this.post<any>('/chat/completions', payload);
      return this.formatResponse(response);
    });
  }

  /**
   * Create streaming chat completion
   */
  async *createChatCompletionStream(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      functions?: AIFunction[];
      function_call?: 'none' | 'auto' | { name: string };
      stop?: string | string[];
    } = {}
  ): AsyncIterable<AIStreamChunk> {
    this.log('info', 'Creating streaming chat completion', { 
      messagesCount: messages.length, 
      model: options.model || this.config.model 
    });

    const payload = {
      model: options.model || this.config.model,
      messages,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.max_tokens || this.config.maxTokens,
      stream: true,
      ...this.filterUndefined({
        functions: options.functions,
        function_call: options.function_call,
        stop: options.stop
      })
    };

    const response = await this.client.post('/chat/completions', payload, {
      responseType: 'stream'
    });

    const stream = response.data;
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            yield this.formatStreamChunk(parsed);
          } catch (error) {
            this.log('warn', 'Failed to parse stream chunk', { line: trimmedLine });
          }
        }
      }
    }
  }

  /**
   * Analyze design elements and generate schema suggestions
   */
  async analyzeDesignForSchema(designElements: any[], context: string = ''): Promise<AIParseableResponse<any[]>> {
    const prompt = this.buildSchemaAnalysisPrompt(designElements, context);
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are an expert database architect. Analyze UI design elements and suggest database schemas in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.createChatCompletion(messages, {
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        return { success: false, error: 'No response content', raw: '' };
      }

      const parsed = this.parseJSONResponse(content);
      return {
        success: parsed.success,
        data: parsed.data,
        error: parsed.error,
        raw: content,
        confidence: 0.8
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: ''
      };
    }
  }

  /**
   * Generate API code from schema
   */
  async generateAPIFromSchema(schema: any, framework: string = 'express'): Promise<AIParseableResponse<string>> {
    const prompt = this.buildAPIGenerationPrompt(schema, framework);
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an expert backend developer. Generate clean, production-ready ${framework} API code based on database schemas.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.createChatCompletion(messages, {
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        return { success: false, error: 'No response content', raw: '' };
      }

      return {
        success: true,
        data: content,
        raw: content,
        confidence: 0.9
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: ''
      };
    }
  }

  /**
   * Analyze code quality and suggest improvements
   */
  async analyzeCodeQuality(code: string, language: string): Promise<AIParseableResponse<any>> {
    const prompt = `Analyze this ${language} code for quality, performance, and best practices. Return analysis as JSON with sections: quality_score (0-100), issues (array of issues with severity/description/fix), recommendations (array of improvements).

Code:
\`\`\`${language}
${code}
\`\`\``;
    
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a senior software engineer and code reviewer. Provide detailed, actionable code analysis in JSON format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.createChatCompletion(messages, {
        temperature: 0.2,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        return { success: false, error: 'No response content', raw: '' };
      }

      const parsed = this.parseJSONResponse(content);
      return {
        success: parsed.success,
        data: parsed.data,
        error: parsed.error,
        raw: content,
        confidence: 0.85
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: ''
      };
    }
  }

  /**
   * Create batch request for multiple completions
   */
  async createBatch(batchRequest: AIBatchRequest): Promise<string> {
    this.log('info', 'Creating batch request', { 
      batchId: batchRequest.id, 
      itemsCount: batchRequest.requests.length 
    });

    const payload = {
      input_file_id: await this.uploadBatchFile(batchRequest),
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: batchRequest.metadata || {}
    };

    const response = await this.withRetry(async () => {
      return await this.post<{ id: string }>('/batches', payload);
    });

    return response.id;
  }

  /**
   * Get batch status and results
   */
  async getBatch(batchId: string): Promise<AIBatchResponse> {
    this.log('info', 'Getting batch status', { batchId });

    return await this.withRetry(async () => {
      const response = await this.get<any>(`/batches/${batchId}`);
      
      // Transform OpenAI response to our format
      return {
        id: response.id,
        status: response.status,
        results: [], // Would need to download and parse results file
        created: response.created_at,
        completed: response.completed_at,
        failed_count: response.failed_requests || 0,
        success_count: response.completed_requests || 0
      };
    });
  }

  /**
   * Health check - verify API access
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/models');
      return true;
    } catch (error) {
      this.log('error', 'OpenAI health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  /**
   * Format OpenAI response to our standard format
   */
  private formatResponse(response: any): AIResponse {
    return {
      id: response.id,
      model: response.model,
      provider: 'openai',
      created: response.created,
      usage: response.usage,
      choices: response.choices
    };
  }

  /**
   * Format OpenAI stream chunk to our standard format
   */
  private formatStreamChunk(chunk: any): AIStreamChunk {
    return {
      id: chunk.id,
      model: chunk.model,
      provider: 'openai',
      created: chunk.created,
      choices: chunk.choices
    };
  }

  /**
   * Build prompt for schema analysis
   */
  private buildSchemaAnalysisPrompt(designElements: any[], context: string): string {
    return `Analyze these UI design elements and suggest database schemas:

Context: ${context}

Design Elements:
${JSON.stringify(designElements, null, 2)}

Generate a JSON response with suggested database tables, fields, relationships, and indexes. Focus on:
1. Identifying repeated patterns that suggest entities
2. Inferring field types from UI content
3. Suggesting relationships between entities
4. Adding spatial indexes where appropriate
5. Including validation constraints

Return only valid JSON without markdown formatting.`;
  }

  /**
   * Build prompt for API generation
   */
  private buildAPIGenerationPrompt(schema: any, framework: string): string {
    return `Generate a complete ${framework} API implementation for this database schema:

Schema:
${JSON.stringify(schema, null, 2)}

Requirements:
1. CRUD operations for all entities
2. Input validation using appropriate libraries
3. Error handling and proper HTTP status codes
4. Relationship handling (joins, includes)
5. Spatial queries if PostGIS is available
6. API documentation comments
7. Security best practices
8. Pagination for list endpoints

Generate clean, production-ready code with proper structure and organization.`;
  }

  /**
   * Parse JSON response from AI
   */
  private parseJSONResponse(content: string): { success: boolean; data?: any; error?: string } {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const parsed = JSON.parse(jsonString);
      return { success: true, data: parsed };
    } catch (error) {
      return { 
        success: false, 
        error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Upload batch file for batch processing
   */
  private async uploadBatchFile(batchRequest: AIBatchRequest): Promise<string> {
    // Convert batch request to JSONL format
    const jsonl = batchRequest.requests
      .map(req => JSON.stringify({
        custom_id: req.id,
        method: 'POST',
        url: '/v1/chat/completions',
        body: {
          model: this.config.model,
          messages: req.messages,
          temperature: req.temperature ?? this.config.temperature,
          max_tokens: req.max_tokens || this.config.maxTokens,
          functions: req.functions
        }
      }))
      .join('\n');

    const formData = new FormData();
    formData.append('purpose', 'batch');
    formData.append('file', new Blob([jsonl], { type: 'application/jsonl' }), 'batch.jsonl');

    const response = await this.post<{ id: string }>('/files', formData, {
      'Content-Type': 'multipart/form-data'
    });

    return response.id;
  }

  /**
   * Filter undefined values from object
   */
  private filterUndefined(obj: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  /**
   * Handle OpenAI-specific errors
   */
  protected handleError(error: any): never {
    const baseError = super.handleError(error);
    
    // Add OpenAI-specific error handling
    if (error.response?.data?.error) {
      const openAIError = error.response.data.error;
      const aiError: AIError = {
        code: openAIError.code || 'unknown',
        message: openAIError.message || baseError.message,
        type: this.mapOpenAIErrorType(openAIError.type || openAIError.code),
        provider: 'openai',
        retryable: this.isRetryableError(openAIError.type || openAIError.code),
        retryAfter: error.response?.headers?.['retry-after'] ? 
          parseInt(error.response.headers['retry-after'], 10) : undefined
      };
      
      throw new APIError(aiError.message, aiError.code, {
        type: aiError.type,
        provider: aiError.provider,
        retryable: aiError.retryable,
        retryAfter: aiError.retryAfter?.toString()
      });
    }
    
    throw baseError;
  }

  /**
   * Map OpenAI error types to our standard types
   */
  private mapOpenAIErrorType(errorType: string): AIError['type'] {
    switch (errorType) {
      case 'rate_limit_exceeded':
        return 'rate_limit';
      case 'invalid_request_error':
        return 'invalid_request';
      case 'authentication_error':
        return 'authentication';
      case 'context_length_exceeded':
        return 'context_length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'server_error';
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorType: string): boolean {
    const retryableTypes = ['rate_limit_exceeded', 'server_error', 'timeout'];
    return retryableTypes.includes(errorType);
  }
}