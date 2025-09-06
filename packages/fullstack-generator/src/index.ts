import type { 
  FullstackGeneratorConfig,
  GeneratedProject,
  SpatialDataModel,
  APIEndpoint,
  DatabaseMigration,
  DeploymentConfig,
  GeneratedFile,
  SpatialAnalysis
} from './types.js';
import type { SpatialElement } from '@fir/spatial-runtime';
import type { DesignExtraction } from '@fir/figma-bridge';

import { DatabaseGenerator } from './database-generator.js';
import { APIGenerator } from './api-generator.js';
import { DeploymentGenerator } from './deployment-generator.js';
import { SpatialAnalyzer } from './spatial-analyzer.js';

export class FullstackGenerator {
  private databaseGenerator: DatabaseGenerator;
  private apiGenerator: APIGenerator;
  private deploymentGenerator: DeploymentGenerator;
  private spatialAnalyzer: SpatialAnalyzer;

  constructor(private config: FullstackGeneratorConfig) {
    this.databaseGenerator = new DatabaseGenerator(config);
    this.apiGenerator = new APIGenerator(config);
    this.deploymentGenerator = new DeploymentGenerator(config);
    this.spatialAnalyzer = new SpatialAnalyzer();
  }

  async generateProject(extraction: DesignExtraction): Promise<GeneratedProject> {
    if (this.config.debug) {
      console.log('🚀 Starting full-stack project generation...');
      console.log(`📊 Processing ${extraction.elements.length} spatial elements`);
    }

    // Step 1: Analyze spatial design for database entities
    const spatialAnalysis = this.spatialAnalyzer.analyzeDesignForDatabase(extraction);
    
    if (this.config.debug) {
      console.log(`🔍 Analysis complete: ${spatialAnalysis.entities.length} entities detected`);
    }

    // Step 2: Generate database models from spatial analysis
    const models = this.databaseGenerator.generateModelsFromElements(extraction.elements);
    
    // Enhance models with analysis insights
    this.enhanceModelsWithAnalysis(models, spatialAnalysis);

    if (this.config.debug) {
      console.log(`🗄️  Generated ${models.length} database models`);
    }

    // Step 3: Generate database migrations
    const migrations = this.databaseGenerator.generateMigrations(models);

    if (this.config.debug) {
      console.log(`📝 Generated ${migrations.length} database migrations`);
    }

    // Step 4: Generate API endpoints
    const endpoints = this.apiGenerator.generateEndpointsFromModels(models);

    if (this.config.debug) {
      console.log(`🌐 Generated ${endpoints.length} API endpoints`);
    }

    // Step 5: Generate deployment configuration
    const deploymentConfig = this.deploymentGenerator.generateDeploymentConfig(models, endpoints);

    if (this.config.debug) {
      console.log(`🚀 Generated deployment config for ${deploymentConfig.target}`);
    }

    // Step 6: Generate all project files
    const files = await this.generateAllFiles(models, endpoints, migrations, deploymentConfig);

    if (this.config.debug) {
      console.log(`📁 Generated ${files.length} project files`);
    }

    // Step 7: Generate documentation
    const documentation = this.generateDocumentation(models, endpoints, spatialAnalysis);

    const project: GeneratedProject = {
      config: this.config,
      files,
      models,
      endpoints,
      migrations,
      deployment: deploymentConfig,
      documentation
    };

    if (this.config.debug) {
      console.log('✅ Full-stack project generation complete!');
    }

    return project;
  }

  async generateFromElements(elements: SpatialElement[]): Promise<GeneratedProject> {
    // Convert elements to a basic design extraction
    const extraction: DesignExtraction = {
      file: {
        key: 'direct-elements',
        name: 'Direct Elements',
        version: '1.0.0'
      },
      elements,
      mapping: {
        scale: 1.0,
        origin: { x: 0, y: 0 },
        preserveAspectRatio: true
      },
      assets: [],
      components: []
    };

    return this.generateProject(extraction);
  }

