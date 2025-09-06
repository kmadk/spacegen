/**
 * FIR + Locofy Integration - Hybrid spatial stack generation
 */

export { LocofyWorkflowGuide } from './locofy-workflow.js';
export { LocofyEnhancer } from './locofy-enhancer.js';

export type {
  LocofyConfig,
  LocofyProject,
  LocofyComponent,
  LocofyAsset,
  SpatialEnhancement,
  HybridProject,
  WorkflowStep
} from './types.js';

import { LocofyWorkflowGuide } from './locofy-workflow.js';
import { LocofyEnhancer } from './locofy-enhancer.js';

/**
 * Main integration class for FIR + Locofy hybrid workflow
 */
export class FirLocofyIntegration {
  private workflowGuide: LocofyWorkflowGuide;
  private enhancer: LocofyEnhancer;

  constructor(config: import('./types.js').LocofyConfig) {
    this.workflowGuide = new LocofyWorkflowGuide(config);
    this.enhancer = new LocofyEnhancer(config);
  }

  /**
   * Generate complete spatial application using Locofy + FIR
   */
  async generateSpatialApp(figmaFileKey: string): Promise<import('./types.js').HybridProject> {
    console.log('🎯 Starting FIR + Locofy Spatial Application Generation\n');
    console.log('This hybrid approach combines:');
    console.log('📱 Locofy.ai - Professional frontend code generation');
    console.log('🌍 FIR - Spatial intelligence + backend generation\n');

    return await this.workflowGuide.startWorkflow(figmaFileKey);
  }

  /**
   * Enhance existing Locofy project with spatial features
   */
  async enhanceExistingProject(spatialData: any): Promise<any> {
    const project = await this.enhancer.loadLocofyProject();
    return await this.enhancer.enhanceWithSpatialFeatures(project, spatialData);
  }

  /**
   * Get workflow progress information
   */
  getWorkflowSteps(): any[] {
    // Return workflow step information for UI/progress tracking
    return [
      { name: 'Figma Analysis', automated: true, description: 'Analyze design for spatial patterns' },
      { name: 'Locofy Setup', automated: false, description: 'Set up Locofy.ai project' },
      { name: 'Frontend Export', automated: false, description: 'Export code from Locofy' },
      { name: 'Spatial Enhancement', automated: true, description: 'Add spatial intelligence' },
      { name: 'Backend Generation', automated: true, description: 'Generate spatial backend' },
      { name: 'Deployment Setup', automated: true, description: 'Configure deployment' }
    ];
  }
}