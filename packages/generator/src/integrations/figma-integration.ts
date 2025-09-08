/**
 * Figma Integration for Backend Generator
 * Bridges optimized Figma data with AI backend generation
 */

import {
  createOptimizedFigmaClient,
  type OptimizedFigmaClient,
  type FigmaFetchOptions,
  DesignRelevanceFilter,
} from "@figma-backend/figma-bridge";
import { VisionAnalyzer } from "../analyzers/vision-analyzer.js";
import type {
  DesignData,
  DesignNode,
  DesignScreenshot,
  AIAnalysisConfig,
  CombinedAnalysis,
} from "../types.js";

export interface FigmaIntegrationConfig {
  figmaAccessToken: string;
  aiConfig: AIAnalysisConfig;
  cacheEnabled?: boolean;
  debug?: boolean;
}

export class FigmaIntegration {
  private figmaClient: OptimizedFigmaClient;
  private aiAnalyzer: VisionAnalyzer;
  private config: FigmaIntegrationConfig;

  constructor(config: FigmaIntegrationConfig) {
    this.config = config;

    // Initialize optimized Figma client
    this.figmaClient = createOptimizedFigmaClient({
      accessToken: config.figmaAccessToken,
      enableCache: config.cacheEnabled ?? true,
      cacheSize: 100,
      timeout: 30000,
    });

    // Initialize Figma-aware analyzer
    this.aiAnalyzer = new VisionAnalyzer(config.aiConfig);
  }

