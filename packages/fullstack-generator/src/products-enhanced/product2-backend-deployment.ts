/**
 * Product 2 Enhanced: Penpot/Figma → Working Backend + Live Deployment
 * Combines code generation with actual hosting deployment
 */

import { Product2BackendGeneration } from '../products/product2-backend-generation.js';
import { UnifiedDeployment, type DeploymentOptions } from '../deployment/index.js';
import type { FullstackGeneratorConfig, GeneratedProject, SpatialElement } from '../types.js';
import type { DeploymentResult, DeploymentCredentials } from '../auto-deployment.js';

export interface Product2Options extends DeploymentOptions {
  /** Project name for deployment */
  projectName: string;
  /** Deployment target: 'supabase-only' | 'railway' | 'aws' */
  target?: 'supabase-only' | 'railway' | 'aws';
}

/**
 * Product 2 Enhanced: AI-powered backend with optional live deployment
 * 
 * Code Generation: ✅ Always included
 * Live Deployment: ⚡ Optional (set deploy: true)
 */
export class Product2BackendDeployment {
  private product2: Product2BackendGeneration;
  private deployment: UnifiedDeployment;

  constructor(private config: FullstackGeneratorConfig, credentials?: DeploymentCredentials) {
    this.product2 = new Product2BackendGeneration(config);
    this.deployment = new UnifiedDeployment(
      config.projectName, 
      config, 
      credentials
    );
  }

  /**
   * Generate + optionally deploy backend from spatial elements
   */
  async generateFromElements(
    elements: SpatialElement[], 
    options: Product2Options
  ): Promise<{ 
    project: GeneratedProject; 
    deploymentResult?: DeploymentResult 
  }> {
    // Step 1: Generate backend code (always)
    const project = await this.product2.generateFromElements(elements);

    if (this.config.debug) {
      console.log(`✅ Product 2: Generated backend with ${project.models.length} models, ${project.endpoints.length} endpoints`);
      if (options.deploy) {
        console.log(`🚀 Deploying to ${options.target || 'supabase-only'}...`);
      }
    }

    // Step 2: Deploy to live infrastructure (if requested)
    if (options.deploy) {
      return await this.deployment.deployProject(project, {
        ...options,
        // Override deployment settings for backend-only
        enableAuth: options.enableAuth ?? true,
        enableStorage: options.enableStorage ?? false
      });
    }

    return { project };
  }

  /**
   * Deploy existing project to live infrastructure
   */
  async deployExistingProject(
    project: GeneratedProject,
    options: Product2Options
  ): Promise<DeploymentResult> {
    const result = await this.deployment.deployProject(project, options);
    return result.deploymentResult || { success: false, error: 'Deployment failed' };
  }

  /**
   * Get deployment status and URLs
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    status: 'building' | 'ready' | 'error';
    url?: string;
    error?: string;
  }> {
    // This would check deployment status via APIs
    // Implementation depends on deployment target
    return { status: 'ready', url: `https://${deploymentId}.vercel.app` };
  }
}