  private enhanceModelsWithAnalysis(models: SpatialDataModel[], analysis: SpatialAnalysis): void {
    // Add relationships from analysis
    for (const relationship of analysis.relationships) {
      const fromModel = models.find(m => m.name === relationship.from);
      const toModel = models.find(m => m.name === relationship.to);
      
      if (fromModel && toModel) {
        fromModel.relationships.push({
          name: `${relationship.to.toLowerCase()}s`,
          model: relationship.to,
          type: relationship.type,
          foreignKey: `${toModel.tableName}_id`
        });
      }
    }

    // Add performance-optimized indexes from recommendations
    for (const recommendation of analysis.performance) {
      if (recommendation.type === 'index') {
        // Parse recommendation to add actual indexes
        this.addRecommendedIndexes(models, recommendation);
      }
    }
  }

  private addRecommendedIndexes(_models: SpatialDataModel[], _recommendation: any): void {
    // Implementation would parse recommendation.implementation 
    // and add appropriate indexes to models
  }

  private async generateAllFiles(
    models: SpatialDataModel[], 
    endpoints: APIEndpoint[], 
    migrations: DatabaseMigration[], 
    deploymentConfig: DeploymentConfig
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate API files
    const apiFiles = this.apiGenerator.generateAPIFiles(endpoints, models);
    files.push(...apiFiles);

    // Generate database files
    files.push({
      path: 'database/schema.sql',
      content: this.databaseGenerator.generateSchemaSQL(models),
      type: 'sql',
      description: 'Complete database schema with spatial support'
    });

    // Generate migration files
    for (const migration of migrations) {
      files.push({
        path: `database/migrations/${migration.timestamp}_${migration.name}.sql`,
        content: migration.up,
        type: 'sql',
        description: `Migration: ${migration.name}`
      });
    }

    // Generate deployment files
    const deploymentFiles = this.deploymentGenerator.generateDeploymentFiles(deploymentConfig, models);
    files.push(...deploymentFiles);

    // Generate TypeScript types file
    files.push({
      path: 'src/types/generated.ts',
      content: this.generateTypeScriptTypes(models),
      type: 'typescript',
      description: 'Generated TypeScript types for all models'
    });

    return files;
  }

  private generateDocumentation(
    models: SpatialDataModel[], 
    endpoints: APIEndpoint[], 
    _analysis: SpatialAnalysis
  ) {
    const apiDocs = this.generateAPIDocumentation(endpoints);
    const schemaDocs = this.generateSchemaDocumentation(models);
    const setup = this.generateSetupInstructions();
    const deployment = this.generateDeploymentGuide();
    const examples = this.generateExampleUsage(endpoints);

    return {
      apiDocs,
      schemaDocs,
      setup,
      deployment,
      examples
    };
  }

  private generateAPIDocumentation(endpoints: APIEndpoint[]): string {
    let docs = '# API Documentation\n\n';
    
    docs += 'This API provides spatial-aware endpoints for your generated application.\n\n';
    
    for (const endpoint of endpoints) {
      docs += `## ${endpoint.method} ${endpoint.path}\n\n`;
      docs += `**Handler:** \`${endpoint.handler}\`\n\n`;
      
      if (endpoint.pathParams?.length) {
        docs += '**Path Parameters:**\n';
        for (const param of endpoint.pathParams) {
          docs += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
        }
        docs += '\n';
      }
      
      if (endpoint.queryParams?.length) {
        docs += '**Query Parameters:**\n';
        for (const param of endpoint.queryParams) {
          const required = param.required ? ' (required)' : '';
          docs += `- \`${param.name}\` (${param.type}${required}): ${param.description}\n`;
        }
        docs += '\n';
      }
      
      if (endpoint.spatialQuery) {
        docs += '**Spatial Features:** This endpoint supports spatial querying capabilities.\n\n';
      }
      
      docs += '---\n\n';
    }
    
    return docs;
  }

