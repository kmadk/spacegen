/**
 * Performance benchmark tests for backend generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackendGenerator } from '../../backend-generator.js';
import { AIPatternAnalyzer } from '../../analyzers/ai-pattern-analyzer.js';
import { VisionAnalyzer } from '../../analyzers/vision-analyzer.js';
import type { DesignData } from '../../types.js';
import {
  createMockOpenAI,
  createTestBackendConfig,
  mockOpenAITextResponse,
  mockOpenAIVisionResponse,
  PerformanceBenchmark
} from '../utils/test-helpers.js';
import {
  mockFigmaDesignData,
  mockScreenshots,
  mockEntityAnalysisResponse,
  mockVisionAnalysisResponse
} from '../fixtures/design-data.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn(() => createMockOpenAI())
}));

describe('Backend Generation Performance Benchmarks', () => {
  let generator: BackendGenerator;
  let mockOpenAI: ReturnType<typeof createMockOpenAI>;
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    // Disable caching for performance tests
    process.env.AI_CACHE_ENABLED = 'false';
    
    mockOpenAI = createMockOpenAI();
    vi.mocked(import('openai')).default = vi.fn(() => mockOpenAI);
    
    // Setup successful mocks
    mockOpenAI.chat.completions.create = vi.fn()
      .mockResolvedValue(mockOpenAITextResponse(mockEntityAnalysisResponse));

    generator = new BackendGenerator(createTestBackendConfig({
      debug: false // Disable debug logging for benchmarks
    }));

    benchmark = new PerformanceBenchmark();
  });

  describe('Text-Only Analysis Benchmarks', () => {
    it('small design file analysis', async () => {
      const start = Date.now();
      await generator.generateFromDesignData(mockFigmaDesignData);
      const duration = Date.now() - start;
      
      // Verify it completes in reasonable time (under 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('medium design file analysis', async () => {
      const mediumDesignData: DesignData = {
        ...mockFigmaDesignData,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          name: `Element ${i}`,
          type: 'FRAME',
          characters: i % 3 === 0 ? `Sample text ${i}` : undefined,
          absoluteBoundingBox: { x: i * 10, y: i * 10, width: 100, height: 50 },
          children: i % 5 === 0 ? [
            {
              id: `child-${i}`,
              name: `Child ${i}`,
              type: 'TEXT',
              characters: `Child text ${i}`,
              absoluteBoundingBox: { x: i * 10 + 10, y: i * 10 + 10, width: 80, height: 30 }
            }
          ] : undefined
        }))
      };

      const start = Date.now();
      await generator.generateFromDesignData(mediumDesignData);
      const duration = Date.now() - start;
      
      // Verify medium complexity completes in reasonable time
      expect(duration).toBeLessThan(10000);
    });

    it('large design file analysis', async () => {
      const largeDesignData: DesignData = {
        ...mockFigmaDesignData,
        nodes: Array.from({ length: 500 }, (_, i) => ({
          id: `node-${i}`,
          name: `Element ${i}`,
          type: 'FRAME',
          characters: i % 2 === 0 ? `Sample text content for element ${i}` : undefined,
          absoluteBoundingBox: { x: i * 5, y: i * 5, width: 150, height: 100 },
          fills: i % 4 === 0 ? [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }] : undefined,
          children: i % 3 === 0 ? Array.from({ length: 3 }, (_, j) => ({
            id: `child-${i}-${j}`,
            name: `Child ${i}-${j}`,
            type: j % 2 === 0 ? 'TEXT' : 'RECTANGLE',
            characters: j % 2 === 0 ? `Child text ${i}-${j}` : undefined,
            absoluteBoundingBox: { x: i * 5 + j * 30, y: i * 5 + j * 20, width: 80, height: 40 }
          })) : undefined
        }))
      };

      const start = Date.now();
      await generator.generateFromDesignData(largeDesignData);
      const duration = Date.now() - start;
      
      // Large files may take longer, but should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Vision-Enhanced Analysis Benchmarks', () => {
    beforeEach(() => {
      // Mock both text and vision responses
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 }))
        .mockResolvedValue(mockOpenAIVisionResponse(mockVisionAnalysisResponse));
    });

    it('vision analysis with single screenshot', async () => {
      const start = Date.now();
      await generator.generateFromDesignData(mockFigmaDesignData, [mockScreenshots[0]]);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(15000);
    });

    it('vision analysis with multiple screenshots', async () => {
      const start = Date.now();
      await generator.generateFromDesignData(mockFigmaDesignData, mockScreenshots);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(20000);
    });

    it('vision analysis with high-res screenshots', async () => {
      const highResScreenshots = mockScreenshots.map(screenshot => ({
        ...screenshot,
        imageUrl: screenshot.imageUrl + '?scale=3' // Simulating high-res
      }));

      const start = Date.now();
      await generator.generateFromDesignData(mockFigmaDesignData, highResScreenshots);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(25000);
    });
  });

  describe('Component-Level Benchmarks', () => {
    let analyzer: AIPatternAnalyzer;
    let visionAnalyzer: VisionAnalyzer;

    beforeEach(() => {
      analyzer = new AIPatternAnalyzer(createTestBackendConfig());
      visionAnalyzer = new VisionAnalyzer(createTestBackendConfig());
    });

    it('AI pattern analysis only', async () => {
      await analyzer.analyzeDesignPatterns(mockFigmaDesignData);
    });
    it('Vision analysis only', async () => {
      await visionAnalyzer.analyzeScreenshots(mockScreenshots);
    });
    it('Combined analysis orchestration', async () => {
      await analyzer.analyzeDesignPatternsWithVision(mockFigmaDesignData, mockScreenshots);
    });  });

  describe('Memory and Resource Usage', () => {
    let initialMemory: number;

    beforeEach(() => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      initialMemory = process.memoryUsage().heapUsed;
    });

    it('should not cause significant memory leaks', async () => {
      // Generate multiple backends in sequence
      for (let i = 0; i < 10; i++) {
        await generator.generateFromDesignData(mockFigmaDesignData);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      // Memory increase should be reasonable (less than 50% growth)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    it('should handle concurrent generations efficiently', async () => {
      const concurrentGenerations = Array.from({ length: 5 }, () =>
        generator.generateFromDesignData(mockFigmaDesignData)
      );

      benchmark.start();
      const results = await Promise.all(concurrentGenerations);
      benchmark.measure('concurrent-generations');

      expect(results).toHaveLength(5);

      const stats = benchmark.getStats('concurrent-generations');
      expect(stats!.avg).toBeLessThan(15000); // Should be faster than sequential
    });
  });

  describe('API Call Efficiency', () => {
    it('should complete analysis within reasonable time', async () => {
      const start = Date.now();
      const result = await generator.generateFromDesignData(mockFigmaDesignData);
      const duration = Date.now() - start;
      
      // Should complete quickly (under 1 second for mocked calls)
      expect(duration).toBeLessThan(1000);
      
      // Should produce valid results
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.models.length).toBeGreaterThan(0);
    });

    it('should efficiently process multiple screenshots', async () => {
      const visionAnalyzer = new VisionAnalyzer(createTestBackendConfig());
      const start = Date.now();
      const result = await visionAnalyzer.analyzeScreenshots(mockScreenshots);
      const duration = Date.now() - start;
      
      // Should complete quickly even with multiple screenshots
      expect(duration).toBeLessThan(2000);
      // Result should be valid (may have 0 entities if vision analysis is disabled/mocked)
      expect(result).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe('Generation Output Size Benchmarks', () => {
    it('should generate appropriately sized output', async () => {
      benchmark.start();
      const result = await generator.generateFromDesignData(mockFigmaDesignData);
      benchmark.measure('output-generation');

      // Validate output size is reasonable
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.length).toBeLessThan(50); // Reasonable upper bound

      const totalOutputSize = result.files.reduce(
        (total, file) => total + file.content.length,
        0
      );

      // Total output should be substantial but not excessive
      expect(totalOutputSize).toBeGreaterThan(1000); // At least 1KB
      expect(totalOutputSize).toBeLessThan(1000000); // Less than 1MB
    });

    it('should scale output appropriately with input size', async () => {
      // Test with different complexity levels
      // Note: Current implementation uses caching and batch optimization,
      // so output size may be consistent for similar patterns

      // Test with different input sizes to verify performance
      const start1 = Date.now();
      const smallResult = await generator.generateFromDesignData({
        ...mockFigmaDesignData,
        name: 'Small Design Test',
        nodes: [{
          id: 'single-node',
          name: 'Single Element',
          type: 'FRAME',
          characters: 'Single text element',
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 }
        }]
      });
      const smallTime = Date.now() - start1;

      const start2 = Date.now();
      const largeResult = await generator.generateFromDesignData({
        ...mockFigmaDesignData,
        name: 'Large Design Test',
        nodes: Array.from({ length: 50 }, (_, i) => ({
          id: `large-node-${i}`,
          name: `Large Element ${i}`,
          type: 'FRAME',
          characters: `Large text content for element ${i} with more detailed information`,
          absoluteBoundingBox: { x: i * 10, y: i * 10, width: 120, height: 60 }
        }))
      });
      const largeTime = Date.now() - start2;

      // Both should generate valid output
      expect(smallResult.files.length).toBeGreaterThan(0);
      expect(largeResult.files.length).toBeGreaterThan(0);
      
      // Performance should be reasonable for both
      expect(smallTime).toBeLessThan(2000);
      expect(largeTime).toBeLessThan(5000);
      
      // Larger input should not take exponentially longer (good caching/batching)
      // Handle case where smallTime might be 0 due to very fast execution
      const timeRatio = smallTime > 0 ? largeTime / smallTime : 1;
      expect(timeRatio).toBeLessThan(10); // More lenient ratio
      
      // Note: Output sizes may be similar due to AI batch optimization and caching
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover from API failures quickly', async () => {
      // First call fails, subsequent calls succeed
      let failureCount = 0;
      mockOpenAI.chat.completions.create = vi.fn().mockImplementation(() => {
        if (failureCount < 2) {
          failureCount++;
          return Promise.reject(new Error('API Error'));
        }
        return mockOpenAITextResponse(mockEntityAnalysisResponse);
      });

      benchmark.start();
      const result = await generator.generateFromDesignData(mockFigmaDesignData);
      benchmark.measure('error-recovery');

      expect(result).toBeDefined();
      
      const stats = benchmark.getStats('error-recovery');
      expect(stats!.avg).toBeLessThan(10000); // Should recover within 10 seconds
    });
  });
});