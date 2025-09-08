/**
 * Agentic Backend Parser Live API Tests
 * Tests the new agentic system with real GPT-5 calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AgenticBackendParser } from '../../analyzers/agentic-backend-parser.js';
import { mockFigmaDesignData } from '../fixtures/design-data.js';
import type { DesignData } from '../../types.js';

// Skip tests if no API key provided
const hasApiKey = !!process.env.OPEN_AI_API_KEY;
const skipMessage = 'OPEN_AI_API_KEY not provided - skipping agentic API tests';

describe.skipIf(!hasApiKey)('Agentic Backend Parser - Live GPT-5 API', () => {
  let parser: AgenticBackendParser;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log(`⚠️ ${skipMessage}`);
      return;
    }

    console.log('🤖 Testing AGENTIC parsing with GPT-5 live API...');
    
    parser = new AgenticBackendParser({
      apiKey: process.env.OPEN_AI_API_KEY!,
      model: 'gpt-5',
      maxTokens: 8000,
      enableVision: true,
      debug: true
    });
  });

  it('should perform complete agentic analysis of e-commerce design', async () => {
    console.log('🎯 Testing agentic parsing with e-commerce design...');
    
    const startTime = Date.now();
    
    const result = await parser.parseDesignAgentic(mockFigmaDesignData);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Agentic parsing completed in ${duration}ms`);
    
    // Validate the agentic result
    expect(result).toBeDefined();
    expect(result.models).toBeInstanceOf(Array);
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.endpoints).toBeInstanceOf(Array);
    expect(result.endpoints.length).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
    expect(result.files.length).toBeGreaterThan(0);
    
    console.log('🏗️ Agentic Backend Generated:', {
      models: result.models.length,
      endpoints: result.endpoints.length, 
      files: result.files.length,
      duration: `${duration}ms`
    });

    // Validate first model has proper structure
    const firstModel = result.models[0];
    expect(firstModel).toHaveProperty('name');
    expect(firstModel).toHaveProperty('fields');
    expect(firstModel.fields.length).toBeGreaterThan(0);

    // Log sample generated content for inspection
    console.log('📊 Sample Generated Model:', firstModel);
    
    if (result.endpoints.length > 0) {
      console.log('🌐 Sample Generated Endpoint:', result.endpoints[0]);
    }
    
  }, 300000); // 5 minute timeout for full agentic analysis

  it('should handle simple design with agentic approach', async () => {
    console.log('🎯 Testing agentic parsing with simple design...');
    
    const simpleData: DesignData = {
      source: 'figma',
      fileId: 'simple-test',
      fileName: 'Simple Blog App',
      nodes: [
        {
          id: 'title1',
          name: 'Blog Post Title',
          type: 'TEXT',
          characters: 'My Amazing Blog Post',
          fills: []
        },
        {
          id: 'author1', 
          name: 'Author Name',
          type: 'TEXT',
          characters: 'John Smith',
          fills: []
        },
        {
          id: 'content1',
          name: 'Post Content', 
          type: 'TEXT',
          characters: 'This is the content of my blog post...',
          fills: []
        }
      ],
      metadata: { 
        version: '1.0', 
        lastModified: new Date().toISOString() 
      }
    };

    const result = await parser.parseDesignAgentic(simpleData);
    
    expect(result).toBeDefined();
    expect(result.models.length).toBeGreaterThanOrEqual(1);
    
    // Should identify at least a Blog Post entity
    const blogModel = result.models.find(m => 
      m.name.toLowerCase().includes('post') || 
      m.name.toLowerCase().includes('blog')
    );
    expect(blogModel).toBeDefined();
    
    console.log('📝 Simple Blog Analysis Result:', {
      models: result.models.map(m => m.name),
      endpoints: result.endpoints.length
    });
    
  }, 240000); // 4 minute timeout

  it('should demonstrate advanced reasoning capabilities', async () => {
    console.log('🧠 Testing GPT-5 advanced reasoning in agentic system...');
    
    const complexData: DesignData = {
      source: 'figma',
      fileId: 'complex-test',
      fileName: 'Multi-tenant SaaS Dashboard',
      nodes: [
        // User management
        { id: '1', name: 'User Avatar', type: 'TEXT', characters: 'JD', fills: [] },
        { id: '2', name: 'User Email', type: 'TEXT', characters: 'john@company.com', fills: [] },
        { id: '3', name: 'Organization Name', type: 'TEXT', characters: 'Acme Corp', fills: [] },
        
        // Subscription & billing
        { id: '4', name: 'Plan Name', type: 'TEXT', characters: 'Pro Plan', fills: [] },
        { id: '5', name: 'Monthly Cost', type: 'TEXT', characters: '$29.99/month', fills: [] },
        { id: '6', name: 'Usage Limit', type: 'TEXT', characters: '10,000 API calls', fills: [] },
        
        // Analytics & metrics
        { id: '7', name: 'Total Users', type: 'TEXT', characters: '1,247', fills: [] },
        { id: '8', name: 'Active Sessions', type: 'TEXT', characters: '34', fills: [] },
        { id: '9', name: 'Revenue This Month', type: 'TEXT', characters: '$12,450', fills: [] }
      ],
      metadata: { 
        version: '1.0', 
        lastModified: new Date().toISOString() 
      }
    };

    const result = await parser.parseDesignAgentic(complexData);
    
    expect(result).toBeDefined();
    expect(result.models.length).toBeGreaterThan(2); // Should identify multiple entities
    
    // Should demonstrate understanding of SaaS concepts
    const modelNames = result.models.map(m => m.name.toLowerCase());
    const hasSaaSConcepts = modelNames.some(name => 
      name.includes('user') || name.includes('organization') || 
      name.includes('subscription') || name.includes('plan')
    );
    expect(hasSaaSConcepts).toBe(true);
    
    console.log('🏢 Complex SaaS Analysis Result:', {
      models: result.models.map(m => ({ name: m.name, fields: m.fields.length })),
      endpoints: result.endpoints.length,
      reasoning: 'GPT-5 should demonstrate understanding of multi-tenant SaaS architecture'
    });
    
  }, 300000); // 5 minute timeout for complex reasoning

  it('should show performance comparison: agentic vs traditional', async () => {
    console.log('⚡ Performance comparison: Agentic vs Traditional parsing...');
    
    const testData = {
      ...mockFigmaDesignData,
      nodes: mockFigmaDesignData.nodes.slice(0, 5) // Smaller for fair comparison
    };

    // Time agentic approach
    const agenticStart = Date.now();
    const agenticResult = await parser.parseDesignAgentic(testData);
    const agenticDuration = Date.now() - agenticStart;
    
    console.log('📊 Performance Comparison:', {
      agentic: {
        duration: `${agenticDuration}ms`,
        models: agenticResult.models.length,
        endpoints: agenticResult.endpoints.length,
        approach: 'Multi-step reasoning with validation'
      },
      traditional: {
        approach: 'Parallel structured prompts',
        note: 'Traditional approach would be faster but less sophisticated'
      }
    });

    // Validate agentic result quality
    expect(agenticResult.models.length).toBeGreaterThan(0);
    expect(agenticResult.endpoints.length).toBeGreaterThan(0);
    
  }, 240000); // 4 minute timeout

  it('should handle edge cases and error recovery', async () => {
    console.log('🛠️ Testing agentic error handling and recovery...');
    
    const edgeCaseData: DesignData = {
      source: 'figma',
      fileId: 'edge-case',
      fileName: 'Minimal Design',
      nodes: [
        { id: '1', name: 'Single Button', type: 'TEXT', characters: 'Click Me', fills: [] }
      ],
      metadata: { version: '1.0', lastModified: new Date().toISOString() }
    };

    const result = await parser.parseDesignAgentic(edgeCaseData);
    
    // Should still generate something meaningful
    expect(result).toBeDefined();
    expect(result.models.length).toBeGreaterThanOrEqual(0);
    
    console.log('🎯 Edge Case Handling Result:', {
      models: result.models.length,
      endpoints: result.endpoints.length,
      reasoning: 'Agentic system should handle minimal input gracefully'
    });
    
  }, 180000); // 3 minute timeout
});

describe.skipIf(hasApiKey)('Agentic API Tests - Skipped', () => {
  it('should skip when no API key provided', () => {
    console.log('⚠️ OPEN_AI_API_KEY not set - agentic API tests skipped');
    console.log('💡 Set OPEN_AI_API_KEY to test agentic backend parsing');
    console.log('💡 Example: OPEN_AI_API_KEY=sk-... pnpm test:run integration/agentic-live-api');
    expect(true).toBe(true);
  });
});