  /**
   * Generate backend from Figma file ID with full optimization pipeline
   */
  async generateFromFigmaFile(
    figmaFileId: string,
    options: {
      version?: string;
      pageIds?: string[];
      includeScreenshots?: boolean;
      screenshotUrls?: string[];
      fetchOptions?: FigmaFetchOptions;
    } = {},
  ): Promise<{
    designData: DesignData;
    analysis: CombinedAnalysis;
    performance: {
      totalTime: number;
      fetchTime: number;
      filterTime: number;
      analysisTime: number;
      tokensUsed: number;
      cacheHit: boolean;
    };
  }> {
    const startTime = Date.now();
    let fetchTime = 0;
    let filterTime = 0;
    let analysisTime = 0;

    try {
      if (this.config.debug) {
        console.log(`🎯 Generating backend from Figma file: ${figmaFileId}`);
      }

      // Step 1: Fetch optimized Figma data
      const fetchStart = Date.now();
      const figmaResult = await this.figmaClient.getFileForBackendGeneration(
        figmaFileId,
        {
          version: options.version,
          pageIds: options.pageIds,
          filterEmpty: true,
          minSize: { width: 20, height: 20 },
          maxDepth: 8,
          ...options.fetchOptions,
        },
      );
      fetchTime = Date.now() - fetchStart;

      if (this.config.debug) {
        console.log(
          `📊 Fetched ${figmaResult.filteredNodes.length} relevant nodes from ${figmaResult.data.document.children?.length || 0} pages`,
        );
      }

      // Step 2: Convert to standardized DesignData format
      const filterStart = Date.now();
      const designData = this.convertFigmaToDesignData(
        figmaResult.data,
        figmaResult.filteredNodes,
      );
      filterTime = Date.now() - filterStart;

      // Step 3: Prepare screenshots if provided
      const screenshots: DesignScreenshot[] = [];
      if (options.includeScreenshots && options.screenshotUrls) {
        for (let i = 0; i < options.screenshotUrls.length; i++) {
          screenshots.push({
            pageId: `page-${i}`,
            name: `Screenshot ${i + 1}`,
            imageUrl: options.screenshotUrls[i],
          });
        }
      }

      // Step 4: Run optimized AI analysis
      const analysisStart = Date.now();
      const analysis = await this.aiAnalyzer.analyzeFigmaDesign(
        designData,
        figmaResult.filteredNodes,
        figmaResult.patterns,
        screenshots.length > 0 ? screenshots : undefined,
      );
      analysisTime = Date.now() - analysisStart;

      const totalTime = Date.now() - startTime;

      if (this.config.debug) {
        console.log(
          `⚡ Performance: Total=${totalTime}ms (Fetch=${fetchTime}ms, Filter=${filterTime}ms, Analysis=${analysisTime}ms)`,
        );
        console.log(
          `🎯 Generated ${analysis.combinedEntities.length} entities with ${analysis.confidenceScore.toFixed(2)} confidence`,
        );
      }

      // Estimate tokens used (rough calculation)
      const estimatedTokens = this.estimateTokenUsage(
        figmaResult.filteredNodes,
        screenshots,
      );

      return {
        designData,
        analysis,
        performance: {
          totalTime,
          fetchTime,
          filterTime,
          analysisTime,
          tokensUsed: estimatedTokens,
          cacheHit: figmaResult.metrics.cacheHits > 0,
        },
      };
    } catch (error) {
      if (this.config.debug) {
        console.error("❌ Figma integration failed:", error);
      }
      throw new Error(
        `Figma integration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get cached analysis if available
   */
  async getCachedAnalysis(
    figmaFileId: string,
    version?: string,
  ): Promise<CombinedAnalysis | null> {
    try {
      // This would integrate with the Figma cache to store analysis results
      // For now, we'll just check if the file is cached
      const metrics = this.figmaClient.getMetrics();
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert Figma API response to standardized DesignData
   */
  private convertFigmaToDesignData(
    figmaFile: any,
    filteredNodes: any[],
  ): DesignData {
    // Convert Figma nodes to standardized format
    const convertNode = (figmaNode: any): DesignNode => {
      return {
        id: figmaNode.id,
        name: figmaNode.name,
        type: figmaNode.type,
        characters: figmaNode.characters,
        fills: figmaNode.fills,
        children: figmaNode.children?.map(convertNode),
        absoluteBoundingBox: figmaNode.absoluteBoundingBox
          ? {
              x: figmaNode.absoluteBoundingBox.x,
              y: figmaNode.absoluteBoundingBox.y,
              width: figmaNode.absoluteBoundingBox.width,
              height: figmaNode.absoluteBoundingBox.height,
            }
          : undefined,
        // Include other Figma-specific properties
        ...figmaNode,
      };
    };

    return {
      source: "figma",
      fileId: figmaFile.name || "unknown",
      fileName: figmaFile.name || "Figma Design",
      nodes: filteredNodes.map(convertNode),
      metadata: {
        version: figmaFile.version,
        lastModified: figmaFile.lastModified,
        author: "Figma User",
      },
    };
  }

  /**
   * Estimate token usage for cost tracking
   */
  private estimateTokenUsage(
    filteredNodes: any[],
    screenshots: DesignScreenshot[],
  ): number {
    // Rough estimation based on content
    const textTokens = filteredNodes.reduce((total, node) => {
      const text = node.characters || node.name || "";
      return total + Math.ceil(text.length / 4); // ~4 chars per token
    }, 0);

    const structureTokens = filteredNodes.length * 10; // Structure overhead
    const screenshotTokens = screenshots.length * 1000; // High cost for vision

    return textTokens + structureTokens + screenshotTokens;
  }

  /**
   * Get performance metrics from Figma client
   */
  getMetrics() {
    return this.figmaClient.getMetrics();
  }

  /**
   * Clear Figma cache
   */
  async clearCache(fileId?: string): Promise<number> {
    return await this.figmaClient.clearCache(fileId);
  }

  /**
   * Warm up cache for commonly used files
   */
  async warmupCache(fileIds: string[]): Promise<void> {
    await this.figmaClient.warmupCache(fileIds);
  }

  /**
   * Batch process multiple Figma files
   */
  async batchProcess(
    fileIds: string[],
    options: {
      version?: string;
      includeScreenshots?: boolean;
      concurrency?: number;
    } = {},
  ): Promise<
    Map<
      string,
      {
        designData: DesignData;
        analysis: CombinedAnalysis;
        performance: any;
      }
    >
  > {
    const results = new Map();
    const concurrency = options.concurrency || 3;

    // Process in batches to respect rate limits
    for (let i = 0; i < fileIds.length; i += concurrency) {
      const batch = fileIds.slice(i, i + concurrency);

      const batchPromises = batch.map(async (fileId) => {
        try {
          const result = await this.generateFromFigmaFile(fileId, options);
          results.set(fileId, result);
        } catch (error) {
          console.warn(`Failed to process file ${fileId}:`, error);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches
      if (i + concurrency < fileIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Analyze Figma file for potential issues before processing
   */
  async analyzeFigmaFileHealth(figmaFileId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    estimatedProcessingTime: number;
    estimatedTokenCost: number;
  }> {
    try {
      const figmaResult = await this.figmaClient.getFileForBackendGeneration(
        figmaFileId,
        { maxDepth: 3, filterEmpty: true }, // Shallow analysis
      );

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check file size
      if (figmaResult.filteredNodes.length > 500) {
        issues.push("Large file with many nodes - may be slow to process");
        recommendations.push(
          "Consider focusing on specific pages or components",
        );
      }

      // Check for meaningful content
      const textNodes = figmaResult.filteredNodes.filter(
        (n) => n.type === "TEXT",
      );
      if (textNodes.length < 5) {
        issues.push("Few text nodes found - may limit entity detection");
        recommendations.push(
          "Ensure design includes representative text content",
        );
      }

      // Check for component patterns
      if (figmaResult.patterns.length === 0) {
        issues.push("No repeating patterns detected");
        recommendations.push(
          "Use components or repeat design elements for better entity detection",
        );
      }

      const estimatedTokens = this.estimateTokenUsage(
        figmaResult.filteredNodes,
        [],
      );
      const estimatedTime = figmaResult.filteredNodes.length * 10 + 5000; // ms

      return {
        isValid: issues.length === 0,
        issues,
        recommendations,
        estimatedProcessingTime: estimatedTime,
        estimatedTokenCost: estimatedTokens,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [
          `Cannot access file: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        recommendations: ["Check file permissions and access token"],
        estimatedProcessingTime: 0,
        estimatedTokenCost: 0,
      };
    }
  }
}
