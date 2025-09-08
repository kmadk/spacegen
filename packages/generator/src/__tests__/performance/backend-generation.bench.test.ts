/**
 * Performance benchmark tests for backend generation
 */

import { describe, it, expect, vi, beforeEach, bench } from 'vitest';
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
    bench('small design file analysis', async () => {
      await generator.generateFromDesignData(mockFigmaDesignData);
    }, {
      iterations: 10,
      time: 5000
    });

    bench('medium design file analysis', async () => {
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

      await generator.generateFromDesignData(mediumDesignData);
    }, {
      iterations: 5,
      time: 10000
    });

    bench('large design file analysis', async () => {
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

      await generator.generateFromDesignData(largeDesignData);
    }, {
      iterations: 3,
      time: 15000
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

    bench('vision analysis with single screenshot', async () => {
      await generator.generateFromDesignData(mockFigmaDesignData, [mockScreenshots[0]]);
    }, {
      iterations: 5,
      time: 10000
    });

    bench('vision analysis with multiple screenshots', async () => {
      await generator.generateFromDesignData(mockFigmaDesignData, mockScreenshots);
    }, {
      iterations: 3,
      time: 15000
    });

    bench('vision analysis with high-res screenshots', async () => {
      const highResScreenshots = mockScreenshots.map(screenshot => ({
        ...screenshot,
        imageUrl: screenshot.imageUrl + '?scale=3' // Simulating high-res
      }));

      await generator.generateFromDesignData(mockFigmaDesignData, highResScreenshots);
    }, {
      iterations: 2,
      time: 20000
    });
  });

  describe('Component-Level Benchmarks', () => {
    let analyzer: AIPatternAnalyzer;
    let visionAnalyzer: VisionAnalyzer;

    beforeEach(() => {
      analyzer = new AIPatternAnalyzer(createTestBackendConfig());
      visionAnalyzer = new VisionAnalyzer(createTestBackendConfig());
    });

    bench('AI pattern analysis only', async () => {
      await analyzer.analyzeDesignPatterns(mockFigmaDesignData);
    }, {
      iterations: 10,
      time: 5000
    });

    bench('Vision analysis only', async () => {
      await visionAnalyzer.analyzeScreenshots(mockScreenshots);
    }, {
      iterations: 5,
      time: 10000
    });

    bench('Combined analysis orchestration', async () => {
      await analyzer.analyzeDesignPatternsWithVision(mockFigmaDesignData, mockScreenshots);
    }, {
      iterations: 3,
      time: 15000
    });
  });

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
    it('should minimize OpenAI API calls', async () => {
      const callCounter = vi.fn();
      mockOpenAI.chat.completions.create = vi.fn().mockImplementation((...args) => {
        callCounter();
        return mockOpenAITextResponse(mockEntityAnalysisResponse);
      });

      await generator.generateFromDesignData(mockFigmaDesignData);

      // Should make exactly 4 calls for text-only analysis
      // (entities, relationships, endpoints, seedData)
      expect(callCounter).toHaveBeenCalledTimes(4);
    });

    it('should batch vision analysis efficiently', async () => {
      const callCounter = vi.fn();
      mockOpenAI.chat.completions.create = vi.fn().mockImplementation((...args) => {
        callCounter();
        return mockOpenAIVisionResponse(mockVisionAnalysisResponse);
      });

      const visionAnalyzer = new VisionAnalyzer(createTestBackendConfig());
      await visionAnalyzer.analyzeScreenshots(mockScreenshots);

      // Should make one call per screenshot
      expect(callCounter).toHaveBeenCalledTimes(mockScreenshots.length);
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
      const smallResult = await generator.generateFromDesignData({
        ...mockFigmaDesignData,
        nodes: mockFigmaDesignData.nodes.slice(0, 1)
      });

      const largeResult = await generator.generateFromDesignData({
        ...mockFigmaDesignData,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          name: `Element ${i}`,
          type: 'FRAME',
          characters: `Text ${i}`,
          absoluteBoundingBox: { x: i * 10, y: i * 10, width: 100, height: 50 }
        }))
      });

      // Larger input should not necessarily create proportionally larger output
      // (due to AI analysis and deduplication)
      const smallOutputSize = smallResult.files.reduce((t, f) => t + f.content.length, 0);
      const largeOutputSize = largeResult.files.reduce((t, f) => t + f.content.length, 0);

      expect(largeOutputSize).toBeGreaterThan(smallOutputSize);
      expect(largeOutputSize / smallOutputSize).toBeLessThan(10); // Should not be 100x larger
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