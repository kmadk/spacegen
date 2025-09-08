/**
 * FIR Figma Bridge - High-Performance Figma Integration
 * Optimized for design-to-backend generation workflows
 */

export { OptimizedFigmaClient } from './client/figma-client';
export { FigmaCache } from './cache/figma-cache';
export { DesignRelevanceFilter, type ComponentPattern, type ComponentField } from './filters/design-relevance';

export type {
  FigmaFileResponse,
  FigmaNode,
  FigmaFrameNode,
  FigmaTextNode,
  FigmaRectangleNode,
  FigmaDocumentNode,
  FigmaPageNode,
  FigmaBoundingBox,
  FigmaColor,
  FigmaFill,
  FigmaTextStyle,
  FigmaFetchOptions,
  FigmaNodeType,
  FigmaPerformanceMetrics,
  FigmaCacheEntry,
  FigmaCacheOptions,
  FigmaAPIError,
  FigmaRateLimitError
} from './types/figma-types';

export type { FigmaClientConfig } from './client/figma-client';

// Convenience factory function
export function createOptimizedFigmaClient(config: {
  accessToken: string;
  enableCache?: boolean;
  cacheSize?: number;
  timeout?: number;
}) {
  return new OptimizedFigmaClient({
    accessToken: config.accessToken,
    enableCache: config.enableCache ?? true,
    cacheOptions: {
      maxSize: config.cacheSize ?? 100,
      ttl: 1000 * 60 * 30 // 30 minutes
    },
    timeout: config.timeout ?? 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMetrics: true
  });
}