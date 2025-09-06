/**
 * Design Parser - Converts Figma nodes to spatial elements with HTML generation
 */

import type { SpatialElement } from '@fir/spatial-runtime';
import type { 
  FigmaNode, 
  ParseResult, 
  ParseWarning, 
  ParseError
} from './types.js';
import { SpatialMapper } from './spatial-mapper.js';

export interface DesignParserConfig {
  /** Spatial coordinate mapper */
  spatialMapper?: SpatialMapper;
  /** Generate HTML for interactive elements */
  generateHTML?: boolean;
  /** Include debug information in output */
  includeDebugInfo?: boolean;
  /** Maximum recursion depth */
  maxDepth?: number;
  /** Skip invisible nodes */
  skipInvisible?: boolean;
}

export class DesignParser {
  private config: Required<DesignParserConfig>;
  private spatialMapper: SpatialMapper;
  private warnings: ParseWarning[] = [];
  private errors: ParseError[] = [];
  private processedNodes: Set<string> = new Set();

  constructor(config: DesignParserConfig = {}) {
    this.config = {
      spatialMapper: config.spatialMapper || new SpatialMapper(),
      generateHTML: config.generateHTML ?? true,
      includeDebugInfo: config.includeDebugInfo ?? false,
      maxDepth: config.maxDepth ?? 10,
      skipInvisible: config.skipInvisible ?? true
    };
    
    this.spatialMapper = this.config.spatialMapper;
  }

