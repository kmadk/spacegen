/**
 * Design Relevance Filters - Optimize for backend generation
 * Focus on nodes that are likely to represent data structures
 */

import type { FigmaNode, FigmaNodeType, FigmaFetchOptions, FigmaTextNode, FigmaFrameNode } from '../types/figma-types';

export class DesignRelevanceFilter {
  
  /**
   * Primary filter: Node types most relevant for backend generation
   */
  private static readonly BACKEND_RELEVANT_TYPES: FigmaNodeType[] = [
    'FRAME',       // Layout containers - potential entities
    'COMPONENT',   // Reusable components - strong entity indicators  
    'INSTANCE',    // Component instances - data patterns
    'TEXT',        // Content - field names and data types
    'RECTANGLE'    // Simple shapes - often represent data cards
  ];

  /**
   * Secondary filter: Nodes that might contain relevant children
   */
  private static readonly CONTAINER_TYPES: FigmaNodeType[] = [
    'PAGE',
    'FRAME', 
    'GROUP',
    'COMPONENT',
    'COMPONENT_SET'
  ];

  /**
   * Filter nodes based on backend generation relevance
   */
  static filterForBackendGeneration(
    nodes: FigmaNode[],
    options: FigmaFetchOptions = {}
  ): FigmaNode[] {
    const {
      nodeTypes = this.BACKEND_RELEVANT_TYPES,
      filterEmpty = true,
      maxDepth = 10,
      minSize = { width: 20, height: 20 }
    } = options;

    return this.filterNodesRecursively(nodes, {
      nodeTypes,
      filterEmpty,
      maxDepth,
      minSize,
      currentDepth: 0
    });
  }

  private static filterNodesRecursively(
    nodes: FigmaNode[],
    options: {
      nodeTypes: FigmaNodeType[];
      filterEmpty: boolean;
      maxDepth: number;
      minSize: { width: number; height: number };
      currentDepth: number;
    }
  ): FigmaNode[] {
    if (options.currentDepth >= options.maxDepth) {
      return [];
    }

    const filtered: FigmaNode[] = [];

    for (const node of nodes) {
      // Skip if not in allowed types
      if (!options.nodeTypes.includes(node.type as FigmaNodeType)) {
        // But still process children if it's a container
        if (this.CONTAINER_TYPES.includes(node.type as FigmaNodeType) && node.children) {
          const filteredChildren = this.filterNodesRecursively(node.children, {
            ...options,
            currentDepth: options.currentDepth + 1
          });
          
          if (filteredChildren.length > 0) {
            filtered.push({
              ...node,
              children: filteredChildren
            });
          }
        }
        continue;
      }

      // Apply size filter
      if (node.absoluteBoundingBox && this.isTooSmall(node, options.minSize)) {
        continue;
      }

      // Apply content relevance filter
      if (options.filterEmpty && !this.hasRelevantContent(node)) {
        continue;
      }

      // Process children if applicable
      let processedNode = node;
      if (node.children && this.CONTAINER_TYPES.includes(node.type as FigmaNodeType)) {
        const filteredChildren = this.filterNodesRecursively(node.children, {
          ...options,
          currentDepth: options.currentDepth + 1
        });
        
        processedNode = {
          ...node,
          children: filteredChildren
        };
      }

      filtered.push(processedNode);
    }

    return filtered;
  }

  /**
   * Check if node is too small to be relevant
   */
  private static isTooSmall(
    node: FigmaNode, 
    minSize: { width: number; height: number }
  ): boolean {
    if (!node.absoluteBoundingBox) return false;
    
    const { width, height } = node.absoluteBoundingBox;
    return width < minSize.width || height < minSize.height;
  }

  /**
   * Check if node has content relevant to backend generation
   */
  private static hasRelevantContent(node: FigmaNode): boolean {
    switch (node.type) {
      case 'TEXT':
        return this.hasRelevantTextContent(node as FigmaTextNode);
      
      case 'FRAME':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.hasRelevantFrameContent(node as FigmaFrameNode);
      
      case 'RECTANGLE':
        return this.hasRelevantShapeContent(node);
      
      default:
        return true; // Conservative - include by default
    }
  }

