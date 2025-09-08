/**
 * Tests for test utilities and helpers
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createMockOpenAI,
  createTestAIConfig,
  createTestBackendConfig,
  mockOpenAITextResponse,
  mockOpenAIVisionResponse,
  PerformanceBenchmark,
  validateGeneratedBackend,
  waitFor,
  createMockFetch,
  assertConfidenceScore
} from './test-helpers.js';

describe('Test Helpers', () => {
  describe('createMockOpenAI', () => {
    it('should create mock OpenAI instance with correct structure', () => {
      const mockOpenAI = createMockOpenAI();

      expect(mockOpenAI).toBeDefined();
      expect(mockOpenAI.chat).toBeDefined();
      expect(mockOpenAI.chat.completions).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toBeDefined();
      expect(typeof mockOpenAI.chat.completions.create).toBe('function');
    });
  });

  describe('createTestAIConfig', () => {
    it('should create default AI config', () => {
      const config = createTestAIConfig();

      expect(config.apiKey).toBe('test-api-key');
      expect(config.model).toBe('gpt-5');
      expect(config.maxTokens).toBe(4000);
      expect(config.temperature).toBe(0.1);
      expect(config.enableVision).toBe(true);
      expect(config.debug).toBe(false);
    });

    it('should accept config overrides', () => {
      const config = createTestAIConfig({
        model: 'gpt-5',
        temperature: 0.5,
        enableVision: false,
        debug: true
      });

      expect(config.model).toBe('gpt-5');
      expect(config.temperature).toBe(0.5);
      expect(config.enableVision).toBe(false);
      expect(config.debug).toBe(true);
      expect(config.apiKey).toBe('test-api-key'); // Still default
    });
  });

  describe('createTestBackendConfig', () => {
    it('should create default backend config', () => {
      const config = createTestBackendConfig();

      expect(config.projectName).toBe('test-project');
      expect(config.openaiApiKey).toBe('test-api-key');
      expect(config.debug).toBe(false);
      expect(config.enableSpatialQueries).toBe(false);
      expect(config.database?.type).toBe('postgresql');
      expect(config.database?.enablePostGIS).toBe(false);
    });

    it('should accept config overrides', () => {
      const config = createTestBackendConfig({
        projectName: 'custom-project',
        debug: true,
        enableSpatialQueries: true,
        database: {
          type: 'sqlite',
          enablePostGIS: true
        }
      });

      expect(config.projectName).toBe('custom-project');
      expect(config.debug).toBe(true);
      expect(config.enableSpatialQueries).toBe(true);
      expect(config.database?.type).toBe('sqlite');
      expect(config.database?.enablePostGIS).toBe(true);
    });
  });

  describe('Mock Response Creators', () => {
    it('should create valid OpenAI text response', () => {
      const customData = { test: 'data' };
      const response = mockOpenAITextResponse(customData);

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBeDefined();
      
      const parsedContent = JSON.parse(response.choices[0].message.content);
      expect(parsedContent.test).toBe('data');
    });

    it('should create default text response when no data provided', () => {
      const response = mockOpenAITextResponse();
      
      expect(response.choices).toHaveLength(1);
      const parsedContent = JSON.parse(response.choices[0].message.content);
      expect(parsedContent.businessDomain).toBe('E-commerce');
    });

    it('should create valid OpenAI vision response', () => {
      const customData = { visualPatterns: [], entities: [] };
      const response = mockOpenAIVisionResponse(customData);

      expect(response.choices).toHaveLength(1);
      const parsedContent = JSON.parse(response.choices[0].message.content);
      expect(parsedContent.visualPatterns).toBeDefined();
      expect(parsedContent.entities).toBeDefined();
    });
  });

  describe('PerformanceBenchmark', () => {
    it('should track performance measurements', () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Busy wait for 10ms
      }
      benchmark.measure('test-operation');

      const stats = benchmark.getStats('test-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.avg).toBeGreaterThan(5); // Should be at least 5ms
      expect(stats!.min).toBeGreaterThan(0);
      expect(stats!.max).toBeGreaterThan(0);
    });

    it('should handle multiple measurements', () => {
      const benchmark = new PerformanceBenchmark();
      
      // Take 3 measurements
      for (let i = 0; i < 3; i++) {
        benchmark.start();
        benchmark.measure('multi-test');
      }

      const stats = benchmark.getStats('multi-test');
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBeDefined();
      expect(stats!.median).toBeDefined();
      expect(stats!.p95).toBeDefined();
    });

    it('should return null for unknown operations', () => {
      const benchmark = new PerformanceBenchmark();
      const stats = benchmark.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should reset measurements', () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      benchmark.measure('test');
      
      expect(benchmark.getStats('test')).not.toBeNull();
      
      benchmark.reset();
      expect(benchmark.getStats('test')).toBeNull();
    });
  });

  describe('validateGeneratedBackend', () => {
    it('should validate correct backend structure', () => {
      const validBackend = {
        files: [
          { path: 'test.sql', content: 'CREATE TABLE test;', type: 'database' }
        ],
        models: [
          {
            name: 'Test',
            tableName: 'tests',
            fields: [{ name: 'id', type: 'uuid', required: true }],
            indexes: [],
            relationships: []
          }
        ],
        endpoints: [
          { method: 'GET', path: '/api/test', handler: 'getTest', description: 'Test endpoint' }
        ],
        config: { projectName: 'test' },
        deploymentFiles: []
      };

      expect(() => validateGeneratedBackend(validBackend)).not.toThrow();
    });

    it('should throw for invalid backend structure', () => {
      const invalidBackend = { invalid: true };

      expect(() => validateGeneratedBackend(invalidBackend)).toThrow();
    });
  });

  describe('waitFor', () => {
    it('should resolve when condition is met', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      const start = Date.now();
      await waitFor(condition, 1000, 10);
      const elapsed = Date.now() - start;

      expect(counter).toBeGreaterThanOrEqual(3);
      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it('should timeout when condition is never met', async () => {
      const condition = () => false;

      await expect(waitFor(condition, 50, 10)).rejects.toThrow('Timeout waiting for condition');
    });

    it('should handle async conditions', async () => {
      let counter = 0;
      const condition = async () => {
        counter++;
        return counter >= 2;
      };

      await waitFor(condition, 1000, 10);
      expect(counter).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createMockFetch', () => {
    it('should create mock fetch function', () => {
      const mockFetch = createMockFetch();
      expect(typeof mockFetch).toBe('function');
    });

    it('should handle screenshot requests', async () => {
      const mockFetch = createMockFetch();
      const response = await mockFetch('https://api.test.com/screenshots');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.images).toBeDefined();
    });

    it('should handle export requests', async () => {
      const mockFetch = createMockFetch();
      const response = await mockFetch('https://api.test.com/export');

      expect(response.ok).toBe(true);
      const blob = await response.blob();
      expect(blob).toBeDefined();
    });
  });

  describe('assertConfidenceScore', () => {
    it('should accept valid confidence scores', () => {
      expect(() => assertConfidenceScore(0.5)).not.toThrow();
      expect(() => assertConfidenceScore(0)).not.toThrow();
      expect(() => assertConfidenceScore(1)).not.toThrow();
      expect(() => assertConfidenceScore(0.999)).not.toThrow();
    });

    it('should reject invalid confidence scores', () => {
      expect(() => assertConfidenceScore(-0.1)).toThrow();
      expect(() => assertConfidenceScore(1.1)).toThrow();
      expect(() => assertConfidenceScore(NaN)).toThrow();
      expect(() => assertConfidenceScore(Infinity)).toThrow();
    });

    it('should accept custom ranges', () => {
      expect(() => assertConfidenceScore(5, 0, 10)).not.toThrow();
      expect(() => assertConfidenceScore(15, 0, 10)).toThrow();
    });

    it('should reject non-numbers', () => {
      expect(() => assertConfidenceScore('0.5' as any)).toThrow();
      expect(() => assertConfidenceScore(null as any)).toThrow();
      expect(() => assertConfidenceScore(undefined as any)).toThrow();
    });
  });
});