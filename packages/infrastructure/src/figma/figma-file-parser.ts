import { FigmaFile, FigmaNode, FigmaNodeType, Rectangle, Color } from './types';

/**
 * Parser for converting Figma API responses into design data
 */
export class FigmaFileParser {
  /**
   * Parse a Figma file into design data format
   */
  parse(figmaFile: FigmaFile, fileId: string, fileName: string): {
    source: 'figma';
    fileId: string;
    fileName: string;
    nodes: any[];
    metadata?: {
      version?: string;
      lastModified?: string;
      author?: string;
    };
  } {
    const nodes: any[] = [];
    
    if (figmaFile.document) {
      this.parseNode(figmaFile.document, nodes);
    }

    return {
      source: 'figma',
      fileId,
      fileName,
      nodes,
      metadata: {
        version: figmaFile.version,
        lastModified: figmaFile.lastModified
      }
    };
  }

  /**
   * Recursively parse Figma nodes into design nodes
   */
  private parseNode(
    node: FigmaNode, 
    nodes: any[]
  ): void {
    // Skip document and canvas nodes unless they contain meaningful content
    if ((node.type === 'DOCUMENT' || node.type === 'CANVAS') && node.children) {
      for (const child of node.children) {
        this.parseNode(child, nodes);
      }
      return;
    }

    const designNode: any = {
      id: node.id,
      name: node.name || 'Unnamed',
      type: node.type,
      absoluteBoundingBox: node.absoluteBoundingBox,
      visible: node.visible !== false,
      locked: node.locked === true
    };

    // Extract content based on node type
    if (node.type === 'TEXT') {
      designNode.characters = node.characters || '';
      designNode.style = node.style;
    }
    
    // Extract fills and other visual properties
    if (node.fills) {
      designNode.fills = node.fills;
    }
    
    if (node.strokes) {
      designNode.strokes = node.strokes;
    }
    
    if (node.cornerRadius !== undefined) {
      designNode.cornerRadius = node.cornerRadius;
    }
    
    // Extract layout properties
    if (node.layoutMode) {
      designNode.layoutMode = node.layoutMode;
    }
    
    if (node.itemSpacing !== undefined) {
      designNode.itemSpacing = node.itemSpacing;
    }
    
    // Extract padding
    if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
      designNode.padding = {
        left: node.paddingLeft || 0,
        right: node.paddingRight || 0,
        top: node.paddingTop || 0,
        bottom: node.paddingBottom || 0
      };
    }

    // Extract component information
    if (node.componentId || node.componentSetId) {
      designNode.componentId = node.componentId;
      designNode.componentSetId = node.componentSetId;
    }

    // Extract auto-layout information
    if (node.primaryAxisSizingMode) {
      designNode.primaryAxisSizingMode = node.primaryAxisSizingMode;
    }
    
    if (node.counterAxisSizingMode) {
      designNode.counterAxisSizingMode = node.counterAxisSizingMode;
    }
    
    if (node.primaryAxisAlignItems) {
      designNode.primaryAxisAlignItems = node.primaryAxisAlignItems;
    }
    
    if (node.counterAxisAlignItems) {
      designNode.counterAxisAlignItems = node.counterAxisAlignItems;
    }

    // Extract constraints
    if (node.constraints) {
      designNode.constraints = {
        horizontal: node.constraints.horizontal,
        vertical: node.constraints.vertical
      };
    }

    // Extract effects (shadows, blurs)
    if (node.effects && node.effects.length > 0) {
      designNode.effects = node.effects;
    }

    nodes.push(designNode);

