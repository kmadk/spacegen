/**
 * Backend Generator
 * AI-powered backend generation from design data
 */

import { AIPatternAnalyzer } from './analyzers/ai-pattern-analyzer.js';
import { SmartDataGenerator } from './generators/smart-data-generator.js';
import { FigmaIntegration } from './integrations/figma-integration.js';
import type { 
  BackendGeneratorConfig, 
  GeneratedProject, 
  DataModel, 
  APIEndpoint,
  GeneratedFile,
  DesignData
} from './types.js';

export class BackendGenerator {
  private aiAnalyzer?: AIPatternAnalyzer;
  private figmaIntegration?: FigmaIntegration;

  constructor(private config: BackendGeneratorConfig) {
    // Validate required config
    if (!config.projectName || config.projectName.trim() === '') {
      throw new Error('Project name is required');
    }
    
    if (config.openaiApiKey) {
      this.aiAnalyzer = new AIPatternAnalyzer({
        apiKey: config.openaiApiKey,
        debug: config.debug,
        model: 'gpt-5',
        maxTokens: 2000, // Optimized: reduced from 8000
        temperature: 0.1,
        enableVision: true
      });
    }

    // Initialize Figma integration if token provided
    if (config.figmaAccessToken && config.openaiApiKey) {
      this.figmaIntegration = new FigmaIntegration({
        figmaAccessToken: config.figmaAccessToken,
        aiConfig: {
          apiKey: config.openaiApiKey,
          debug: config.debug,
          model: 'gpt-5',
          maxTokens: 2000, // Optimized: consistent with main analyzer
          temperature: 0.1,
          enableVision: true
        },
        cacheEnabled: true,
        debug: config.debug
      });
    }
  }

