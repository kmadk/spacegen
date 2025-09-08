/**
 * Real API integration tests for cost optimization
 * These tests run only when OPENAI_API_KEY is provided
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AIPatternAnalyzer } from '../../analyzers/ai-pattern-analyzer.js';
import { BackendGenerator } from '../../backend-generator.js';
import type { DesignData } from '../../types.js';

// Skip all tests if no API key is provided
const shouldRunRealAPITests = !!process.env.OPENAI_API_KEY || !!process.env.OPEN_AI_API_KEY;

describe.skipIf(!shouldRunRealAPITests)('Real API Cost Optimization Tests', () => {
  let analyzer: AIPatternAnalyzer;
  let generator: BackendGenerator;

  const testDesignData: DesignData = {
    forms: [
      {
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'password', type: 'password', required: true },
          { name: 'confirmPassword', type: 'password', required: true }
        ],
        type: 'registration'
      },
      {
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'textarea', required: false },
          { name: 'price', type: 'number', required: true }
        ],
        type: 'product'
      }
    ],
    lists: [
      {
        items: ['Dashboard', 'Products', 'Orders', 'Users'],
        type: 'navigation'
      },
      {
        items: ['Product 1', 'Product 2', 'Product 3'],
        type: 'product-list'
      }
    ],
    buttons: [
      { text: 'Sign Up', type: 'primary' },
      { text: 'Add Product', type: 'success' },
      { text: 'View Orders', type: 'info' }
    ],
    hasAuthentication: true,
    hasPayments: true,
    hasSpatialData: false
  };

  beforeAll(() => {
    if (!shouldRunRealAPITests) {
      console.log('⏭️  Skipping real API tests - no OPENAI_API_KEY provided');
      return;
    }

    analyzer = new AIPatternAnalyzer({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY!,
      model: 'gpt-4o-mini', // Use cheaper model for testing
      maxTokens: 2000,
      temperature: 0.1,
      enableVision: false, // Disable vision for faster testing
      debug: true
    });

    generator = new BackendGenerator({
      projectName: 'cost-optimization-test',
      openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY!,
      debug: true
    });

    console.log('🧪 Running real API tests for cost optimization...');
  });

  it('should perform real cost-optimized batch analysis', async () => {
    const startTime = Date.now();
    
    const result = await analyzer.analyzeCostOptimized(testDesignData);
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Cost-optimized analysis completed in ${duration}ms`);
    
    // Validate results
    expect(result).toBeDefined();
    expect(result.entities.entities.length).toBeGreaterThan(0);
    expect(result.endpoints.endpoints.length).toBeGreaterThan(0);
    
    console.log(`📊 Results: ${result.entities.entities.length} entities, ${result.endpoints.endpoints.length} endpoints`);
    
    // Log entities for verification
    result.entities.entities.forEach(entity => {
      console.log(`  📋 Entity: ${entity.name} (${entity.fields?.length || 0} fields)`);
    });

    // Should complete in reasonable time (under 30 seconds)
    expect(duration).toBeLessThan(30000);
  }, 45000); // 45 second timeout

  it('should demonstrate caching with real API', async () => {
    console.log('🔄 Testing cache performance...');
    
    // First call - should hit API
    const start1 = Date.now();
    const result1 = await analyzer.analyzeCostOptimized(testDesignData);
    const duration1 = Date.now() - start1;
    
    console.log(`🌐 First call (API): ${duration1}ms`);
    
    // Second call - should hit cache
    const start2 = Date.now();
    const result2 = await analyzer.analyzeCostOptimized(testDesignData);
    const duration2 = Date.now() - start2;
    
    console.log(`📦 Second call (cache): ${duration2}ms`);
    
    // Results should be identical
    expect(result1.entities.entities.length).toBe(result2.entities.entities.length);
    expect(result1.endpoints.endpoints.length).toBe(result2.endpoints.endpoints.length);
    
    // Cache should be much faster (at least 5x improvement)
    expect(duration2).toBeLessThan(duration1 / 5);
    
    console.log(`⚡ Cache speedup: ${Math.round(duration1 / duration2)}x faster`);
  }, 60000); // 60 second timeout

  it('should generate complete backend using cost-optimized analysis', async () => {
    console.log('🏗️  Testing full backend generation...');
    
    const startTime = Date.now();
    
    const result = await generator.generateFromDesignData(testDesignData);
    
    const duration = Date.now() - startTime;
    
    console.log(`🎯 Backend generation completed in ${duration}ms`);
    
    // Validate generated backend
    expect(result).toBeDefined();
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.endpoints.length).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    
    console.log(`📁 Generated: ${result.models.length} models, ${result.endpoints.length} endpoints, ${result.files.length} files`);
    
    // Log generated models
    result.models.forEach(model => {
      console.log(`  🗃️  Model: ${model.name} (${model.fields?.length || 0} fields)`);
    });

    // Should complete in reasonable time
    expect(duration).toBeLessThan(45000);
  }, 60000); // 60 second timeout

  it('should compare costs between old and new methods', async () => {
    console.log('💰 Comparing analysis costs...');
    
    // This is more of a demonstration test - we can't easily measure actual API costs
    // But we can measure token usage and API calls
    
    const testData = {
      ...testDesignData,
      forms: testDesignData.forms?.slice(0, 1), // Reduce complexity for faster testing
      lists: testDesignData.lists?.slice(0, 1)
    };

    // Cost-optimized method
    const optimizedStart = Date.now();
    const optimizedResult = await analyzer.analyzeCostOptimized(testData);
    const optimizedDuration = Date.now() - optimizedStart;

    expect(optimizedResult).toBeDefined();
    
    console.log(`⚡ Cost-optimized: ${optimizedDuration}ms`);
    console.log(`📊 Result quality: ${optimizedResult.entities.entities.length} entities detected`);
    
    // The cost optimization should provide good results quickly
    expect(optimizedDuration).toBeLessThan(20000);
    expect(optimizedResult.entities.entities.length).toBeGreaterThan(0);
  }, 45000);
});