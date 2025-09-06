/**
 * FigmaBridge - Main class that orchestrates the conversion from Figma to spatial elements
 */

import type { 
  FigmaBridgeConfig,
  DesignExtraction,
  ComponentDefinition,
  FigmaFile,
  FigmaNode
} from './types.js';
import { FigmaClient } from './figma-client.js';
import { SpatialMapper } from './spatial-mapper.js';
import { DesignParser } from './design-parser.js';

export class FigmaBridge {
  private client: FigmaClient;
  private spatialMapper: SpatialMapper;
  private parser: DesignParser;
  private config: FigmaBridgeConfig;

  constructor(config: FigmaBridgeConfig) {
    this.config = config;
    this.client = new FigmaClient(config);
    this.spatialMapper = new SpatialMapper({
      scale: config.spatialUnit ? 1.0 / config.spatialUnit : 1.0,
      flipY: true // Figma Y+ down, spatial Y+ up
    });
    this.parser = new DesignParser({
      spatialMapper: this.spatialMapper,
      generateHTML: true,
      includeDebugInfo: config.debug
    });
  }

  /**
   * Extract spatial elements from a Figma file
   */
  async extractFromFile(
    fileKey: string,
    options: {
      /** Specific node IDs to extract (optional, extracts all if not specified) */
      nodeIds?: string[];
      /** Extract components separately */
      extractComponents?: boolean;
      /** Include asset downloads */
      includeAssets?: boolean;
      /** Optimize spatial mapping automatically */
      optimizeMapping?: boolean;
    } = {}
  ): Promise<DesignExtraction> {
    // Store file key for Dev Mode API calls
    this.currentFileKey = fileKey;
    
    // Validate connection first
    const isConnected = await this.client.validateConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to Figma API. Please check your access token.');
    }

    // Get the Figma file
    const file = await this.client.getFile(fileKey, {
      depth: 3, // Get reasonable depth to avoid huge payloads
      geometry: 'bounds' // We need bounding boxes for spatial mapping
    });

    if (this.config.debug) {
      console.log(`Loaded Figma file: ${file.name}`);
    }

    // Extract nodes to process
    const nodesToProcess = options.nodeIds 
      ? await this.getSpecificNodes(fileKey, options.nodeIds)
      : [file.document];

    // Optimize spatial mapping if requested
    if (options.optimizeMapping && nodesToProcess.length > 0) {
      const optimalMapping = this.spatialMapper.calculateOptimalMapping(nodesToProcess[0]);
      this.spatialMapper.updateMapping(optimalMapping);
    }

    // Parse nodes into spatial elements
    const parseResult = this.parser.parseNodes(nodesToProcess, file.schemaVersion.toString());

    // Extract components if requested
    const components: ComponentDefinition[] = [];
    if (options.extractComponents) {
      components.push(...await this.extractComponents(file));
    }

    // Extract assets if requested
    const assets = options.includeAssets 
      ? await this.client.extractAssets(fileKey, nodesToProcess)
      : [];

    // Create extraction result
    const extraction: DesignExtraction = {
      file: {
        key: fileKey,
        name: file.name,
        version: file.schemaVersion.toString()
      },
      elements: parseResult.elements,
      mapping: this.spatialMapper.getMapping(),
      assets,
      components
    };

    if (this.config.debug) {
      console.log(`Extraction complete:`, {
        elements: parseResult.elements.length,
        components: components.length,
        assets: assets.length,
        warnings: parseResult.warnings.length,
        errors: parseResult.errors.length
      });
    }

