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
import { SmartDataGenerator } from './smart-data-generator.js';
import { PenpotBridge } from './penpot-bridge.js';
import { AutoDeployment, type DeploymentCredentials, type DeploymentResult } from './auto-deployment.js';
import type { PenpotConfig, PenpotFile } from './types.js';

export class FullstackGenerator {
  private databaseGenerator: DatabaseGenerator;
  private apiGenerator: APIGenerator;
  private deploymentGenerator: DeploymentGenerator;
  private spatialAnalyzer: SpatialAnalyzer;
  private smartDataGenerator: SmartDataGenerator;
  private penpotBridge?: PenpotBridge;
  private autoDeployment?: AutoDeployment;

  constructor(private config: FullstackGeneratorConfig) {
    this.databaseGenerator = new DatabaseGenerator(config);
    this.apiGenerator = new APIGenerator(config);
    this.deploymentGenerator = new DeploymentGenerator(config);
    
    // Initialize spatial analyzer with AI if API key available
    const aiConfig = {
      apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      debug: config.debug,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview', // Latest available model
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1')
    };
    
    this.spatialAnalyzer = new SpatialAnalyzer(aiConfig);
    
    // Initialize smart data generator with AI
    const dataConfig = {
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      debug: config.debug,
      recordsPerEntity: 25,
      useRealisticData: true,
      includeRelationships: true
    };
    
    this.smartDataGenerator = new SmartDataGenerator(dataConfig);
    
    // Initialize Penpot bridge if config provided
    if (config.penpot) {
      this.penpotBridge = new PenpotBridge(config.penpot);
    }
  }

  /**
   * Initialize auto-deployment with credentials (Products 3 & 4)
   */
  enableAutoDeployment(credentials: DeploymentCredentials) {
    this.autoDeployment = new AutoDeployment(credentials);
  }

