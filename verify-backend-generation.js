/**
 * Verification script to test the quality of generated backend code
 */

import { FullstackGenerator } from './packages/fullstack-generator/dist/index.js';

async function verifyBackendGeneration() {
  console.log('🔍 Verifying Backend Code Generation Quality...\n');

  const generator = new FullstackGenerator({
    projectName: 'test-spatial-app',
    database: 'postgresql',
    apiFramework: 'express',
    deployment: 'docker',
    enableSpatialQueries: true,
    debug: false
  });

  const mockElements = [
    {
      id: 'user-profile',
      type: 'form',
      position: { x: 100, y: 200 },
      bounds: { width: 400, height: 300 },
      semanticData: { standard: 'User Profile Form' }
    },
    {
      id: 'dashboard-widget',
      type: 'container',
      position: { x: 600, y: 200 },
      bounds: { width: 500, height: 400 },
      semanticData: { system: 'Analytics Dashboard' }
    }
  ];

  const project = await generator.generateFromElements(mockElements);

  console.log('📋 Generated Project Analysis:');
  console.log(`├── Models: ${project.models.length}`);
  console.log(`├── API Endpoints: ${project.endpoints.length}`);
  console.log(`├── Generated Files: ${project.files.length}`);
  console.log(`└── Migrations: ${project.migrations.length}\n`);

  // Verify database schema quality
  console.log('🗄️  Database Schema Quality Check:');
  const hasValidModels = project.models.every(model => 
    model.fields.length > 0 && 
    model.fields.some(f => f.name === 'id') &&
    model.fields.some(f => f.type === 'geometry')
  );
  console.log(`├── All models have valid structure: ${hasValidModels ? '✅' : '❌'}`);

  const hasSpatialIndexes = project.models.every(model => 
    model.spatialIndexes.some(idx => idx.type === 'spatial')
  );
  console.log(`├── All models have spatial indexes: ${hasSpatialIndexes ? '✅' : '❌'}`);

  const hasTimestamps = project.models.every(model =>
    model.fields.some(f => f.name === 'created_at') &&
    model.fields.some(f => f.name === 'updated_at')
  );
  console.log(`└── All models have timestamps: ${hasTimestamps ? '✅' : '❌'}\n`);

  // Verify API endpoint quality
  console.log('🌐 API Endpoints Quality Check:');
  const hasCRUDEndpoints = ['GET', 'POST', 'PUT', 'DELETE'].every(method =>
    project.endpoints.some(e => e.method === method)
  );
  console.log(`├── Has full CRUD operations: ${hasCRUDEndpoints ? '✅' : '❌'}`);

  const hasSpatialEndpoints = project.endpoints.some(e => e.spatialQuery === true);
  console.log(`├── Has spatial query endpoints: ${hasSpatialEndpoints ? '✅' : '❌'}`);

  const hasValidation = project.endpoints.some(e => 
    e.requestSchema || e.queryParams || e.pathParams
  );
  console.log(`└── Has request validation: ${hasValidation ? '✅' : '❌'}\n`);

  // Verify generated file content quality
  console.log('📁 Generated Files Quality Check:');
  
  const serverFile = project.files.find(f => f.path.includes('server'));
  const hasServerFile = !!serverFile;
  console.log(`├── Has Express server file: ${hasServerFile ? '✅' : '❌'}`);

  const packageJsonFile = project.files.find(f => f.path === 'package.json');
  const hasValidPackageJson = packageJsonFile && JSON.parse(packageJsonFile.content).dependencies;
  console.log(`├── Has valid package.json: ${hasValidPackageJson ? '✅' : '❌'}`);

  const migrationFiles = project.files.filter(f => f.path.includes('migrations'));
  const hasMigrationFiles = migrationFiles.length > 0;
  console.log(`├── Has migration files: ${hasMigrationFiles ? '✅' : '❌'}`);

  const dockerFile = project.files.find(f => f.path === 'docker-compose.yml');
  const hasDockerConfig = !!dockerFile;
  console.log(`└── Has Docker deployment config: ${hasDockerConfig ? '✅' : '❌'}\n`);

  // Sample some actual generated code
  console.log('📝 Sample Generated Code:');
  
  if (packageJsonFile) {
    const pkg = JSON.parse(packageJsonFile.content);
    console.log('Package.json scripts:');
    Object.entries(pkg.scripts).forEach(([script, command]) => {
      console.log(`   ${script}: ${command}`);
    });
    console.log();
  }

  // Show SQL migration sample
  const migrationFile = project.files.find(f => f.path.includes('.sql'));
  if (migrationFile) {
    console.log('Sample SQL Migration (first 300 chars):');
    console.log('```sql');
    console.log(migrationFile.content.substring(0, 300) + '...');
    console.log('```\n');
  }

  // Quality assessment
  console.log('🎯 Overall Backend Generation Assessment:');
  
  const qualityChecks = [
    hasValidModels,
    hasSpatialIndexes, 
    hasTimestamps,
    hasCRUDEndpoints,
    hasSpatialEndpoints,
    hasValidation,
    hasServerFile,
    hasValidPackageJson,
    hasMigrationFiles,
    hasDockerConfig
  ];
  
  const passedChecks = qualityChecks.filter(Boolean).length;
  const totalChecks = qualityChecks.length;
  const qualityScore = Math.round((passedChecks / totalChecks) * 100);
  
  console.log(`Quality Score: ${qualityScore}% (${passedChecks}/${totalChecks} checks passed)`);
  
  if (qualityScore >= 90) {
    console.log('🏆 EXCELLENT - Production-ready backend generation!');
  } else if (qualityScore >= 70) {
    console.log('✅ GOOD - Backend generation is solid with minor improvements needed');
  } else {
    console.log('⚠️  NEEDS WORK - Backend generation needs significant improvements');
  }

  return { qualityScore, project };
}

// Run verification
verifyBackendGeneration()
  .then(({ qualityScore, project }) => {
    console.log(`\n📊 Final Result: ${qualityScore}% quality score`);
    console.log(`📁 Generated ${project.files.length} files ready for deployment`);
  })
  .catch(console.error);