  private generateSchemaDocumentation(models: SpatialDataModel[]): string {
    let docs = '# Database Schema Documentation\n\n';
    
    docs += 'Generated database schema with spatial support.\n\n';
    
    for (const model of models) {
      docs += `## ${model.name}\n\n`;
      docs += `**Table:** \`${model.tableName}\`\n\n`;
      
      docs += '**Fields:**\n';
      for (const field of model.fields) {
        const required = field.required ? ' (required)' : '';
        const unique = field.unique ? ' (unique)' : '';
        docs += `- \`${field.name}\` (${field.type}${required}${unique})\n`;
      }
      docs += '\n';
      
      if (model.relationships.length) {
        docs += '**Relationships:**\n';
        for (const rel of model.relationships) {
          docs += `- ${rel.type} with \`${rel.model}\`\n`;
        }
        docs += '\n';
      }
      
      docs += '---\n\n';
    }
    
    return docs;
  }

  private generateSetupInstructions(): string {
    return `# Setup Instructions

## Prerequisites
- Node.js 20+
- ${this.getReadableDatabase()} database
${this.config.enableSpatialQueries ? '- PostGIS extension (for spatial queries)' : ''}

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Run database migrations:
   \`\`\`bash
   npm run db:migrate
   \`\`\`

4. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Configuration

Update your \`.env\` file with appropriate values for your environment.
`;
  }

  private generateDeploymentGuide(): string {
    return `# Deployment Guide

## ${this.getReadableDeploymentTarget()}

This project is configured for deployment to ${this.config.deployment}.

### Quick Deploy

1. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy:
   \`\`\`bash
   ${this.getDeploymentCommand()}
   \`\`\`

### Environment Variables

Ensure all required environment variables are configured in your deployment platform.
See \`.env.example\` for the complete list.
`;
  }

  private generateExampleUsage(endpoints: APIEndpoint[]): string {
    const exampleEndpoint = endpoints.find(e => e.method === 'GET') || endpoints[0];
    
    return `# Example Usage

## Basic API Call

\`\`\`javascript
const response = await fetch('${exampleEndpoint?.path || '/api/items'}');
const data = await response.json();
console.log(data);
\`\`\`

## Spatial Query Example

${this.config.enableSpatialQueries ? `
\`\`\`javascript
// Find items within bounds
const spatialResponse = await fetch('/api/items/spatial/within-bounds?minX=0&minY=0&maxX=100&maxY=100');
const spatialData = await spatialResponse.json();
\`\`\`
` : ''}

## Integration with Spatial Runtime

\`\`\`javascript
import { SpatialEngine } from '@fir/spatial-runtime';

const engine = new SpatialEngine(container);

// Load data from your API
const apiData = await fetch('/api/items').then(r => r.json());
engine.addElements(apiData.data);
\`\`\`
`;
  }

  private generateTypeScriptTypes(models: SpatialDataModel[]): string {
    let types = '// Generated TypeScript types\n\n';
    
    for (const model of models) {
      types += `export interface ${model.name} {\n`;
      
      for (const field of model.fields) {
        const optional = field.required ? '' : '?';
        const tsType = this.mapFieldTypeToTypeScript(field.type);
        types += `  ${field.name}${optional}: ${tsType};\n`;
      }
      
      types += '}\n\n';
    }
    
    return types;
  }

  private mapFieldTypeToTypeScript(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      json: 'any',
      array: 'any[]',
      geometry: '{ x: number; y: number }',
      point: '{ x: number; y: number }',
      polygon: '{ x: number; y: number }[]'
    };
    
    return typeMap[fieldType] || 'any';
  }


  private getReadableDatabase(): string {
    return {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      sqlite: 'SQLite',
      mongodb: 'MongoDB'
    }[this.config.database] || this.config.database;
  }

  private getReadableDeploymentTarget(): string {
    return {
      vercel: 'Vercel',
      railway: 'Railway',
      aws: 'AWS',
      gcp: 'Google Cloud Platform',
      docker: 'Docker',
      local: 'Local Development'
    }[this.config.deployment] || this.config.deployment;
  }

  private getDeploymentCommand(): string {
    switch (this.config.deployment) {
      case 'vercel': return 'vercel deploy';
      case 'railway': return 'railway up';
      case 'docker': return 'docker-compose up';
      default: return 'npm start';
    }
  }
}

// Export all types and classes
export * from './types.js';
export { DatabaseGenerator } from './database-generator.js';
export { APIGenerator } from './api-generator.js';
export { DeploymentGenerator } from './deployment-generator.js';
export { SpatialAnalyzer } from './spatial-analyzer.js';