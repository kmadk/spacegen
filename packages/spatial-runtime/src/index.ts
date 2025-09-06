/**
 * @fir/spatial-runtime - High-performance spatial rendering with semantic zoom
 * 
 * This package provides a hybrid rendering system that combines:
 * - deck.gl for high-performance WebGL canvas rendering
 * - HTML overlay system for forms and interactive elements
 * - Semantic zoom with data collapse at different levels
 * - Viewport culling and performance monitoring
 */

export { HTMLOverlaySystem } from './html-overlay.js';
export { 
  getSemanticLevel, 
  collapseDataForLevel, 
  applySemanticCollapse,
  DEFAULT_SEMANTIC_LEVELS 
} from './semantic-zoom.js';
export type {
  ViewState,
  WorldPosition,
  ScreenPosition,
  SpatialBounds,
  SpatialElement,
  SemanticLevel,
  SemanticLevelConfig,
  RenderingMetrics,
  SpatialEngineConfig
} from './types.js';
export { SpatialEngine } from './engine.js';