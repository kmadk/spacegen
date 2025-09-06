/**
 * @fir/figma-bridge - Bridge between Figma designs and spatial runtime elements
 * 
 * This package provides functionality to:
 * - Connect to Figma's REST API
 * - Parse Figma design nodes into spatial elements
 * - Map Figma coordinates to spatial world coordinates  
 * - Extract components and assets from designs
 * - Generate HTML/CSS from Figma designs
 */

export { FigmaBridge } from './figma-bridge.js';
export { FigmaClient, FigmaAPIError } from './figma-client.js';
export { SpatialMapper } from './spatial-mapper.js';
export { DesignParser } from './design-parser.js';

export type {
  // Main types
  FigmaBridgeConfig,
  DesignExtraction,
  SpatialMapping,
  ParseResult,
  
  // Figma API types
  FigmaFile,
  FigmaNode,
  FigmaNodeType,
  FigmaBoundingBox,
  FigmaFill,
  FigmaStroke,
  FigmaColor,
  FigmaTextStyle,
  FigmaEffect,
  FigmaStyle,
  
  // Component types
  ComponentDefinition,
  ComponentTemplate,
  ComponentInteraction,
  PropertyBinding,
  
  // Asset types
  DesignAsset,
  
  // Parser types
  ParseWarning,
  ParseError,
  ParseMetadata
} from './types.js';