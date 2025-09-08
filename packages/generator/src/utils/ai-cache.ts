/**
 * AI Response Caching System
 * Reduces API costs by caching similar design analysis results
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface CacheEntry {
  key: string;
  response: any;
  timestamp: number;
  designHash: string;
  tokensSaved: number;
}

export class AICache {
  private cacheDir: string;
  private maxAge: number; // milliseconds
  private enabled: boolean;

  constructor(options: {
    cacheDir?: string;
    maxAgeHours?: number;
    enabled?: boolean;
  } = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache', 'ai-analysis');
    this.maxAge = (options.maxAgeHours || 24) * 60 * 60 * 1000; // 24 hours default
    this.enabled = options.enabled !== false;
  }

  /**
   * Generate cache key from design data characteristics
   */
  private generateCacheKey(designData: any): string {
    // Hash based on structural patterns, not exact content
    const fingerprint = {
      formCount: designData.forms?.length || 0,
      fieldTypes: designData.forms?.flatMap((f: any) => 
        f.fields?.map((field: any) => field.type) || []
      ).sort(),
      listCount: designData.lists?.length || 0,
      buttonTypes: designData.buttons?.map((b: any) => b.type).sort(),
      hasAuth: designData.hasAuthentication,
      hasPayments: designData.hasPayments,
      isSpatial: designData.hasSpatialData
    };

    return createHash('md5').update(JSON.stringify(fingerprint)).digest('hex');
  }

  /**
   * Check if we have a cached result for similar design patterns
   */
  async get(designData: any, analysisType: string): Promise<any | null> {
    if (!this.enabled) return null;

    const cacheKey = `${this.generateCacheKey(designData)}_${analysisType}`;
    const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheData = await fs.readFile(cachePath, 'utf8');
      const entry: CacheEntry = JSON.parse(cacheData);

      // Check if cache is still valid
      if (Date.now() - entry.timestamp > this.maxAge) {
        await fs.unlink(cachePath);
        return null;
      }

      console.log(`💰 Cache hit! Saved ~${entry.tokensSaved} tokens for ${analysisType}`);
      return entry.response;
    } catch {
      return null;
    }
  }

  /**
   * Store analysis result in cache
   */
  async set(designData: any, analysisType: string, response: any, estimatedTokens: number): Promise<void> {
    if (!this.enabled) return;

    const cacheKey = `${this.generateCacheKey(designData)}_${analysisType}`;
    const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

    const entry: CacheEntry = {
      key: cacheKey,
      response,
      timestamp: Date.now(),
      designHash: this.generateCacheKey(designData),
      tokensSaved: estimatedTokens
    };

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.warn('Failed to write cache:', error);
    }
  }

  /**
   * Clear old cache entries
   */
  async cleanup(): Promise<number> {
    if (!this.enabled) return 0;

    let cleaned = 0;
    try {
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        
        if (Date.now() - stat.mtime.getTime() > this.maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch {
      // Cache dir doesn't exist or other error
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ entries: number; totalSize: number; tokensSaved: number }> {
    if (!this.enabled) return { entries: 0, totalSize: 0, tokensSaved: 0 };

    let entries = 0;
    let totalSize = 0;
    let tokensSaved = 0;

    try {
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        entries++;
        totalSize += stat.size;
        tokensSaved += data.tokensSaved || 0;
      }
    } catch {
      // Ignore errors
    }

    return { entries, totalSize, tokensSaved };
  }
}