/**
 * Unified Deployment Module
 * Combines all deployment capabilities into a single, powerful interface
 */

export { AutoDeployment, type DeploymentCredentials, type DeploymentResult } from '../auto-deployment.js';
export { DeploymentGenerator } from '../deployment-generator.js';
export { VercelSupabaseTemplates } from '../vercel-supabase-templates.js';

import { AutoDeployment, type DeploymentCredentials, type DeploymentResult } from '../auto-deployment.js';
import { DeploymentGenerator } from '../deployment-generator.js';
import { VercelSupabaseTemplates } from '../vercel-supabase-templates.js';
import type { GeneratedProject, VercelSupabaseConfig } from '../types.js';

export interface DeploymentOptions {
  /** Deploy to live infrastructure (true) or generate files only (false) */
  deploy: boolean;
  /** Domain for the deployed application */
  domain?: string;
  /** Deployment credentials for live deployment */
  credentials?: DeploymentCredentials;
  /** Enable authentication */
  enableAuth?: boolean;
  /** Enable file storage */
  enableStorage?: boolean;
  /** Enable edge functions */
  enableEdgeFunctions?: boolean;
}

/**
 * Unified deployment orchestrator that handles both file generation and live deployment
 */
export class UnifiedDeployment {
  private autoDeployment?: AutoDeployment;
  private deploymentGenerator: DeploymentGenerator;
  private vercelSupabase: VercelSupabaseTemplates;

  constructor(
    private projectName: string,
    private config: any,
    credentials?: DeploymentCredentials
  ) {
    if (credentials) {
      this.autoDeployment = new AutoDeployment(credentials);
    }
    
    this.deploymentGenerator = new DeploymentGenerator(config);
    
    // Initialize Vercel/Supabase templates
    const vercelSupabaseConfig: VercelSupabaseConfig = {
      projectName,
      supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
      enableAuth: true,
      enableStorage: true,
      enableEdgeFunctions: false,
      vercel: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
        environmentVariables: {}
      }
    };
    
    this.vercelSupabase = new VercelSupabaseTemplates(vercelSupabaseConfig);
  }

  /**
   * Deploy a generated project with unified options
   */
  async deployProject(
    project: GeneratedProject, 
    options: DeploymentOptions
  ): Promise<{ 
    project: GeneratedProject; 
    deploymentResult?: DeploymentResult 
  }> {
    
    // Step 1: Always generate deployment files
    const deploymentFiles = this.generateDeploymentFiles(project, options);
    
    // Add deployment files to the project
    const enhancedProject: GeneratedProject = {
      ...project,
      files: [...project.files, ...deploymentFiles],
      deploymentFiles
    };

    // Step 2: Deploy to live infrastructure if requested
    if (options.deploy && this.autoDeployment) {
      console.log('🚀 Deploying to live infrastructure...');
      
      const deploymentResult = await this.autoDeployment.deployToVercelSupabase(
        enhancedProject,
        {
          projectName: this.projectName,
          domain: options.domain,
          enableAuth: options.enableAuth,
          enableStorage: options.enableStorage
        }
      );

      return { project: enhancedProject, deploymentResult };
    }

    // Just return enhanced project with deployment files
    return { project: enhancedProject };
  }

  private generateDeploymentFiles(project: GeneratedProject, options: DeploymentOptions) {
    const files = [];

    // Vercel configuration
    files.push({
      path: 'vercel.json',
      content: JSON.stringify(this.vercelSupabase.generateVercelJson(), null, 2)
    });

    // Environment template
    files.push({
      path: '.env.example',
      content: this.vercelSupabase.generateEnvTemplate()
    });

    // Deployment script
    files.push({
      path: 'deploy.sh',
      content: this.vercelSupabase.generateDeploymentScript()
    });

    // Database migrations
    if (project.models.length > 0) {
      files.push({
        path: 'supabase/migrations/001_initial.sql',
        content: this.vercelSupabase.generateSupabaseMigrations(project.models)
      });
    }

    // API routes for Vercel
    if (project.models.length > 0) {
      const apiRoutes = this.vercelSupabase.generateApiRoutes(project.models);
      files.push(...apiRoutes.map(route => ({
        path: route.path,
        content: route.content
      })));
    }

    // Package.json with deployment dependencies
    files.push({
      path: 'package.json',
      content: JSON.stringify(this.vercelSupabase.generatePackageJson(this.projectName), null, 2)
    });

    return files;
  }
}

/**
 * Quick deployment functions for each product
 */
export async function deployProduct1(
  project: GeneratedProject,
  options: DeploymentOptions & { projectName: string }
): Promise<{ project: GeneratedProject; deploymentResult?: DeploymentResult }> {
  const deployment = new UnifiedDeployment(
    options.projectName,
    { deployment: 'vercel' },
    options.credentials
  );
  return await deployment.deployProject(project, options);
}

export async function deployProduct2(
  project: GeneratedProject,
  options: DeploymentOptions & { projectName: string }
): Promise<{ project: GeneratedProject; deploymentResult?: DeploymentResult }> {
  const deployment = new UnifiedDeployment(
    options.projectName,
    { deployment: 'railway' }, // Backend-focused
    options.credentials
  );
  return await deployment.deployProject(project, options);
}

export async function deployProduct3(
  project: GeneratedProject,
  options: DeploymentOptions & { projectName: string }
): Promise<{ project: GeneratedProject; deploymentResult?: DeploymentResult }> {
  const deployment = new UnifiedDeployment(
    options.projectName,
    { deployment: 'vercel-supabase' }, // Full-stack
    options.credentials
  );
  return await deployment.deployProject(project, options);
}

export async function deployProduct4(
  project: GeneratedProject,
  options: DeploymentOptions & { projectName: string }
): Promise<{ project: GeneratedProject; deploymentResult?: DeploymentResult }> {
  const deployment = new UnifiedDeployment(
    options.projectName,
    { deployment: 'vercel-supabase' }, // Locofy + backend
    options.credentials
  );
  return await deployment.deployProject(project, options);
}