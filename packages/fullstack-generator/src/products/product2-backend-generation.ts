/**
 * Product 2: Penpot/Figma → Working Backend
 * AI-powered backend generation from spatial designs
 */

import type { SpatialElement } from '@fir/spatial-runtime';
import { AIPatternAnalyzer } from '../ai-analyzer.js';
import { SmartDataGenerator } from '../smart-data-generator.js';
import type { FullstackGeneratorConfig, GeneratedProject, SpatialDataModel, APIEndpoint } from '../types.js';

export class Product2BackendGeneration {
  private aiAnalyzer?: AIPatternAnalyzer;

  constructor(private config: FullstackGeneratorConfig) {
    if (config.openaiApiKey) {
      this.aiAnalyzer = new AIPatternAnalyzer(config);
    }
  }

  /**
   * Generate complete backend from spatial elements
   */
  async generateFromElements(elements: SpatialElement[]): Promise<GeneratedProject> {
    if (!this.aiAnalyzer) {
      throw new Error('OpenAI API key required for AI-powered backend generation');
    }

    // AI analysis of design patterns
    const analysis = await this.aiAnalyzer.analyzeDesignPatterns(elements);
    
    // Generate models from AI analysis
    const models = this.generateModelsFromAnalysis(analysis.entities);
    
    // Generate API endpoints
    const endpoints = this.generateEndpointsFromAnalysis(analysis.endpoints, models);
    
    // Generate database files
    const databaseFiles = this.generateDatabaseFiles(models);
    
    // Generate API files
    const apiFiles = this.generateAPIFiles(endpoints);
    
    // Generate seed data
    const seedFiles = await this.generateSeedData(models, analysis.seedData);

    const files = [
      ...databaseFiles,
      ...apiFiles,
      ...seedFiles,
      {
        path: 'package.json',
        content: JSON.stringify(this.generatePackageJson(), null, 2)
      }
    ];

    if (this.config.debug) {
      console.log(`✅ Product 2: Generated backend with ${models.length} models, ${endpoints.length} endpoints`);
    }

    return {
      files,
      models,
      endpoints,
      config: this.config,
      deploymentFiles: []
    };
  }

  private generateModelsFromAnalysis(entities: any): SpatialDataModel[] {
    const models: SpatialDataModel[] = [];

    for (const [entityName, entityData] of Object.entries(entities)) {
      const model: SpatialDataModel = {
        name: entityName,
        tableName: this.toSnakeCase(entityName),
        fields: [],
        spatialIndexes: [],
        relationships: []
      };

      // Add fields from entity analysis
      if (typeof entityData === 'object' && entityData !== null) {
        const data = entityData as any;
        if (data.commonFields) {
          for (const [fieldName, fieldInfo] of Object.entries(data.commonFields)) {
            if (typeof fieldInfo === 'object' && fieldInfo !== null) {
              const info = fieldInfo as any;
              model.fields.push({
                name: fieldName,
                type: this.inferDatabaseType(info.type || 'string'),
                required: info.required ?? true,
                unique: info.unique ?? false
              });
            }
          }
        }
      }

      // Add standard fields if not present
      if (!model.fields.find(f => f.name === 'id')) {
        model.fields.unshift({
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true
        });
      }

      models.push(model);
    }

    return models;
  }

  private generateEndpointsFromAnalysis(endpointAnalysis: any, models: SpatialDataModel[]): APIEndpoint[] {
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

  private generateDatabaseFiles(models: SpatialDataModel[]) {
    const files = [];

    // Database schema
    files.push({
      path: 'database/schema.sql',
      content: this.generateDatabaseSchema(models)
    });

    // Drizzle schema
    files.push({
      path: 'src/database/schema.ts',
      content: this.generateDrizzleSchema(models)
    });

    return files;
  }

  private generateAPIFiles(endpoints: APIEndpoint[]) {
    const files = [];

    // Main API router
    files.push({
      path: 'src/api/index.ts',
      content: this.generateAPIRouter(endpoints)
    });

    // Individual route handlers
    const routesByEntity = this.groupEndpointsByEntity(endpoints);
    for (const [entity, entityEndpoints] of Object.entries(routesByEntity)) {
      files.push({
        path: `src/api/${entity}.ts`,
        content: this.generateEntityRoutes(entity, entityEndpoints)
      });
    }

    return files;
  }

  private async generateSeedData(models: SpatialDataModel[], seedAnalysis: any) {
    const files = [];
    const generator = new SmartDataGenerator();

    for (const model of models) {
      const seedData = await generator.generateRealisticData(
        model,
        { count: 50, useAI: !!this.config.openaiApiKey }
      );

      files.push({
        path: `database/seeds/${model.tableName}.json`,
        content: JSON.stringify(seedData, null, 2)
      });
    }

    return files;
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

  private generateDatabaseSchema(models: SpatialDataModel[]): string {
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

  private generateDrizzleSchema(models: SpatialDataModel[]): string {
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
// Import your database connection and models here

export const ${entity}Router = Router();

${endpoints.map(endpoint => {
  const method = endpoint.method.toLowerCase();
  return `${entity}Router.${method}('${endpoint.path.replace(`/${entity}`, '') || '/'}', async (req, res) => {
  try {
    // TODO: Implement ${endpoint.handler}
    res.json({ message: '${endpoint.description}' });
  } catch (error) {
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
}