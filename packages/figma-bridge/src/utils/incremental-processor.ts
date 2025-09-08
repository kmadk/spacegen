/**
 * Incremental Processing Utilities for Figma Updates
 * Detect and process only changed components for efficiency
 */

import type { FigmaFileResponse, FigmaNode } from '../types/figma-types';

export interface IncrementalChange {
  type: 'added' | 'modified' | 'removed';
  nodeId: string;
  nodeName: string;
  changeDescription: string;
}

export interface IncrementalAnalysis {
  hasChanges: boolean;
  changes: IncrementalChange[];
  changedNodes: FigmaNode[];
  addedNodes: FigmaNode[];
  modifiedNodes: FigmaNode[];
  removedNodeIds: string[];
  impactScore: number; // 0-1, how much the changes affect backend generation
}

export class IncrementalProcessor {
  
  /**
   * Compare two Figma file versions and detect changes
   */
  static analyzeChanges(
    previousVersion: FigmaFileResponse,
    currentVersion: FigmaFileResponse
  ): IncrementalAnalysis {
    const changes: IncrementalChange[] = [];
    const changedNodes: FigmaNode[] = [];
    const addedNodes: FigmaNode[] = [];
    const modifiedNodes: FigmaNode[] = [];
    const removedNodeIds: string[] = [];

    // Build node maps for comparison
    const prevNodes = this.buildNodeMap(previousVersion.document);
    const currNodes = this.buildNodeMap(currentVersion.document);

    // Detect additions
    for (const [nodeId, node] of currNodes) {
      if (!prevNodes.has(nodeId)) {
        addedNodes.push(node);
        changes.push({
          type: 'added',
          nodeId,
          nodeName: node.name,
          changeDescription: `New ${node.type} component added`
        });
      }
    }

    // Detect modifications
    for (const [nodeId, currNode] of currNodes) {
      const prevNode = prevNodes.get(nodeId);
      if (prevNode && this.hasNodeChanged(prevNode, currNode)) {
        modifiedNodes.push(currNode);
        changes.push({
          type: 'modified',
          nodeId,
          nodeName: currNode.name,
          changeDescription: this.describeChanges(prevNode, currNode)
        });
      }
    }

    // Detect removals
    for (const [nodeId, node] of prevNodes) {
      if (!currNodes.has(nodeId)) {
        removedNodeIds.push(nodeId);
        changes.push({
          type: 'removed',
          nodeId,
          nodeName: node.name,
          changeDescription: `${node.type} component removed`
        });
      }
    }

    // Combine all changed nodes
    changedNodes.push(...addedNodes, ...modifiedNodes);

    // Calculate impact score based on change types and relevance
    const impactScore = this.calculateImpactScore(changes, changedNodes);

    return {
      hasChanges: changes.length > 0,
      changes,
      changedNodes,
      addedNodes,
      modifiedNodes,
      removedNodeIds,
      impactScore
    };
  }

  /**
   * Determine if incremental processing is worth it
   */
  static shouldUseIncremental(analysis: IncrementalAnalysis): boolean {
    // Use incremental if:
    // 1. Changes are limited (< 30% of total)
    // 2. Impact score is moderate (not complete redesign)
    // 3. Changes are mostly modifications, not major additions/removals

    if (!analysis.hasChanges) return false;
    if (analysis.impactScore > 0.7) return false; // Too many significant changes

    const totalChanges = analysis.changes.length;
    const majorChanges = analysis.changes.filter(c => 
      c.type === 'added' || c.type === 'removed'
    ).length;

    // If more than 50% are major changes, do full processing
    return majorChanges / totalChanges < 0.5;
  }

  /**
   * Build a map of all nodes in the document tree
   */
  private static buildNodeMap(node: FigmaNode, map = new Map<string, FigmaNode>()): Map<string, FigmaNode> {
    map.set(node.id, node);
    
    if (node.children) {
      for (const child of node.children) {
        this.buildNodeMap(child, map);
      }
    }
    
    return map;
  }

