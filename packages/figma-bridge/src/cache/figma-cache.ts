/**
 * High-Performance Figma Cache System
 * Optimized for design-to-backend workflows
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import type { 
  FigmaCacheEntry, 
  FigmaCacheOptions,
  FigmaFileResponse,
  FigmaPerformanceMetrics 
} from '../types/figma-types';

export class FigmaCache {
  private cache: LRUCache<string, FigmaCacheEntry>;
  private metrics: FigmaPerformanceMetrics;

  constructor(options: FigmaCacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 100,
      ttl: options.ttl || 1000 * 60 * 30, // 30 minutes default
      updateAgeOnGet: true,
      allowStale: true
    });

    this.metrics = {
      apiCallDuration: 0,
      processingDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      nodesFiltered: 0,
      nodesProcessed: 0
    };
  }

  /**
   * Get cached Figma file data
   */
  async get(fileId: string, version?: string): Promise<FigmaFileResponse | null> {
    const key = this.generateCacheKey(fileId, version);
    const entry = this.cache.get(key);

    if (entry) {
      // Validate version if provided
      if (version && entry.version !== version) {
        this.cache.delete(key);
        this.metrics.cacheMisses++;
        return null;
      }

      this.metrics.cacheHits++;
      return entry.data as FigmaFileResponse;
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Cache Figma file data with smart versioning
   */
  async set(
    fileId: string, 
    data: FigmaFileResponse, 
    version?: string,
    etag?: string
  ): Promise<void> {
    const key = this.generateCacheKey(fileId, version);
    const entry: FigmaCacheEntry = {
      data,
      timestamp: Date.now(),
      version: version || data.version,
      etag
    };

    this.cache.set(key, entry);

    // Also cache without version for quick lookups
    if (version) {
      const versionlessKey = this.generateCacheKey(fileId);
      this.cache.set(versionlessKey, entry);
    }
  }

  /**
   * Check if cached data is still valid
   */
  async isValid(fileId: string, currentVersion?: string): Promise<boolean> {
    const entry = this.cache.get(this.generateCacheKey(fileId));
    if (!entry) return false;

    // Check version match
    if (currentVersion && entry.version !== currentVersion) {
      return false;
    }

    // Entry exists and version matches (or no version check)
    return true;
  }

  /**
   * Get cached data with fallback and validation
   */
  async getWithFallback<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    options: {
      version?: string;
      maxAge?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    if (options.skipCache) {
      return await fallbackFn();
    }

    // Try cache first
    const cached = await this.get(key, options.version);
    if (cached && this.isCacheEntryValid(cached, options.maxAge)) {
      this.metrics.cacheHits++;
      return cached as T;
    }

    // Cache miss - fetch fresh data
    this.metrics.cacheMisses++;
    const fresh = await fallbackFn();
    
    // Cache the result
    if (fresh && typeof fresh === 'object') {
      await this.set(key, fresh as any, options.version);
    }

    return fresh;
  }

  /**
   * Invalidate cache for specific file or pattern
   */
  async invalidate(fileId?: string, pattern?: RegExp): Promise<number> {
    let deletedCount = 0;

    if (fileId) {
      // Delete specific file entries
      const keys = Array.from(this.cache.keys()).filter(key => 
        key.includes(fileId)
      );
      
      for (const key of keys) {
        this.cache.delete(key);
        deletedCount++;
      }
    } else if (pattern) {
      // Delete entries matching pattern
      const keys = Array.from(this.cache.keys()).filter(key => 
        pattern.test(key)
      );
      
      for (const key of keys) {
        this.cache.delete(key);
        deletedCount++;
      }
    } else {
      // Clear all
      deletedCount = this.cache.size;
      this.cache.clear();
    }

    return deletedCount;
  }

  /**
   * Get cache statistics and performance metrics
   */
  getMetrics(): FigmaPerformanceMetrics & {
    cacheSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;

    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      hitRate,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Cache warming - preload commonly accessed files
   */
  async warmup(
    fileIds: string[], 
    fetchFn: (fileId: string) => Promise<FigmaFileResponse>
  ): Promise<{
    warmed: number;
    failed: number;
    errors: Error[];
  }> {
    const results = { warmed: 0, failed: 0, errors: [] as Error[] };

    const warmPromises = fileIds.map(async (fileId) => {
      try {
        // Skip if already cached and recent
        const cached = await this.get(fileId);
        if (cached && this.isCacheEntryValid(cached, 1000 * 60 * 10)) {
          return;
        }

        const data = await fetchFn(fileId);
        await this.set(fileId, data);
        results.warmed++;
      } catch (error) {
        results.failed++;
        results.errors.push(error as Error);
      }
    });

    await Promise.allSettled(warmPromises);
    return results;
  }

  /**
   * Smart cache key generation with content hashing
   */
  private generateCacheKey(fileId: string, version?: string, suffix?: string): string {
    const parts = [fileId];
    if (version) parts.push(version);
    if (suffix) parts.push(suffix);
    
    const baseKey = parts.join(':');
    return createHash('md5').update(baseKey).digest('hex');
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheEntryValid(entry: any, maxAge?: number): boolean {
    if (!maxAge) return true;
    
    const age = Date.now() - (entry.timestamp || 0);
    return age < maxAge;
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation
      totalSize += key.length * 2; // Char size
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return totalSize;
  }

  /**
   * Advanced cache patterns for specific use cases
   */

  /**
   * Cache node subtrees separately for incremental updates
   */
  async cacheNodeSubtree(
    fileId: string, 
    nodeId: string, 
    subtree: any,
    version?: string
  ): Promise<void> {
    const key = this.generateCacheKey(fileId, version, `node:${nodeId}`);
    const entry: FigmaCacheEntry = {
      data: subtree,
      timestamp: Date.now(),
      version: version || 'unknown'
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Get cached node subtree
   */
  async getCachedNodeSubtree(
    fileId: string,
    nodeId: string,
    version?: string
  ): Promise<any | null> {
    const key = this.generateCacheKey(fileId, version, `node:${nodeId}`);
    const entry = this.cache.get(key);
    
    if (entry && (!version || entry.version === version)) {
      this.metrics.cacheHits++;
      return entry.data;
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Cache processed analysis results
   */
  async cacheAnalysisResult(
    fileId: string,
    analysisType: string,
    result: any,
    version?: string
  ): Promise<void> {
    const key = this.generateCacheKey(fileId, version, `analysis:${analysisType}`);
    const entry: FigmaCacheEntry = {
      data: result,
      timestamp: Date.now(),
      version: version || 'unknown'
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Get cached analysis result
   */
  async getCachedAnalysisResult(
    fileId: string,
    analysisType: string,
    version?: string
  ): Promise<any | null> {
    const key = this.generateCacheKey(fileId, version, `analysis:${analysisType}`);
    const entry = this.cache.get(key);
    
    if (entry && (!version || entry.version === version)) {
      this.metrics.cacheHits++;
      return entry.data;
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Batch cache operations for better performance
   */
  async batchSet(entries: Array<{
    fileId: string;
    data: any;
    version?: string;
    suffix?: string;
  }>): Promise<void> {
    const setPromises = entries.map(entry => {
      const key = this.generateCacheKey(entry.fileId, entry.version, entry.suffix);
      const cacheEntry: FigmaCacheEntry = {
        data: entry.data,
        timestamp: Date.now(),
        version: entry.version || 'unknown'
      };
      
      this.cache.set(key, cacheEntry);
      return Promise.resolve();
    });

    await Promise.all(setPromises);
  }

  /**
   * Cache compression for large datasets
   */
  private shouldCompress(data: any): boolean {
    const jsonSize = JSON.stringify(data).length;
    return jsonSize > 50 * 1024; // 50KB threshold
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      apiCallDuration: 0,
      processingDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      nodesFiltered: 0,
      nodesProcessed: 0
    };
  }
}