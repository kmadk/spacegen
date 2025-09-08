/**
 * Integration tests for AI Pattern Analyzer with Vision Analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIPatternAnalyzer } from '../../analyzers/ai-pattern-analyzer.js';
import type { DesignData, CombinedAnalysis } from '../../types.js';
import {
  createMockOpenAI,
  createTestAIConfig,
  mockOpenAIVisionResponse,
  mockOpenAITextResponse,
  PerformanceBenchmark,
  assertConfidenceScore,
  validateGeneratedBackend
} from '../utils/test-helpers.js';
import {
  mockFigmaDesignData,
  mockFigmaDesignData2,
  mockScreenshots,
  mockVisionAnalysisResponse,
  mockEntityAnalysisResponse
} from '../fixtures/design-data.js';

// Mock OpenAI with shared instance
let sharedMockOpenAI = createMockOpenAI();
vi.mock('openai', () => ({
  default: vi.fn(() => sharedMockOpenAI)
}));

describe('AIPatternAnalyzer Integration Tests', () => {
  let analyzer: AIPatternAnalyzer;
  let mockOpenAI: ReturnType<typeof createMockOpenAI>;
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    // Reset the shared mock
    sharedMockOpenAI = createMockOpenAI();
    mockOpenAI = sharedMockOpenAI;
    
    analyzer = new AIPatternAnalyzer(createTestAIConfig({
      enableVision: true,
      debug: true
    }));
    
    benchmark = new PerformanceBenchmark();
    
    // Setup default responses
    mockOpenAI.chat.completions.create = vi.fn()
      .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse))
      .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], confidence: 0.8 }))
      .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], confidence: 0.8 }))
      .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], confidence: 0.8 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    benchmark.reset();
  });

  describe('Text-Only Analysis', () => {
    beforeEach(() => {
      // Mock all text analysis endpoints
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse)) // entities
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 })) // relationships
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 })) // endpoints
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 })); // seed data
    });

    it('should perform complete text-based analysis for Figma design', async () => {
      // Override mock for this specific test
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse({
          entities: [{
            name: 'Product',
            tableName: 'products',
            fields: [
              { name: 'id', type: 'uuid', required: true, primary: true },
              { name: 'name', type: 'varchar(255)', required: true },
              { name: 'price', type: 'decimal(10,2)', required: true }
            ],
            confidence: 0.9
          }]
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], confidence: 0.8 }));
      
      benchmark.start();
      
      const result = await analyzer.analyzeDesignPatterns(mockFigmaDesignData);
      
      benchmark.measure('text-analysis-figma');
      
      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.endpoints).toBeDefined();
      expect(result.seedData).toBeDefined();
      
      expect(result.entities.entities).toHaveLength(1);
      expect(result.entities.entities[0].name).toBe('Product');
      assertConfidenceScore(result.entities.confidence);
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4);
    });

    it('should perform complete text-based analysis for secondary Figma design', async () => {
      benchmark.start();
      
      const result = await analyzer.analyzeDesignPatterns(mockFigmaDesignData2);
      
      benchmark.measure('text-analysis-figma2');
      
      expect(result).toBeDefined();
      expect(result.entities.entities).toHaveLength(1);
      
      // Verify that source information is preserved
      const calls = mockOpenAI.chat.completions.create.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      if (calls[0] && calls[0][0] && calls[0][0].messages) {
        expect(calls[0][0].messages[1].content).toContain('figma');
        expect(calls[0][0].messages[1].content).toContain('Social Media Dashboard');
      }
    });
  });

  describe('Vision-Enhanced Analysis', () => {
    beforeEach(() => {
      // Mock text analysis calls (entities, relationships, endpoints, seed data)
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse)) // text entities
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 })) // text relationships
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 })) // text endpoints
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 })) // text seed data
        // Vision analysis calls (one per screenshot)
        .mockResolvedValueOnce(mockOpenAIVisionResponse(mockVisionAnalysisResponse))
        .mockResolvedValueOnce(mockOpenAIVisionResponse(mockVisionAnalysisResponse));
    });

    it('should perform combined text and vision analysis', async () => {
      benchmark.start();
      
      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        mockScreenshots
      );
      
      benchmark.measure('combined-analysis');
      
      expect(result).toBeDefined();
      expect(result.combinedAnalysis).toBeDefined();
      
      const combined = result.combinedAnalysis!;
      expect(combined.textAnalysis).toBeDefined();
      expect(combined.visionAnalysis).toBeDefined();
      expect(combined.combinedEntities).toHaveLength(2); // User from text + Product from vision
      expect(combined.analysisMethod).toBe('combined');
      assertConfidenceScore(combined.confidenceScore, 0.5, 1.0);
      
      // Should have called both text analysis (4 calls) and vision analysis (2 screenshots)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(6);
    });

    it('should boost confidence when text and vision agree', async () => {
      // Create matching entities between text and vision
      const matchingTextResponse = {
        ...mockEntityAnalysisResponse,
        entities: [
          {
            name: 'Product', // Same as vision analysis
            tableName: 'products',
            fields: [
              { name: 'id', type: 'uuid', required: true, primary: true },
              { name: 'name', type: 'varchar(255)', required: true }
            ],
            confidence: 0.7,
            reasoning: 'Text analysis detected product'
          }
        ]
      };

      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(matchingTextResponse))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAIVisionResponse(mockVisionAnalysisResponse));

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        [mockScreenshots[0]]
      );

      const combined = result.combinedAnalysis!;
      expect(combined.combinedEntities).toHaveLength(1); // Merged into one entity
      
      const mergedEntity = combined.combinedEntities[0];
      expect(mergedEntity.name).toBe('Product');
      expect(mergedEntity.confidence).toBeGreaterThan(0.8); // Boosted confidence
      expect(mergedEntity.reasoning).toContain('Combined analysis');
    });

    it('should handle vision-only entities', async () => {
      // Text analysis returns no entities, vision analysis returns Product
      const emptyTextResponse = {
        ...mockEntityAnalysisResponse,
        entities: []
      };

      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(emptyTextResponse))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAIVisionResponse(mockVisionAnalysisResponse));

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        [mockScreenshots[0]]
      );

      const combined = result.combinedAnalysis!;
      expect(combined.analysisMethod).toBe('vision_only');
      expect(combined.combinedEntities).toHaveLength(1);
      expect(combined.combinedEntities[0].reasoning).toContain('Vision analysis');
    });

    it('should handle text-only when vision analysis fails', async () => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 }))
        .mockRejectedValueOnce(new Error('Vision analysis failed'));

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        mockScreenshots
      );

      const combined = result.combinedAnalysis!;
      expect(combined.analysisMethod).toBe('text_only');
      expect(combined.combinedEntities).toHaveLength(1);
      expect(combined.combinedEntities[0].name).toBe('User');
    });
  });

  describe('Field Merging and Enhancement', () => {
    it('should merge fields from text and vision analysis', async () => {
      const textWithFields = {
        entities: [
          {
            name: 'Product',
            tableName: 'products',
            fields: [
              { name: 'id', type: 'uuid', required: true, primary: true, description: 'Product ID' },
              { name: 'name', type: 'varchar(255)', required: true, description: 'Product name from text' },
              { name: 'category', type: 'varchar(100)', required: false, description: 'Product category' }
            ],
            confidence: 0.8,
            reasoning: 'Text analysis'
          }
        ],
        insights: ['Text analysis insights'],
        confidence: 0.8
      };

      const visionWithFields = {
        entities: [
          {
            name: 'Product',
            tableName: 'products',
            fields: [
              { name: 'name', type: 'varchar(255)', required: true, description: 'Product name from vision' },
              { name: 'price', type: 'decimal(10,2)', required: true, description: 'Product price' },
              { name: 'description', type: 'text', required: false, description: 'Product description' }
            ],
            confidence: 0.9,
            reasoning: 'Vision analysis'
          }
        ],
        visualPatterns: [],
        insights: ['Vision analysis insights'],
        confidence: 0.9
      };

      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(textWithFields))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAIVisionResponse(visionWithFields));

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        [mockScreenshots[0]]
      );

      const mergedEntity = result.combinedAnalysis!.combinedEntities[0];
      expect(mergedEntity.fields).toHaveLength(5); // id, name, category, price, description

      // Check that 'name' field was enhanced
      const nameField = mergedEntity.fields.find(f => f.name === 'name');
      expect(nameField!.description).toContain('confirmed by visual analysis');

      // Check that unique fields from each analysis are preserved
      expect(mergedEntity.fields.find(f => f.name === 'category')).toBeDefined();
      expect(mergedEntity.fields.find(f => f.name === 'price')).toBeDefined();
      expect(mergedEntity.fields.find(f => f.name === 'description')).toBeDefined();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should gracefully handle OpenAI API failures', async () => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockRejectedValue(new Error('OpenAI API Error'));

      const result = await analyzer.analyzeDesignPatterns(mockFigmaDesignData);

      // Should fall back to rule-based analysis
      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.entities.entities.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial API failures in combined analysis', async () => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse(mockEntityAnalysisResponse)) // entities succeed
        .mockRejectedValueOnce(new Error('Relationships failed')) // relationships fail
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.8 })) // endpoints succeed
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.8 })) // seed data succeed
        .mockResolvedValueOnce(mockOpenAIVisionResponse(mockVisionAnalysisResponse)); // vision succeeds

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        [mockScreenshots[0]]
      );

      expect(result).toBeDefined();
      expect(result.entities.entities).toHaveLength(1);
      expect(result.relationships.relationships).toHaveLength(0); // Should use fallback
      expect(result.combinedAnalysis).toBeDefined();
    });

    it('should handle malformed JSON responses', async () => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValue({
          choices: [{
            message: {
              content: 'invalid json response'
            }
          }]
        });

      const result = await analyzer.analyzeDesignPatterns(mockFigmaDesignData);

      // Should fall back to rule-based analysis
      expect(result).toBeDefined();
      expect(result.entities.entities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValue(mockOpenAITextResponse(mockEntityAnalysisResponse));
    });

    it('should handle large design files efficiently', async () => {
      const largeDesignData: DesignData = {
        ...mockFigmaDesignData,
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          name: `Element ${i}`,
          type: 'FRAME',
          characters: `Sample text ${i}`,
          absoluteBoundingBox: { x: i * 10, y: i * 10, width: 100, height: 50 }
        }))
      };

      benchmark.start();
      const result = await analyzer.analyzeDesignPatterns(largeDesignData);
      benchmark.measure('large-design-analysis');

      expect(result).toBeDefined();
      
      const stats = benchmark.getStats('large-design-analysis');
      expect(stats!.avg).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should handle multiple concurrent analyses', async () => {
      const analyses = Array.from({ length: 5 }, () => 
        analyzer.analyzeDesignPatterns(mockFigmaDesignData)
      );

      benchmark.start();
      const results = await Promise.all(analyses);
      benchmark.measure('concurrent-analyses');

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.entities).toBeDefined();
      });

      const stats = benchmark.getStats('concurrent-analyses');
      expect(stats!.avg).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });

  describe('Confidence Scoring Validation', () => {
    it('should calculate confidence scores within valid ranges', async () => {
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse({
          ...mockEntityAnalysisResponse,
          confidence: 0.7
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], insights: [], confidence: 0.8 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], authEndpoints: [], spatialEndpoints: [], confidence: 0.9 }))
        .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], themes: [], spatialPatterns: {}, confidence: 0.6 }))
        .mockResolvedValueOnce(mockOpenAIVisionResponse({
          ...mockVisionAnalysisResponse,
          confidence: 0.85
        }));

      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        [mockScreenshots[0]]
      );

      // Validate all confidence scores
      assertConfidenceScore(result.entities.confidence);
      assertConfidenceScore(result.relationships.confidence);
      assertConfidenceScore(result.endpoints.confidence);
      assertConfidenceScore(result.seedData.confidence);
      assertConfidenceScore(result.combinedAnalysis!.confidenceScore);
      assertConfidenceScore(result.combinedAnalysis!.visionAnalysis.confidence);

      // Combined confidence should be higher than individual scores
      expect(result.combinedAnalysis!.confidenceScore).toBeGreaterThan(
        Math.max(result.entities.confidence, result.combinedAnalysis!.visionAnalysis.confidence)
      );
    });
  });

  describe('Cost-Optimized Batch Analysis', () => {
    beforeEach(() => {
      // Setup mock for batch analysis response
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValue(mockOpenAITextResponse({
          entities: [
            {
              name: 'User',
              tableName: 'users',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true },
                { name: 'email', type: 'text', required: true },
              ],
              indexes: [],
              confidence: 0.9,
            }
          ],
          relationships: [],
          endpoints: [
            {
              path: '/api/users',
              method: 'GET',
              entity: 'User',
              operation: 'list'
            }
          ],
          seedData: [
            {
              entity: 'User',
              sampleCount: 5,
              description: 'Sample users'
            }
          ]
        }));
    });

    it('should perform cost-optimized batch analysis with single API call', async () => {
      benchmark.start();
      
      const result = await analyzer.analyzeCostOptimized(mockFigmaDesignData);
      
      benchmark.measure('cost-optimized-batch-analysis');
      
      expect(result).toBeDefined();
      expect(result.entities.entities).toHaveLength(1);
      expect(result.relationships.relationships).toHaveLength(0);
      expect(result.endpoints.endpoints).toHaveLength(1);
      expect(result.seedData.dataTypes).toHaveLength(1);
      
      // Should make only one API call
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      
      // Verify the API call uses batch prompt format
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Analyze UI for backend gen');
      expect(callArgs.messages[0].content).toContain('JSON');
    });

    it('should use cache for subsequent similar analyses', async () => {
      // Enable caching for this test
      process.env.AI_CACHE_ENABLED = 'true';
      
      // Create new analyzer with caching enabled
      const cachingAnalyzer = new AIPatternAnalyzer(createTestAIConfig({
        enableVision: false,
        debug: true
      }));

      // First call
      await cachingAnalyzer.analyzeCostOptimized(mockFigmaDesignData);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);

      // Reset mock call count
      mockOpenAI.chat.completions.create.mockClear();

      // Second call with same data should use cache
      const result = await cachingAnalyzer.analyzeCostOptimized(mockFigmaDesignData);
      
      expect(result).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(0); // Should use cache

      // Restore cache setting
      process.env.AI_CACHE_ENABLED = 'false';
    });
  });
});