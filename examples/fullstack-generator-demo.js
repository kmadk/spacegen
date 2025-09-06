/**
 * FIR Fullstack Generator Demo
 * 
 * This example demonstrates the complete workflow:
 * 1. Extract spatial elements from Figma
 * 2. Generate database models with spatial support
 * 3. Create API endpoints with spatial queries
 * 4. Generate deployment configuration
 * 5. Output complete full-stack project
 */

import { FullstackGenerator } from '../packages/fullstack-generator/dist/index.js';

async function demonstrateFullstackGeneration() {
  console.log('🔥 FIR Fullstack Generator Demo');
  console.log('===============================\n');

  // Example 1: Generate from Mock Spatial Elements
  console.log('1. Creating mock spatial elements for demonstration...');
  
  const mockSpatialElements = [
    {
      id: 'hero-section',
      type: 'container',
      position: { x: 0, y: 0 },
      bounds: { width: 1200, height: 600 },
      semanticData: {
        system: 'Hero Section'
      }
    },
    {
      id: 'contact-form',
      type: 'form',
      position: { x: 100, y: 700 },
      bounds: { width: 500, height: 400 },
      semanticData: {
        standard: 'Contact Form'
      }
    },
    {
      id: 'product-card-1',
      type: 'item',
      position: { x: 200, y: 1200 },
      bounds: { width: 300, height: 250 },
      semanticData: {
        atomic: 'Premium Plan - $99'
      }
    },
    {
      id: 'product-card-2',
      type: 'item',
      position: { x: 550, y: 1200 },
      bounds: { width: 300, height: 250 },
      semanticData: {
        atomic: 'Basic Plan - $49'
      }
    },
    {
      id: 'navigation-menu',
      type: 'navigation',
      position: { x: 0, y: 0 },
      bounds: { width: 1200, height: 80 },
      semanticData: {
        universal: 'Main Navigation'
      }
    },
    {
      id: 'user-profile',
      type: 'component',
      position: { x: 1000, y: 20 },
      bounds: { width: 180, height: 40 },
      semanticData: {
        atomic: 'User Profile'
      }
    }
  ];

  console.log(`📊 Mock elements created: ${mockSpatialElements.length} elements`);

  // Example 2: Configure Fullstack Generator
  console.log('\n2. Configuring fullstack generator...');
  
  const generatorConfig = {
    projectName: 'spatial-web-app',
    database: 'postgresql',
    apiFramework: 'express',
    deployment: 'vercel',
    enableSpatialQueries: true,
    outputDir: './generated-project',
    debug: true
  };

  console.log('Configuration:', {
    projectName: generatorConfig.projectName,
    database: generatorConfig.database,
    apiFramework: generatorConfig.apiFramework,
    deployment: generatorConfig.deployment,
    spatialQueries: generatorConfig.enableSpatialQueries
  });

  // Example 3: Initialize Generator and Generate Project
  console.log('\n3. Generating full-stack project...');
  
  const generator = new FullstackGenerator(generatorConfig);
  const project = await generator.generateFromElements(mockSpatialElements);

  console.log('\n📋 Generation Results:');
  console.log(`   📊 Models: ${project.models.length}`);
  console.log(`   🌐 Endpoints: ${project.endpoints.length}`);
  console.log(`   📁 Files: ${project.files.length}`);
  console.log(`   🗄️  Migrations: ${project.migrations.length}`);

  // Example 4: Display Generated Models
  console.log('\n4. Generated Database Models:');
  
  for (const model of project.models) {
    console.log(`\n   📋 ${model.name} (${model.tableName})`);
    console.log(`      Fields: ${model.fields.length}`);
    console.log(`      Relationships: ${model.relationships.length}`);
    console.log(`      Spatial Indexes: ${model.spatialIndexes.length}`);
    
    // Show first few fields
    const fieldSample = model.fields.slice(0, 3);
    fieldSample.forEach(field => {
      const required = field.required ? ' (required)' : '';
      console.log(`        - ${field.name}: ${field.type}${required}`);
    });
    
    if (model.fields.length > 3) {
      console.log(`        ... and ${model.fields.length - 3} more fields`);
    }
  }

  // Example 5: Display Generated API Endpoints
  console.log('\n5. Generated API Endpoints:');
  
  const endpointsByType = new Map();
  
  for (const endpoint of project.endpoints) {
    const type = endpoint.spatialQuery ? 'spatial' : 'standard';
    endpointsByType.set(type, (endpointsByType.get(type) || 0) + 1);
    
    if (project.endpoints.indexOf(endpoint) < 6) { // Show first 6
      const spatial = endpoint.spatialQuery ? ' [SPATIAL]' : '';
      console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.path}${spatial}`);
    }
  }
  
  if (project.endpoints.length > 6) {
    console.log(`   ... and ${project.endpoints.length - 6} more endpoints`);
  }
  
  console.log(`\n   📊 Endpoint Summary:`);
  console.log(`      Standard: ${endpointsByType.get('standard') || 0}`);
  console.log(`      Spatial: ${endpointsByType.get('spatial') || 0}`);

  // Example 6: Display File Generation Summary
  console.log('\n6. Generated Project Files:');
  
  const filesByType = new Map();
  
  for (const file of project.files) {
    filesByType.set(file.type, (filesByType.get(file.type) || 0) + 1);
  }
  
  for (const [type, count] of filesByType) {
    console.log(`   ${type.padEnd(12)}: ${count} files`);
  }

  // Show sample files
  console.log(`\n   📄 Sample Files:`);
  const sampleFiles = project.files.slice(0, 5);
  for (const file of sampleFiles) {
    console.log(`      ${file.path} - ${file.description}`);
  }

  // Example 7: Display Deployment Configuration
  console.log('\n7. Deployment Configuration:');
  
  console.log(`   🚀 Target: ${project.deployment.target}`);
  console.log(`   🔧 Build Commands: ${project.deployment.buildCommands.length}`);
  console.log(`   🏃 Start Command: ${project.deployment.startCommand}`);
  console.log(`   💚 Health Check: ${project.deployment.healthCheck}`);
  console.log(`   🌍 Environment Variables: ${Object.keys(project.deployment.environment).length}`);

  // Example 8: Show Sample Generated Code
  console.log('\n8. Sample Generated Code:');
  
  // Show package.json content
  const packageFile = project.files.find(f => f.path === 'package.json');
  if (packageFile) {
    console.log('\n   📦 package.json:');
    const packageJson = JSON.parse(packageFile.content);
    console.log(`      Name: ${packageJson.name}`);
    console.log(`      Scripts: ${Object.keys(packageJson.scripts).join(', ')}`);
    console.log(`      Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
  }

  // Show a sample TypeScript model
  const typesFile = project.files.find(f => f.path.includes('generated.ts'));
  if (typesFile) {
    console.log('\n   📝 Sample TypeScript Types:');
    const lines = typesFile.content.split('\n').slice(0, 10);
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`      ${line}`);
      }
    });
    console.log('      ...');
  }

  console.log('\n✅ Fullstack Generator Demo Complete!');
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('   • Spatial element analysis and entity detection');
  console.log('   • Database schema generation with PostGIS support');
  console.log('   • RESTful API generation with spatial queries');
  console.log('   • Multi-platform deployment configuration');
  console.log('   • TypeScript type generation');
  console.log('   • Complete project file structure');
  
  console.log('\n🚀 Ready for Production:');
  console.log('   • Copy generated files to your project directory');
  console.log('   • Update .env with your database credentials');
  console.log('   • Run migrations: npm run db:migrate');
  console.log('   • Deploy: npm run deploy');
  
  return project;
}

// Run the demo
demonstrateFullstackGeneration()
  .then(project => {
    console.log(`\n📁 Generated ${project.files.length} files for ${project.config.projectName}`);
  })
  .catch(console.error);