    // Recursively parse children
    if (node.children && node.children.length > 0) {
      designNode.children = [];
      for (const child of node.children) {
        this.parseNode(child, designNode.children);
      }
    }
  }


  /**
   * Extract text styling information
   */
  private extractTextStyle(node: FigmaNode): any {
    if (!node.style) return {};

    return {
      fontFamily: node.style.fontFamily,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      lineHeight: node.style.lineHeightPx || node.style.lineHeightPercent,
      letterSpacing: node.style.letterSpacing,
      textAlign: node.style.textAlignHorizontal,
      textCase: node.style.textCase,
      textDecoration: node.style.textDecoration,
      color: node.fills?.[0] ? this.extractColorFromPaint(node.fills[0]) : undefined
    };
  }

  /**
   * Extract fill information
   */
  private extractFills(fills: any[]): any[] {
    return fills.map(fill => ({
      type: fill.type,
      visible: fill.visible !== false,
      opacity: fill.opacity || 1,
      color: fill.color ? this.colorToHex(fill.color) : undefined,
      gradient: fill.gradientStops ? {
        stops: fill.gradientStops.map((stop: any) => ({
          position: stop.position,
          color: this.colorToHex(stop.color)
        }))
      } : undefined
    }));
  }

  /**
   * Extract stroke information
   */
  private extractStrokes(strokes: any[]): any[] {
    return strokes.map(stroke => ({
      type: stroke.type,
      visible: stroke.visible !== false,
      opacity: stroke.opacity || 1,
      color: stroke.color ? this.colorToHex(stroke.color) : undefined
    }));
  }

  /**
   * Extract padding information
   */
  private extractPadding(node: FigmaNode): any {
    return {
      left: node.paddingLeft || 0,
      right: node.paddingRight || 0,
      top: node.paddingTop || 0,
      bottom: node.paddingBottom || 0
    };
  }

  /**
   * Extract color from paint object
   */
  private extractColorFromPaint(paint: any): string | undefined {
    if (paint.type === 'SOLID' && paint.color) {
      return this.colorToHex(paint.color);
    }
    return undefined;
  }

  /**
   * Convert Figma color to hex string
   */
  private colorToHex(color: Color): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Analyze repetitive patterns in the design nodes
   */
  analyzePatterns(nodes: any[]): any[] {
    const patterns: any[] = [];
    
    // Group nodes by similar properties
    const groupedByName = this.groupNodesByNamePattern(nodes);
    
    for (const [pattern, groupNodes] of Object.entries(groupedByName)) {
      if (groupNodes.length > 1) {
        patterns.push({
          type: 'repeated_component',
          pattern,
          count: groupNodes.length,
          nodes: groupNodes.map(node => node.id),
          suggestedEntity: this.suggestEntityFromPattern(pattern, groupNodes)
        });
      }
    }

    return patterns;
  }

  /**
   * Group nodes by name patterns (e.g., "User Card 1", "User Card 2")
   */
  private groupNodesByNamePattern(nodes: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    for (const node of nodes) {
      // Extract base pattern from name (remove numbers, "copy", etc.)
      const basePattern = node.name
        .replace(/\s*\d+$/, '')  // Remove trailing numbers
        .replace(/\s*copy\s*\d*$/i, '')  // Remove "copy" variations
        .replace(/\s*instance\s*\d*$/i, '')  // Remove "instance" variations
        .trim();

      if (!groups[basePattern]) {
        groups[basePattern] = [];
      }
      groups[basePattern].push(node);
    }

    return groups;
  }

  /**
   * Suggest database entity based on pattern analysis
   */
  private suggestEntityFromPattern(pattern: string, nodes: any[]): any {
    // Analyze the first node to understand structure
    const sample = nodes[0];
    const fields: any[] = [];

    // Look for text nodes that might represent data fields
    const textNodes = nodes.filter(node => node.type === 'TEXT');
    
    for (const textNode of textNodes) {
      if (textNode.characters) {
        const fieldName = this.inferFieldNameFromText(textNode.characters, textNode.name);
        if (fieldName) {
          fields.push({
            name: fieldName,
            type: this.inferFieldTypeFromText(textNode.characters),
            example: textNode.characters
          });
        }
      }
    }

    return {
      name: pattern.toLowerCase().replace(/\s+/g, '_'),
      displayName: pattern,
      fields,
      estimatedCount: nodes.length * 10 // Extrapolate for real data
    };
  }

  /**
   * Infer field name from text content or element name
   */
  private inferFieldNameFromText(text: string, elementName: string): string | null {
    // Common patterns to detect field names
    const patterns = [
      { regex: /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, field: 'full_name' }, // "John Doe"
      { regex: /\b\w+@\w+\.\w+\b/, field: 'email' }, // Email addresses
      { regex: /^\$\d+/, field: 'price' }, // Prices
      { regex: /^\d{4}-\d{2}-\d{2}/, field: 'date' }, // Dates
      { regex: /^\d{1,2}:\d{2}/, field: 'time' }, // Times
      { regex: /^@\w+/, field: 'username' }, // Usernames
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        return pattern.field;
      }
    }

    // Fallback to element name if it looks like a field
    if (elementName.toLowerCase().includes('name') ||
        elementName.toLowerCase().includes('title') ||
        elementName.toLowerCase().includes('description')) {
      return elementName.toLowerCase().replace(/\s+/g, '_');
    }

    return null;
  }

  /**
   * Infer field type from text content
   */
  private inferFieldTypeFromText(text: string): string {
    if (/\b\w+@\w+\.\w+\b/.test(text)) return 'email';
    if (/^\$\d+/.test(text)) return 'currency';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return 'date';
    if (/^\d{1,2}:\d{2}/.test(text)) return 'time';
    if (/^\d+$/.test(text)) return 'integer';
    if (/^\d+\.\d+$/.test(text)) return 'decimal';
    if (text.length > 100) return 'text';
    return 'string';
  }
}