    return extraction;
  }

  /**
   * Extract from specific Figma frames/components
   */
  async extractFromNodes(
    fileKey: string, 
    nodeIds: string[],
    options: {
      includeAssets?: boolean;
      optimizeMapping?: boolean;
    } = {}
  ): Promise<DesignExtraction> {
    return this.extractFromFile(fileKey, {
      nodeIds,
      extractComponents: true,
      ...options
    });
  }

  /**
   * Get spatial regions for cinematic navigation
   */
  async getNavigationRegions(fileKey: string, targetRegions: number = 6): Promise<Array<{
    id: string;
    name: string;
    spatialBounds: { position: { x: number; y: number }; width: number; height: number };
    elements: any[];
  }>> {
    const file = await this.client.getFile(fileKey, { depth: 2 });
    const regions = this.spatialMapper.createViewportRegions(file.document, targetRegions);
    
    return regions.map(region => ({
      id: region.id,
      name: region.name,
      spatialBounds: region.spatialBounds,
      elements: region.nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type
      }))
    }));
  }

  /**
   * Preview extraction without full processing (fast analysis)
   */
  async previewExtraction(fileKey: string): Promise<{
    file: { name: string; nodeCount: number; };
    estimatedElements: number;
    suggestedRegions: number;
    components: Array<{ id: string; name: string; }>;
  }> {
    const file = await this.client.getFile(fileKey, { depth: 1 });
    
    const nodeCount = this.countTotalNodes(file.document);
    const components = this.findComponents(file.document);
    
    return {
      file: {
        name: file.name,
        nodeCount
      },
      estimatedElements: Math.floor(nodeCount * 0.3), // Rough estimate
      suggestedRegions: Math.min(6, Math.ceil(nodeCount / 50)),
      components: components.map(comp => ({
        id: comp.id,
        name: comp.name
      }))
    };
  }

  /**
   * Extract reusable components from the file
   */
  private async extractComponents(file: FigmaFile): Promise<ComponentDefinition[]> {
    const components: ComponentDefinition[] = [];
    const componentNodes = this.findComponents(file.document);

    for (const componentNode of componentNodes) {
      try {
        // Parse component into spatial elements
        const parseResult = this.parser.parseNodes([componentNode]);
        
        // Generate component template
        const template = await this.generateComponentTemplate(componentNode);
        
        const definition: ComponentDefinition = {
          id: componentNode.id,
          name: componentNode.name,
          figmaComponentId: componentNode.componentId || componentNode.id,
          properties: this.extractComponentProperties(componentNode),
          elements: parseResult.elements,
          template
        };

        components.push(definition);
        
      } catch (error) {
        if (this.config.debug) {
          console.warn(`Failed to extract component ${componentNode.name}:`, error);
        }
      }
    }

    return components;
  }

  /**
   * Find all component nodes in the document tree
   */
  private findComponents(node: FigmaNode): FigmaNode[] {
    const components: FigmaNode[] = [];
    
    const traverse = (n: FigmaNode) => {
      if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') {
        components.push(n);
      }
      
      if (n.children) {
        for (const child of n.children) {
          traverse(child);
        }
      }
    };
    
    traverse(node);
    return components;
  }

  /**
   * Generate component template for reusability
   */
  private async generateComponentTemplate(
    componentNode: FigmaNode
  ): Promise<any> {
    // This is a simplified template generation
    // In practice, this would analyze the component structure more deeply
    
    const htmlStructure = this.generateComponentHTML(componentNode);
    const cssStyles = await this.generateComponentCSS(componentNode);
    const interactions = this.extractInteractions(componentNode);
    const bindings = this.extractPropertyBindings(componentNode);
    
    return {
      html: htmlStructure,
      css: cssStyles,
      interactions,
      bindings,
      // Enhanced interaction detection
      eventHandlers: this.generateEventHandlers(componentNode, interactions),
      accessibility: this.generateAccessibilityAttributes(componentNode)
    };
  }

  /**
   * Generate event handlers based on component analysis
   */
  private generateEventHandlers(node: FigmaNode, interactions: any[]): Record<string, string> {
    const handlers: Record<string, string> = {};
    const name = node.name.toLowerCase();
    
    // Button interactions
    if (this.isButton(node)) {
      handlers.onClick = this.generateClickHandler(node, interactions);
    }
    
    // Form element interactions
    if (this.isFormElement(node)) {
      handlers.onChange = this.generateChangeHandler(node);
      handlers.onSubmit = this.generateSubmitHandler(node);
    }
    
    // Hover interactions for cards/items
    if (name.includes('card') || name.includes('item')) {
      handlers.onMouseEnter = 'handleCardHover';
      handlers.onMouseLeave = 'handleCardLeave';
    }
    
    return handlers;
  }

  /**
   * Check if node is a button
   */
  private isButton(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('button') || 
           name.includes('btn') || 
           name.includes('cta') ||
           name.includes('submit') ||
           this.hasInteractions(node) ||
           this.isClickableShape(node);
  }

  /**
   * Check if node is a form element
   */
  private isFormElement(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('input') || 
           name.includes('field') || 
           name.includes('form') ||
           name.includes('textarea') ||
           (node.type === 'TEXT' && node.characters?.includes('@')) || false;
  }

  /**
   * Generate click handler code
   */
  private generateClickHandler(node: FigmaNode, interactions: any[]): string {
    // If has prototype interactions, use those
    if (interactions.length > 0) {
      return `handlePrototypeNavigation('${interactions[0].targetNodeId}')`;
    }
    
    // Smart inference based on name
    const name = node.name.toLowerCase();
    if (name.includes('submit')) return 'handleFormSubmit';
    if (name.includes('cancel')) return 'handleCancel';
    if (name.includes('close')) return 'handleClose';
    if (name.includes('save')) return 'handleSave';
    if (name.includes('delete')) return 'handleDelete';
    if (name.includes('edit')) return 'handleEdit';
    
    return `handleClick('${node.id}')`;
  }

  /**
   * Generate change handler for form elements
   */
  private generateChangeHandler(node: FigmaNode): string {
    const name = node.name.toLowerCase();
    if (name.includes('email')) return 'handleEmailChange';
    if (name.includes('password')) return 'handlePasswordChange';
    if (name.includes('search')) return 'handleSearchChange';
    
    return `handleInputChange('${node.id}')`;
  }

  /**
   * Generate submit handler
   */
  private generateSubmitHandler(node: FigmaNode): string {
    const name = node.name.toLowerCase();
    if (name.includes('contact')) return 'handleContactFormSubmit';
    if (name.includes('login')) return 'handleLoginSubmit';
    if (name.includes('signup')) return 'handleSignupSubmit';
    
    return `handleFormSubmit('${node.id}')`;
  }

  /**
   * Generate accessibility attributes
   */
  private generateAccessibilityAttributes(node: FigmaNode): Record<string, string> {
    const attrs: Record<string, string> = {};
    const name = node.name.toLowerCase();
    
    // ARIA labels
    if (this.isButton(node)) {
      attrs['aria-label'] = node.name;
      attrs['role'] = 'button';
    }
    
    if (this.isFormElement(node)) {
      attrs['aria-required'] = name.includes('required') ? 'true' : 'false';
      if (name.includes('email')) attrs['type'] = 'email';
      if (name.includes('password')) attrs['type'] = 'password';
    }
    
    // Navigation landmarks
    if (name.includes('nav')) attrs['role'] = 'navigation';
    if (name.includes('main')) attrs['role'] = 'main';
    if (name.includes('header')) attrs['role'] = 'banner';
    if (name.includes('footer')) attrs['role'] = 'contentinfo';
    
    return attrs;
  }

  /**
   * Generate HTML structure for a component
   */
  private generateComponentHTML(node: FigmaNode): string {
    // Simplified HTML generation
    const tag = this.getHTMLTagForNode(node);
    const classes = this.generateCSSClassesForNode(node);
    const content = node.type === 'TEXT' ? node.characters || '' : '';
    
    let html = `<${tag} class="${classes}"`;
    
    if (node.id) {
      html += ` data-figma-id="${node.id}"`;
    }
    
    html += `>${content}`;
    
    // Add children
    if (node.children) {
      for (const child of node.children) {
        html += this.generateComponentHTML(child);
      }
    }
    
    html += `</${tag}>`;
    
    return html;
  }

  /**
   * Generate CSS for a component
   */
  private async generateComponentCSS(node: FigmaNode): Promise<string> {
    // Try to get enhanced CSS from Figma Dev Mode first
    const enhancedCSS = await this.client.getEnhancedCSS(
      this.getCurrentFileKey(), 
      node.id
    );
    
    if (enhancedCSS) {
      // Add spatial positioning to the enhanced CSS
      const spatial = this.spatialMapper.figmaToSpatial(node.absoluteBoundingBox!);
      return this.addSpatialPositioning(enhancedCSS, spatial);
    }

    // Fallback to basic CSS generation
    const className = this.generateCSSClassesForNode(node);
    let css = `.${className.replace(/\s+/g, '.')} {\n`;
    
    if (node.absoluteBoundingBox) {
      const spatial = this.spatialMapper.figmaToSpatial(node.absoluteBoundingBox);
      css += `  position: absolute;\n`;
      css += `  left: ${spatial.position.x}px;\n`;
      css += `  top: ${spatial.position.y}px;\n`;
      css += `  width: ${spatial.width}px;\n`;
      css += `  height: ${spatial.height}px;\n`;
    }
    
    if (node.fills && node.fills[0]?.color) {
      const color = node.fills[0].color;
      css += `  background-color: rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a || 1});\n`;
    }
    
    if (node.cornerRadius) {
      css += `  border-radius: ${node.cornerRadius}px;\n`;
    }
    
    css += '}\n';
    
    return css;
  }

  /**
   * Add spatial positioning to existing CSS
   */
  private addSpatialPositioning(css: string, spatial: { position: { x: number; y: number }; width: number; height: number }): string {
    // Parse the CSS and add spatial positioning
    const spatialProps = `
  position: absolute;
  left: ${spatial.position.x}px;
  top: ${spatial.position.y}px;
  width: ${spatial.width}px;
  height: ${spatial.height}px;`;
    
    // Simple approach: inject spatial props into the first CSS rule
    return css.replace(/\{/, `{${spatialProps}`);
  }

  /**
   * Store current file key for Dev Mode API calls
   */
  private currentFileKey: string = '';
  private getCurrentFileKey(): string {
    return this.currentFileKey;
  }

  /**
   * Extract component properties/variants
   */
  private extractComponentProperties(node: FigmaNode): Record<string, any> {
    // This would extract component properties/variants
    // For now, return basic info
    return {
      name: node.name,
      type: node.type,
      visible: node.visible !== false,
      locked: node.locked === true
    };
  }

  /**
   * Extract interactions from component
   */
  private extractInteractions(_node: FigmaNode): any[] {
    // This would extract prototype interactions
    // For now, return empty array
    return [];
  }

  /**
   * Extract property bindings for dynamic content
   */
  private extractPropertyBindings(_node: FigmaNode): any[] {
    // This would extract text/content bindings
    // For now, return empty array  
    return [];
  }

  /**
   * Get specific nodes by IDs
   */
  private async getSpecificNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNode[]> {
    const response = await this.client.getFileNodes(fileKey, nodeIds);
    return Object.values(response.nodes);
  }

  /**
   * Count total nodes in tree
   */
  private countTotalNodes(node: FigmaNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countTotalNodes(child);
      }
    }
    return count;
  }

  /**
   * Helper methods for HTML/CSS generation
   */
  private getHTMLTagForNode(node: FigmaNode): string {
    // Smart component detection based on name and properties
    const name = node.name.toLowerCase();
    
    // Text handling
    if (node.type === 'TEXT') {
      if (node.characters?.includes('@')) return 'input';
      if (name.includes('heading') || name.includes('title')) return 'h2';
      if (name.includes('label')) return 'label';
      return 'p';
    }
    
    // Button detection
    if (name.includes('button') || name.includes('btn') || 
        name.includes('submit') || name.includes('cta')) {
      return 'button';
    }
    
    // Form element detection
    if (name.includes('input') || name.includes('field')) {
      if (name.includes('text') || name.includes('email')) return 'input';
      if (name.includes('password')) return 'input';
      if (name.includes('textarea') || name.includes('message')) return 'textarea';
      return 'input';
    }
    
    // Navigation detection
    if (name.includes('nav') || name.includes('menu')) {
      return 'nav';
    }
    
    // List detection
    if (name.includes('list') || name.includes('item')) {
      return 'ul';
    }
    
    // Component instances - preserve semantic meaning
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
      return this.inferComponentTag(node);
    }
    
    // Interactive elements
    if (this.hasInteractions(node)) {
      return 'button';
    }
    
    // Default containers
    switch (node.type) {
      case 'FRAME': 
        return name.includes('card') ? 'article' : 'div';
      case 'RECTANGLE': 
        return this.isClickableShape(node) ? 'button' : 'div';
      case 'GROUP': return 'div';
      default: return 'div';
    }
  }

  /**
   * Infer semantic tag for component instances
   */
  private inferComponentTag(node: FigmaNode): string {
    const name = node.name.toLowerCase();
    
    if (name.includes('button') || name.includes('cta')) return 'button';
    if (name.includes('card') || name.includes('item')) return 'article';
    if (name.includes('modal') || name.includes('dialog')) return 'dialog';
    if (name.includes('form')) return 'form';
    if (name.includes('header')) return 'header';
    if (name.includes('footer')) return 'footer';
    if (name.includes('nav')) return 'nav';
    
    return 'div';
  }

  /**
   * Check if node has prototype interactions
   */
  private hasInteractions(node: FigmaNode): boolean {
    return (node as any).reactions && (node as any).reactions.length > 0;
  }

  /**
   * Check if a shape looks clickable (button-like)
   */
  private isClickableShape(node: FigmaNode): boolean {
    // Rectangle with rounded corners and solid fill might be a button
    if (node.type === 'RECTANGLE' && node.cornerRadius && node.cornerRadius > 4) {
      return node.fills?.some(fill => fill.type === 'SOLID') || false;
    }
    return false;
  }

  private generateCSSClassesForNode(node: FigmaNode): string {
    return node.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'figma-element';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FigmaBridgeConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update client if access token changed
    if (config.accessToken) {
      this.client = new FigmaClient(this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FigmaBridgeConfig {
    return { ...this.config };
  }
}