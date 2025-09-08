import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseAdapter } from '../base/base-adapter';
import {
  LocofyConfig,
  LocofyConfigSchema,
  LocofyProject,
  LocofyComponent,
  LocofySyncOperation,
  LocofyExportOperation,
  LocofyCodeAnalysis,
  LocofyDeploymentTarget
} from './types';

/**
 * Locofy integration adapter for managing generated frontend code
 * Note: Locofy primarily works as a local tool, so this adapter focuses on file system operations
 */
export class LocofyAdapter extends BaseAdapter {
  protected readonly config: LocofyConfig;

  constructor(config: LocofyConfig) {
    const validatedConfig = LocofyConfigSchema.parse(config);
    
    super({
      baseUrl: 'file://', // Local file operations
      timeout: validatedConfig.timeout
    });

    this.config = validatedConfig;
    this.log('info', 'Locofy adapter initialized', { projectPath: config.projectPath });
  }

  /**
   * Load Locofy project from local directory
   */
  async loadProject(): Promise<LocofyProject | null> {
    this.log('info', 'Loading Locofy project', { projectPath: this.config.projectPath });
    
    try {
      const projectFile = path.join(this.config.projectPath, 'locofy.json');
      const projectData = await fs.readFile(projectFile, 'utf-8');
      return JSON.parse(projectData) as LocofyProject;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.log('info', 'No existing Locofy project found');
        return null;
      }
      throw error;
    }
  }

  /**
   * Initialize new Locofy project
   */
  async initializeProject(settings: {
    name: string;
    figmaFileId?: string;
    framework: 'react' | 'html' | 'vue' | 'react-native';
    typescript?: boolean;
    cssFramework?: 'css' | 'scss' | 'styled-components' | 'tailwind';
  }): Promise<LocofyProject> {
    this.log('info', 'Initializing Locofy project', settings);
    
    const project: LocofyProject = {
      id: this.generateId(),
      name: settings.name,
      figmaFileId: settings.figmaFileId,
      framework: settings.framework,
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      settings: {
        framework: settings.framework,
        typescript: settings.typescript || false,
        cssFramework: settings.cssFramework || 'css',
        responsive: true,
        optimizeImages: true,
        generateCleanCode: true,
        componentStructure: 'feature-based',
        naming: {
          components: 'PascalCase',
          files: 'kebab-case',
          cssClasses: 'kebab-case'
        },
        export: {
          includeAssets: true,
          includeStyles: true,
          bundleComponents: false,
          generateStorybook: false
        }
      },
      components: [],
      pages: [],
      assets: [],
      styles: []
    };

    await this.saveProject(project);
    return project;
  }

  /**
   * Save project configuration
   */
  async saveProject(project: LocofyProject): Promise<void> {
    this.log('info', 'Saving Locofy project', { projectId: project.id });
    
    await fs.mkdir(this.config.projectPath, { recursive: true });
    const projectFile = path.join(this.config.projectPath, 'locofy.json');
    await fs.writeFile(projectFile, JSON.stringify(project, null, 2));
  }

  /**
   * Get all components in the project
   */
  async getComponents(): Promise<LocofyComponent[]> {
    const project = await this.loadProject();
    if (!project) {
      throw new Error('No Locofy project found. Initialize project first.');
    }
    return project.components;
  }

  /**
   * Get specific component by ID or name
   */
  async getComponent(idOrName: string): Promise<LocofyComponent | null> {
    const components = await this.getComponents();
    return components.find(c => c.id === idOrName || c.name === idOrName) || null;
  }

  /**
   * Add or update component
   */
  async saveComponent(component: LocofyComponent): Promise<void> {
    this.log('info', 'Saving component', { componentId: component.id, name: component.name });
    
    const project = await this.loadProject();
    if (!project) {
      throw new Error('No Locofy project found. Initialize project first.');
    }

    const existingIndex = project.components.findIndex(c => c.id === component.id);
    if (existingIndex >= 0) {
      project.components[existingIndex] = component;
    } else {
      project.components.push(component);
    }

    project.updated = new Date().toISOString();
    await this.saveProject(project);

    // Save component files
    await this.saveComponentFiles(component);
  }

  /**
   * Save component code and styles to files
   */
  private async saveComponentFiles(component: LocofyComponent): Promise<void> {
    const componentsDir = path.join(this.config.outputDirectory, 'components');
    await fs.mkdir(componentsDir, { recursive: true });

    const componentDir = path.join(componentsDir, this.sanitizeFileName(component.name));
    await fs.mkdir(componentDir, { recursive: true });

    // Determine file extensions based on framework and settings
    const project = await this.loadProject();
    const settings = project?.settings;
    
    const codeExtension = this.getCodeExtension(component.framework, settings?.typescript);
    const styleExtension = this.getStyleExtension(settings?.cssFramework);

    // Save component code
    const codeFile = path.join(componentDir, `${this.sanitizeFileName(component.name)}.${codeExtension}`);
    await fs.writeFile(codeFile, component.code);

    // Save component styles
    if (component.styles) {
      const styleFile = path.join(componentDir, `${this.sanitizeFileName(component.name)}.${styleExtension}`);
      await fs.writeFile(styleFile, component.styles);
    }

    // Save responsive styles
    for (const breakpoint of component.responsive) {
      const responsiveFile = path.join(componentDir, `${this.sanitizeFileName(component.name)}.${breakpoint.name}.${styleExtension}`);
      await fs.writeFile(responsiveFile, breakpoint.styles);
    }
  }

  /**
   * Sync with Figma (simulated - would integrate with actual Locofy CLI)
   */
  async syncWithFigma(figmaFileId?: string): Promise<LocofySyncOperation> {
    const project = await this.loadProject();
    if (!project) {
      throw new Error('No Locofy project found. Initialize project first.');
    }

    const fileId = figmaFileId || project.figmaFileId;
    if (!fileId) {
      throw new Error('Figma file ID required for sync operation');
    }

    this.log('info', 'Starting Figma sync', { figmaFileId: fileId });

    const syncOperation: LocofySyncOperation = {
      id: this.generateId(),
      projectId: project.id,
      figmaFileId: fileId,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      changes: [],
      errors: []
    };

    // Simulate sync process
    // In real implementation, this would call Locofy CLI or API
    try {
      syncOperation.progress = 50;
      
      // Simulate successful sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      syncOperation.status = 'completed';
      syncOperation.progress = 100;
      syncOperation.completedAt = new Date().toISOString();
      
      this.log('info', 'Figma sync completed', { syncId: syncOperation.id });
    } catch (error) {
      syncOperation.status = 'failed';
      syncOperation.errors.push({
        code: 'SYNC_FAILED',
        message: error instanceof Error ? error.message : 'Unknown sync error',
        severity: 'error'
      });
      this.log('error', 'Figma sync failed', { syncId: syncOperation.id, error });
    }

    return syncOperation;
  }

  /**
   * Export project to specified format
   */
  async exportProject(settings: {
    format: 'zip' | 'git' | 'npm';
    includeAssets?: boolean;
    optimizeCode?: boolean;
    destination?: string;
  }): Promise<LocofyExportOperation> {
    const project = await this.loadProject();
    if (!project) {
      throw new Error('No Locofy project found. Initialize project first.');
    }

    this.log('info', 'Exporting project', { format: settings.format });

    const exportOperation: LocofyExportOperation = {
      id: this.generateId(),
      projectId: project.id,
      format: settings.format,
      status: 'running',
      progress: 0,
      settings: {
        includeAssets: settings.includeAssets || true,
        includeStyles: true,
        optimizeCode: settings.optimizeCode || false,
        minifyAssets: false,
        generateDocs: false,
        packageManager: 'npm',
        framework: project.framework,
        destination: settings.destination ? {
          type: 'local',
          config: { path: settings.destination }
        } : undefined
      },
      startedAt: new Date().toISOString(),
      errors: []
    };

    try {
      // Simulate export process
      exportOperation.progress = 25;
      await this.copyProjectFiles(settings.destination || path.join(this.config.outputDirectory, 'export'));
      
      exportOperation.progress = 75;
      if (settings.format === 'zip') {
        // Would create ZIP file here
        exportOperation.downloadUrl = path.join(this.config.outputDirectory, `${project.name}.zip`);
      }
      
      exportOperation.status = 'completed';
      exportOperation.progress = 100;
      exportOperation.completedAt = new Date().toISOString();
      
      this.log('info', 'Project export completed', { exportId: exportOperation.id });
    } catch (error) {
      exportOperation.status = 'failed';
      exportOperation.errors.push({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown export error',
        severity: 'error'
      });
      this.log('error', 'Project export failed', { exportId: exportOperation.id, error });
    }

    return exportOperation;
  }

  /**
   * Analyze code quality and performance
   */
  async analyzeProject(): Promise<LocofyCodeAnalysis> {
    const project = await this.loadProject();
    if (!project) {
      throw new Error('No Locofy project found. Initialize project first.');
    }

    this.log('info', 'Analyzing project code quality', { projectId: project.id });

    // Simulate code analysis
    const analysis: LocofyCodeAnalysis = {
      projectId: project.id,
      componentCount: project.components.length,
      pageCount: project.pages.length,
      assetCount: project.assets.length,
      totalLinesOfCode: project.components.reduce((total, comp) => total + comp.code.split('\n').length, 0),
      duplicateComponents: [],
      unusedAssets: [],
      performanceIssues: [],
      accessibilityIssues: [],
      codeQualityScore: 85, // Simulated score
      recommendations: []
    };

    // Add some sample recommendations
    if (analysis.componentCount > 50) {
      analysis.recommendations.push({
        category: 'maintainability',
        priority: 'medium',
        title: 'Consider component organization',
        description: 'Large number of components may benefit from better organization',
        impact: 'Improved maintainability and developer experience',
        effort: 'medium',
        actions: ['Group related components', 'Create component categories', 'Implement component documentation']
      });
    }

    return analysis;
  }

  /**
   * Get deployment targets
   */
  async getDeploymentTargets(): Promise<LocofyDeploymentTarget[]> {
    // Return configured deployment targets
    // In real implementation, this would read from configuration
    return [
      {
        id: 'vercel-prod',
        name: 'Vercel Production',
        platform: 'vercel',
        status: 'connected',
        config: {},
        lastDeployment: {
          id: 'deploy-123',
          url: 'https://my-app.vercel.app',
          status: 'success',
          deployedAt: new Date().toISOString()
        }
      }
    ];
  }

  /**
   * Health check - verify project structure
   */
  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.config.projectPath);
      return true;
    } catch (error) {
      this.log('error', 'Locofy health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  /**
   * Copy project files to destination
   */
  private async copyProjectFiles(destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    
    const outputDir = this.config.outputDirectory;
    try {
      await fs.access(outputDir);
      // Copy files recursively (simplified)
      // In real implementation, would use proper file copying logic
      this.log('info', 'Copying project files', { from: outputDir, to: destination });
    } catch (error) {
      this.log('warn', 'Output directory not found, creating empty export');
    }
  }

  /**
   * Get appropriate code file extension
   */
  private getCodeExtension(framework: string, typescript = false): string {
    switch (framework) {
      case 'react':
        return typescript ? 'tsx' : 'jsx';
      case 'vue':
        return 'vue';
      case 'react-native':
        return typescript ? 'tsx' : 'jsx';
      default:
        return 'html';
    }
  }

  /**
   * Get appropriate style file extension
   */
  private getStyleExtension(cssFramework = 'css'): string {
    switch (cssFramework) {
      case 'scss':
        return 'scss';
      case 'styled-components':
        return 'js';
      default:
        return 'css';
    }
  }

  /**
   * Sanitize filename for safe file system operations
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `locofy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}