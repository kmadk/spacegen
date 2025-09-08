/**
 * Quick Agentic Test - Verify the system is working
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AgenticBackendParser } from '../../analyzers/agentic-backend-parser.js';
import type { DesignData } from '../../types.js';

const hasApiKey = !!process.env.OPEN_AI_API_KEY;

describe.skipIf(!hasApiKey)('Agentic Parser - Quick Test', () => {
  let parser: AgenticBackendParser;

  beforeAll(() => {
    console.log('🚀 Quick agentic test with GPT-5...');
    
    parser = new AgenticBackendParser({
      apiKey: process.env.OPEN_AI_API_KEY!,
      model: 'gpt-5',
      maxTokens: 4000, // Reduced for faster testing
      enableVision: false,
      debug: true
    });
  });

  it('should successfully create analysis plan', async () => {
    console.log('📋 Testing analysis planning...');
    
    const simpleData: DesignData = {
      source: 'figma',
      fileId: 'quick-test',
      fileName: 'Todo App',
      nodes: [
        {
          id: '1',
          name: 'Task Title',
          type: 'TEXT',
          characters: 'Buy groceries',
          fills: []
        },
        {
          id: '2', 
          name: 'Due Date',
          type: 'TEXT',
          characters: '2025-09-15',
          fills: []
        }
      ],
      metadata: { version: '1.0', lastModified: new Date().toISOString() }
    };

    const result = await parser.parseDesignAgentic(simpleData);
    
    expect(result).toBeDefined();
    expect(result.models).toBeInstanceOf(Array);
    console.log('✅ Agentic parsing successful!');
    console.log('📊 Result:', {
      models: result.models.length,
      endpoints: result.endpoints.length,
      files: result.files.length
    });
    
  }, 180000); // 3 minute timeout for quick test
});

describe.skipIf(hasApiKey)('Agentic Quick Test - Skipped', () => {
  it('should skip when no API key', () => {
    console.log('⚠️ No API key - agentic quick test skipped');
    expect(true).toBe(true);
  });
});