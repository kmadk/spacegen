/**
 * Locofy Code Enhancer - Adds spatial intelligence to Locofy-generated code
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import type { 
  LocofyConfig, 
  LocofyProject, 
  LocofyComponent, 
  SpatialEnhancement,
  LocofyAsset 
} from './types.js';

export class LocofyEnhancer {
  private config: LocofyConfig;

  constructor(config: LocofyConfig) {
    this.config = config;
  }

  /**
   * Load Locofy project from the code directory
   */
  async loadLocofyProject(): Promise<LocofyProject> {
    const codeDir = this.config.codeDirectory;
    
    if (!(await fs.pathExists(codeDir))) {
      throw new Error(`Locofy code directory not found: ${codeDir}`);
    }

    const components = await this.discoverComponents(codeDir);
    const assets = await this.discoverAssets(codeDir);
    const config = await this.loadProjectConfig(codeDir);

    return {
      id: this.config.projectId || 'locofy-project',
      name: path.basename(codeDir),
      framework: this.config.framework,
      components,
      assets,
      config
    };
  }

  /**
   * Enhance Locofy components with spatial intelligence
   */
  async enhanceWithSpatialFeatures(
    project: LocofyProject, 
    spatialData: any
  ): Promise<{ locofyProject: LocofyProject; enhancements: SpatialEnhancement[] }> {
    const enhancements: SpatialEnhancement[] = [];

    for (const component of project.components) {
      try {
        const enhancement = await this.enhanceComponent(component, spatialData);
        if (enhancement) {
          enhancements.push(enhancement);
          
          // Write enhanced component back to filesystem
          await this.writeEnhancedComponent(component, enhancement);
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn(`Failed to enhance component ${component.name}:`, error);
        }
      }
    }

    // Add spatial runtime dependencies
    await this.addSpatialDependencies(project);

    return {
      locofyProject: project,
      enhancements
    };
  }

  /**
   * Discover React/Next.js components in the project
   */
  private async discoverComponents(codeDir: string): Promise<LocofyComponent[]> {
    const components: LocofyComponent[] = [];

    // Look for component files based on framework
    const patterns = this.getComponentPatterns();
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: codeDir });
      
      for (const file of files) {
        const filePath = path.join(codeDir, file);
        const code = await fs.readFile(filePath, 'utf-8');
        
        const component: LocofyComponent = {
          id: this.generateComponentId(file),
          name: this.extractComponentName(file, code),
          filePath: file,
          code,
          type: this.inferComponentType(file, code),
          figmaNodeId: this.extractFigmaNodeId(code)
        };

        components.push(component);
      }
    }

    return components;
  }

  /**
   * Get file patterns based on framework
   */
  private getComponentPatterns(): string[] {
    switch (this.config.framework) {
      case 'nextjs':
        return [
          'pages/**/*.{js,jsx,ts,tsx}',
          'components/**/*.{js,jsx,ts,tsx}',
          'app/**/*.{js,jsx,ts,tsx}'
        ];
      case 'react':
        return [
          'src/**/*.{js,jsx,ts,tsx}',
          'components/**/*.{js,jsx,ts,tsx}'
        ];
      case 'vue':
        return ['src/**/*.vue', 'components/**/*.vue'];
      case 'angular':
        return ['src/**/*.component.ts'];
      default:
        return ['**/*.{js,jsx,ts,tsx,vue}'];
    }
  }

  /**
   * Discover assets (images, icons, etc.)
   */
  private async discoverAssets(codeDir: string): Promise<LocofyAsset[]> {
    const assets: LocofyAsset[] = [];
    const assetPatterns = ['public/**/*.{png,jpg,jpeg,svg,gif}', 'assets/**/*.{png,jpg,jpeg,svg,gif}'];

    for (const pattern of assetPatterns) {
      const files = await glob(pattern, { cwd: codeDir });
      
      for (const file of files) {
        assets.push({
          id: this.generateAssetId(file),
          name: path.basename(file),
          type: this.inferAssetType(file),
          path: file
        });
      }
    }

    return assets;
  }

  /**
   * Load project configuration (package.json, etc.)
   */
  private async loadProjectConfig(codeDir: string): Promise<Record<string, any>> {
    const packageJsonPath = path.join(codeDir, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      return await fs.readJson(packageJsonPath);
    }
    
    return {};
  }

  /**
   * Enhance a single component with spatial features
   */
  private async enhanceComponent(
    component: LocofyComponent, 
    spatialData: any
  ): Promise<SpatialEnhancement | null> {
    const spatialInfo = this.findSpatialDataForComponent(component, spatialData);
    
    if (!spatialInfo) {
      return null;
    }

    const spatialWrapper = this.generateSpatialWrapper(component, spatialInfo);
    const spatialImports = this.generateSpatialImports();

    return {
      componentId: component.id,
      spatialData: spatialInfo,
      spatialWrapper,
      spatialImports
    };
  }

  /**
   * Find spatial data for a component
   */
  private findSpatialDataForComponent(component: LocofyComponent, spatialData: any): any {
    // Match component to spatial data by figma node ID or name
    const clusters = spatialData?.spatialClusters || [];
    
    return clusters.find((cluster: any) => 
      cluster.figmaNodeId === component.figmaNodeId ||
      cluster.name?.toLowerCase().includes(component.name.toLowerCase())
    );
  }

  /**
   * Generate spatial wrapper code
   */
  private generateSpatialWrapper(component: LocofyComponent, spatialInfo: any): string {
    const framework = this.config.framework;
    
    if (framework === 'react' || framework === 'nextjs') {
      return this.generateReactSpatialWrapper(component, spatialInfo);
    }
    
    // Add support for other frameworks later
    return '';
  }

  /**
   * Generate React spatial wrapper
   */
  private generateReactSpatialWrapper(component: LocofyComponent, spatialInfo: any): string {
    const { position, semanticLevel, spatialCluster } = spatialInfo;
    
    return `
import { SpatialContainer, SpatialElement } from '@fir/spatial-runtime';

// Enhanced ${component.name} with spatial intelligence
export const Enhanced${component.name} = (props) => {
  return (
    <SpatialContainer>
      <SpatialElement
        position={{ x: ${position?.x || 0}, y: ${position?.y || 0} }}
        semanticLevel="${semanticLevel || 'standard'}"
        spatialCluster="${spatialCluster || ''}"
        {...props}
      >
        <${component.name} {...props} />
      </SpatialElement>
    </SpatialContainer>
  );
};
    `.trim();
  }

  /**
   * Generate spatial imports
   */
  private generateSpatialImports(): string[] {
    return [
      "import { SpatialContainer, SpatialElement } from '@fir/spatial-runtime';",
      "import { useSpatialContext } from '@fir/spatial-runtime/hooks';"
    ];
  }

  /**
   * Write enhanced component to filesystem
   */
  private async writeEnhancedComponent(
    component: LocofyComponent, 
    enhancement: SpatialEnhancement
  ): Promise<void> {
    const enhancedDir = path.join(this.config.codeDirectory, 'spatial-enhanced');
    await fs.ensureDir(enhancedDir);

    const enhancedFilePath = path.join(enhancedDir, `Enhanced${component.name}.tsx`);
    const enhancedCode = [
      ...enhancement.spatialImports,
      enhancement.spatialWrapper
    ].join('\n');

    await fs.writeFile(enhancedFilePath, enhancedCode);
    
    if (this.config.debug) {
      console.log(`Enhanced component written to: ${enhancedFilePath}`);
    }
  }

  /**
   * Add spatial runtime dependencies to package.json
   */
  private async addSpatialDependencies(_project: LocofyProject): Promise<void> {
    const packageJsonPath = path.join(this.config.codeDirectory, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      
      packageJson.dependencies = packageJson.dependencies || {};
      packageJson.dependencies['@fir/spatial-runtime'] = '^0.1.0';
      packageJson.dependencies['@deck.gl/core'] = '^8.9.0';
      
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      if (this.config.debug) {
        console.log('Added spatial runtime dependencies to package.json');
      }
    }
  }

  /**
   * Helper methods
   */
  private generateComponentId(filePath: string): string {
    return path.basename(filePath, path.extname(filePath)).toLowerCase();
  }

  private extractComponentName(filePath: string, code: string): string {
    // Try to extract component name from export statement
    const exportMatch = code.match(/export\s+(?:default\s+)?(?:function\s+|const\s+|class\s+)?(\w+)/);
    if (exportMatch) {
      return exportMatch[1];
    }
    
    // Fall back to filename
    return path.basename(filePath, path.extname(filePath));
  }

  private inferComponentType(filePath: string, code: string): 'page' | 'component' | 'layout' {
    if (filePath.includes('pages/') || filePath.includes('app/')) {
      return 'page';
    }
    
    if (code.includes('layout') || code.includes('Layout')) {
      return 'layout';
    }
    
    return 'component';
  }

  private extractFigmaNodeId(code: string): string | undefined {
    // Look for Figma node ID in comments or data attributes
    const figmaIdMatch = code.match(/figma[_-]?node[_-]?id[:\s=]["']([^"']+)["']/i);
    return figmaIdMatch ? figmaIdMatch[1] : undefined;
  }

  private generateAssetId(filePath: string): string {
    return path.basename(filePath).toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  private inferAssetType(filePath: string): 'image' | 'icon' | 'font' {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath).toLowerCase();
    
    if (name.includes('icon') || ext === '.svg') {
      return 'icon';
    }
    
    if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
      return 'font';
    }
    
    return 'image';
  }
}