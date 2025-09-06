/**
 * Semantic zoom functionality - different zoom levels reveal different data
 */

import type { SemanticLevel, SemanticLevelConfig, SpatialElement } from './types.js';

/**
 * Default semantic level configuration
 */
export const DEFAULT_SEMANTIC_LEVELS: Record<SemanticLevel, SemanticLevelConfig> = {
  universal: { min: 0.01, max: 0.1 },   // 1% to 10% - High-level summaries
  system: { min: 0.1, max: 0.5 },       // 10% to 50% - System overviews
  standard: { min: 0.5, max: 2.0 },     // 50% to 200% - Normal detailed view
  atomic: { min: 2.0, max: 100 }        // 200%+ - Maximum detail + metadata
};

/**
 * Get the semantic level for a given zoom value
 */
export function getSemanticLevel(
  zoom: number, 
  levels: Record<SemanticLevel, SemanticLevelConfig> = DEFAULT_SEMANTIC_LEVELS
): SemanticLevel {
  const levelEntries = Object.entries(levels) as [SemanticLevel, SemanticLevelConfig][];
  
  for (const [level, config] of levelEntries) {
    if (zoom >= config.min && zoom <= config.max) {
      return level;
    }
  }
  
  // Fallback logic
  if (zoom < 0.01) return 'universal';
  if (zoom > 100) return 'atomic';
  return 'standard';
}

/**
 * Collapse data for a specific semantic level
 */
export function collapseDataForLevel<T extends Record<string, any>>(
  data: T[], 
  level: SemanticLevel
): T[] {
  switch (level) {
    case 'universal':
      // Show only a summary representation
      return data.length > 0 ? [{
        ...data[0],
        type: 'summary',
        count: data.length,
        representative: data[0]
      } as T] : [];
      
    case 'system':
      // Show aggregated/grouped data
      return aggregateByCategory(data);
      
    case 'standard':
      // Show normal data
      return data;
      
    case 'atomic':
      // Show data with additional metadata
      return data.map(item => ({
        ...item,
        metadata: generateMetadata(item),
        debugInfo: generateDebugInfo(item)
      }));
      
    default:
      return data;
  }
}

/**
 * Aggregate data by category for system level view
 */
function aggregateByCategory<T extends Record<string, any>>(data: T[]): T[] {
  const categories = new Map<string, T[]>();
  
  // Group by type or category field
  for (const item of data) {
    const category = item.type || item.category || 'uncategorized';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(item);
  }
  
  // Convert to aggregated items
  return Array.from(categories.entries()).map(([category, items]) => ({
    type: 'category_summary',
    category,
    count: items.length,
    representative: items[0],
    items: items.slice(0, 3) // Show first 3 items as preview
  } as unknown as T));
}

/**
 * Generate metadata for atomic level view
 */
function generateMetadata(item: Record<string, any>): Record<string, any> {
  return {
    id: item.id,
    type: item.type,
    createdAt: new Date().toISOString(),
    properties: Object.keys(item).length,
    size: JSON.stringify(item).length
  };
}

/**
 * Generate debug information for atomic level view
 */
function generateDebugInfo(item: Record<string, any>): Record<string, any> {
  return {
    memoryUsage: JSON.stringify(item).length,
    renderTime: Math.random() * 5, // Simulated render time
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Apply semantic collapse to spatial elements
 */
export function applySemanticCollapse(
  elements: SpatialElement[], 
  level: SemanticLevel
): SpatialElement[] {
  // First, collapse the data based on semantic level
  const collapsedData = collapseDataForLevel(elements, level);
  
  // Then adjust visual representation based on level
  return collapsedData.map(element => ({
    ...element,
    // Store the current semantic level for rendering
    currentSemanticLevel: level,
    // Apply level-specific rendering hints
    renderingHints: getSemanticRenderingHints(level)
  }));
}

/**
 * Get rendering hints for each semantic level
 */
function getSemanticRenderingHints(level: SemanticLevel): Record<string, any> {
  switch (level) {
    case 'universal':
      return {
        showLabels: false,
        showDetails: false,
        useSimplifiedShape: true,
        opacity: 0.7
      };
      
    case 'system':
      return {
        showLabels: true,
        showDetails: false,
        useSimplifiedShape: true,
        opacity: 0.8
      };
      
    case 'standard':
      return {
        showLabels: true,
        showDetails: true,
        useSimplifiedShape: false,
        opacity: 1.0
      };
      
    case 'atomic':
      return {
        showLabels: true,
        showDetails: true,
        showMetadata: true,
        showDebugInfo: true,
        useSimplifiedShape: false,
        opacity: 1.0
      };
      
    default:
      return {};
  }
}