/**
 * Test utilities and helpers
 */

import { vi, type MockedFunction } from 'vitest';
import type OpenAI from 'openai';
import type { 
  AIAnalysisConfig, 
  BackendGeneratorConfig,
  VisionAnalysisResult,
  AIEntityAnalysis 
} from '../../types.js';

/**
 * Create mock OpenAI instance with robust error handling
 */
export function createMockOpenAI() {
  const mockResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          entities: [{
            name: 'Product',
            fields: [
              { name: 'id', type: 'uuid', required: true, primary: true },
              { name: 'name', type: 'varchar', required: true },
              { name: 'price', type: 'decimal', required: true },
              { name: 'description', type: 'text', required: false }
            ],
            confidence: 0.9,
            tableName: 'products',
            reasoning: 'Product entity inferred from product name, price, and description fields'
          }],
          relationships: [{
            type: 'one_to_many',
            from: 'users',
            to: 'products',
            confidence: 0.8,
            reasoning: 'Users can have multiple products'
          }],
          endpoints: [{
            path: '/products',
            method: 'GET',
            description: 'List all products',
            confidence: 0.9
          }],
          seedData: [{
            entity: 'Product',
            count: 10,
            confidence: 0.8
          }]
        })
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300
    }
  };

  const mockCreate = vi.fn().mockResolvedValue(mockResponse);

  return {
    chat: {
      completions: {
        create: mockCreate
      }
    }
  } as unknown as OpenAI;
}

/**
 * Create test AI analysis config
 */
export function createTestAIConfig(overrides: Partial<AIAnalysisConfig> = {}): AIAnalysisConfig {
  return {
    apiKey: 'test-api-key',
    model: 'gpt-5',
    maxTokens: 4000,
    temperature: 0.1,
    enableVision: true,
    debug: false,
    ...overrides
  };
}

/**
 * Create test backend generator config
 */
export function createTestBackendConfig(overrides: Partial<BackendGeneratorConfig> = {}): BackendGeneratorConfig {
  return {
    projectName: 'test-project',
    openaiApiKey: 'test-api-key',
    debug: false,
    enableSpatialQueries: false,
    database: {
      type: 'postgresql',
      enablePostGIS: false
    },
    deployment: {
      enabled: false,
      provider: 'supabase'
    },
    ...overrides
  };
}

/**
 * Mock successful OpenAI vision response
 */
export function mockOpenAIVisionResponse(customResponse?: any) {
  return {
    choices: [{
      message: {
        content: JSON.stringify(customResponse || {
          visualPatterns: [
            {
              type: 'card_pattern',
              description: 'Product card layout',
              confidence: 0.9,
              suggestedEntity: 'Product'
            }
          ],
          entities: [
            {
              name: 'Product',
              tableName: 'products',
              description: 'Product entity from visual analysis',
              fields: [
                {
                  name: 'name',
                  type: 'varchar(255)',
                  required: true,
                  description: 'Product name'
                },
                {
                  name: 'price',
                  type: 'decimal(10,2)',
                  required: true,
                  description: 'Product price'
                }
              ],
              confidence: 0.9,
              reasoning: 'Visual card pattern detected',
              visualEvidence: 'Card with name and price fields'
            }
          ],
          relationships: [],
          insights: ['E-commerce product catalog identified'],
          confidence: 0.9
        })
      }
    }]
  };
}

/**
 * Mock successful OpenAI text response
 */
export function mockOpenAITextResponse(customResponse?: any) {
  return {
    choices: [{
      message: {
        content: JSON.stringify(customResponse || {
          businessDomain: 'E-commerce',
          entities: [
            {
              name: 'User',
              tableName: 'users',
              description: 'Application user',
              fields: [
                {
                  name: 'id',
                  type: 'uuid',
                  required: true,
                  primary: true,
                  description: 'User identifier'
                },
                {
                  name: 'email',
                  type: 'varchar(320)',
                  required: true,
                  unique: true,
                  description: 'User email'
                }
              ],
              sourceElements: ['user-card'],
              confidence: 0.85,
              reasoning: 'User profile pattern detected'
            }
          ],
          insights: ['User management system'],
          confidence: 0.85
        })
      }
    }]
  };
}

/**
 * Create performance benchmark utility
 */
export class PerformanceBenchmark {
  private startTime: number = 0;
  private measurements: Record<string, number[]> = {};

  start() {
    this.startTime = performance.now();
  }

  measure(operation: string) {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    if (!this.measurements[operation]) {
      this.measurements[operation] = [];
    }
    this.measurements[operation].push(duration);
    
    this.startTime = performance.now();
  }

  getStats(operation: string) {
    const times = this.measurements[operation] || [];
    if (times.length === 0) return null;

    const sorted = times.sort((a, b) => a - b);
    return {
      count: times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  reset() {
    this.measurements = {};
    this.startTime = performance.now();
  }
}

/**
 * Validate generated backend structure
 */
export function validateGeneratedBackend(result: any) {
  // Basic structure validation
  expect(result).toHaveProperty('files');
  expect(result).toHaveProperty('models');
  expect(result).toHaveProperty('endpoints');
  expect(result).toHaveProperty('config');
  expect(result).toHaveProperty('deploymentFiles');

  // Validate files structure
  expect(Array.isArray(result.files)).toBe(true);
  result.files.forEach((file: any) => {
    expect(file).toHaveProperty('path');
    expect(file).toHaveProperty('content');
    expect(file).toHaveProperty('type');
    expect(typeof file.path).toBe('string');
    expect(typeof file.content).toBe('string');
    expect(['database', 'api', 'config', 'data', 'migration', 'test']).toContain(file.type);
  });

  // Validate models structure
  expect(Array.isArray(result.models)).toBe(true);
  result.models.forEach((model: any) => {
    expect(model).toHaveProperty('name');
    expect(model).toHaveProperty('tableName');
    expect(model).toHaveProperty('fields');
    expect(model).toHaveProperty('indexes');
    expect(model).toHaveProperty('relationships');
    expect(Array.isArray(model.fields)).toBe(true);
    expect(Array.isArray(model.indexes)).toBe(true);
    expect(Array.isArray(model.relationships)).toBe(true);
  });

  // Validate endpoints structure
  expect(Array.isArray(result.endpoints)).toBe(true);
  result.endpoints.forEach((endpoint: any) => {
    expect(endpoint).toHaveProperty('method');
    expect(endpoint).toHaveProperty('path');
    expect(endpoint).toHaveProperty('handler');
    expect(endpoint).toHaveProperty('description');
    expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(endpoint.method);
  });
}

/**
 * Wait for async operation with timeout
 */
export function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      try {
        const result = await condition();
        if (result) {
          resolve();
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Create mock fetch function for HTTP requests
 */
export function createMockFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('screenshots')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          images: {
            'page-1': 'https://example.com/screenshot1.png',
            'page-2': 'https://example.com/screenshot2.png'
          }
        })
      });
    }

    if (url.includes('export')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(['fake-image-data'], { type: 'image/png' }))
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    });
  });
}

/**
 * Assert confidence score is within expected range
 */
export function assertConfidenceScore(score: number, min = 0, max = 1) {
  expect(typeof score).toBe('number');
  expect(score).toBeGreaterThanOrEqual(min);
  expect(score).toBeLessThanOrEqual(max);
  expect(Number.isFinite(score)).toBe(true);
}