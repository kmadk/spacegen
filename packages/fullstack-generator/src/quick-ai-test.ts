import dotenv from 'dotenv';
dotenv.config();

import { AIPatternAnalyzer } from './ai-analyzer.js';
import type { SpatialElement } from '@fir/spatial-runtime';

// Quick test of just the AI pattern analyzer
const testElements: SpatialElement[] = [
  {
    id: 'product-1',
    type: 'product-card',
    position: { x: 0, y: 0 },
    bounds: { width: 300, height: 400 },
    semanticData: {
      atomic: {
        title: 'MacBook Pro',
        price: 1999.99,
        category: 'Electronics',
        brand: 'Apple'
      }
    }
  },
  {
    id: 'product-2', 
    type: 'product-card',
    position: { x: 350, y: 0 },
    bounds: { width: 300, height: 400 },
    semanticData: {
      atomic: {
        title: 'iPhone 15',
        price: 899.99,
        category: 'Electronics', 
        brand: 'Apple'
      }
    }
  }
];

async function quickAITest() {
  console.log('🧠 Quick AI Pattern Analysis Test');
  console.log(`🔑 API Key Available: ${!!process.env.OPENAI_API_KEY}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No API key - set OPENAI_API_KEY in .env');
    return;
  }

  const analyzer = new AIPatternAnalyzer({
    apiKey: process.env.OPENAI_API_KEY,
    debug: true
  });

  try {
    console.log('📊 Analyzing 2 product cards...');
    const startTime = Date.now();
    
    const analysis = await analyzer.analyzeDesignPatterns(testElements);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Analysis completed in ${duration}ms`);
    
    console.log('\n🎯 RESULTS:');
    console.log(`Entities: ${analysis.entities.entities.length}`);
    console.log(`Relationships: ${analysis.relationships.relationships.length}`);
    console.log(`Endpoints: ${analysis.endpoints.endpoints.length}`);
    
    // Debug: Show raw analysis results
    console.log('\n🔍 RAW ANALYSIS DEBUG:');
    console.log('Entities response:', JSON.stringify(analysis.entities, null, 2));
    console.log('Relationships response:', JSON.stringify(analysis.relationships, null, 2));
    
    // Show first entity details
    if (analysis.entities.entities.length > 0) {
      const entity = analysis.entities.entities[0];
      console.log(`\n📝 First Entity: ${entity.name}`);
      console.log(`Fields: ${entity.fields.map(f => f.name).join(', ')}`);
      console.log(`Confidence: ${entity.confidence}`);
      console.log(`Reasoning: ${entity.reasoning}`);
    } else {
      console.log('\n⚠️  No entities detected - checking if AI returned valid data...');
    }
    
  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
  }
}

quickAITest();