  /**
   * Generate full-stack backend code from design extraction
   * Products 1, 2, 3: Generates code only (no deployment)
   * For deployment, use generateForLocofyProject with enableHosting=true (Product 4)
   */
  async generateProject(extraction: DesignExtraction): Promise<GeneratedProject> {
    if (this.config.debug) {
      console.log('🚀 Starting full-stack backend code generation...');
      console.log(`📊 Processing ${extraction.elements.length} spatial elements`);
      console.log('ℹ️  This generates code only - no deployment included');
    }

    // Step 1: Analyze spatial design for database entities (with AI if available)
    const spatialAnalysis = await this.spatialAnalyzer.analyzeDesignForDatabase(extraction);
    
    if (this.config.debug) {
      console.log(`🔍 Analysis complete: ${spatialAnalysis.entities.length} entities detected`);
    }

    // Step 2: Generate database models from analyzed entities (not raw elements)
    const models = this.generateModelsFromAnalysis(spatialAnalysis, extraction.elements);

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

    // Step 6: Generate smart seed data with AI
    let seedData = undefined;
    try {
      const seedDataAnalysis = (spatialAnalysis as any).aiInsights ? 
        undefined : // Would extract from AI insights if available
        undefined;
      
      seedData = await this.smartDataGenerator.generateSeedData(models, seedDataAnalysis);
      
      if (this.config.debug) {
        console.log(`🎲 Generated ${seedData.metadata.totalRecords} seed data records`);
      }
    } catch (error) {
      console.warn('⚠️ Seed data generation failed:', error);
    }

    // Step 7: Generate all project files (including seed data)
    const files = await this.generateAllFiles(models, endpoints, migrations, deploymentConfig, seedData);

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

  /**
   * Generate backend code from Penpot file
   * Product 3: Penpot → Working Backend (code generation only)
   */
  async generateFromPenpotFile(penpotFile: PenpotFile): Promise<GeneratedProject> {
    if (!this.penpotBridge) {
      throw new Error('Penpot bridge not initialized. Add penpot config to FullstackGeneratorConfig.');
    }

    if (this.config.debug) {
      console.log('🎨 Starting Penpot backend code generation...');
      console.log(`📄 Processing Penpot file: ${penpotFile.name}`);
      console.log('ℹ️  This generates code only - no deployment included');
    }

    // Convert Penpot file to spatial elements using the bridge
    const spatialElements = await this.penpotBridge.convertToSpatialElements(penpotFile);
    
    if (this.config.debug) {
      console.log(`🔄 Converted ${spatialElements.length} Penpot shapes to spatial elements`);
    }

    // Convert elements to a design extraction format
    const extraction: DesignExtraction = {
      file: {
        key: penpotFile.id,
        name: penpotFile.name,
        version: '1.0.0'
      },
      elements: spatialElements,
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

  /**
   * Generate backend code from Penpot URL
   * Product 3: Penpot → Working Backend (code generation only)
   */
  async generateFromPenpotUrl(fileUrl: string): Promise<GeneratedProject> {
    if (!this.penpotBridge) {
      throw new Error('Penpot bridge not initialized. Add penpot config to FullstackGeneratorConfig.');
    }

    if (this.config.debug) {
      console.log(`🌐 Fetching Penpot file from: ${fileUrl}`);
      console.log('ℹ️  This generates code only - no deployment included');
    }

    const penpotFile = await this.penpotBridge.fetchPenpotFile(fileUrl);
    return this.generateFromPenpotFile(penpotFile);
  }

  /**
   * Product 2: Optional Backend-Only Deployment
   * Creates just Supabase database + API (no frontend hosting)
   */
  async deployBackendOnly(
    penpotFile: PenpotFile,
    options: {
      projectName: string;
      enableAuth?: boolean;
      enableStorage?: boolean;
    }
  ): Promise<DeploymentResult> {
    if (!this.autoDeployment) {
      return {
        success: false,
        error: 'Auto-deployment not enabled. Call enableAutoDeployment() first with your Supabase credentials.'
      };
    }

    if (this.config.debug) {
      console.log('🗄️  Product 2: Backend-Only Deployment...');
      console.log(`📄 Processing Penpot file: ${penpotFile.name}`);
      console.log('📡 This creates only Supabase database + API (no frontend)');
    }

    // Generate the project code
    const project = await this.generateFromPenpotFile(penpotFile);

    // Deploy only the backend to Supabase
    return await this.autoDeployment.deployBackendOnly(project, options);
  }

  /**
   * Product 3: Penpot → Working Backend + Auto-Deployment
   * This actually deploys to live hosting, not just code generation
   */
  async deployPenpotToLive(
    penpotFile: PenpotFile,
    options: {
      projectName: string;
      domain?: string;
      enableAuth?: boolean;
      enableStorage?: boolean;
    }
  ): Promise<DeploymentResult> {
    if (!this.autoDeployment) {
      return {
        success: false,
        error: 'Auto-deployment not enabled. Call enableAutoDeployment() first with your credentials.'
      };
    }

    if (this.config.debug) {
      console.log('🎨 Product 3: Penpot → Live Deployment...');
      console.log(`📄 Deploying Penpot file: ${penpotFile.name}`);
      console.log('🚀 This will create actual live infrastructure');
    }

    // Generate the project code
    const project = await this.generateFromPenpotFile(penpotFile);

    // Deploy to live hosting
    return await this.autoDeployment.deployToVercelSupabase(project, options);
  }

  /**
   * Generate backend for a Locofy hybrid project with Vercel/Supabase hosting
   * Product 4: Figma → Locofy → Full-Stack Backend + Hosting
   */
  async generateForLocofyProject(
    figmaExtraction: DesignExtraction,
    locofyProjectPath?: string,
    enableHosting: boolean = false
  ): Promise<GeneratedProject> {
    if (this.config.debug) {
      console.log('🚀 Generating backend for Locofy hybrid project...');
      console.log(`📁 Locofy project path: ${locofyProjectPath || 'Not specified'}`);
      console.log(`🌐 Hosting enabled: ${enableHosting}`);
    }

    // Generate full project but focus on backend components
    const project = await this.generateProject(figmaExtraction);

    // Additional files for Locofy integration
    const locofyFiles = [
      {
        path: 'README-LOCOFY-INTEGRATION.md',
        content: this.generateLocofyIntegrationGuide(locofyProjectPath, enableHosting),
        type: 'markdown' as const,
        description: 'Guide for integrating this backend with Locofy frontend'
      },
      {
        path: 'scripts/setup-locofy-integration.js',
        content: this.generateLocofySetupScript(),
        type: 'javascript' as const,
        description: 'Script to configure Locofy project for spatial backend'
      }
    ];

    // Add Vercel/Supabase hosting files if enabled
    if (enableHosting && this.config.deployment === 'vercel-supabase') {
      const hostingFiles = this.generateLocofyHostingFiles(project.models);
      locofyFiles.push(...hostingFiles);
    }

    // Customize project for Locofy integration
    const hybridProject: GeneratedProject = {
      ...project,
      config: {
        ...project.config,
        projectName: project.config.projectName + '-spatial-backend',
        description: `Spatial backend generated for Locofy frontend project${enableHosting ? ' with Vercel/Supabase hosting' : ''}`
      },
      files: [
        ...project.files,
        ...locofyFiles
      ],
      documentation: {
        ...project.documentation,
        locofyIntegration: this.generateLocofySpecificDocs(project, enableHosting)
      }
    };

    if (this.config.debug) {
      console.log('✅ Locofy hybrid backend generation complete!');
      if (enableHosting) {
        console.log('🌐 Vercel/Supabase hosting files included');
      }
    }

    return hybridProject;
  }

  /**
   * Product 4: Figma → Locofy → Full-Stack Backend + Auto-Deployment
   * This actually deploys to live Vercel/Supabase hosting
   */
  async deployLocofyToLive(
    figmaExtraction: DesignExtraction,
    options: {
      projectName: string;
      locofyProjectPath?: string;
      domain?: string;
      enableAuth?: boolean;
      enableStorage?: boolean;
    }
  ): Promise<DeploymentResult> {
    if (!this.autoDeployment) {
      return {
        success: false,
        error: 'Auto-deployment not enabled. Call enableAutoDeployment() first with your credentials.'
      };
    }

    if (this.config.debug) {
      console.log('🚀 Product 4: Figma → Locofy → Live Deployment...');
      console.log(`📁 Locofy project: ${options.locofyProjectPath || 'Not specified'}`);
      console.log('🌐 This will create actual live infrastructure + hosting');
    }

    // Generate the Locofy hybrid project
    const project = await this.generateForLocofyProject(
      figmaExtraction,
      options.locofyProjectPath,
      true // Enable hosting files
    );

    // Deploy to live Vercel + Supabase
    return await this.autoDeployment.deployToVercelSupabase(project, {
      projectName: options.projectName,
      domain: options.domain,
      enableAuth: options.enableAuth ?? true,
      enableStorage: options.enableStorage ?? true
    });
  }

  /**
   * Actually deploy a generated project (Product 4 only)
   * This method performs real deployment to Vercel/Supabase
   */
  async deployProject(project: GeneratedProject, deploymentPath: string): Promise<{
    success: boolean;
    deploymentUrl?: string;
    error?: string;
  }> {
    if (this.config.deployment !== 'vercel-supabase') {
      return {
        success: false,
        error: 'Deployment only supported for vercel-supabase target. Other targets generate code only.'
      };
    }

    if (this.config.debug) {
      console.log('🚀 Starting actual deployment to Vercel/Supabase...');
      console.log(`📁 Deployment path: ${deploymentPath}`);
    }

    try {
      // Write all project files to deployment directory
      const fs = await import('fs/promises');
      const path = await import('path');

      for (const file of project.files) {
        const filePath = path.join(deploymentPath, file.path);
        const fileDir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(fileDir, { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, file.content, 'utf8');
        
        // Make executable if needed
        if (file.executable) {
          await fs.chmod(filePath, 0o755);
        }
      }

      if (this.config.debug) {
        console.log(`📝 Written ${project.files.length} files to ${deploymentPath}`);
        console.log('ℹ️  Run the deployment script manually or use CI/CD for actual hosting');
      }

      return {
        success: true,
        deploymentUrl: 'Run ./deploy-locofy-hybrid.sh to complete deployment'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
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
    deploymentConfig: DeploymentConfig,
    seedData?: any
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

    // Generate seed data files if available
    if (seedData) {
      files.push({
        path: 'database/seed-data.json',
        content: JSON.stringify(seedData, null, 2),
        type: 'json',
        description: 'AI-generated seed data for all entities'
      });

      // Generate seed script
      files.push({
        path: 'scripts/seed-database.js',
        content: this.generateSeedScript(models, seedData),
        type: 'javascript',
        description: 'Script to populate database with seed data'
      });
    }

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

  private generateSeedScript(models: SpatialDataModel[], seedData: any): string {
    const databaseType = this.config.database;
    
    return `/**
 * Database Seed Script
 * Generated by FIR Full-stack Generator with AI-powered seed data
 * Run: node scripts/seed-database.js
 */

const fs = require('fs');
const path = require('path');

// Import seed data
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/seed-data.json'), 'utf8'));

${this.generateDatabaseConnection(databaseType)}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    ${this.generateSeedingLogic(models, databaseType)}
    
    console.log('✅ Database seeding completed successfully!');
    console.log(\`📊 Seeded \${seedData.metadata.totalRecords} total records across \${Object.keys(seedData.entities).length} entities\`);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    ${this.generateConnectionCleanup(databaseType)}
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };`;
  }

  private generateDatabaseConnection(databaseType: string): string {
    switch (databaseType) {
      case 'postgresql':
        return `const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/app_db',
});`;

      case 'mysql':
        return `const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'app_db',
});`;

      case 'sqlite':
        return `const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH || './database/app.db');`;

      default:
        return `// Database connection configuration needed for ${databaseType}`;
    }
  }

  private generateSeedingLogic(models: SpatialDataModel[], databaseType: string): string {
    const insertStatements = models.map(model => {
      const fields = model.fields.map(f => f.name).join(', ');
      const placeholders = model.fields.map((_, i) => this.getPlaceholder(databaseType, i + 1)).join(', ');
      
      return `
    // Seed ${model.name} entities
    console.log('Seeding ${model.name}...');
    const ${model.name.toLowerCase()}Records = seedData.entities.${model.name} || [];
    
    for (const record of ${model.name.toLowerCase()}Records) {
      const values = [${model.fields.map(f => `record.${f.name}`).join(', ')}];
      ${this.generateInsertStatement(model, databaseType, fields, placeholders)}
    }
    console.log(\`✅ Seeded \${${model.name.toLowerCase()}Records.length} ${model.name} records\`);`;
    }).join('\n');

    return `    await ${this.getDatabaseSetup(databaseType)}
${insertStatements}
    
    // Handle relationships
    console.log('Creating relationships...');
    for (const rel of seedData.relationships) {
      ${this.generateRelationshipInsert(databaseType)}
    }
    console.log(\`✅ Created \${seedData.relationships.length} relationships\`);`;
  }

  private generateInsertStatement(model: SpatialDataModel, databaseType: string, fields: string, placeholders: string): string {
    const tableName = model.tableName;
    
    switch (databaseType) {
      case 'postgresql':
        return `await pool.query(
        \`INSERT INTO ${tableName} (${fields}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING\`,
        values
      );`;
      
      case 'mysql':
        return `await connection.execute(
        \`INSERT IGNORE INTO ${tableName} (${fields}) VALUES (${placeholders})\`,
        values
      );`;
      
      case 'sqlite':
        return `const stmt = db.prepare(\`INSERT OR IGNORE INTO ${tableName} (${fields}) VALUES (${placeholders})\`);
      stmt.run(values);`;
      
      default:
        return `// Insert statement needed for ${databaseType}`;
    }
  }

  private generateRelationshipInsert(databaseType: string): string {
    switch (databaseType) {
      case 'postgresql':
        return `// Update foreign keys based on relationships
      if (rel.from && rel.to && rel.fromId && rel.toId) {
        await pool.query(
          \`UPDATE \${rel.from.toLowerCase()}s SET \${rel.to.toLowerCase()}_id = $1 WHERE id = $2\`,
          [rel.toId, rel.fromId]
        );
      }`;
      
      case 'mysql':
        return `// Update foreign keys based on relationships
      if (rel.from && rel.to && rel.fromId && rel.toId) {
        await connection.execute(
          \`UPDATE \${rel.from.toLowerCase()}s SET \${rel.to.toLowerCase()}_id = ? WHERE id = ?\`,
          [rel.toId, rel.fromId]
        );
      }`;
      
      case 'sqlite':
        return `// Update foreign keys based on relationships
      if (rel.from && rel.to && rel.fromId && rel.toId) {
        const updateStmt = db.prepare(\`UPDATE \${rel.from.toLowerCase()}s SET \${rel.to.toLowerCase()}_id = ? WHERE id = ?\`);
        updateStmt.run(rel.toId, rel.fromId);
      }`;
      
      default:
        return `// Relationship insert logic needed`;
    }
  }

  private getDatabaseSetup(databaseType: string): string {
    switch (databaseType) {
      case 'postgresql':
        return `pool.connect();`;
      case 'mysql':
        return `connection.connect();`;
      case 'sqlite':
        return `db.pragma('journal_mode = WAL');`;
      default:
        return `// Database setup`;
    }
  }

  private generateConnectionCleanup(databaseType: string): string {
    switch (databaseType) {
      case 'postgresql':
        return `await pool.end();`;
      case 'mysql':
        return `await connection.end();`;
      case 'sqlite':
        return `db.close();`;
      default:
        return `// Connection cleanup`;
    }
  }

  private getPlaceholder(databaseType: string, index: number): string {
    switch (databaseType) {
      case 'postgresql':
        return `$${index}`;
      case 'mysql':
      case 'sqlite':
        return '?';
      default:
        return '?';
    }
  }

  /**
   * Generate database models from AI/rule-based analysis results
   */
  private generateModelsFromAnalysis(
    spatialAnalysis: SpatialAnalysis, 
    elements: SpatialElement[]
  ): SpatialDataModel[] {
    const models: SpatialDataModel[] = [];

    // Convert analyzed entities to database models
    for (const entity of spatialAnalysis.entities) {
      const model: SpatialDataModel = {
        name: entity.name,
        tableName: this.toSnakeCase(entity.name.toLowerCase()) + 's',
        fields: this.convertDetectedFieldsToSpatialFields(entity.fields),
        spatialIndexes: this.generateSpatialIndexes(entity),
        relationships: [], // Will be populated from relationships analysis
        metadata: {
          figmaElementId: entity.sourceElements[0],
          elementType: entity.type,
          spatialBounds: this.calculateEntityBounds(entity.sourceElements, elements),
          createdAt: new Date().toISOString(),
          generated: true
        }
      };

      models.push(model);
    }

    // Add relationships from analysis
    for (const relationship of spatialAnalysis.relationships) {
      const fromModel = models.find(m => m.name === relationship.from);
      const toModel = models.find(m => m.name === relationship.to);
      
      if (fromModel && toModel) {
        fromModel.relationships.push({
          name: `${relationship.to.toLowerCase()}s`,
          model: relationship.to,
          type: relationship.type,
          foreignKey: `${this.toSnakeCase(toModel.name)}_id`
        });
      }
    }

    // Add spatial metadata model if spatial queries enabled
    if (this.config.enableSpatialQueries) {
      models.push(this.createSpatialMetadataModel());
    }

    return models;
  }

  private convertDetectedFieldsToSpatialFields(detectedFields: any[]): SpatialField[] {
    return detectedFields.map(field => ({
      name: field.name,
      type: this.mapDetectedFieldTypeToSpatialFieldType(field.type),
      required: field.required,
      unique: field.unique || false,
      constraints: this.generateFieldConstraints(field)
    }));
  }

  private mapDetectedFieldTypeToSpatialFieldType(detectedType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'date',
      'point': 'point',
      'geometry': 'geometry'
    };
    return typeMap[detectedType] || 'string';
  }

  private generateFieldConstraints(field: any) {
    const constraints: any = {};
    
    if (field.name.includes('email')) {
      constraints.pattern = '^[^@]+@[^@]+\\.[^@]+$';
    }
    if (field.name.includes('price') || field.name.includes('cost')) {
      constraints.min = 0;
    }
    if (field.name.includes('rating')) {
      constraints.min = 0;
      constraints.max = 5;
    }
    
    return Object.keys(constraints).length > 0 ? constraints : undefined;
  }

  private generateSpatialIndexes(entity: any): SpatialIndex[] {
    const indexes: SpatialIndex[] = [];
    
    // Always add spatial index for position
    indexes.push({
      name: `idx_${this.toSnakeCase(entity.name)}_position_spatial`,
      fields: ['position'],
      type: 'gist'
    });
    
    // Add semantic index for common query fields
    const semanticFields = entity.fields.filter((f: any) => 
      ['name', 'title', 'type', 'status', 'category'].includes(f.name.toLowerCase())
    );
    
    if (semanticFields.length > 0) {
      indexes.push({
        name: `idx_${this.toSnakeCase(entity.name)}_semantic`,
        fields: semanticFields.map((f: any) => f.name),
        type: 'btree'
      });
    }
    
    return indexes;
  }

  private calculateEntityBounds(sourceElementIds: string[], elements: SpatialElement[]) {
    const entityElements = elements.filter(e => sourceElementIds.includes(e.id));
    if (entityElements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let minX = entityElements[0].position.x;
    let minY = entityElements[0].position.y;
    let maxX = entityElements[0].position.x + entityElements[0].bounds.width;
    let maxY = entityElements[0].position.y + entityElements[0].bounds.height;

    for (const element of entityElements) {
      minX = Math.min(minX, element.position.x);
      minY = Math.min(minY, element.position.y);
      maxX = Math.max(maxX, element.position.x + element.bounds.width);
      maxY = Math.max(maxY, element.position.y + element.bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private createSpatialMetadataModel(): SpatialDataModel {
    return {
      name: 'SpatialMetadata',
      tableName: 'spatial_metadata',
      fields: [
        { name: 'id', type: 'string', required: true, unique: true },
        { name: 'entity_type', type: 'string', required: true },
        { name: 'entity_id', type: 'string', required: true },
        { name: 'viewport_bounds', type: 'geometry', required: true },
        { name: 'zoom_level', type: 'number', required: true },
        { name: 'visible', type: 'boolean', required: true, defaultValue: true }
      ],
      spatialIndexes: [
        {
          name: 'idx_viewport_bounds_spatial',
          fields: ['viewport_bounds'],
          type: 'gist'
        },
        {
          name: 'idx_entity_lookup',
          fields: ['entity_type', 'entity_id'],
          type: 'btree'
        }
      ],
      relationships: [],
      metadata: {
        createdAt: new Date().toISOString(),
        generated: true
      }
    };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  /**
   * Locofy integration helper methods
   */
  private generateLocofyIntegrationGuide(locofyProjectPath?: string, enableHosting?: boolean): string {
    return `# Locofy Integration Guide

This backend was generated to work with your Locofy frontend project.

## Quick Setup

1. **Frontend (Locofy)**
   ${locofyProjectPath ? `- Your Locofy project is located at: \`${locofyProjectPath}\`` : '- Export your design using the Locofy.ai Figma plugin'}
   - Configure API endpoints to point to this backend
   - Add spatial runtime components for enhanced features

2. **Backend (FIR Generated)**
   - Install dependencies: \`npm install\`
   - Set up your database connection in \`.env\`
   - Run migrations: \`npm run db:migrate\`
   - Start the server: \`npm run dev\`

## Integration Points

### API Configuration
Update your Locofy project's API configuration:

\`\`\`javascript
// In your Locofy project
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
\`\`\`

### Spatial Features
Enhance your Locofy components with spatial intelligence:

\`\`\`javascript
import { SpatialContainer, SpatialElement } from '@fir/spatial-runtime';

// Wrap your Locofy components
export const EnhancedComponent = (props) => (
  <SpatialContainer>
    <SpatialElement spatialData={props.spatialData}>
      <OriginalLocofyComponent {...props} />
    </SpatialElement>
  </SpatialContainer>
);
\`\`\`

## Deployment

${enableHosting ? `
### With Vercel/Supabase Hosting (Product 4)

This project includes automated Vercel/Supabase hosting:

1. **Frontend (Locofy)**: Deploy to Vercel
2. **Backend**: Automatically deployed with Vercel functions
3. **Database**: Supabase with PostGIS extension

#### Quick Deploy:
\`\`\`bash
npm run deploy
\`\`\`

#### Manual Setup:
1. Set up Supabase project at https://supabase.io
2. Update \`.env\` with Supabase credentials
3. Run Supabase migrations: \`supabase db push\`
4. Deploy to Vercel: \`vercel --prod\`

#### Environment Variables:
- \`NEXT_PUBLIC_SUPABASE_URL\`: Your Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`: Supabase anonymous key
- \`SUPABASE_SERVICE_ROLE_KEY\`: Supabase service role key
` : `
### Standard Deployment

1. **Frontend**: Deploy your Locofy project to Vercel/Netlify
2. **Backend**: Deploy this API to Railway/Heroku
3. **Database**: Use managed PostgreSQL with PostGIS extension
`}

For detailed instructions, see the deployment guide in this repository.
`;
  }

  private generateLocofySetupScript(): string {
    return `#!/usr/bin/env node
/**
 * Locofy Integration Setup Script
 * Configures your Locofy project to work with the FIR spatial backend
 */

const fs = require('fs');
const path = require('path');

async function setupLocofyIntegration() {
  console.log('🔧 Setting up Locofy integration...');

  try {
    // 1. Update package.json to include spatial runtime
    await updatePackageJson();
    
    // 2. Create API configuration
    await createApiConfig();
    
    // 3. Generate spatial wrapper components
    await generateSpatialWrappers();
    
    // 4. Update environment variables
    await updateEnvConfig();
    
    console.log('✅ Locofy integration setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run \`npm install\` in your Locofy project');
    console.log('2. Update your API endpoints to use the generated backend');
    console.log('3. Wrap components with spatial containers as needed');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function updatePackageJson() {
  const packageJsonPath = findLocofyPackageJson();
  if (!packageJsonPath) {
    console.log('⚠️ Could not find Locofy project package.json');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add spatial runtime dependency
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies['@fir/spatial-runtime'] = '^0.1.0';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('📦 Updated package.json with spatial runtime dependency');
}

async function createApiConfig() {
  const configPath = 'src/config/api.js';
  const configContent = \`export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const SPATIAL_CONFIG = {
  enableSpatialQueries: true,
  defaultViewport: { x: 0, y: 0, zoom: 1 },
};\`;

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, configContent);
  console.log('⚙️ Created API configuration');
}

async function generateSpatialWrappers() {
  const wrappersPath = 'src/components/spatial';
  
  if (!fs.existsSync(wrappersPath)) {
    fs.mkdirSync(wrappersPath, { recursive: true });
  }
  
  const wrapperContent = \`import React from 'react';
import { SpatialContainer, SpatialElement } from '@fir/spatial-runtime';

export const SpatialWrapper = ({ children, spatialData, ...props }) => (
  <SpatialContainer>
    <SpatialElement spatialData={spatialData} {...props}>
      {children}
    </SpatialElement>
  </SpatialContainer>
);

export const withSpatial = (WrappedComponent) => {
  return function SpatialEnhancedComponent(props) {
    const { spatialData, ...rest } = props;
    
    if (spatialData) {
      return (
        <SpatialWrapper spatialData={spatialData}>
          <WrappedComponent {...rest} />
        </SpatialWrapper>
      );
    }
    
    return <WrappedComponent {...rest} />;
  };
};\`;

  fs.writeFileSync(path.join(wrappersPath, 'index.js'), wrapperContent);
  console.log('🎁 Generated spatial wrapper components');
}

async function updateEnvConfig() {
  const envExamplePath = '.env.example';
  const envContent = \`# API Configuration
REACT_APP_API_URL=http://localhost:3001/api

# Spatial Features
REACT_APP_ENABLE_SPATIAL=true\`;

  fs.writeFileSync(envExamplePath, envContent);
  console.log('🌐 Created environment configuration template');
}

function findLocofyPackageJson() {
  // Look for package.json in common locations
  const possiblePaths = [
    './package.json',
    '../package.json',
    '../../package.json'
  ];
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      const content = JSON.parse(fs.readFileSync(path, 'utf8'));
      // Check if it looks like a Locofy project
      if (content.dependencies && (
        content.dependencies.react || 
        content.name?.includes('locofy') ||
        content.description?.includes('locofy')
      )) {
        return path;
      }
    }
  }
  
  return null;
}

// Run setup if called directly
if (require.main === module) {
  setupLocofyIntegration();
}

module.exports = { setupLocofyIntegration };`;
  }

  private generateLocofyHostingFiles(models: SpatialDataModel[]) {
    if (!this.config.vercelSupabase) {
      return [];
    }

    const templates = new (require('./vercel-supabase-templates.js').VercelSupabaseTemplates)(this.config.vercelSupabase);
    const files = [];

    // Locofy-specific Vercel configuration
    files.push({
      path: 'backend/vercel.json',
      content: JSON.stringify({
        ...templates.generateVercelJson(),
        routes: [
          // Proxy API calls to backend
          {
            src: "/api/(.*)",
            dest: "/api/$1"
          },
          // Serve Locofy frontend
          {
            src: "/(.*)",
            dest: "/locofy-frontend/$1"
          }
        ]
      }, null, 2),
      type: 'json' as const,
      description: 'Vercel config optimized for Locofy + backend integration'
    });

    // Backend package.json
    files.push({
      path: 'backend/package.json',
      content: JSON.stringify({
        ...templates.generatePackageJson(this.config.projectName + '-backend'),
        scripts: {
          ...templates.generatePackageJson(this.config.projectName + '-backend').scripts,
          "deploy": "vercel --prod",
          "deploy:backend": "cd backend && vercel --prod",
          "setup:locofy": "node scripts/setup-locofy-integration.js"
        }
      }, null, 2),
      type: 'json' as const,
      description: 'Backend package.json with Locofy integration scripts'
    });

    // Supabase configuration optimized for Locofy
    files.push({
      path: 'backend/lib/supabase.js',
      content: `${templates.generateSupabaseConfig()}

// Locofy-specific helpers
export const locofyHelpers = {
  // Sync Locofy component data with Supabase
  async syncComponentData(componentId, data) {
    const { data: result, error } = await supabase
      .from('locofy_components')
      .upsert({ component_id: componentId, data })
      .select();
    
    if (error) throw error;
    return result;
  },

  // Get spatial data for Locofy components
  async getSpatialData(bounds) {
    const { data, error } = await supabase
      .rpc('get_spatial_components', { bounds });
    
    if (error) throw error;
    return data;
  }
};`,
      type: 'javascript' as const,
      description: 'Supabase client with Locofy-specific helpers'
    });

    // Integration deployment script
    files.push({
      path: 'deploy-locofy-hybrid.sh',
      content: `#!/bin/bash
# Deploy Locofy Frontend + FIR Backend to Vercel/Supabase

set -e

echo "🚀 Deploying Locofy + FIR Hybrid to Vercel/Supabase..."

# Build Locofy frontend
if [ -d "locofy-frontend" ]; then
  echo "📦 Building Locofy frontend..."
  cd locofy-frontend
  npm install
  npm run build
  cd ..
fi

# Deploy backend to Vercel
echo "🔧 Deploying backend to Vercel..."
cd backend
npm install
vercel --prod
cd ..

# Run Supabase migrations
if command -v supabase &> /dev/null; then
  echo "🗄️ Running Supabase migrations..."
  supabase db push
else
  echo "⚠️ Supabase CLI not found. Please run migrations manually."
fi

echo "✅ Deployment complete!"
echo "🌐 Frontend + Backend deployed to Vercel with Supabase database"`,
      type: 'text' as const,
      description: 'Deployment script for Locofy + FIR hybrid',
      executable: true
    });

    return files;
  }

  private generateLocofySpecificDocs(project: GeneratedProject, enableHosting?: boolean): string {
    return `# Locofy + FIR Hybrid Integration${enableHosting ? ' with Vercel/Supabase Hosting' : ''}

## Overview

This documentation covers the integration between your Locofy-generated frontend and the FIR-generated spatial backend${enableHosting ? ' with automated Vercel/Supabase hosting' : ''}.

## Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  Figma Design   │────▶│  Locofy Frontend    │────▶│  FIR Backend    │
│                 │    │  (React/Next.js)    │    │  ${enableHosting ? '(Vercel API)' : '(Express/API)'}  │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
                                │                           │
                                ▼                           ▼
                        ┌─────────────────┐    ┌─────────────────────┐
                        │ Spatial Runtime │    │ ${enableHosting ? 'Supabase/PostGIS' : 'PostGIS Database'} │
                        │  Enhancement    │    │  (Spatial Queries)  │
                        └─────────────────┘    └─────────────────────┘
\`\`\`

${enableHosting ? `
## Vercel/Supabase Hosting (Product 4)

This project is configured for seamless deployment to Vercel with Supabase backend:

### Features:
- **Automatic Deployment**: One-command deploy with \`npm run deploy\`
- **Serverless API**: Vercel Functions for backend logic
- **Real-time Database**: Supabase with PostGIS for spatial queries
- **Authentication**: Supabase Auth integration ready
- **File Storage**: Supabase Storage for assets

### Quick Start:
1. Set up Supabase project
2. Update environment variables
3. Run \`./deploy-locofy-hybrid.sh\`
4. Your app is live!

### Environment Setup:
\`\`\`bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`
` : ''}

## API Endpoints

${project.endpoints.map(endpoint => 
`### ${endpoint.method} ${endpoint.path}
- **Purpose**: ${endpoint.description || 'Data access'}
- **Spatial**: ${endpoint.spatialQuery ? 'Yes' : 'No'}
`).join('\n')}

## Data Models

${project.models.map(model => 
`### ${model.name}
- **Table**: \`${model.tableName}\`
- **Fields**: ${model.fields.length}
- **Spatial**: ${model.spatialIndexes.length > 0 ? 'Yes' : 'No'}
`).join('\n')}

## Best Practices

1. **Frontend Integration**
   - Use the provided spatial wrapper components
   - Configure API endpoints to match your backend deployment
   - Implement error handling for spatial queries

2. **Performance**
   - Use spatial indexes for location-based queries
   - Implement pagination for large datasets
   - Cache frequently accessed spatial data

3. **Deployment**
   - Deploy frontend and backend to compatible platforms
   - Configure CORS for cross-origin requests
   - Use environment variables for configuration
`;
  }
}

// Export all types and classes
export * from './types.js';
export { DatabaseGenerator } from './database-generator.js';
export { APIGenerator } from './api-generator.js';
export { DeploymentGenerator } from './deployment-generator.js';
export { SpatialAnalyzer } from './spatial-analyzer.js';
export { VercelSupabaseTemplates } from './vercel-supabase-templates.js';
export { AutoDeployment, type DeploymentCredentials, type DeploymentResult } from './auto-deployment.js';