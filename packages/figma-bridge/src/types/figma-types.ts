/**
 * Optimized Figma API Types - Focus on performance-critical data
 */

// Core Figma API Response Types
export interface FigmaFileResponse {
  document: FigmaDocumentNode;
  componentSets: Record<string, FigmaComponentSet>;
  components: Record<string, FigmaComponent>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
}

export interface FigmaDocumentNode {
  id: string;
  name: string;
  type: 'DOCUMENT';
  children: FigmaPageNode[];
}

export interface FigmaPageNode {
  id: string;
  name: string;
  type: 'PAGE';
  children: FigmaFrameNode[];
  backgroundColor?: FigmaColor;
}

export interface FigmaFrameNode {
  id: string;
  name: string;
  type: 'FRAME' | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE';
  children?: FigmaNode[];
  backgroundColor?: FigmaColor;
  fills?: FigmaFill[];
  absoluteBoundingBox: FigmaBoundingBox;
  constraints?: FigmaConstraints;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export interface FigmaTextNode {
  id: string;
  name: string;
  type: 'TEXT';
  characters: string;
  style?: FigmaTextStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<number, FigmaTextStyle>;
  absoluteBoundingBox: FigmaBoundingBox;
  fills?: FigmaFill[];
}

export interface FigmaRectangleNode {
  id: string;
  name: string;
  type: 'RECTANGLE';
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  cornerRadius?: number;
  absoluteBoundingBox: FigmaBoundingBox;
}

export type FigmaNode = FigmaFrameNode | FigmaTextNode | FigmaRectangleNode | FigmaGeneralNode;

export interface FigmaGeneralNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: FigmaBoundingBox;
  [key: string]: any;
}

// Supporting Types
export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  color?: FigmaColor;
  opacity?: number;
}

export interface FigmaStroke {
  type: 'SOLID';
  color: FigmaColor;
  opacity?: number;
}

export interface FigmaTextStyle {
  fontFamily: string;
  fontPostScriptName: string;
  fontWeight: number;
  fontSize: number;
  lineHeightPx: number;
  letterSpacing: number;
  fills?: FigmaFill[];
}

export interface FigmaConstraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  documentationLinks: Array<{ uri: string }>;
}

export interface FigmaComponentSet {
  key: string;
  name: string;
  description: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

// Performance Optimization Types
export interface FigmaFetchOptions {
  /** Only fetch specific node types for performance */
  nodeTypes?: FigmaNodeType[];
  /** Include only nodes with meaningful content */
  filterEmpty?: boolean;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Skip nodes smaller than this threshold */
  minSize?: { width: number; height: number };
  /** Include version for incremental updates */
  version?: string;
  /** Specific page IDs to fetch */
  pageIds?: string[];
}

export type FigmaNodeType = 
  | 'DOCUMENT' | 'PAGE' | 'FRAME' | 'GROUP' 
  | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE'
  | 'TEXT' | 'RECTANGLE' | 'LINE' | 'ELLIPSE'
  | 'POLYGON' | 'STAR' | 'VECTOR'
  | 'BOOLEAN_OPERATION' | 'SLICE';

export interface FigmaPerformanceMetrics {
  apiCallDuration: number;
  processingDuration: number;
  cacheHits: number;
  cacheMisses: number;
  nodesFiltered: number;
  nodesProcessed: number;
}

// Cache Types
export interface FigmaCacheEntry {
  data: any;
  timestamp: number;
  version: string;
  etag?: string;
}

export interface FigmaCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache entries
  version?: string; // File version for cache invalidation
}

// Error Types
export class FigmaAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public figmaErrorCode?: string
  ) {
    super(message);
    this.name = 'FigmaAPIError';
  }
}

export class FigmaRateLimitError extends FigmaAPIError {
  constructor(public retryAfter?: number) {
    super('Figma API rate limit exceeded');
    this.name = 'FigmaRateLimitError';
  }
}