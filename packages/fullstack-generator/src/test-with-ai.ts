import { FullstackGenerator } from './index.js';
import type { SpatialElement } from '@fir/spatial-runtime';
import type { FullstackGeneratorConfig } from './types.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Test with real OpenAI API - requires OPENAI_API_KEY environment variable
const mockElements: SpatialElement[] = [
  {
    id: 'product-card-1',
    type: 'product-item',
    position: { x: 50, y: 120 },
    bounds: { width: 280, height: 350 },
    semanticData: {
      standard: 'Wireless Headphones - $89.99',
      atomic: {
        title: 'Wireless Headphones',
        price: 89.99,
        rating: 4.5,
        image: 'headphones.jpg',
        inStock: true,
        brand: 'SoundTech',
        color: 'Black',
        wireless: true
      }
    }
  },
  {
    id: 'product-card-2', 
    type: 'product-item',
    position: { x: 350, y: 120 },
    bounds: { width: 280, height: 350 },
    semanticData: {
      standard: 'Smart Watch - $299.99',
      atomic: {
        title: 'Smart Watch',
        price: 299.99,
        rating: 4.2,
        image: 'watch.jpg',
        inStock: true,
        brand: 'TechTime',
        color: 'Silver',
        batteryLife: '7 days'
      }
    }
  },
  {
    id: 'user-profile',
    type: 'user-info',
    position: { x: 1000, y: 20 },
    bounds: { width: 180, height: 120 },
    semanticData: {
      standard: 'John Doe - Premium User',
      atomic: {
        name: 'John Doe',
        email: 'john@example.com',
        membershipType: 'premium',
        joinDate: '2023-01-15',
        avatar: 'john-avatar.jpg'
      }
    }
  }
];

async function testWithAI() {
  console.log('🧪 Testing FIR Fullstack Generator with OpenAI...\n');
  
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY environment variable');
    console.log('📝 Steps to test with AI:');
    console.log('   1. Get API key from: https://platform.openai.com/api-keys');
    console.log('   2. Copy .env.example to .env');
    console.log('   3. Add your key: OPENAI_API_KEY=sk-proj-...');
    console.log('   4. Run: npx tsx src/test-with-ai.ts\n');
    
    console.log('🤖 Falling back to rule-based analysis...');
  }

  const config: FullstackGeneratorConfig = {
    projectName: 'ai-test-ecommerce',
    database: 'postgresql',
    apiFramework: 'express',
    deployment: 'vercel',
    enableSpatialQueries: true,
    debug: true,
    openaiApiKey: process.env.OPENAI_API_KEY // Will use AI if available
  };

  console.log(`🔑 AI Mode: ${process.env.OPENAI_API_KEY ? 'ENABLED' : 'DISABLED (rule-based fallback)'}\n`);

  const generator = new FullstackGenerator(config);
  const project = await generator.generateFromElements(mockElements);

  console.log('\n=== 🎯 RESULTS ANALYSIS ===');
  console.log(`📊 Generated ${project.models.length} models`);
  console.log(`🌐 Generated ${project.endpoints.length} endpoints`);
  console.log(`🗄️  Generated ${project.files.length} files`);

  console.log('\n=== 📋 DATABASE MODELS ===');
  project.models.forEach(model => {
    console.log(`\n📝 ${model.name}:`);
    model.fields.forEach(field => {
      const constraints = field.constraints ? ` [${Object.keys(field.constraints).join(', ')}]` : '';
      console.log(`   ${field.name}: ${field.type}${field.required ? ' (required)' : ''}${constraints}`);
    });
    if (model.relationships.length > 0) {
      console.log(`   🔗 Relationships: ${model.relationships.map(r => `${r.type} ${r.model}`).join(', ')}`);
    }
  });

  console.log('\n=== 🚀 API ENDPOINTS ===');
  const spatialEndpoints = project.endpoints.filter(e => e.spatialQuery).length;
  console.log(`📍 Spatial endpoints: ${spatialEndpoints}/${project.endpoints.length}`);
  
  // Show first few endpoints as examples
  project.endpoints.slice(0, 8).forEach(endpoint => {
    const spatial = endpoint.spatialQuery ? '🗺️ ' : '';
    console.log(`   ${spatial}${endpoint.method} ${endpoint.path}`);
  });
  if (project.endpoints.length > 8) {
    console.log(`   ... and ${project.endpoints.length - 8} more`);
  }

  console.log('\n=== 📁 GENERATED FILES ===');
  const fileTypes = ['sql', 'typescript', 'javascript', 'json'];
  fileTypes.forEach(type => {
    const count = project.files.filter(f => f.type === type).length;
    if (count > 0) {
      console.log(`   ${type.toUpperCase()}: ${count} files`);
    }
  });

  // Show sample generated file
  const schemaFile = project.files.find(f => f.path.includes('schema.sql'));
  if (schemaFile) {
    console.log('\n=== 🔍 SAMPLE: DATABASE SCHEMA ===');
    console.log(schemaFile.content.substring(0, 500) + '...\n');
  }

  console.log('✅ Test completed successfully!');
  
  if (process.env.OPENAI_API_KEY) {
    console.log('🧠 AI analysis was used for entity detection and relationships');
  } else {
    console.log('📐 Rule-based analysis was used (set OPENAI_API_KEY to test AI features)');
  }
}

testWithAI().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});