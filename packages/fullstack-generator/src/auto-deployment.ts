/**
 * Auto-Deployment for Products 3 & 4
 * Actually deploys to live hosting (not just code generation)
 */

import type { GeneratedProject, SpatialDataModel } from './types.js';

export interface DeploymentResult {
  success: boolean;
  appUrl?: string;
  databaseUrl?: string;
  dashboardUrl?: string;
  error?: string;
  deploymentId?: string;
}

export interface DeploymentCredentials {
  vercel?: {
    token: string;
    teamId?: string;
  };
  supabase?: {
    accessToken: string;
    organizationId?: string;
  };
  railway?: {
    token: string;
  };
}

export class AutoDeployment {
  constructor(private credentials: DeploymentCredentials) {}

  /**
   * Deploy backend only to Supabase (Product 2)
   * Creates just the database + API, no frontend hosting
   */
  async deployBackendOnly(
    project: GeneratedProject,
    options: {
      projectName: string;
      enableAuth?: boolean;
      enableStorage?: boolean;
    }
  ): Promise<DeploymentResult> {
    try {
      console.log('🗄️  Starting backend-only deployment to Supabase...');

      // Create Supabase project (database + API only)
      const supabaseProject = await this.createSupabaseProject(
        options.projectName,
        project.models,
        options
      );

      if (!supabaseProject.success) {
        return supabaseProject;
      }

      console.log('✅ Backend-only deployment completed!');
      
      return {
        success: true,
        appUrl: `${supabaseProject.databaseUrl}/rest/v1`, // API endpoint
        databaseUrl: supabaseProject.databaseUrl,
        dashboardUrl: supabaseProject.dashboardUrl,
        deploymentId: supabaseProject.projectRef
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend deployment failed'
      };
    }
  }

  /**
   * Deploy to Vercel + Supabase (Product 3 & 4)
   * This actually creates live infrastructure, not just files
   */
  async deployToVercelSupabase(
    project: GeneratedProject,
    options: {
      projectName: string;
      domain?: string;
      enableAuth?: boolean;
      enableStorage?: boolean;
    }
  ): Promise<DeploymentResult> {
    try {
      console.log('🚀 Starting live deployment to Vercel + Supabase...');

      // Step 1: Create Supabase project (live database)
      const supabaseProject = await this.createSupabaseProject(
        options.projectName,
        project.models,
        options
      );

      if (!supabaseProject.success) {
        return supabaseProject;
      }

      // Step 2: Deploy to Vercel (live app)
      const vercelDeployment = await this.deployToVercel(
        project,
        options.projectName,
        {
          NEXT_PUBLIC_SUPABASE_URL: supabaseProject.databaseUrl!,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseProject.anonKey!,
          SUPABASE_SERVICE_ROLE_KEY: supabaseProject.serviceRoleKey!,
        },
        options.domain
      );

      if (!vercelDeployment.success) {
        return vercelDeployment;
      }

      console.log('✅ Live deployment completed successfully!');
      
      return {
        success: true,
        appUrl: vercelDeployment.appUrl,
        databaseUrl: supabaseProject.dashboardUrl,
        dashboardUrl: supabaseProject.dashboardUrl,
        deploymentId: `${vercelDeployment.deploymentId}-${supabaseProject.projectRef}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  /**
   * Deploy to Railway (alternative hosting)
   */
  async deployToRailway(
    project: GeneratedProject,
    projectName: string
  ): Promise<DeploymentResult> {
    try {
      console.log('🚀 Starting live deployment to Railway...');

      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.railway?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation deployFromFiles($input: DeploymentCreateInput!) {
              deploymentCreate(input: $input) {
                id
                url
                status
              }
            }
          `,
          variables: {
            input: {
              projectName,
              files: project.files.map(f => ({
                path: f.path,
                content: f.content
              })),
              environmentVariables: project.deployment.environment
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const deployment = result.data.deploymentCreate;
      
      return {
        success: true,
        appUrl: `https://${deployment.url}`,
        deploymentId: deployment.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Railway deployment failed'
      };
    }
  }

  private async createSupabaseProject(
    projectName: string,
    models: SpatialDataModel[],
    options: { enableAuth?: boolean; enableStorage?: boolean }
  ): Promise<DeploymentResult & { anonKey?: string; serviceRoleKey?: string; projectRef?: string }> {
    try {
      // Create Supabase project
      const createResponse = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.supabase?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          organization_id: this.credentials.supabase?.organizationId,
          plan: 'free',
          region: 'us-east-1',
          db_pass: this.generateSecurePassword()
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Supabase project creation failed: ${error.message}`);
      }

      const project = await createResponse.json();
      
      // Wait for project to be ready
      await this.waitForSupabaseProject(project.id);

      // Run database migrations
      await this.runSupabaseMigrations(project.id, models, options);

      // Get API keys
      const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${project.id}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.supabase?.accessToken}`
        }
      });

      const keys = await keysResponse.json();
      const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
      const serviceRoleKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

      console.log('✅ Supabase project created and configured');

      return {
        success: true,
        databaseUrl: `https://${project.id}.supabase.co`,
        dashboardUrl: `https://supabase.com/dashboard/project/${project.id}`,
        anonKey,
        serviceRoleKey,
        projectRef: project.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Supabase creation failed'
      };
    }
  }