  /**
   * Analyze text content for backend relevance
   */
  private static hasRelevantTextContent(node: FigmaTextNode): boolean {
    const text = node.characters?.trim();
    if (!text) return false;

    // Skip generic placeholder text
    const placeholderPatterns = [
      /^(lorem ipsum|placeholder|sample|dummy|test|example)$/i,
      /^(click here|button|link)$/i,
      /^[\s\-_]*$/,
      /^[0-9.,$%]+$/ // Pure numbers without context
    ];

    if (placeholderPatterns.some(pattern => pattern.test(text))) {
      return false;
    }

    // Prioritize text that looks like:
    const relevantPatterns = [
      /\w+@\w+\.\w+/,           // Email addresses
      /^\$?[\d,]+\.?\d*$/,      // Prices/amounts
      /^\d{4}-\d{2}-\d{2}/,     // Dates
      /^(name|email|phone|address|title|description|status|category|type|id)/i, // Field labels
      /@\w+/,                   // Handles/usernames
      /^\w+\s+\w+$/            // Likely names (first + last)
    ];

    // Include if matches data patterns or is substantial content
    return relevantPatterns.some(pattern => pattern.test(text)) || 
           (text.length > 3 && text.split(' ').length >= 2);
  }

  /**
   * Analyze frame content for backend relevance
   */
  private static hasRelevantFrameContent(node: FigmaFrameNode): boolean {
    const name = node.name.toLowerCase();
    
    // Skip decorative/UI frames
    const decorativePatterns = [
      /^(background|bg|decoration|ornament|divider|spacer|separator)$/i,
      /^(shadow|glow|blur|effect)$/i,
      /^(icon|logo|avatar|image|picture|photo)$/i
    ];

    if (decorativePatterns.some(pattern => pattern.test(name))) {
      return false;
    }

    // Prioritize frames that suggest data structures
    const dataPatterns = [
      /(card|item|row|entry|record|post|article|product|user|profile|account)/i,
      /(form|input|field|textarea|select|dropdown|checkbox|radio)/i,
      /(list|grid|table|collection|gallery|feed)/i,
      /(header|title|content|body|details|info|data)/i,
      /(modal|dialog|popup|panel|sidebar|nav|menu)/i
    ];

    return dataPatterns.some(pattern => pattern.test(name)) ||
           (node.children && node.children.length > 0); // Has potential child data
  }

