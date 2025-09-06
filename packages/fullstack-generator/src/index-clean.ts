/**
 * FIR Full-Stack Generator - Clean Architecture
 * 
 * This is the new, modular entry point that replaces the 1300+ line index.ts
 * with clean separation of all 4 products.
 */

// Main orchestrator and convenience functions
export { 
  FIROrchestrator,
  createFIROrchestrator,
  generateFromPenpotFile,
  generateBackendFromElements,
  generateLocofyIntegration
} from './orchestrator.js';

// Individual product modules (for advanced usage)
export { Product1PenpotSpatial } from './products/product1-penpot-spatial.js';
export { Product2BackendGeneration } from './products/product2-backend-generation.js';
export { Product3PenpotFullstack } from './products/product3-penpot-fullstack.js';
export { Product4LocofyHosting } from './products/product4-locofy-hosting.js';

// Core functionality modules
export { PenpotBridge } from './penpot-bridge.js';
export { AIPatternAnalyzer } from './ai-analyzer.js';
export { SmartDataGenerator } from './smart-data-generator.js';
export { VercelSupabaseTemplates } from './vercel-supabase-templates.js';

// Types
export type {
  FullstackGeneratorConfig,
  GeneratedProject,
  SpatialDataModel,
  APIEndpoint,
  PenpotConfig,
  LocofyConfig,
  VercelSupabaseConfig
} from './types.js';

// Backward compatibility - maintain the original FullstackGenerator class
export { FullstackGenerator } from './index.js';

// ========== QUICK START EXAMPLES ==========

/**
 * Example 1: Generate spatial components from Penpot (Product 1)
 * 
 * import { createFIROrchestrator } from '@fir/fullstack-generator';
 * 
 * const orchestrator = createFIROrchestrator({
 *   projectName: 'my-app',
 *   penpot: { accessToken: 'your-token' }
 * });
 * 
 * const result = await orchestrator.generatePenpotSpatialComponents('file-id');
 */

/**
 * Example 2: Generate backend from spatial elements (Product 2)
 * 
 * import { generateBackendFromElements } from '@fir/fullstack-generator';
 * 
 * const project = await generateBackendFromElements(spatialElements, {
 *   projectName: 'my-backend',
 *   openaiApiKey: 'your-key',
 *   database: 'postgresql',
 *   apiFramework: 'express'
 * });
 */

/**
 * Example 3: Generate full-stack app from Penpot (Product 3)
 * 
 * import { generateFromPenpotFile } from '@fir/fullstack-generator';
 * 
 * const app = await generateFromPenpotFile('penpot-file-id', {
 *   projectName: 'my-fullstack-app',
 *   penpot: { accessToken: 'penpot-token' },
 *   openaiApiKey: 'openai-key',
 *   deployment: 'vercel'
 * });
 */

/**
 * Example 4: Integrate Locofy code with backend (Product 4)
 * 
 * import { generateLocofyIntegration } from '@fir/fullstack-generator';
 * 
 * const integration = await generateLocofyIntegration(locofyCodeString, {
 *   projectName: 'locofy-backend',
 *   deployment: 'vercel'
 * });
 */

/**
 * Example 5: Generate all products at once
 * 
 * import { FIROrchestrator } from '@fir/fullstack-generator';
 * 
 * const orchestrator = new FIROrchestrator(config);
 * const allProducts = await orchestrator.generateAllProducts('penpot-file-id', locofyCode);
 * 
 * // Access individual results:
 * // allProducts.product1 - Spatial components
 * // allProducts.product2 - Backend only
 * // allProducts.product3 - Full-stack app
 * // allProducts.product4 - Locofy integration
 */