  /**
   * Check if a node has meaningful changes
   */
  private static hasNodeChanged(prevNode: FigmaNode, currNode: FigmaNode): boolean {
    // Compare key properties that affect backend generation
    
    // Text content changes
    if (prevNode.type === 'TEXT' && currNode.type === 'TEXT') {
      const prevText = (prevNode as any).characters;
      const currText = (currNode as any).characters;
      if (prevText !== currText) return true;
    }

    // Name changes (important for field inference)
    if (prevNode.name !== currNode.name) return true;

    // Structure changes (children added/removed)
    const prevChildCount = prevNode.children?.length || 0;
    const currChildCount = currNode.children?.length || 0;
    if (prevChildCount !== currChildCount) return true;

    // Bounding box changes (significant layout changes)
    if (prevNode.absoluteBoundingBox && currNode.absoluteBoundingBox) {
      const prevBox = prevNode.absoluteBoundingBox;
      const currBox = currNode.absoluteBoundingBox;
      
      const sizeChangedSignificantly = 
        Math.abs(prevBox.width - currBox.width) > 10 ||
        Math.abs(prevBox.height - currBox.height) > 10;
      
      if (sizeChangedSignificantly) return true;
    }

    return false;
  }

  /**
   * Describe what changed in a node
   */
  private static describeChanges(prevNode: FigmaNode, currNode: FigmaNode): string {
    const changes: string[] = [];

    if (prevNode.name !== currNode.name) {
      changes.push(`renamed from "${prevNode.name}" to "${currNode.name}"`);
    }

    if (prevNode.type === 'TEXT' && currNode.type === 'TEXT') {
      const prevText = (prevNode as any).characters;
      const currText = (currNode as any).characters;
      if (prevText !== currText) {
        changes.push('text content modified');
      }
    }

    const prevChildCount = prevNode.children?.length || 0;
    const currChildCount = currNode.children?.length || 0;
    if (prevChildCount !== currChildCount) {
      changes.push(`children count changed from ${prevChildCount} to ${currChildCount}`);
    }

    if (prevNode.absoluteBoundingBox && currNode.absoluteBoundingBox) {
      const prevBox = prevNode.absoluteBoundingBox;
      const currBox = currNode.absoluteBoundingBox;
      
      if (Math.abs(prevBox.width - currBox.width) > 10 || Math.abs(prevBox.height - currBox.height) > 10) {
        changes.push('size changed significantly');
      }
    }

    return changes.length > 0 ? changes.join(', ') : 'minor changes';
  }

  /**
   * Calculate how much the changes impact backend generation
   */
  private static calculateImpactScore(changes: IncrementalChange[], changedNodes: FigmaNode[]): number {
    if (changes.length === 0) return 0;

    let impactPoints = 0;
    const maxImpact = changes.length * 10; // Normalize to 0-1

    for (const change of changes) {
      // Weight different change types
      switch (change.type) {
        case 'added':
          impactPoints += 8; // New components are high impact
          break;
        case 'removed':
          impactPoints += 6; // Removals matter but less than additions
          break;
        case 'modified':
          impactPoints += 3; // Modifications are usually lower impact
          break;
      }

      // Additional weight for backend-relevant nodes
      if (this.isBackendRelevant(change.changeDescription)) {
        impactPoints += 3;
      }
    }

    return Math.min(impactPoints / maxImpact, 1);
  }

  /**
   * Check if a change is relevant for backend generation
   */
  private static isBackendRelevant(description: string): boolean {
    const backendRelevantKeywords = [
      'component', 'text content', 'form', 'input', 'button',
      'card', 'list', 'table', 'data', 'field'
    ];

    return backendRelevantKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
  }

  /**
   * Generate incremental prompt for AI analysis
   */
  static generateIncrementalPrompt(analysis: IncrementalAnalysis): string {
    if (!analysis.hasChanges) {
      return "No changes detected in design.";
    }

    const changesSummary = analysis.changes.map(change => 
      `- ${change.type.toUpperCase()}: ${change.nodeName} (${change.changeDescription})`
    ).join('\n');

    return `
INCREMENTAL DESIGN CHANGES DETECTED:

${changesSummary}

IMPACT ASSESSMENT:
- Total changes: ${analysis.changes.length}
- Added nodes: ${analysis.addedNodes.length}
- Modified nodes: ${analysis.modifiedNodes.length}
- Removed nodes: ${analysis.removedNodeIds.length}
- Impact score: ${(analysis.impactScore * 100).toFixed(1)}%

Focus analysis on these specific changes rather than re-analyzing the entire design.
Update existing entities where applicable, and suggest new entities only for significant additions.
`;
  }
}