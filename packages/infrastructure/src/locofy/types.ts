import { z } from 'zod';

export const LocofyConfigSchema = z.object({
  projectPath: z.string(),
  syncEnabled: z.boolean().default(true),
  timeout: z.number().int().positive().default(60000), // 60 seconds for AI operations
  figmaFileId: z.string().optional(),
  outputDirectory: z.string().default('./locofy-output')
});

export type LocofyConfig = z.infer<typeof LocofyConfigSchema>;

// Locofy project structure
export interface LocofyProject {
  id: string;
  name: string;
  figmaFileId?: string;
  framework: 'react' | 'html' | 'vue' | 'react-native';
  version: string;
  created: string;
  updated: string;
  settings: LocofyProjectSettings;
  components: LocofyComponent[];
  pages: LocofyPage[];
  assets: LocofyAsset[];
  styles: LocofyStylesheet[];
}

export interface LocofyProjectSettings {
  framework: 'react' | 'html' | 'vue' | 'react-native';
  typescript: boolean;
  cssFramework: 'css' | 'scss' | 'styled-components' | 'tailwind';
  responsive: boolean;
  optimizeImages: boolean;
  generateCleanCode: boolean;
  componentStructure: 'flat' | 'nested' | 'feature-based';
  naming: {
    components: 'PascalCase' | 'camelCase' | 'kebab-case';
    files: 'PascalCase' | 'camelCase' | 'kebab-case';
    cssClasses: 'camelCase' | 'kebab-case' | 'snake_case';
  };
  export: {
    includeAssets: boolean;
    includeStyles: boolean;
    bundleComponents: boolean;
    generateStorybook: boolean;
  };
}

export interface LocofyComponent {
  id: string;
  name: string;
  figmaNodeId?: string;
  type: 'page' | 'component' | 'element';
  framework: 'react' | 'html' | 'vue' | 'react-native';
  code: string;
  styles: string;
  props: LocofyProp[];
  dependencies: string[];
  assets: string[];
  responsive: LocofyResponsiveBreakpoint[];
  metadata: {
    figmaUrl?: string;
    description?: string;
    tags: string[];
    category?: string;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface LocofyProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'element';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface LocofyResponsiveBreakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
  styles: string;
}

export interface LocofyPage {
  id: string;
  name: string;
  route: string;
  figmaNodeId?: string;
  components: string[]; // Component IDs used in this page
  layout?: string; // Layout component ID
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface LocofyAsset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'font' | 'video' | 'document';
  format: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  url: string;
  localPath: string;
  optimized: boolean;
  usedInComponents: string[];
}

export interface LocofyStylesheet {
  id: string;
  name: string;
  type: 'global' | 'component' | 'utilities' | 'variables';
  framework: 'css' | 'scss' | 'styled-components' | 'tailwind';
  content: string;
  dependencies: string[];
}

// Sync and export operations
export interface LocofySyncOperation {
  id: string;
  projectId: string;
  figmaFileId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  changes: LocofySyncChange[];
  errors: LocofyError[];
}

export interface LocofySyncChange {
  type: 'created' | 'updated' | 'deleted';
  target: 'component' | 'page' | 'asset' | 'style';
  targetId: string;
  targetName: string;
  description: string;
  figmaNodeId?: string;
}

export interface LocofyError {
  code: string;
  message: string;
  target?: string;
  figmaNodeId?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface LocofyExportOperation {
  id: string;
  projectId: string;
  format: 'zip' | 'git' | 'npm' | 'cdn';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  settings: LocofyExportSettings;
  downloadUrl?: string;
  startedAt: string;
  completedAt?: string;
  errors: LocofyError[];
}

export interface LocofyExportSettings {
  includeAssets: boolean;
  includeStyles: boolean;
  optimizeCode: boolean;
  minifyAssets: boolean;
  generateDocs: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  framework: 'react' | 'html' | 'vue' | 'react-native';
  destination?: {
    type: 'local' | 'github' | 'gitlab' | 'vercel' | 'netlify';
    config: Record<string, any>;
  };
}

// Code analysis and quality
export interface LocofyCodeAnalysis {
  projectId: string;
  componentCount: number;
  pageCount: number;
  assetCount: number;
  totalLinesOfCode: number;
  duplicateComponents: LocofyDuplicateComponent[];
  unusedAssets: string[];
  performanceIssues: LocofyPerformanceIssue[];
  accessibilityIssues: LocofyAccessibilityIssue[];
  codeQualityScore: number;
  recommendations: LocofyRecommendation[];
}

export interface LocofyDuplicateComponent {
  groupId: string;
  components: {
    id: string;
    name: string;
    similarity: number;
  }[];
  suggestion: string;
}

export interface LocofyPerformanceIssue {
  type: 'large-asset' | 'inefficient-css' | 'unnecessary-rerenders' | 'missing-optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  target: string;
  description: string;
  recommendation: string;
}

export interface LocofyAccessibilityIssue {
  type: 'missing-alt' | 'color-contrast' | 'keyboard-navigation' | 'aria-labels' | 'semantic-html';
  severity: 'low' | 'medium' | 'high' | 'critical';
  target: string;
  description: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  fix: string;
}

export interface LocofyRecommendation {
  category: 'performance' | 'maintainability' | 'accessibility' | 'best-practices';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actions: string[];
}

// Integration with deployment platforms
export interface LocofyDeploymentTarget {
  id: string;
  name: string;
  platform: 'vercel' | 'netlify' | 'aws' | 'github-pages' | 'firebase';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  lastDeployment?: {
    id: string;
    url: string;
    status: 'success' | 'failed' | 'building';
    deployedAt: string;
  };
}

// Plugin system
export interface LocofyPlugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  hooks: {
    beforeSync?: string;
    afterSync?: string;
    beforeExport?: string;
    afterExport?: string;
    onComponentGenerated?: string;
  };
}

// Project templates
export interface LocofyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: 'react' | 'html' | 'vue' | 'react-native';
  preview: string;
  files: LocofyTemplateFile[];
  dependencies: string[];
  configuration: LocofyProjectSettings;
}

export interface LocofyTemplateFile {
  path: string;
  content: string;
  type: 'component' | 'style' | 'config' | 'documentation';
  editable: boolean;
}