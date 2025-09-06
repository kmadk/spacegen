/**
 * Types for Figma Bridge - connecting Figma designs to spatial runtime
 */

import type { SpatialElement, WorldPosition } from '@fir/spatial-runtime';

// Figma API Types (simplified subset)
export interface FigmaFile {
  document: FigmaNode;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
  name: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  
  // Layout properties
  absoluteBoundingBox?: FigmaBoundingBox;
  absoluteRenderBounds?: FigmaBoundingBox;
  constraints?: FigmaConstraints;
  
  // Visual properties
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  opacity?: number;
  
  // Text properties (for TEXT nodes)
  characters?: string;
  style?: FigmaTextStyle;
  characterStyleOverrides?: FigmaTextStyleOverride[];
  
  // Component properties
  componentId?: string;
  componentSetId?: string;
  
  // Auto-layout properties
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  
  // Effects
  effects?: FigmaEffect[];
  
  // Export settings
  exportSettings?: FigmaExportSetting[];
}

export type FigmaNodeType = 
  | 'DOCUMENT' 
  | 'CANVAS' 
  | 'FRAME' 
  | 'GROUP'
  | 'RECTANGLE' 
  | 'TEXT' 
  | 'ELLIPSE' 
  | 'POLYGON' 
  | 'STAR' 
  | 'VECTOR' 
  | 'LINE'
  | 'INSTANCE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'SLICE';

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaConstraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientStops?: FigmaGradientStop[];
  imageRef?: string;
}

export interface FigmaStroke {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaGradientStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaTextStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

export interface FigmaTextStyleOverride {
  start: number;
  end: number;
  style: Partial<FigmaTextStyle>;
}

export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface FigmaExportSetting {
  suffix: string;
  format: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  constraint: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT';
    value: number;
  };
}

export interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

// Bridge-specific types
export interface FigmaBridgeConfig {
  /** Figma personal access token */
  accessToken: string;
  /** Base URL for Figma API */
  apiBaseUrl?: string;
  /** Default spacing unit for spatial layout */
  spatialUnit?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface SpatialMapping {
  /** Scale factor from Figma pixels to spatial units */
  scale: number;
  /** Origin offset in spatial coordinates */
  origin: WorldPosition;
  /** Whether to preserve aspect ratios */
  preserveAspectRatio: boolean;
}

export interface DesignExtraction {
  /** Original Figma file information */
  file: {
    key: string;
    name: string;
    version: string;
  };
  /** Extracted spatial elements */
  elements: SpatialElement[];
  /** Spatial mapping configuration used */
  mapping: SpatialMapping;
  /** Asset references (images, icons, etc.) */
  assets: DesignAsset[];
  /** Component definitions for reusability */
  components: ComponentDefinition[];
}

export interface DesignAsset {
  /** Unique identifier */
  id: string;
  /** Asset type */
  type: 'image' | 'icon' | 'vector';
  /** Original Figma node ID */
  figmaNodeId: string;
  /** Asset URL or data */
  source: string;
  /** Dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Format information */
  format: 'PNG' | 'SVG' | 'JPG';
}

export interface ComponentDefinition {
  /** Component identifier */
  id: string;
  /** Component name */
  name: string;
  /** Original Figma component/instance ID */
  figmaComponentId: string;
  /** Component properties/variants */
  properties: Record<string, any>;
  /** Spatial elements that make up this component */
  elements: SpatialElement[];
  /** Reusable component template */
  template: ComponentTemplate;
}

export interface ComponentTemplate {
  /** Template HTML structure */
  html: string;
  /** Template CSS styles */
  css: string;
  /** Interactive behavior definitions */
  interactions: ComponentInteraction[];
  /** Property bindings for dynamic content */
  bindings: PropertyBinding[];
}

export interface ComponentInteraction {
  /** Trigger event type */
  trigger: 'click' | 'hover' | 'focus' | 'input';
  /** Target element selector */
  target: string;
  /** Action to perform */
  action: {
    type: 'navigate' | 'toggle' | 'animate' | 'custom';
    params: Record<string, any>;
  };
}

export interface PropertyBinding {
  /** Property name */
  property: string;
  /** Target attribute or content */
  target: string;
  /** Data transformation function */
  transform?: string;
}

// Parser result types
export interface ParseResult {
  /** Successfully parsed elements */
  elements: SpatialElement[];
  /** Parsing warnings */
  warnings: ParseWarning[];
  /** Parsing errors */
  errors: ParseError[];
  /** Metadata about the parsing process */
  metadata: ParseMetadata;
}

export interface ParseWarning {
  message: string;
  nodeId: string;
  nodeName: string;
  code: string;
}

export interface ParseError {
  message: string;
  nodeId: string;
  nodeName: string;
  code: string;
  stack?: string;
}

export interface ParseMetadata {
  /** Total nodes processed */
  totalNodes: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Figma file version */
  fileVersion: string;
  /** Parser version */
  parserVersion: string;
}