  private async deployToVercel(
    project: GeneratedProject,
    projectName: string,
    envVars: Record<string, string>,
    customDomain?: string
  ): Promise<DeploymentResult> {
    try {
      // Create deployment
      const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.vercel?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          files: project.files.map(f => ({
            file: f.path,
            data: Buffer.from(f.content).toString('base64')
          })),
          projectSettings: {
            framework: 'nextjs',
            buildCommand: 'npm run build',
            outputDirectory: '.next'
          },
          env: Object.entries(envVars).map(([key, value]) => ({
            key,
            value,
            type: 'encrypted'
          }))
        })
      });

      if (!deployResponse.ok) {
        const error = await deployResponse.json();
        throw new Error(`Vercel deployment failed: ${error.error.message}`);
      }

      const deployment = await deployResponse.json();

      // Wait for deployment to be ready
      await this.waitForVercelDeployment(deployment.id);

      // Add custom domain if provided
      if (customDomain) {
        await this.addVercelDomain(projectName, customDomain);
      }

      console.log('✅ Vercel deployment completed');

      return {
        success: true,
        appUrl: `https://${deployment.url}`,
        deploymentId: deployment.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vercel deployment failed'
      };
    }
  }

  private async waitForSupabaseProject(projectId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.supabase?.accessToken}`
        }
      });

      const project = await response.json();
      
      if (project.status === 'ACTIVE_HEALTHY') {
        return;
      }

      console.log(`⏳ Waiting for Supabase project to be ready... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      attempts++;
    }

    throw new Error('Supabase project failed to become ready');
  }

  private async waitForVercelDeployment(deploymentId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 20; // 5 minutes max

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.vercel?.token}`
        }
      });

      const deployment = await response.json();
      
      if (deployment.readyState === 'READY') {
        return;
      }

      if (deployment.readyState === 'ERROR') {
        throw new Error('Vercel deployment failed');
      }

      console.log(`⏳ Waiting for Vercel deployment to be ready... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s
      attempts++;
    }

    throw new Error('Vercel deployment timeout');
  }

  private async runSupabaseMigrations(
    projectId: string,
    models: SpatialDataModel[],
    options: { enableAuth?: boolean; enableStorage?: boolean }
  ): Promise<void> {
    // Generate SQL migrations
    const migrations = this.generateMigrationSQL(models, options);

    // Execute migrations via Supabase API
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.supabase?.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: migrations
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log('✅ Database migrations completed');
  }

  private generateMigrationSQL(
    models: SpatialDataModel[],
    options: { enableAuth?: boolean; enableStorage?: boolean }
  ): string {
    let sql = `-- FIR Generated Migrations
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

`;

    // Create tables for each model
    for (const model of models) {
      sql += `-- Create table: ${model.tableName}\n`;
      sql += `CREATE TABLE ${model.tableName} (\n`;
      sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
      
      // Add fields
      for (const field of model.fields) {
        const sqlType = this.mapFieldTypeToSQL(field.type);
        const nullable = field.required ? 'NOT NULL' : '';
        const unique = field.unique ? 'UNIQUE' : '';
        
        sql += `  ${field.name} ${sqlType} ${nullable} ${unique},\n`;
      }
      
      sql += `  created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
      sql += `  updated_at TIMESTAMPTZ DEFAULT NOW()\n`;
      sql += `);\n\n`;

      // Add spatial indexes
      for (const index of model.spatialIndexes) {
        if (index.type === 'gist') {
          sql += `CREATE INDEX ${index.name} ON ${model.tableName} USING GIST (${index.fields.join(', ')});\n`;
        } else {
          sql += `CREATE INDEX ${index.name} ON ${model.tableName} (${index.fields.join(', ')});\n`;
        }
      }

      // Enable Row Level Security
      sql += `ALTER TABLE ${model.tableName} ENABLE ROW LEVEL SECURITY;\n`;
      sql += `CREATE POLICY "Public read access" ON ${model.tableName} FOR SELECT USING (true);\n`;
      sql += `CREATE POLICY "Public insert access" ON ${model.tableName} FOR INSERT WITH CHECK (true);\n\n`;
    }

    // Add auth setup if enabled
    if (options.enableAuth) {
      sql += `-- Enable auth
CREATE POLICY "Users can view own data" ON auth.users FOR SELECT USING (auth.uid() = id);
`;
    }

    // Add storage setup if enabled
    if (options.enableStorage) {
      sql += `-- Enable storage
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
CREATE POLICY "Public upload access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
`;
    }

    return sql;
  }

  private mapFieldTypeToSQL(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'TEXT',
      number: 'NUMERIC',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMPTZ',
      json: 'JSONB',
      array: 'TEXT[]',
      geometry: 'GEOMETRY',
      point: 'POINT',
      polygon: 'POLYGON'
    };

    return typeMap[fieldType] || 'TEXT';
  }

  private async addVercelDomain(projectName: string, domain: string): Promise<void> {
    await fetch(`https://api.vercel.com/v9/projects/${projectName}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.vercel?.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domain })
    });
  }

  private generateSecurePassword(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}