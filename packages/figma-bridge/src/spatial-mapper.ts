/**
 * Spatial Coordinate Mapper - Converts Figma coordinates to spatial world coordinates
 */

import type { WorldPosition } from '@fir/spatial-runtime';
import type { 
  FigmaBoundingBox, 
  SpatialMapping,
  FigmaNode 
} from './types.js';

export interface SpatialMapperConfig {
  /** Scale factor from Figma pixels to spatial units (default: 1.0) */
  scale?: number;
  /** Origin offset in spatial coordinates (default: {0, 0}) */
  origin?: WorldPosition;
  /** Whether to preserve aspect ratios (default: true) */
  preserveAspectRatio?: boolean;
  /** Base unit size in pixels (default: 16 for typical UI density) */
  baseUnit?: number;
  /** Whether to flip Y axis (Figma Y+ down, spatial Y+ up) */
  flipY?: boolean;
}

export class SpatialMapper {
  private mapping: SpatialMapping;
  private config: Required<SpatialMapperConfig>;

  constructor(config: SpatialMapperConfig = {}) {
    this.config = {
      scale: config.scale ?? 1.0,
      origin: config.origin ?? { x: 0, y: 0 },
      preserveAspectRatio: config.preserveAspectRatio ?? true,
      baseUnit: config.baseUnit ?? 16,
      flipY: config.flipY ?? true
    };

    this.mapping = {
      scale: this.config.scale,
      origin: this.config.origin,
      preserveAspectRatio: this.config.preserveAspectRatio
    };
  }

  /**
   * Convert Figma bounding box to spatial world position and dimensions
   */
  figmaToSpatial(bbox: FigmaBoundingBox): {
    position: WorldPosition;
    width: number;
    height: number;
  } {
    // Convert Figma coordinates to spatial coordinates
    const x = (bbox.x * this.config.scale / this.config.baseUnit) + this.config.origin.x;
    
    // Handle Y-axis flipping (Figma Y+ down, spatial Y+ up)
    const y = this.config.flipY 
      ? -(bbox.y * this.config.scale / this.config.baseUnit) + this.config.origin.y
      : (bbox.y * this.config.scale / this.config.baseUnit) + this.config.origin.y;

    return {
      position: { x, y },
      width: bbox.width * this.config.scale / this.config.baseUnit,
      height: bbox.height * this.config.scale / this.config.baseUnit
    };
  }

  /**
   * Convert spatial coordinates back to Figma coordinates
   */
  spatialToFigma(position: WorldPosition, width: number, height: number): FigmaBoundingBox {
    // Convert spatial coordinates to Figma coordinates
    const x = (position.x - this.config.origin.x) * this.config.baseUnit / this.config.scale;
    
    // Handle Y-axis flipping
    const y = this.config.flipY 
      ? -(position.y - this.config.origin.y) * this.config.baseUnit / this.config.scale
      : (position.y - this.config.origin.y) * this.config.baseUnit / this.config.scale;

    return {
      x,
      y,
      width: width * this.config.baseUnit / this.config.scale,
      height: height * this.config.baseUnit / this.config.scale
    };
  }

  /**
   * Calculate optimal spatial mapping for a Figma file
   * This analyzes the content and determines good defaults for spatial layout
   */
  calculateOptimalMapping(rootNode: FigmaNode): SpatialMapping {
    const bounds = this.calculateContentBounds(rootNode);
    
    if (!bounds) {
      return this.mapping;
    }

    // Calculate scale to fit content in a reasonable spatial area
    // Target: fit content within ~1000x1000 spatial units
    const targetSpatialSize = 1000;
    const maxDimension = Math.max(bounds.width, bounds.height);
    const optimalScale = maxDimension > 0 ? targetSpatialSize / maxDimension : 1.0;

    // Center the content
    const spatialBounds = this.figmaToSpatial(bounds);
    const centerOffset: WorldPosition = {
      x: -spatialBounds.position.x - (spatialBounds.width / 2),
      y: -spatialBounds.position.y - (spatialBounds.height / 2)
    };

    return {
      scale: optimalScale * this.config.scale,
      origin: centerOffset,
      preserveAspectRatio: true
    };
  }

  /**
   * Calculate the bounding box of all content in a Figma node tree
   */
  private calculateContentBounds(node: FigmaNode): FigmaBoundingBox | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const traverse = (n: FigmaNode) => {
      // Only consider visible nodes with bounding boxes
      if (n.visible !== false && n.absoluteBoundingBox) {
        const bbox = n.absoluteBoundingBox;
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }

      // Recursively process children
      if (n.children) {
        for (const child of n.children) {
          traverse(child);
        }
      }
    };

    traverse(node);

