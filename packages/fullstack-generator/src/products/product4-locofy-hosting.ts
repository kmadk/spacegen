/**
 * Product 4: Figma → Locofy → Full-Stack Backend/Hosting
 * Integrate Locofy-generated code with backend and hosting
 */

import { VercelSupabaseTemplates } from '../vercel-supabase-templates.js';
import { Product2BackendGeneration } from './product2-backend-generation.js';
import type { FullstackGeneratorConfig, GeneratedProject, LocofyConfig, VercelSupabaseConfig, SpatialDataModel } from '../types.js';

export class Product4LocofyHosting {
  private product2: Product2BackendGeneration;
  private vercelSupabase: VercelSupabaseTemplates;

  constructor(private config: FullstackGeneratorConfig) {
    this.product2 = new Product2BackendGeneration(config);
    
    const vercelSupabaseConfig: VercelSupabaseConfig = {
      projectName: config.projectName,
      supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
      enableAuth: true,
      enableStorage: true,
      enableEdgeFunctions: false,
      vercel: {
        framework: 'react',
        buildCommand: 'npm run build',
        outputDirectory: 'build',
        installCommand: 'npm install',
        environmentVariables: {}
      }
    };
    
    this.vercelSupabase = new VercelSupabaseTemplates(vercelSupabaseConfig);
  }

  /**
   * Generate backend and hosting for Locofy-generated frontend
   */
  async generateFromLocofy(
    locofyCode: string,
    locofyConfig: LocofyConfig,
    inferredModels?: SpatialDataModel[]
  ): Promise<GeneratedProject> {
    
    // Step 1: Analyze Locofy code for data patterns
    const analysisResults = this.analyzeLocofyCode(locofyCode);
    
    // Step 2: Use provided models or generate from analysis
    const models = inferredModels || this.generateModelsFromAnalysis(analysisResults);
    
    // Step 3: Generate backend infrastructure
    const backendFiles = this.generateBackendFiles(models);
    
    // Step 4: Generate Vercel/Supabase hosting files
    const hostingFiles = this.generateHostingFiles(models);
    
    // Step 5: Generate integration files to connect Locofy frontend with backend
    const integrationFiles = this.generateLocofyIntegration(locofyCode, models);
    
    // Step 6: Generate deployment configuration
    const deploymentFiles = this.generateDeploymentFiles(models);

    const allFiles = [
      ...backendFiles,
      ...hostingFiles,
      ...integrationFiles,
      ...deploymentFiles
    ];

    if (this.config.debug) {
      console.log(`✅ Product 4: Generated Locofy integration with ${allFiles.length} files`);
      console.log(`🗄️  Models: ${models.length}`);
      console.log(`🌐 Backend: Express + Supabase`);
      console.log(`🚀 Frontend: Locofy + Vercel hosting`);
    }

    return {
      files: allFiles,
      models,
      endpoints: this.generateEndpoints(models),
      config: this.config,
      deploymentFiles
    };
  }

  private analyzeLocofyCode(locofyCode: string) {
    // Extract data patterns from Locofy-generated code
    const dataPatterns = {
      components: this.extractComponents(locofyCode),
      stateVariables: this.extractStateVariables(locofyCode),
      apiCalls: this.extractApiCalls(locofyCode),
      formFields: this.extractFormFields(locofyCode)
    };

    if (this.config.debug) {
      console.log(`🔍 Analyzed Locofy code: ${dataPatterns.components.length} components, ${dataPatterns.stateVariables.length} state vars`);
    }

    return dataPatterns;
  }