  /**
   * Parse Figma nodes into spatial elements
   */
  parseNodes(nodes: FigmaNode[], fileVersion: string = 'unknown'): ParseResult {
    const startTime = performance.now();
    this.warnings = [];
    this.errors = [];
    this.processedNodes.clear();

    const elements: SpatialElement[] = [];
    let totalNodes = 0;

    for (const node of nodes) {
      try {
        const nodeElements = this.parseNode(node, 0);
        elements.push(...nodeElements);
        totalNodes += this.countNodes(node);
      } catch (error) {
        this.addError(node, 'PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      elements,
      warnings: [...this.warnings],
      errors: [...this.errors],
      metadata: {
        totalNodes,
        processingTime,
        fileVersion,
        parserVersion: '0.1.0'
      }
    };
  }

  /**
   * Parse a single Figma node into spatial elements
   */
  private parseNode(node: FigmaNode, depth: number): SpatialElement[] {
    // Check depth limit
    if (depth > this.config.maxDepth) {
      this.addWarning(node, 'MAX_DEPTH_EXCEEDED', 'Node skipped due to maximum depth limit');
      return [];
    }

    // Check visibility
    if (this.config.skipInvisible && node.visible === false) {
      return [];
    }

    // Check for circular references
    if (this.processedNodes.has(node.id)) {
      this.addWarning(node, 'CIRCULAR_REFERENCE', 'Node already processed, skipping to avoid infinite loop');
      return [];
    }

    this.processedNodes.add(node.id);

    const elements: SpatialElement[] = [];

    try {
      // Parse this node
      const element = this.createSpatialElement(node);
      if (element) {
        elements.push(element);
      }

      // Parse children
      if (node.children) {
        for (const child of node.children) {
          const childElements = this.parseNode(child, depth + 1);
          elements.push(...childElements);
        }
      }

    } catch (error) {
      this.addError(node, 'NODE_PARSE_ERROR', error instanceof Error ? error.message : 'Unknown error');
    }

    this.processedNodes.delete(node.id);
    return elements;
  }

  /**
   * Create a spatial element from a Figma node
   */
  private createSpatialElement(node: FigmaNode): SpatialElement | null {
    if (!node.absoluteBoundingBox) {
      this.addWarning(node, 'NO_BOUNDING_BOX', 'Node has no bounding box, skipping');
      return null;
    }

    const spatial = this.spatialMapper.figmaToSpatial(node.absoluteBoundingBox);
    
    // Generate HTML element if requested
    let htmlElement: HTMLElement | undefined;
    if (this.config.generateHTML) {
      htmlElement = this.generateHTMLElement(node);
    }

    const element: SpatialElement = {
      id: node.id,
      type: this.mapFigmaTypeToSpatialType(node.type),
      position: spatial.position,
      bounds: {
        width: spatial.width,
        height: spatial.height
      },
      htmlElement
    };

    // Add semantic data based on node properties
    if (this.shouldIncludeSemanticData(node)) {
      element.semanticData = this.generateSemanticData(node);
    }

    return element;
  }

  /**
   * Generate HTML element from Figma node
   */
  private generateHTMLElement(node: FigmaNode): HTMLElement {
    // This would normally run in a browser environment
    // For now, we'll create a mock element structure
    const element = this.createMockElement(this.getHTMLTag(node));
    
    // Set basic properties
    element.id = node.id;
    element.className = this.generateCSSClasses(node);
    
    // Apply styles
    this.applyNodeStyles(element, node);
    
    // Set content
    this.setElementContent(element, node);
    
    return element as HTMLElement;
  }

  /**
   * Create a mock HTML element (for server-side use)
   */
  private createMockElement(tagName: string): any {
    return {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      style: {},
      innerHTML: '',
      textContent: '',
      children: [],
      setAttribute: function(name: string, value: string) {
        (this as any)[name] = value;
      },
      appendChild: function(child: any) {
        this.children.push(child);
      }
    };
  }

  /**
   * Determine appropriate HTML tag for Figma node
   */
  private getHTMLTag(node: FigmaNode): string {
    switch (node.type) {
      case 'TEXT':
        return this.getTextTag(node);
      case 'RECTANGLE':
        return this.isButton(node) ? 'button' : 'div';
      case 'FRAME':
        return this.isForm(node) ? 'form' : 'section';
      case 'GROUP':
        return 'div';
      case 'INSTANCE':
      case 'COMPONENT':
        return this.getComponentTag(node);
      default:
        return 'div';
    }
  }

  /**
   * Determine text tag based on text properties
   */
  private getTextTag(node: FigmaNode): string {
    if (!node.style) return 'p';
    
    const fontSize = node.style.fontSize;
    if (fontSize >= 32) return 'h1';
    if (fontSize >= 24) return 'h2';
    if (fontSize >= 20) return 'h3';
    if (fontSize >= 18) return 'h4';
    if (fontSize >= 16) return 'h5';
    if (fontSize >= 14) return 'h6';
    
    return 'p';
  }

  /**
   * Check if node should be rendered as a button
   */
  private isButton(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('button') || 
           name.includes('btn') || 
           (node.fills !== undefined && node.fills.length > 0 && name.includes('click'));
  }

  /**
   * Check if node should be rendered as a form
   */
  private isForm(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    return name.includes('form') || 
           name.includes('input') || 
           name.includes('field');
  }

  /**
   * Get HTML tag for component/instance nodes
   */
  private getComponentTag(node: FigmaNode): string {
    const name = node.name.toLowerCase();
    
    if (name.includes('input') || name.includes('textfield')) return 'input';
    if (name.includes('button')) return 'button';
    if (name.includes('card')) return 'article';
    if (name.includes('nav')) return 'nav';
    if (name.includes('header')) return 'header';
    if (name.includes('footer')) return 'footer';
    
    return 'div';
  }

  /**
   * Generate CSS classes for a node
   */
  private generateCSSClasses(node: FigmaNode): string {
    const classes = [];
    
    // Add type-based class
    classes.push(`figma-${node.type.toLowerCase()}`);
    
    // Add name-based class (sanitized)
    const nameClass = node.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (nameClass) {
      classes.push(nameClass);
    }

    // Add semantic classes
    if (this.isInteractive(node)) classes.push('interactive');
    if (this.isButton(node)) classes.push('button');
    if (this.isForm(node)) classes.push('form');
    
    return classes.join(' ');
  }

  /**
   * Apply Figma node styles to HTML element
   */
  private applyNodeStyles(element: any, node: FigmaNode): void {
    const bbox = node.absoluteBoundingBox!;
    const spatial = this.spatialMapper.figmaToSpatial(bbox);
    
    // Position and size
    element.style.position = 'absolute';
    element.style.left = `${spatial.position.x}px`;
    element.style.top = `${spatial.position.y}px`;
    element.style.width = `${spatial.width}px`;
    element.style.height = `${spatial.height}px`;
    
    // Background fills
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0]; // Use first fill
      if (fill.type === 'SOLID' && fill.color) {
        const color = fill.color;
        const alpha = (fill.opacity ?? 1) * (color.a ?? 1);
        element.style.backgroundColor = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
      }
    }
    
    // Strokes/borders
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
      const stroke = node.strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        const color = stroke.color;
        const alpha = (stroke.opacity ?? 1) * (color.a ?? 1);
        element.style.border = `${node.strokeWeight}px solid rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
      }
    }
    
    // Border radius
    if (node.cornerRadius) {
      element.style.borderRadius = `${node.cornerRadius}px`;
    }
    
    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
      element.style.opacity = node.opacity.toString();
    }
    
    // Text styles
    if (node.type === 'TEXT' && node.style) {
      const textStyle = node.style;
      element.style.fontFamily = textStyle.fontFamily;
      element.style.fontSize = `${textStyle.fontSize}px`;
      element.style.fontWeight = textStyle.fontWeight.toString();
      
      if (textStyle.lineHeightPx) {
        element.style.lineHeight = `${textStyle.lineHeightPx}px`;
      }
      
      if (textStyle.letterSpacing) {
        element.style.letterSpacing = `${textStyle.letterSpacing}px`;
      }
      
      if (textStyle.textAlignHorizontal) {
        element.style.textAlign = textStyle.textAlignHorizontal.toLowerCase();
      }
    }
  }

  /**
   * Set element content based on node type
   */
  private setElementContent(element: any, node: FigmaNode): void {
    if (node.type === 'TEXT' && node.characters) {
      element.textContent = node.characters;
    } else if (this.isButton(node)) {
      element.textContent = node.name || 'Button';
    }
  }

  /**
   * Check if node is interactive
   */
  private isInteractive(node: FigmaNode): boolean {
    return this.isButton(node) || 
           this.isForm(node) || 
           node.type === 'INSTANCE' ||
           node.name.toLowerCase().includes('link');
  }

  /**
   * Check if node should include semantic data
   */
  private shouldIncludeSemanticData(node: FigmaNode): boolean {
    return node.type === 'FRAME' || 
           node.type === 'COMPONENT' || 
           node.type === 'INSTANCE' ||
           (node.children !== undefined && node.children.length > 0);
  }

  /**
   * Generate semantic data for different zoom levels
   */
  private generateSemanticData(node: FigmaNode): Record<string, any> {
    const bbox = node.absoluteBoundingBox!;
    const area = bbox.width * bbox.height;
    
    return {
      universal: {
        name: node.name,
        type: node.type,
        area: Math.round(area)
      },
      system: {
        name: node.name,
        type: node.type,
        bounds: bbox,
        childCount: node.children?.length || 0
      },
      standard: {
        name: node.name,
        type: node.type,
        bounds: bbox,
        styles: this.extractStyleSummary(node),
        children: node.children?.slice(0, 5).map(child => ({
          id: child.id,
          name: child.name,
          type: child.type
        }))
      },
      atomic: {
        name: node.name,
        type: node.type,
        figmaProperties: this.extractAllProperties(node),
        debugInfo: this.config.includeDebugInfo ? {
          processingTime: Date.now(),
          parserVersion: '0.1.0'
        } : undefined
      }
    };
  }

  /**
   * Extract style summary from node
   */
  private extractStyleSummary(node: FigmaNode): any {
    return {
      fills: node.fills?.length || 0,
      strokes: node.strokes?.length || 0,
      effects: node.effects?.length || 0,
      opacity: node.opacity,
      cornerRadius: node.cornerRadius
    };
  }

  /**
   * Extract all properties from node for atomic level
   */
  private extractAllProperties(node: FigmaNode): any {
    // Return a subset of properties for atomic level debugging
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible ?? true,
      locked: node.locked ?? false,
      bounds: node.absoluteBoundingBox,
      constraints: node.constraints,
      styles: this.extractStyleSummary(node)
    };
  }

  /**
   * Map Figma node types to spatial element types
   */
  private mapFigmaTypeToSpatialType(figmaType: string): string {
    const typeMap: Record<string, string> = {
      'FRAME': 'container',
      'GROUP': 'group',
      'RECTANGLE': 'shape',
      'ELLIPSE': 'shape',
      'TEXT': 'text',
      'INSTANCE': 'component',
      'COMPONENT': 'component',
      'VECTOR': 'icon',
      'LINE': 'shape'
    };

    return typeMap[figmaType] || 'element';
  }

  /**
   * Count total nodes in a tree
   */
  private countNodes(node: FigmaNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * Add warning to parsing results
   */
  private addWarning(node: FigmaNode, code: string, message: string): void {
    this.warnings.push({
      message,
      nodeId: node.id,
      nodeName: node.name,
      code
    });
  }

  /**
   * Add error to parsing results
   */
  private addError(node: FigmaNode, code: string, message: string, stack?: string): void {
    this.errors.push({
      message,
      nodeId: node.id,
      nodeName: node.name,
      code,
      stack
    });
  }
}