  /**
   * Generate complete backend directly from Figma file (optimized)
   */
  async generateFromFigmaFile(
    figmaFileId: string,
    options: {
      version?: string;
      includeScreenshots?: boolean;
      screenshotUrls?: string[];
      pageIds?: string[];
    } = {}
  ): Promise<GeneratedProject & {
    performance: {
      totalTime: number;
      fetchTime: number;
      filterTime: number;
      analysisTime: number;
      tokensUsed: number;
      cacheHit: boolean;
    };
  }> {
    if (!this.figmaIntegration) {
      throw new Error('Figma access token required for direct Figma file processing');
    }

    const startTime = Date.now();

    if (this.config.debug) {
      console.log('DEBUG: Generating backend from Figma file:', figmaFileId);
    }

    try {
      // Use optimized Figma integration
      const result = await this.figmaIntegration.generateFromFigmaFile(figmaFileId, options);
      
      // Generate backend from the analyzed data
      const generatedProject = await this.generateFromAnalysis(result.analysis);

      if (this.config.debug) {
        console.log('DEBUG: Figma-optimized generation completed:', {
          entities: result.analysis.combinedEntities.length,
          performance: result.performance,
          analysisMethod: result.analysis.analysisMethod
        });
      }

      return {
        ...generatedProject,
        performance: result.performance
      };

    } catch (error) {
      console.error('Figma file processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete backend from design data with optional vision analysis
   */
  async generateFromDesignData(designData: DesignData, screenshots?: any[]): Promise<GeneratedProject> {
    if (!this.aiAnalyzer) {
      throw new Error('OpenAI API key required for AI-powered backend generation');
    }

    if (this.config.debug) {
      console.log('DEBUG: Generating backend from design data:', {
        source: designData.source,
        hasScreenshots: screenshots && screenshots.length > 0
      });
    }
    
    // AI analysis of design patterns using cost-optimized batch analysis
    const analysis = await this.aiAnalyzer.analyzeCostOptimized(designData);
      
    if (this.config.debug) {
      console.log('DEBUG: Analysis result:', {
        entities: analysis?.entities?.entities?.length || 0,
        endpoints: analysis?.endpoints?.endpoints?.length || 0,
        combinedAnalysis: !!(analysis as any).combinedAnalysis,
        analysisMethod: (analysis as any).combinedAnalysis?.analysisMethod || 'text_only'
      });
    }
    
    // Use combined entities if available, otherwise fall back to text analysis
    const entitiesForGeneration = (analysis as any).combinedAnalysis?.combinedEntities || analysis?.entities?.entities || [];
    
    // Generate models from AI analysis (with defaults)
    const models = this.generateModelsFromAnalysis(entitiesForGeneration);
    
    // Generate API endpoints (with defaults)
    const endpoints = this.generateEndpointsFromAnalysis(analysis?.endpoints?.endpoints || [], models);
    
    // Generate database files
    const databaseFiles = this.generateDatabaseFiles(models);
    
    // Generate API files
    const apiFiles = this.generateAPIFiles(endpoints);
    
    // Generate seed data
    const seedFiles = await this.generateSeedData(models, analysis?.seedData || []);

    const files = [
      ...databaseFiles,
      ...apiFiles,
      ...seedFiles,
      {
        path: 'package.json',
        content: JSON.stringify(this.generatePackageJson(), null, 2),
        type: 'config' as const
      }
    ];

    if (this.config.debug) {
      const combinedAnalysis = (analysis as any).combinedAnalysis;
      const analysisInfo = combinedAnalysis 
        ? `(${combinedAnalysis.analysisMethod} analysis, confidence: ${combinedAnalysis.confidenceScore.toFixed(2)})`
        : '(text analysis only)';
        
      console.log(`✅ Generated backend with ${models.length} models, ${endpoints.length} endpoints ${analysisInfo}`);
    }

    return {
      files,
      models,
      endpoints,
      config: this.config,
      deploymentFiles: [],
      metadata: {
        generatedAt: new Date(),
        aiAnalysisUsed: true,
        totalEndpoints: endpoints.length,
        spatialEndpoints: 0, // No longer using spatial endpoints
        estimatedComplexity: endpoints.length > 10 ? 'complex' : endpoints.length > 5 ? 'medium' : 'simple'
      }
    };
  }

  private generateModelsFromAnalysis(entities: any[] = []): DataModel[] {
    const models: DataModel[] = [];

    // Handle array of DetectedEntity objects from AI analysis
    for (const entity of entities) {
      const model: DataModel = {
        name: entity.name,
        tableName: entity.tableName || this.toSnakeCase(entity.name),
        fields: [],
        indexes: [],
        relationships: []
      };

      // Add fields from entity
      if (entity.fields && Array.isArray(entity.fields)) {
        for (const field of entity.fields) {
          model.fields.push({
            name: field.name,
            type: field.type,
            required: field.required ?? true,
            unique: field.unique ?? false,
            primary: field.primary ?? false,
            indexed: field.indexed ?? false,
            default: field.default,
            constraints: field.constraints,
            description: field.description
          });
        }
      }

      // Add standard fields if not present
      if (!model.fields.find(f => f.name === 'id')) {
        model.fields.unshift({
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          primary: true
        });
      }

      // Add spatial indexing if enabled
      if (this.config.enableSpatialQueries && entity.fields?.some(f => f.type.includes('geometry'))) {
        model.indexes.push({
          name: `${model.tableName}_spatial_idx`,
          field: 'position',
          type: 'gist'
        });
      }

      models.push(model);
    }

    return models;
  }

  private generateEndpointsFromAnalysis(endpointAnalysis: any, models: DataModel[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    for (const model of models) {
      // Standard CRUD endpoints
      endpoints.push(
        {
          method: 'GET',
          path: `/${model.tableName}`,
          handler: `get${model.name}List`,
          description: `Get all ${model.name} records`
        },
        {
          method: 'GET',
          path: `/${model.tableName}/:id`,
          handler: `get${model.name}ById`,
          description: `Get ${model.name} by ID`
        },
        {
          method: 'POST',
          path: `/${model.tableName}`,
          handler: `create${model.name}`,
          description: `Create new ${model.name}`
        },
        {
          method: 'PUT',
          path: `/${model.tableName}/:id`,
          handler: `update${model.name}`,
          description: `Update ${model.name}`
        },
        {
          method: 'DELETE',
          path: `/${model.tableName}/:id`,
          handler: `delete${model.name}`,
          description: `Delete ${model.name}`
        }
      );

      // Add spatial endpoint if applicable
      if (this.config.enableSpatialQueries) {
        endpoints.push({
          method: 'GET',
          path: `/${model.tableName}/spatial`,
          handler: `get${model.name}Spatial`,
          description: `Spatial query for ${model.name}`
        });
      }
    }

    return endpoints;
  }

  private generateDatabaseFiles(models: DataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Database schema
    files.push({
      path: 'database/schema.sql',
      content: this.generateDatabaseSchema(models),
      type: 'database'
    });

    // Migration file
    const timestamp = Date.now();
    files.push({
      path: `database/migrations/${timestamp}_initial_migration.sql`,
      content: this.generateMigrationFile(models),
      type: 'migration'
    });

    // Drizzle schema
    files.push({
      path: 'src/database/schema.ts',
      content: this.generateDrizzleSchema(models),
      type: 'database'
    });

    // Migration runner
    files.push({
      path: 'database/migrate.ts',
      content: this.generateMigrationRunner(),
      type: 'database'
    });

    return files;
  }

  private generateAPIFiles(endpoints: APIEndpoint[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Main API router
    files.push({
      path: 'src/api/index.ts',
      content: this.generateAPIRouter(endpoints),
      type: 'api'
    });

    // Individual route handlers
    const routesByEntity = this.groupEndpointsByEntity(endpoints);
    for (const [entity, entityEndpoints] of Object.entries(routesByEntity)) {
      files.push({
        path: `src/api/${entity}.ts`,
        content: this.generateEntityRoutes(entity, entityEndpoints),
        type: 'api'
      });
    }

    return files;
  }

  private async generateSeedData(models: DataModel[], seedAnalysis: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const generator = new SmartDataGenerator();

    for (const model of models) {
      const seedData = await generator.generateRealisticData(
        model,
        { count: 50, useAI: !!this.config.openaiApiKey }
      );

      files.push({
        path: `database/seeds/${model.tableName}.json`,
        content: JSON.stringify(seedData, null, 2),
        type: 'data'
      });
    }

    return files;
  }

  private generateMigrationFile(models: DataModel[]): string {
    let migration = '';
    
    // Enable PostGIS if spatial queries are enabled
    if (this.config.enableSpatialQueries) {
      migration += '-- Enable PostGIS extension\nCREATE EXTENSION IF NOT EXISTS postgis;\n\n';
    }
    
    // Create tables
    for (const model of models) {
      migration += `-- Create table ${model.tableName}\n`;
      migration += `CREATE TABLE ${model.tableName} (\n`;
      
      const fieldDefinitions = model.fields.map(field => {
        let definition = `  ${field.name} ${this.mapFieldTypeToSQL(field.type)}`;
        
        if (field.required && !field.primary) {
          definition += ' NOT NULL';
        }
        
        if (field.unique) {
          definition += ' UNIQUE';
        }
        
        if (field.default !== undefined) {
          definition += ` DEFAULT ${this.formatDefaultValue(field.default)}`;
        }
        
        return definition;
      });
      
      // Add primary key constraint
      const primaryFields = model.fields.filter(f => f.primary).map(f => f.name);
      if (primaryFields.length > 0) {
        fieldDefinitions.push(`  PRIMARY KEY (${primaryFields.join(', ')})`);
      }
      
      migration += fieldDefinitions.join(',\n') + '\n);\n\n';
      
      // Add database indexes
      for (const index of model.indexes) {
        migration += `-- Create index for ${model.tableName}\n`;
        migration += `CREATE INDEX ${index.name} ON ${model.tableName} USING ${index.type.toUpperCase()} (${index.field});\n\n`;
      }
    }
    
    return migration;
  }

  private generateMigrationRunner(): string {
    return `import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Find migration files
    const migrationFiles = [
      // Add migration files here
    ];
    
    for (const migrationFile of migrationFiles) {
      console.log(\`Running migration: \${migrationFile}\`);
      const migrationSQL = readFileSync(join(__dirname, 'migrations', migrationFile), 'utf-8');
      await client.query(migrationSQL);
    }
    
    console.log('All migrations completed successfully');
    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}
`;
  }

  private mapFieldTypeToSQL(type: string): string {
    const mapping: Record<string, string> = {
      'uuid': 'UUID DEFAULT gen_random_uuid()',
      'serial': 'SERIAL',
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'timestamp': 'TIMESTAMP DEFAULT NOW()',
      'date': 'DATE',
      'geometry(Point,4326)': 'GEOMETRY(Point,4326)',
      'geometry': 'GEOMETRY'
    };
    
    return mapping[type] || 'TEXT';
  }

  private formatDefaultValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value === null) {
      return 'NULL';
    }
    return String(value);
  }

  private generatePackageJson() {
    return {
      name: this.config.projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'tsx src/api/index.ts',
        build: 'tsc',
        start: 'node dist/api/index.js',
        'db:generate': 'drizzle-kit generate:pg',
        'db:migrate': 'tsx database/migrate.ts',
        'db:seed': 'tsx database/seed.ts'
      },
      dependencies: {
        'drizzle-orm': '^0.29.0',
        'postgres': '^3.4.0',
        'express': '^4.18.0',
        'cors': '^2.8.5',
        'tsx': '^4.0.0'
      },
      devDependencies: {
        '@types/express': '^4.17.0',
        '@types/cors': '^2.8.0',
        'drizzle-kit': '^0.20.0',
        'typescript': '^5.0.0'
      }
    };
  }

  private generateDatabaseSchema(models: DataModel[]): string {
    let schema = '-- Generated Database Schema\n\n';
    
    if (this.config.enableSpatialQueries) {
      schema += '-- Enable PostGIS\nCREATE EXTENSION IF NOT EXISTS postgis;\n\n';
    }

    for (const model of models) {
      schema += `-- Table: ${model.tableName}\n`;
      schema += `CREATE TABLE ${model.tableName} (\n`;
      
      for (const field of model.fields) {
        const pgType = this.toPgType(field.type);
        const nullable = field.required ? 'NOT NULL' : '';
        const unique = field.unique ? 'UNIQUE' : '';
        schema += `  ${field.name} ${pgType} ${nullable} ${unique},\n`;
      }
      
      schema += '  created_at TIMESTAMPTZ DEFAULT NOW(),\n';
      schema += '  updated_at TIMESTAMPTZ DEFAULT NOW()\n';
      schema += ');\n\n';
    }

    return schema;
  }

  private generateDrizzleSchema(models: DataModel[]): string {
    let schema = "import { pgTable, uuid, text, decimal, timestamp, boolean, integer } from 'drizzle-orm/pg-core';\n\n";

    for (const model of models) {
      schema += `export const ${model.tableName} = pgTable('${model.tableName}', {\n`;
      
      for (const field of model.fields) {
        const drizzleType = this.toDrizzleType(field.type);
        schema += `  ${field.name}: ${drizzleType}`;
        if (field.name === 'id') schema += ".primaryKey()";
        if (field.unique && field.name !== 'id') schema += ".unique()";
        if (field.required) schema += ".notNull()";
        schema += ',\n';
      }
      
      schema += '  createdAt: timestamp("created_at").defaultNow().notNull(),\n';
      schema += '  updatedAt: timestamp("updated_at").defaultNow().notNull()\n';
      schema += '});\n\n';
    }

    return schema;
  }

  private generateAPIRouter(endpoints: APIEndpoint[]): string {
    return `import express from 'express';
import cors from 'cors';
${Array.from(new Set(endpoints.map(e => this.getEntityFromPath(e.path)))).map(entity => 
  `import { ${entity}Router } from './${entity}.js';`
).join('\n')}

const app = express();
app.use(cors());
app.use(express.json());

${Array.from(new Set(endpoints.map(e => this.getEntityFromPath(e.path)))).map(entity => 
  `app.use('/${entity}', ${entity}Router);`
).join('\n')}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚀 API server running on port \${PORT}\`);
});`;
  }

  private generateEntityRoutes(entity: string, endpoints: APIEndpoint[]): string {
    return `import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

export const ${entity}Router = Router();

${endpoints.map(endpoint => {
  const method = endpoint.method.toLowerCase();
  const pathPattern = endpoint.path.replace(`/${entity}`, '') || '/';
  const hasIdParam = pathPattern.includes('[id]');
  const cleanPath = pathPattern.replace('[id]', ':id');
  
  return `${entity}Router.${method}('${cleanPath}', async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    ${method === 'get' && hasIdParam ? `
    // Get single ${entity} by ID
    const { id } = req.params;
    const { data, error } = await supabase
      .from('${entity}')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: '${entity} not found' });
    
    res.json(data);` : ''}
    
    ${method === 'get' && !hasIdParam ? `
    // Get all ${entity}
    const { page = 1, limit = 10, ...filters } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase.from('${entity}').select('*', { count: 'exact' });
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });` : ''}
    
    ${method === 'post' ? `
    // Create new ${entity}
    const { data, error } = await supabase
      .from('${entity}')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);` : ''}
    
    ${method === 'put' ? `
    // Update ${entity}
    const { id } = req.params;
    const { data, error } = await supabase
      .from('${entity}')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: '${entity} not found' });
    
    res.json(data);` : ''}
    
    ${method === 'delete' ? `
    // Delete ${entity}
    const { id } = req.params;
    const { error } = await supabase
      .from('${entity}')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(204).send();` : ''}
    
  } catch (error) {
    console.error('${entity} ${method} error:', error);
    res.status(500).json({ error: error.message });
  }
});`;
}).join('\n\n')}`;
  }