    // Return null if no bounds found
    if (minX === Infinity) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Create spatial regions for different zoom levels
   * This helps organize content into semantic levels based on hierarchy
   */
  createSemanticRegions(nodes: FigmaNode[]): {
    universal: FigmaNode[]; // Top-level frames/pages
    system: FigmaNode[];    // Major sections/components  
    standard: FigmaNode[];  // Regular UI elements
    atomic: FigmaNode[];    // Text, icons, small details
  } {
    const regions = {
      universal: [] as FigmaNode[],
      system: [] as FigmaNode[],
      standard: [] as FigmaNode[],
      atomic: [] as FigmaNode[]
    };

    const analyzeNode = (node: FigmaNode, depth: number = 0) => {
      const bbox = node.absoluteBoundingBox;
      if (!bbox) return;

      const area = bbox.width * bbox.height;
      const hasChildren = node.children && node.children.length > 0;

      // Classify based on size, type, and hierarchy
      if (depth === 0 || node.type === 'CANVAS') {
        regions.universal.push(node);
      } else if (
        node.type === 'FRAME' && 
        area > 100000 && // Large frames (>316x316px)
        hasChildren
      ) {
        regions.system.push(node);
      } else if (
        node.type === 'TEXT' || 
        area < 1000 || // Small elements (<32x32px)
        ['VECTOR', 'ELLIPSE', 'POLYGON'].includes(node.type)
      ) {
        regions.atomic.push(node);
      } else {
        regions.standard.push(node);
      }

      // Recursively analyze children
      if (node.children) {
        for (const child of node.children) {
          analyzeNode(child, depth + 1);
        }
      }
    };

    for (const node of nodes) {
      analyzeNode(node);
    }

    return regions;
  }

  /**
   * Calculate spatial distance between two Figma nodes
   */
  calculateDistance(nodeA: FigmaNode, nodeB: FigmaNode): number {
    if (!nodeA.absoluteBoundingBox || !nodeB.absoluteBoundingBox) {
      return Infinity;
    }

    const posA = this.figmaToSpatial(nodeA.absoluteBoundingBox).position;
    const posB = this.figmaToSpatial(nodeB.absoluteBoundingBox).position;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Group nearby nodes for component detection
   */
  groupNearbyNodes(nodes: FigmaNode[], maxDistance: number = 50): FigmaNode[][] {
    const groups: FigmaNode[][] = [];
    const processed = new Set<string>();

    for (const node of nodes) {
      if (processed.has(node.id)) continue;

      const group: FigmaNode[] = [node];
      processed.add(node.id);

      // Find nearby nodes
      for (const otherNode of nodes) {
        if (processed.has(otherNode.id)) continue;

        const distance = this.calculateDistance(node, otherNode);
        if (distance <= maxDistance) {
          group.push(otherNode);
          processed.add(otherNode.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Create viewport regions for spatial navigation
   * Divides content into regions that work well for cinematic transitions
   */
  createViewportRegions(
    rootNode: FigmaNode, 
    targetRegions: number = 6
  ): Array<{
    id: string;
    name: string;
    bounds: FigmaBoundingBox;
    spatialBounds: { position: WorldPosition; width: number; height: number };
    nodes: FigmaNode[];
  }> {
    const contentBounds = this.calculateContentBounds(rootNode);
    if (!contentBounds) return [];

    // Collect all meaningful nodes
    const meaningfulNodes: FigmaNode[] = [];
    const traverse = (node: FigmaNode) => {
      if (
        node.visible !== false && 
        node.absoluteBoundingBox &&
        ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(node.type)
      ) {
        meaningfulNodes.push(node);
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(rootNode);

    // Sort nodes by size (largest first)
    meaningfulNodes.sort((a, b) => {
      const aArea = (a.absoluteBoundingBox?.width || 0) * (a.absoluteBoundingBox?.height || 0);
      const bArea = (b.absoluteBoundingBox?.width || 0) * (b.absoluteBoundingBox?.height || 0);
      return bArea - aArea;
    });

    // Create regions around the largest nodes
    const regions = [];
    const usedNodes = new Set<string>();

    for (let i = 0; i < Math.min(targetRegions, meaningfulNodes.length); i++) {
      const centerNode = meaningfulNodes[i];
      if (usedNodes.has(centerNode.id)) continue;

      const regionNodes: FigmaNode[] = [centerNode];
      usedNodes.add(centerNode.id);

      // Find nearby nodes to include in this region
      for (const node of meaningfulNodes) {
        if (usedNodes.has(node.id)) continue;

        const distance = this.calculateDistance(centerNode, node);
        if (distance < 200) { // Within 200 spatial units
          regionNodes.push(node);
          usedNodes.add(node.id);
        }
      }

      // Calculate region bounds
      const regionBounds = this.calculateContentBounds({ 
        ...centerNode, 
        children: regionNodes 
      } as FigmaNode);

      if (regionBounds) {
        const spatialBounds = this.figmaToSpatial(regionBounds);
        
        regions.push({
          id: `region_${i}`,
          name: centerNode.name || `Region ${i + 1}`,
          bounds: regionBounds,
          spatialBounds,
          nodes: regionNodes
        });
      }
    }

    return regions;
  }

  /**
   * Get current spatial mapping configuration
   */
  getMapping(): SpatialMapping {
    return { ...this.mapping };
  }

  /**
   * Update spatial mapping configuration
   */
  updateMapping(mapping: Partial<SpatialMapping>): void {
    this.mapping = { ...this.mapping, ...mapping };
    
    if (mapping.scale) this.config.scale = mapping.scale;
    if (mapping.origin) this.config.origin = mapping.origin;
    if (mapping.preserveAspectRatio !== undefined) {
      this.config.preserveAspectRatio = mapping.preserveAspectRatio;
    }
  }
}