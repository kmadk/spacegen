/**
 * High-Performance Figma API Client
 * Optimized for design-to-backend generation workflows
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  FigmaFileResponse,
  FigmaFetchOptions,
  FigmaNode,
  FigmaPerformanceMetrics
} from '../types/figma-types';
import { FigmaAPIError, FigmaRateLimitError } from '../types/figma-types';
import { FigmaCache } from '../cache/figma-cache';
import { DesignRelevanceFilter } from '../filters/design-relevance';

export interface FigmaClientConfig {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheOptions?: {
    ttl?: number;
    maxSize?: number;
  };
  enableMetrics?: boolean;
  rateLimitBuffer?: number; // Buffer time in ms before rate limit
}

export class OptimizedFigmaClient {
  private client: AxiosInstance;
  private cache: FigmaCache;
  private metrics: FigmaPerformanceMetrics;
  private rateLimitReset?: number;
  private rateLimitRemaining?: number;

  constructor(private config: FigmaClientConfig) {
    // Validate required config
    if (!config.accessToken) {
      throw new Error('Figma access token is required');
    }

    // Validate token format (skip validation in test environment)
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (!isTestEnv && (!config.accessToken.startsWith('figd_') || config.accessToken.length < 20)) {
      throw new Error('Invalid Figma access token format. Expected format: figd_...');
    }

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.figma.com/v1',
      timeout: config.timeout || 60000, // Increased to 60 seconds for AI operations
      headers: {
        'X-Figma-Token': config.accessToken,
        'Content-Type': 'application/json',
        'User-Agent': 'FIR-Backend-Generator/1.0'
      }
    });

    // Initialize cache
    this.cache = new FigmaCache(config.cacheOptions);

    // Initialize metrics
    this.metrics = {
      apiCallDuration: 0,
      processingDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      nodesFiltered: 0,
      nodesProcessed: 0
    };

    // Setup request/response interceptors
    this.setupInterceptors();
  }

  /**
   * Fetch and optimize Figma file data for backend generation
   */
  async getFileForBackendGeneration(
    fileId: string,
    options: FigmaFetchOptions = {}
  ): Promise<{
    data: FigmaFileResponse;
    filteredNodes: FigmaNode[];
    patterns: any[];
    metrics: FigmaPerformanceMetrics;
  }> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedData = await this.cache.get(fileId, options.version);
      if (cachedData && !this.shouldRefetch(cachedData, options)) {
        return this.processAndAnalyze(cachedData, options, true);
      }

      // Fetch from API with optimizations
      const response = await this.fetchFileOptimized(fileId, options);
      
      // Cache the result
      if (this.config.enableCache !== false) {
        await this.cache.set(fileId, response, response.version);
      }

      return this.processAndAnalyze(response, options, false);

    } catch (error) {
      this.handleApiError(error);
      throw error;
    } finally {
      this.metrics.apiCallDuration = Date.now() - startTime;
    }
  }

  /**
   * Fetch specific node with caching
   */
  async getNode(
    fileId: string,
    nodeId: string,
    options: FigmaFetchOptions = {}
  ): Promise<FigmaNode | null> {
    // Try cache first
    const cached = await this.cache.getCachedNodeSubtree(fileId, nodeId, options.version);
    if (cached) {
      return cached;
    }

    // Fetch full file and extract node
    const fileData = await this.getFileForBackendGeneration(fileId, options);
    const node = this.findNodeById(fileData.data.document, nodeId);
    
    if (node) {
      // Cache the node subtree
      await this.cache.cacheNodeSubtree(fileId, nodeId, node, options.version);
    }

    return node;
  }

  /**
   * Batch fetch multiple files efficiently
   */
  async batchGetFiles(
    fileIds: string[],
    options: FigmaFetchOptions = {}
  ): Promise<Map<string, FigmaFileResponse>> {
    const results = new Map<string, FigmaFileResponse>();
    const uncachedFiles: string[] = [];

    // Check cache for each file
    for (const fileId of fileIds) {
      const cached = await this.cache.get(fileId, options.version);
      if (cached && !this.shouldRefetch(cached, options)) {
        results.set(fileId, cached);
      } else {
        uncachedFiles.push(fileId);
      }
    }

    // Fetch uncached files with rate limiting
    const batchSize = 3; // Conservative batch size for API limits
    for (let i = 0; i < uncachedFiles.length; i += batchSize) {
      const batch = uncachedFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (fileId) => {
        try {
          await this.checkRateLimit();
          const response = await this.fetchFileOptimized(fileId, options);
          
          if (this.config.enableCache !== false) {
            await this.cache.set(fileId, response, response.version);
          }
          
          results.set(fileId, response);
        } catch (error) {
          console.warn(`Failed to fetch file ${fileId}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < uncachedFiles.length) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Get file with incremental updates
   */
  async getFileIncremental(
    fileId: string,
    lastVersion?: string,
    options: FigmaFetchOptions = {}
  ): Promise<{
    data: FigmaFileResponse;
    isIncremental: boolean;
    changedNodes: FigmaNode[];
  }> {
    const result = await this.getFileForBackendGeneration(fileId, {
      ...options,
      version: lastVersion
    });

    // Future enhancement: implement proper incremental diffing
    // For now, return full data with isIncremental flag
    return {
      data: result.data,
      isIncremental: false,
      changedNodes: result.filteredNodes
    };
  }

  /**
   * Setup request/response interceptors for optimization
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
          throw new FigmaRateLimitError(retryAfter * 1000);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Optimized file fetching with smart query parameters
   */
  private async fetchFileOptimized(
    fileId: string,
    options: FigmaFetchOptions
  ): Promise<FigmaFileResponse> {
    const params: Record<string, any> = {
      // Only fetch what we need
      geometry: 'paths', // Minimal geometry data
      plugin_data: '', // Skip plugin data
      branch_data: false, // Skip branch data
      
      // Version control
      ...(options.version && { version: options.version })
    };

    const response = await this.client.get(`/files/${fileId}`, { params });
    
    if (!response.data) {
      throw new FigmaAPIError('Empty response from Figma API');
    }

    return response.data;
  }

  /**
   * Process and analyze fetched data
   */
  private processAndAnalyze(
    data: FigmaFileResponse,
    options: FigmaFetchOptions,
    fromCache: boolean
  ): {
    data: FigmaFileResponse;
    filteredNodes: FigmaNode[];
    patterns: any[];
    metrics: FigmaPerformanceMetrics;
  } {
    const processingStart = Date.now();

    // Extract all nodes from document
    const allNodes = this.extractAllNodes(data.document);
    this.metrics.nodesProcessed = allNodes.length;

    // Apply intelligent filtering
    const filteredNodes = DesignRelevanceFilter.filterForBackendGeneration(allNodes, options);
    this.metrics.nodesFiltered = filteredNodes.length;

    // Analyze component patterns
    const patterns = DesignRelevanceFilter.analyzeComponentPatterns(filteredNodes);

    // Update cache metrics
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    this.metrics.processingDuration = Date.now() - processingStart;

    return {
      data,
      filteredNodes,
      patterns,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Extract all nodes recursively
   */
  private extractAllNodes(node: any): FigmaNode[] {
    const nodes: FigmaNode[] = [node];
    
    if (node.children) {
      for (const child of node.children) {
        nodes.push(...this.extractAllNodes(child));
      }
    }
    
    return nodes;
  }

  /**
   * Find node by ID in document tree
   */
  private findNodeById(node: any, targetId: string): FigmaNode | null {
    if (node.id === targetId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, targetId);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Check if we should refetch cached data
   */
  private shouldRefetch(cachedData: FigmaFileResponse, options: FigmaFetchOptions): boolean {
    // Force refresh if version specified and doesn't match
    if (options.version && cachedData.version !== options.version) {
      return true;
    }

    // Check cache age (implement based on requirements)
    return false;
  }

  /**
   * Rate limit management
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitReset && this.rateLimitRemaining !== undefined) {
      const now = Date.now();
      const resetTime = this.rateLimitReset * 1000;
      
      if (this.rateLimitRemaining <= 1 && resetTime > now) {
        const waitTime = resetTime - now + (this.config.rateLimitBuffer || 1000);
        console.log(`Rate limit approaching, waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const remaining = response.headers['x-ratelimit-remaining'];
    const reset = response.headers['x-ratelimit-reset'];
    
    if (remaining !== undefined) {
      this.rateLimitRemaining = parseInt(remaining);
    }
    if (reset !== undefined) {
      this.rateLimitReset = parseInt(reset);
    }
  }

  /**
   * Handle API errors with context
   */
  private handleApiError(error: any): void {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message;
      
      if (status === 401) {
        throw new FigmaAPIError('Invalid Figma access token', status);
      } else if (status === 403) {
        throw new FigmaAPIError('Access denied - check file permissions', status);
      } else if (status === 404) {
        throw new FigmaAPIError('File not found', status);
      } else {
        throw new FigmaAPIError(`Figma API error: ${message}`, status);
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new FigmaAPIError('Network error - check internet connection');
    } else {
      throw new FigmaAPIError(error.message || 'Unknown error occurred');
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance metrics
   */
  getMetrics(): FigmaPerformanceMetrics {
    return {
      ...this.metrics,
      ...this.cache.getMetrics()
    };
  }

  /**
   * Clear cache
   */
  async clearCache(fileId?: string): Promise<number> {
    return await this.cache.invalidate(fileId);
  }

  /**
   * Warm up cache with commonly used files
   */
  async warmupCache(fileIds: string[]): Promise<void> {
    await this.cache.warmup(fileIds, (fileId) => this.fetchFileOptimized(fileId, {}));
  }
}