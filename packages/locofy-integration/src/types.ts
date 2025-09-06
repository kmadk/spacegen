/**
 * Types for Locofy integration with FIR spatial intelligence
 */

export interface LocofyConfig {
  /** Locofy project ID or name */
  projectId?: string;
  /** Path to Locofy-generated code directory */
  codeDirectory: string;
  /** Framework used by Locofy (react, nextjs, etc.) */
  framework: 'react' | 'nextjs' | 'vue' | 'angular';
  /** Whether to enhance with spatial features */
  enableSpatialFeatures: boolean;
  /** Debug mode */
  debug?: boolean;
}

export interface LocofyProject {
  /** Project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Framework type */
  framework: string;
  /** Generated components */
  components: LocofyComponent[];
  /** Assets (images, icons) */
  assets: LocofyAsset[];
  /** Project configuration */
  config: Record<string, any>;
}

export interface LocofyComponent {
  /** Component identifier */
  id: string;
  /** Component name */
  name: string;
  /** File path relative to project */
  filePath: string;
  /** Component code */
  code: string;
  /** Component props/properties */
  props?: ComponentProp[];
  /** Associated Figma node ID */
  figmaNodeId?: string;
  /** Component type (page, component, etc.) */
  type: 'page' | 'component' | 'layout';
}

export interface ComponentProp {
  name: string;
  type: string;
  defaultValue?: any;
  required?: boolean;
}

export interface LocofyAsset {
  /** Asset identifier */
  id: string;
  /** Asset name */
  name: string;
  /** Asset type */
  type: 'image' | 'icon' | 'font';
  /** File path */
  path: string;
  /** Original Figma node ID */
  figmaNodeId?: string;
}

export interface SpatialEnhancement {
  /** Component being enhanced */
  componentId: string;
  /** Spatial position data */
  spatialData: {
    position: { x: number; y: number };
    semanticLevel: string;
    spatialCluster?: string;
    zoomBehaviors?: string[];
  };
  /** Additional spatial wrapper code */
  spatialWrapper: string;
  /** Spatial imports needed */
  spatialImports: string[];
}

export interface HybridProject {
  /** Original Locofy project */
  frontend: LocofyProject;
  /** Spatial enhancements */
  spatialEnhancements: SpatialEnhancement[];
  /** Generated backend */
  backend?: any; // From fullstack-generator
  /** Deployment configuration */
  deployment?: any;
}

export interface WorkflowStep {
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Whether step is automated */
  automated: boolean;
  /** Manual instructions if not automated */
  instructions?: string;
  /** Validation function */
  validate?: () => Promise<boolean>;
}