  private groupEndpointsByEntity(endpoints: APIEndpoint[]) {
    return endpoints.reduce((acc, endpoint) => {
      const entity = this.getEntityFromPath(endpoint.path);
      if (!acc[entity]) acc[entity] = [];
      acc[entity].push(endpoint);
      return acc;
    }, {} as Record<string, APIEndpoint[]>);
  }

  private getEntityFromPath(path: string): string {
    return path.split('/')[1] || 'api';
  }

  private inferDatabaseType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'number': 'decimal',
      'boolean': 'boolean',
      'date': 'timestamp',
      'array': 'text[]',
      'object': 'jsonb'
    };
    return typeMap[type] || 'text';
  }

  private toPgType(type: string): string {
    const typeMap: Record<string, string> = {
      'uuid': 'UUID DEFAULT gen_random_uuid()',
      'text': 'TEXT',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'timestamp': 'TIMESTAMPTZ',
      'integer': 'INTEGER'
    };
    return typeMap[type] || 'TEXT';
  }

  private toDrizzleType(type: string): string {
    const typeMap: Record<string, string> = {
      'uuid': 'uuid("id")',
      'text': 'text()',
      'decimal': 'decimal({ precision: 10, scale: 2 })',
      'boolean': 'boolean()',
      'timestamp': 'timestamp()',
      'integer': 'integer()'
    };
    return typeMap[type] || 'text()';
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase();
  }

  /**
   * Generate backend project from pre-analyzed data
   */
  private async generateFromAnalysis(analysis: any): Promise<GeneratedProject> {
    // Convert analysis to models
    const models: DataModel[] = analysis.combinedEntities.map((entity: any) => ({
      name: entity.name,
      tableName: entity.tableName,
      description: entity.reasoning || `Generated ${entity.name} model`,
      fields: entity.fields,
      indexes: entity.indexes || [],
      relationships: []
    }));

    // Generate API endpoints
    const endpoints: APIEndpoint[] = [];
    for (const model of models) {
      endpoints.push(
        {
          path: `/${model.tableName}`,
          method: 'GET',
          description: `Get all ${model.name} records`,
          parameters: [],
          response: { type: 'array', items: model.name }
        },
        {
          path: `/${model.tableName}/:id`,
          method: 'GET',
          description: `Get ${model.name} by ID`,
          parameters: [{ name: 'id', type: 'string', required: true }],
          response: { type: 'object', schema: model.name }
        },
        {
          path: `/${model.tableName}`,
          method: 'POST',
          description: `Create new ${model.name}`,
          parameters: [],
          body: { type: 'object', schema: model.name },
          response: { type: 'object', schema: model.name }
        }
      );
    }

    // Generate files
    const files: GeneratedFile[] = [];
    
    // Database schema file
    const schemaContent = this.generateDatabaseSchema(models);
    files.push({
      path: 'database/schema.sql',
      content: schemaContent,
      type: 'database',
      description: 'Database schema definition'
    });

    // API routes file
    const apiContent = this.generateAPIRoutes(models, endpoints);
    files.push({
      path: 'api/routes.js',
      content: apiContent,
      type: 'api',
      description: 'API route definitions'
    });

    return {
      models,
      endpoints,
      files,
      config: this.config
    };
  }
}