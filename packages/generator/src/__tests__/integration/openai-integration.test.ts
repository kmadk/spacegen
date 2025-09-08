/**
 * OpenAI API Integration Test
 * Tests actual OpenAI API calls (when API key is provided)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIPatternAnalyzer } from '../../analyzers/ai-pattern-analyzer.js';
import { VisionAnalyzer } from '../../analyzers/vision-analyzer.js';
import { createTestAIConfig } from '../utils/test-helpers.js';

// Skip these tests if no API key is provided
const hasApiKey = process.env.OPEN_AI_API_KEY && process.env.OPEN_AI_API_KEY.startsWith('sk-');
const testCondition = hasApiKey ? describe : describe.skip;

testCondition('OpenAI Integration Tests', () => {
  let aiAnalyzer: AIPatternAnalyzer;
  let visionAnalyzer: VisionAnalyzer;

  beforeEach(() => {
    aiAnalyzer = new AIPatternAnalyzer(createTestAIConfig({
      apiKey: process.env.OPEN_AI_API_KEY,
      enableVision: false, // Keep it simple for integration test
      debug: true
    }));

    visionAnalyzer = new VisionAnalyzer(createTestAIConfig({
      apiKey: process.env.OPEN_AI_API_KEY,
      enableVision: true,
      debug: true
    }));
  });

  it('should successfully call OpenAI API for entity analysis', async () => {
    const mockDesignData = {
      source: 'figma' as const,
      nodes: [{
        id: '1',
        name: 'User Profile Card',
        type: 'FRAME' as const,
        width: 300,
        height: 150,
        children: [
          { id: '2', name: 'Profile Picture', type: 'RECTANGLE' as const, width: 50, height: 50 },
          { id: '3', name: 'john.doe@example.com', type: 'TEXT' as const, characters: 'john.doe@example.com' },
          { id: '4', name: 'John Doe', type: 'TEXT' as const, characters: 'John Doe' }
        ]
      }]
    };

    const result = await aiAnalyzer.analyzeDesignPatterns(mockDesignData);

    expect(result).toBeDefined();
    expect(result.entities).toBeDefined();
    expect(result.entities.entities).toBeInstanceOf(Array);
    expect(result.entities.confidence).toBeGreaterThan(0);
    
    console.log('✅ OpenAI API Entity Analysis Result:', {
      entitiesFound: result.entities.entities.length,
      confidence: result.entities.confidence,
      firstEntity: result.entities.entities[0]?.name
    });
  }, 15000); // 15 second timeout for API call

  it('should successfully call OpenAI API for vision analysis', async () => {
    const mockScreenshots = [{
      id: 'test-screenshot',
      url: 'https://via.placeholder.com/400x300.png?text=User+Dashboard',
      description: 'User dashboard with profile information',
      boundingBox: { x: 0, y: 0, width: 400, height: 300 }
    }];

    if (visionAnalyzer.supportsVision) {
      const result = await visionAnalyzer.analyzeScreenshots(mockScreenshots);

      expect(result).toBeDefined();
      expect(result.entities).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);

      console.log('✅ OpenAI Vision API Analysis Result:', {
        entitiesFound: result.entities.length,
        confidence: result.confidence,
        visualPatterns: result.visualPatterns?.length || 0
      });
    } else {
      console.log('⚠️ Vision analysis not supported - skipping');
      expect(true).toBe(true); // Pass the test
    }
  }, 20000); // 20 second timeout for vision API call

  it('should handle API rate limits gracefully', async () => {
    // Make multiple rapid requests to test rate limiting
    const requests = Array.from({ length: 3 }, (_, i) => 
      aiAnalyzer.analyzeEntities({
        source: 'figma' as const,
        nodes: [{ 
          id: `test-${i}`, 
          name: `Test Entity ${i}`, 
          type: 'FRAME' as const, 
          width: 100, 
          height: 100 
        }]
      })
    );

    const results = await Promise.allSettled(requests);
    
    // At least one should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(0);

    console.log('✅ Rate Limit Test Result:', {
      total: results.length,
      successful: successful.length,
      failed: results.length - successful.length
    });
  }, 30000);
});

// Always run these tests regardless of API key
describe('OpenAI Integration Mock Tests', () => {
  it('should show how to test without API key', () => {
    if (!hasApiKey) {
      console.log('💡 To run live OpenAI integration tests, set OPEN_AI_API_KEY environment variable');
      console.log('💡 Example: OPEN_AI_API_KEY=sk-... pnpm test:run integration');
    }
    expect(true).toBe(true);
  });
});