/**
 * FIR Full-Stack Generator - Final Export Architecture
 * 
 * Complete modular system with both code generation and live deployment capabilities
 */

// ========== ENHANCED PRODUCTS WITH DEPLOYMENT ==========

// Enhanced products that include live deployment capabilities
export { Product2BackendDeployment, type Product2Options } from './products-enhanced/product2-backend-deployment.js';
export { Product3FullstackDeployment, type Product3Options } from './products-enhanced/product3-fullstack-deployment.js';
export { Product4LocofyDeployment, type Product4Options } from './products-enhanced/product4-locofy-deployment.js';

// ========== CLEAN MODULAR PRODUCTS ==========

// Code-generation-only products (no deployment)
export { Product1PenpotSpatial } from './products/product1-penpot-spatial.js';
export { Product2BackendGeneration } from './products/product2-backend-generation.js';
export { Product3PenpotFullstack } from './products/product3-penpot-fullstack.js';
export { Product4LocofyHosting } from './products/product4-locofy-hosting.js';

// ========== ORCHESTRATION LAYER ==========

// Main orchestrator for coordinating all products
export { 
  FIROrchestrator,
  createFIROrchestrator,
  generateFromPenpotFile,
  generateBackendFromElements,
  generateLocofyIntegration
} from './orchestrator.js';

// ========== DEPLOYMENT SYSTEM ==========

// Unified deployment capabilities
export { 
  UnifiedDeployment,
  type DeploymentOptions,
  deployProduct1,
  deployProduct2,
  deployProduct3,
  deployProduct4
} from './deployment/index.js';

// Individual deployment components
export { AutoDeployment, type DeploymentCredentials, type DeploymentResult } from './auto-deployment.js';
export { DeploymentGenerator } from './deployment-generator.js';
export { VercelSupabaseTemplates } from './vercel-supabase-templates.js';

// ========== CORE FUNCTIONALITY ==========

// AI and analysis modules
export { AIPatternAnalyzer } from './ai-analyzer.js';
export { SmartDataGenerator } from './smart-data-generator.js';
export { SpatialAnalyzer } from './spatial-analyzer.js';

// Integration bridges
export { PenpotBridge } from './penpot-bridge.js';

// Infrastructure generators
export { DatabaseGenerator } from './database-generator.js';
export { APIGenerator } from './api-generator.js';

// ========== TYPES AND UTILITIES ==========

export type {
  FullstackGeneratorConfig,
  GeneratedProject,
  SpatialDataModel,
  APIEndpoint,
  PenpotConfig,
  LocofyConfig,
  VercelSupabaseConfig,
  DatabaseMigration,
  DeploymentConfig,
  GeneratedFile,
  SpatialAnalysis
} from './types.js';

// ========== LEGACY COMPATIBILITY ==========

// Maintain backward compatibility
export { FullstackGenerator } from './index.js';

// ========== CONVENIENCE CLASSES ==========

import type { DeploymentCredentials } from './auto-deployment.js';
import type { FullstackGeneratorConfig } from './types.js';
import { Product2BackendDeployment, type Product2Options } from './products-enhanced/product2-backend-deployment.js';
import { Product3FullstackDeployment, type Product3Options } from './products-enhanced/product3-fullstack-deployment.js';
import { Product4LocofyDeployment, type Product4Options } from './products-enhanced/product4-locofy-deployment.js';

/**
 * All-in-One FIR Client
 * Single class that provides access to all 4 products with deployment
 */
export class FIRClient {
  private config: FullstackGeneratorConfig;
  private credentials?: DeploymentCredentials;
  
  public product2: Product2BackendDeployment;
  public product3: Product3FullstackDeployment;
  public product4: Product4LocofyDeployment;

  constructor(config: FullstackGeneratorConfig, credentials?: DeploymentCredentials) {
    this.config = config;
    this.credentials = credentials;
    
    this.product2 = new Product2BackendDeployment(config, credentials);
    this.product3 = new Product3FullstackDeployment(config, credentials);
    this.product4 = new Product4LocofyDeployment(config, credentials);
  }

  /**
   * Quick backend generation with optional deployment
   */
  async generateBackend(elements: any[], options: Product2Options) {
    return await this.product2.generateFromElements(elements, options);
  }

