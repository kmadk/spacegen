/**
 * Core types for the spatial runtime system
 */

export interface ViewState {
  /** X coordinate of the viewport center */
  x: number;
  /** Y coordinate of the viewport center */
  y: number;
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Viewport width in pixels */
  width?: number;
  /** Viewport height in pixels */
  height?: number;
}

export interface SpatialBounds {
  /** Minimum X coordinate */
  minX: number;
  /** Minimum Y coordinate */
  minY: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Maximum Y coordinate */
  maxY: number;
}

export interface WorldPosition {
  /** X coordinate in world space */
  x: number;
  /** Y coordinate in world space */
  y: number;
}

export interface ScreenPosition {
  /** X coordinate in screen space */
  x: number;
  /** Y coordinate in screen space */
  y: number;
}

export type SemanticLevel = 'universal' | 'system' | 'standard' | 'atomic';

export interface SemanticLevelConfig {
  /** Minimum zoom level for this semantic level */
  min: number;
  /** Maximum zoom level for this semantic level */
  max: number;
}

export interface SpatialElement {
  /** Unique identifier */
  id: string;
  /** Element type */
  type: string;
  /** Position in world coordinates */
  position: WorldPosition;
  /** Element bounds */
  bounds: {
    width: number;
    height: number;
  };
  /** Semantic data for different zoom levels */
  semanticData?: Record<SemanticLevel, any>;
  /** HTML element for overlay rendering */
  htmlElement?: HTMLElement;
}

export interface RenderingMetrics {
  /** Frame time in milliseconds */
  frameTime: number;
  /** Number of elements rendered */
  renderedElements: number;
  /** Number of elements culled */
  culledElements: number;
  /** Total elements in dataset */
  totalElements: number;
  /** Current semantic level */
  semanticLevel: SemanticLevel;
}

export interface SpatialEngineConfig {
  /** Target frame time budget in milliseconds (default: 16.67ms for 60fps) */
  frameTimeBudget?: number;
  /** Semantic level zoom thresholds */
  semanticLevels?: Record<SemanticLevel, SemanticLevelConfig>;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Debug mode */
  debug?: boolean;
}