  /**
   * Analyze shape content for backend relevance
   */
  private static hasRelevantShapeContent(node: FigmaNode): boolean {
    const name = node.name.toLowerCase();
    
    // Include rectangles that might represent data containers
    const containerPatterns = [
      /(card|box|container|panel|section|block|tile)/i,
      /(background|bg)(?!.*decoration)/i, // Background but not decoration
      /(border|frame|outline)/i
    ];

    return containerPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Analyze component patterns for entity detection
   */
  static analyzeComponentPatterns(nodes: FigmaNode[]): ComponentPattern[] {
    const patterns: ComponentPattern[] = [];
    const componentGroups = this.groupSimilarComponents(nodes);

    for (const [patternName, components] of componentGroups.entries()) {
      if (components.length >= 2) { // Must repeat to be a pattern
        patterns.push({
          name: patternName,
          instances: components,
          confidence: Math.min(0.9, components.length * 0.1 + 0.5),
          suggestedEntity: this.inferEntityName(patternName),
          fields: this.extractFieldsFromPattern(components)
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private static groupSimilarComponents(nodes: FigmaNode[]): Map<string, FigmaNode[]> {
    const groups = new Map<string, FigmaNode[]>();

    const getAllNodes = (nodeList: FigmaNode[]): FigmaNode[] => {
      const result: FigmaNode[] = [];
      for (const node of nodeList) {
        result.push(node);
        if (node.children) {
          result.push(...getAllNodes(node.children));
        }
      }
      return result;
    };

    const allNodes = getAllNodes(nodes);

    for (const node of allNodes) {
      if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        const baseName = this.normalizeComponentName(node.name);
        if (!groups.has(baseName)) {
          groups.set(baseName, []);
        }
        groups.get(baseName)!.push(node);
      }
    }

    return groups;
  }

  private static normalizeComponentName(name: string): string {
    // Remove instance numbers and variations
    return name
      .replace(/\s*\d+$/, '')        // Remove trailing numbers
      .replace(/\s*copy.*$/i, '')    // Remove "copy" suffixes
      .replace(/\s*variant.*$/i, '') // Remove "variant" suffixes
      .replace(/[_-]/g, ' ')         // Normalize separators
      .toLowerCase()
      .trim();
  }

  private static inferEntityName(componentName: string): string {
    // Convert component names to likely entity names
    const entityMappings: Record<string, string> = {
      'user card': 'User',
      'profile card': 'Profile', 
      'product card': 'Product',
      'post card': 'Post',
      'article card': 'Article',
      'item card': 'Item',
      'contact card': 'Contact',
      'message card': 'Message',
      'comment card': 'Comment',
      'order card': 'Order'
    };

    const normalized = componentName.toLowerCase();
    for (const [pattern, entity] of Object.entries(entityMappings)) {
      if (normalized.includes(pattern)) {
        return entity;
      }
    }

    // Fallback: capitalize first word
    return componentName.split(' ')[0]
      .replace(/^\w/, c => c.toUpperCase());
  }

  private static extractFieldsFromPattern(components: FigmaNode[]): ComponentField[] {
    // Analyze first component as representative
    const representative = components[0];
    const fields: ComponentField[] = [];

    const extractTextFields = (node: FigmaNode, path: string = ''): void => {
      if (node.type === 'TEXT') {
        const textNode = node as FigmaTextNode;
        if (textNode.characters) {
          fields.push({
            name: this.inferFieldName(node.name, textNode.characters),
            type: this.inferFieldType(textNode.characters),
            sample: textNode.characters.slice(0, 50),
            confidence: 0.7
          });
        }
      }

      if (node.children) {
        for (const child of node.children) {
          extractTextFields(child, path + '/' + child.name);
        }
      }
    };

    extractTextFields(representative);
    return fields;
  }

  private static inferFieldName(nodeName: string, content: string): string {
    // Clean up node name to field name
    const cleaned = nodeName
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .trim();

    // Common field name patterns
    if (cleaned.includes('email') || /@/.test(content)) return 'email';
    if (cleaned.includes('name') && /^\w+\s+\w+$/.test(content)) return 'fullName';
    if (cleaned.includes('name')) return 'name';
    if (cleaned.includes('title')) return 'title';
    if (cleaned.includes('price') || /^\$/.test(content)) return 'price';
    if (cleaned.includes('date') || /\d{4}-\d{2}-\d{2}/.test(content)) return 'date';
    if (cleaned.includes('description')) return 'description';
    if (cleaned.includes('status')) return 'status';

    return cleaned.replace(/\s+/g, '');
  }

  private static inferFieldType(content: string): string {
    if (/@\w+\.\w+/.test(content)) return 'email';
    if (/^\$?[\d,]+\.?\d*$/.test(content)) return 'decimal';
    if (/^\d{4}-\d{2}-\d{2}/.test(content)) return 'date';
    if (/^\d+$/.test(content)) return 'integer';
    if (content.length > 100) return 'text';
    return 'varchar';
  }
}

export interface ComponentPattern {
  name: string;
  instances: FigmaNode[];
  confidence: number;
  suggestedEntity: string;
  fields: ComponentField[];
}

export interface ComponentField {
  name: string;
  type: string;
  sample: string;
  confidence: number;
}