  /**
   * Quick full-stack app from Penpot with optional deployment  
   */
  async generateFullStack(penpotFileId: string, options: Product3Options) {
    return await this.product3.generateFromPenpotFile(penpotFileId, options);
  }

  /**
   * Quick Locofy integration with optional deployment
   */
  async generateLocofyIntegration(locofyCode: string, options: Product4Options) {
    return await this.product4.generateFromLocofy(locofyCode, options);
  }

  /**
   * Enable deployment capabilities
   */
  enableDeployment(credentials: DeploymentCredentials) {
    this.credentials = credentials;
    this.product2 = new Product2BackendDeployment(this.config, credentials);
    this.product3 = new Product3FullstackDeployment(this.config, credentials);
    this.product4 = new Product4LocofyDeployment(this.config, credentials);
  }

  /**
   * Get available capabilities based on configuration
   */
  getCapabilities(): {
    codeGeneration: boolean;
    liveDeployment: boolean;
    aiAnalysis: boolean;
    penpotIntegration: boolean;
    locofyIntegration: boolean;
    spatialQueries: boolean;
  } {
    return {
      codeGeneration: true,
      liveDeployment: !!this.credentials,
      aiAnalysis: !!this.config.openaiApiKey,
      penpotIntegration: !!this.config.penpot,
      locofyIntegration: true,
      spatialQueries: !!this.config.enableSpatialQueries
    };
  }
}

// ========== QUICK START FUNCTIONS ==========

/**
 * Create FIR client with deployment capabilities
 */
export function createFIRClient(
  config: FullstackGeneratorConfig, 
  credentials?: DeploymentCredentials
): FIRClient {
  return new FIRClient(config, credentials);
}

/**
 * Quick Penpot → Full-Stack App (with deployment)
 */
export async function deployPenpotApp(
  penpotFileId: string,
  projectName: string,
  config: FullstackGeneratorConfig,
  credentials: DeploymentCredentials,
  domain?: string
) {
  const client = new FIRClient(config, credentials);
  return await client.generateFullStack(penpotFileId, {
    projectName,
    domain,
    deploy: true,
    enableAuth: true,
    enableStorage: true
  });
}

/**
 * Quick Locofy → Backend (with deployment)  
 */
export async function deployLocofyBackend(
  locofyCode: string,
  projectName: string,
  config: FullstackGeneratorConfig,
  credentials: DeploymentCredentials
) {
  const client = new FIRClient(config, credentials);
  return await client.generateLocofyIntegration(locofyCode, {
    projectName,
    deploy: true,
    enableAuth: true,
    enableStorage: true
  });
}

// ========== USAGE EXAMPLES ==========

/**
 * Example 1: Code Generation Only (No Deployment)
 * 
 * import { Product2BackendGeneration } from '@fir/fullstack-generator';
 * 
 * const generator = new Product2BackendGeneration(config);
 * const project = await generator.generateFromElements(elements);
 * // Files generated, no deployment
 */

/**
 * Example 2: Code Generation + Live Deployment  
 * 
 * import { Product2BackendDeployment } from '@fir/fullstack-generator';
 * 
 * const generator = new Product2BackendDeployment(config, credentials);
 * const result = await generator.generateFromElements(elements, { 
 *   projectName: 'my-app',
 *   deploy: true // This actually deploys to live infrastructure
 * });
 * console.log('Live app URL:', result.deploymentResult?.appUrl);
 */

/**
 * Example 3: All-in-One Client
 * 
 * import { FIRClient } from '@fir/fullstack-generator';
 * 
 * const client = new FIRClient(config, credentials);
 * 
 * // Generate + deploy full-stack app
 * const app = await client.generateFullStack('penpot-file-id', {
 *   projectName: 'my-spatial-app',
 *   deploy: true,
 *   domain: 'myapp.com'
 * });
 * 
 * console.log('Your app is live at:', app.urls?.app);
 */

/**
 * Example 4: Quick Deploy Functions
 * 
 * import { deployPenpotApp } from '@fir/fullstack-generator';
 * 
 * const result = await deployPenpotApp(
 *   'penpot-file-id',
 *   'my-app', 
 *   config,
 *   credentials,
 *   'myapp.com'
 * );
 * 
 * console.log('Live at:', result.urls?.app);
 */