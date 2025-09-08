/**
 * Core types shared across FIR packages
 * These are duplicated to avoid cross-package dependencies
 */

// Spatial element types
export interface SpatialBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  bounds: SpatialBounds;
  semanticData?: {
    universal?: any;
    system?: any;
    standard?: any;
    atomic?: any;
  };
  metadata?: Record<string, any>;
}

export enum ElementType {
  TEXT = 'text',
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  SHAPE = 'shape',
  CONTAINER = 'container',
  COMPONENT = 'component',
  GROUP = 'group',
  UNKNOWN = 'unknown'
}