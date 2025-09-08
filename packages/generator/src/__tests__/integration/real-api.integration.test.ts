/**
 * REAL API Integration Tests
 * Tests the actual OpenAI API with real calls
 * Only runs when OPEN_AI_API_KEY is set
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AIPatternAnalyzer } from '../../analyzers/ai-pattern-analyzer.js';
import { BackendGenerator } from '../../backend-generator.js';
import { mockFigmaDesignData } from '../fixtures/design-data.js';
import type { DesignData } from '../../types.js';

// Skip tests if no API key provided
const hasApiKey = !!process.env.OPEN_AI_API_KEY;
const skipMessage = 'OPEN_AI_API_KEY not provided - skipping real API tests';

describe.skipIf(!hasApiKey)('Real OpenAI API Integration', () => {
  let analyzer: AIPatternAnalyzer;
  let generator: BackendGenerator;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log(`⚠️ ${skipMessage}`);
      return;
    }

    console.log('🚀 Running REAL API integration tests with OpenAI');
    
    analyzer = new AIPatternAnalyzer({
      apiKey: process.env.OPEN_AI_API_KEY!,
      model: 'gpt-5',
      maxTokens: 4000,
      temperature: 0.1,
      enableVision: true,
      debug: true
    });

    generator = new BackendGenerator({
      projectName: 'real-api-test',
      openaiApiKey: process.env.OPEN_AI_API_KEY!,
      debug: true
    });
  });

  it('should analyze design patterns with real OpenAI API', async () => {
    const startTime = Date.now();
    
    const result = await analyzer.analyzeDesignPatterns(mockFigmaDesignData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Real API call completed in ${duration}ms`);
    
    // Validate the response structure
    expect(result).toBeDefined();
    expect(result.entities).toBeDefined();
    expect(result.entities.entities).toBeInstanceOf(Array);
    expect(result.entities.entities.length).toBeGreaterThan(0);
    
    // Log the actual AI response for debugging
    console.log('🤖 Real AI Analysis Result:', {
      entitiesFound: result.entities.entities.length,
      firstEntity: result.entities.entities[0],
      confidence: result.entities.confidence,
      relationshipsFound: result.relationships?.relationships?.length || 0,
      endpointsFound: result.endpoints?.endpoints?.length || 0
    });

    // Validate entity structure
    const firstEntity = result.entities.entities[0];
    expect(firstEntity).toHaveProperty('name');
    expect(firstEntity).toHaveProperty('fields');
    expect(firstEntity).toHaveProperty('confidence');
    expect(firstEntity.confidence).toBeGreaterThan(0);
    expect(firstEntity.confidence).toBeLessThanOrEqual(1);

    // Validate fields
    expect(firstEntity.fields).toBeInstanceOf(Array);
    expect(firstEntity.fields.length).toBeGreaterThan(0);
    
    const firstField = firstEntity.fields[0];
    expect(firstField).toHaveProperty('name');
    expect(firstField).toHaveProperty('type');
  }, 60000); // 60 second timeout for GPT-5 API calls

  it('should generate complete backend with real API', async () => {
    const startTime = Date.now();
    
    const result = await generator.generateFromDesignData(mockFigmaDesignData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Full backend generation completed in ${duration}ms`);
    
    // Validate generated project
    expect(result).toBeDefined();
    expect(result.models).toBeInstanceOf(Array);
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.endpoints).toBeInstanceOf(Array);
    expect(result.files).toBeInstanceOf(Array);
    
    console.log('🏗️ Generated Backend:', {
      models: result.models.length,
      endpoints: result.endpoints.length,
      files: result.files.length,
      modelNames: result.models.map(m => m.name)
    });

    // Validate first model
    const firstModel = result.models[0];
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('tableName');
    expect(firstModel).toHaveProperty('fields');
    expect(firstModel.fields.length).toBeGreaterThan(0);

    // Validate generated files
    expect(result.files.length).toBeGreaterThan(0);
    const schemaFile = result.files.find(f => f.path.includes('schema'));
    expect(schemaFile).toBeDefined();
    expect(schemaFile!.content).toContain('CREATE TABLE');
  }, 120000); // 120 second timeout for GPT-5 full generation

  it('should handle rate limiting gracefully', async () => {
    console.log('🔄 Testing rate limit handling with multiple concurrent requests...');
    
    const promises = Array.from({ length: 3 }, () => 
      analyzer.analyzeDesignPatterns({
        ...mockFigmaDesignData,
        nodes: mockFigmaDesignData.nodes.slice(0, 2) // Smaller payload
      })
    );

    const results = await Promise.allSettled(promises);
    
    // At least some should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(0);
    
    console.log(`✅ Rate limit test: ${successful.length}/3 requests succeeded`);
    
    // Check if any failed due to rate limiting
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.log('⚠️ Some requests failed (expected with rate limiting):', 
        failed.map(f => f.status === 'rejected' ? f.reason.message : ''));
    }
  }, 45000); // 45 second timeout

  it('should validate API key and model access', async () => {
    // Test with a simple request to validate API access
    const simpleData: DesignData = {
      source: 'figma',
      fileId: 'test',
      fileName: 'API Test',
      nodes: [{
        id: 'text1',
        name: 'Product Name',
        type: 'TEXT',
        characters: 'Test Product',
        fills: []
      }],
      metadata: { version: '1.0', lastModified: new Date().toISOString() }
    };

    const result = await analyzer.analyzeDesignPatterns(simpleData);
    
    expect(result).toBeDefined();
    expect(result.entities.entities.length).toBeGreaterThanOrEqual(1);
    
    console.log('✅ API key validation successful - OpenAI API is accessible');
  }, 20000);
});

describe.skipIf(hasApiKey)('Real API Tests - Skipped', () => {
  it('should skip when no API key provided', () => {
    console.log('⚠️ OPEN_AI_API_KEY not set - real API tests skipped');
    console.log('💡 Set OPEN_AI_API_KEY environment variable to run real API tests');
    console.log('💡 Example: OPEN_AI_API_KEY=sk-... pnpm test:run integration/real-api');
    expect(true).toBe(true); // Always pass when skipping
  });
});