  private extractComponents(code: string): string[] {
    const componentRegex = /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:\(|\s*=)/g;
    const matches = [];
    let match;
    while ((match = componentRegex.exec(code)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractStateVariables(code: string): string[] {
    const stateRegex = /const\s+\[([a-zA-Z][a-zA-Z0-9]*),\s*set[A-Z][a-zA-Z0-9]*\]\s*=\s*useState/g;
    const matches = [];
    let match;
    while ((match = stateRegex.exec(code)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractApiCalls(code: string): string[] {
    const apiRegex = /(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const matches = [];
    let match;
    while ((match = apiRegex.exec(code)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractFormFields(code: string): string[] {
    const fieldRegex = /(?:name|id)=['"`]([a-zA-Z][a-zA-Z0-9_-]*)['"`]/g;
    const matches = [];
    let match;
    while ((match = fieldRegex.exec(code)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)]; // Remove duplicates
  }

  private generateModelsFromAnalysis(analysis: any): SpatialDataModel[] {
    const models: SpatialDataModel[] = [];

    // Generate models based on detected patterns
    if (analysis.stateVariables.length > 0) {
      // Create a generic data model
      const model: SpatialDataModel = {
        name: 'LocofyData',
        tableName: 'locofy_data',
        fields: [
          {
            name: 'id',
            type: 'uuid',
            required: true,
            unique: true
          }
        ],
        spatialIndexes: [],
        relationships: []
      };

      // Add fields based on form fields and state variables
      const fieldNames = [...new Set([...analysis.formFields, ...analysis.stateVariables])];
      for (const fieldName of fieldNames) {
        if (fieldName !== 'id' && !fieldName.startsWith('set')) {
          model.fields.push({
            name: fieldName,
            type: this.inferFieldType(fieldName),
            required: false
          });
        }
      }

      models.push(model);
    }

    return models;
  }

  private inferFieldType(fieldName: string): string {
    const name = fieldName.toLowerCase();
    
    if (name.includes('email')) return 'text';
    if (name.includes('password')) return 'text';
    if (name.includes('phone')) return 'text';
    if (name.includes('price') || name.includes('amount')) return 'decimal';
    if (name.includes('count') || name.includes('quantity')) return 'integer';
    if (name.includes('date') || name.includes('time')) return 'timestamp';
    if (name.includes('active') || name.includes('enabled')) return 'boolean';
    
    return 'text';
  }

  private generateBackendFiles(models: SpatialDataModel[]) {
    const files = [];

    // Generate API routes for Vercel
    const apiRoutes = this.vercelSupabase.generateApiRoutes(models);
    files.push(...apiRoutes.map(route => ({
      path: route.path,
      content: route.content
    })));

    // Generate database migrations
    files.push({
      path: 'supabase/migrations/001_initial.sql',
      content: this.vercelSupabase.generateSupabaseMigrations(models)
    });

    return files;
  }

  private generateHostingFiles(models: SpatialDataModel[]) {
    const files = [];

    // Supabase client configuration
    files.push({
      path: 'src/lib/supabase.js',
      content: this.vercelSupabase.generateSupabaseConfig()
    });

    // Updated package.json for Locofy project
    files.push({
      path: 'package.json',
      content: JSON.stringify(this.generateLocofyPackageJson(), null, 2)
    });

    // Vercel configuration
    files.push({
      path: 'vercel.json',
      content: JSON.stringify(this.vercelSupabase.generateVercelJson(), null, 2)
    });

    return files;
  }

  private generateLocofyIntegration(locofyCode: string, models: SpatialDataModel[]) {
    const files = [];

    // Generate data service layer
    files.push({
      path: 'src/services/dataService.js',
      content: this.generateDataService(models)
    });

    // Generate React hooks for data fetching
    files.push({
      path: 'src/hooks/useData.js',
      content: this.generateDataHooks(models)
    });

    // Generate enhanced Locofy components with backend integration
    files.push({
      path: 'src/components/EnhancedComponents.jsx',
      content: this.generateEnhancedComponents(locofyCode)
    });

    return files;
  }

  private generateDataService(models: SpatialDataModel[]): string {
    return `import { supabase } from '../lib/supabase';

class DataService {
${models.map(model => `
  // ${model.name} operations
  async get${model.name}List() {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  async get${model.name}ById(id) {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async create${model.name}(item) {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .insert([item])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  async update${model.name}(id, updates) {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  async delete${model.name}(id) {
    const { error } = await supabase
      .from('${model.tableName}')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }`).join('\n')}
}

export const dataService = new DataService();`;
  }

  private generateDataHooks(models: SpatialDataModel[]): string {
    return `import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

${models.map(model => `
export function use${model.name}List() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const result = await dataService.get${model.name}List();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchData };
}

export function use${model.name}(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const result = await dataService.get${model.name}ById(id);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchData };
}`).join('\n')}`;
  }

  private generateEnhancedComponents(locofyCode: string): string {
    return `import React from 'react';
${this.extractComponents(locofyCode).map(comp => `import { use${comp}List } from '../hooks/useData';`).join('\n')}

// Enhanced components with backend integration
// These wrap your Locofy components with data fetching

${this.extractComponents(locofyCode).map(comp => `
export function Enhanced${comp}() {
  const { data, loading, error } = use${comp}List();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // Pass data to your original Locofy component
  return <${comp} data={data} />;
}`).join('\n')}`;
  }

  private generateDeploymentFiles(models: SpatialDataModel[]) {
    return [
      {
        path: '.env.example',
        content: this.vercelSupabase.generateEnvTemplate()
      },
      {
        path: 'deploy.sh',
        content: this.vercelSupabase.generateDeploymentScript()
      },
      {
        path: 'README.md',
        content: this.generateReadme()
      }
    ];
  }

  private generateLocofyPackageJson() {
    const basePackage = this.vercelSupabase.generatePackageJson(this.config.projectName);
    
    // Add Locofy-specific dependencies
    return {
      ...basePackage,
      scripts: {
        ...basePackage.scripts,
        'locofy:sync': 'echo "Sync with Locofy project"'
      },
      dependencies: {
        ...basePackage.dependencies,
        // Add any Locofy-specific dependencies here
      }
    };
  }

  private generateEndpoints(models: SpatialDataModel[]) {
    const endpoints = [];

    for (const model of models) {
      endpoints.push(
        {
          method: 'GET',
          path: `/api/${model.tableName}`,
          handler: `get${model.name}List`,
          description: `Get all ${model.name} records`
        },
        {
          method: 'POST',
          path: `/api/${model.tableName}`,
          handler: `create${model.name}`,
          description: `Create new ${model.name}`
        }
      );
    }

    return endpoints;
  }

  private generateReadme(): string {
    return `# ${this.config.projectName}

## Locofy + FIR Full-Stack Integration

This project combines:
- **Frontend**: Locofy-generated React components
- **Backend**: AI-generated database + API
- **Hosting**: Vercel + Supabase

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment variables:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

3. Set up Supabase:
   - Create a new Supabase project
   - Run the migration: \`supabase db push\`

4. Deploy to Vercel:
   \`\`\`bash
   npm run deploy
   \`\`\`

## Development

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run locofy:sync\` - Sync with Locofy project

## Generated Files

- \`/src/lib/supabase.js\` - Supabase client
- \`/src/services/dataService.js\` - Backend API client
- \`/src/hooks/useData.js\` - React data hooks
- \`/pages/api/\` - Vercel API routes
- \`/supabase/migrations/\` - Database schema

Your Locofy components are enhanced with real backend data!
`;
  }
}