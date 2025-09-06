/**
 * Figma API Client - Handles communication with Figma's REST API
 */

import type { 
  FigmaFile, 
  FigmaBridgeConfig, 
  DesignAsset,
  FigmaNode 
} from './types.js';

export class FigmaAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'FigmaAPIError';
  }
}

export class FigmaClient {
  private config: FigmaBridgeConfig;
  private baseUrl: string;
  private requestCache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheExpiration: number = 5 * 60 * 1000; // 5 minutes

  constructor(config: FigmaBridgeConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl || 'https://api.figma.com/v1';
    this.requestCache = new Map();
  }

  /**
   * Get a Figma file by its key
   */
  async getFile(fileKey: string, options: {
    version?: string;
    ids?: string[];
    depth?: number;
    geometry?: 'paths' | 'bounds';
    plugin_data?: string;
    branch_data?: boolean;
  } = {}): Promise<FigmaFile> {
    const url = new URL(`${this.baseUrl}/files/${fileKey}`);
    
    // Add query parameters
    if (options.version) url.searchParams.set('version', options.version);
    if (options.ids) url.searchParams.set('ids', options.ids.join(','));
    if (options.depth) url.searchParams.set('depth', options.depth.toString());
    if (options.geometry) url.searchParams.set('geometry', options.geometry);
    if (options.plugin_data) url.searchParams.set('plugin_data', options.plugin_data);
    if (options.branch_data) url.searchParams.set('branch_data', 'true');

    const response = await this.makeRequest(url.toString());
    
    if (!response.document) {
      throw new FigmaAPIError('Invalid Figma file response: missing document');
    }

    return response as FigmaFile;
  }

  /**
   * Get file nodes by their IDs
   */
  async getFileNodes(
    fileKey: string, 
    nodeIds: string[],
    options: {
      version?: string;
      depth?: number;
      geometry?: 'paths' | 'bounds';
      plugin_data?: string;
    } = {}
  ): Promise<{ nodes: Record<string, FigmaNode> }> {
    const url = new URL(`${this.baseUrl}/files/${fileKey}/nodes`);
    url.searchParams.set('ids', nodeIds.join(','));
    
    if (options.version) url.searchParams.set('version', options.version);
    if (options.depth) url.searchParams.set('depth', options.depth.toString());
    if (options.geometry) url.searchParams.set('geometry', options.geometry);
    if (options.plugin_data) url.searchParams.set('plugin_data', options.plugin_data);

    return await this.makeRequest(url.toString());
  }

  /**
   * Get images/exports for specific nodes
   */
  async getImages(
    fileKey: string,
    options: {
      ids: string[];
      scale?: number;
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      svg_include_id?: boolean;
      svg_simplify_stroke?: boolean;
      use_absolute_bounds?: boolean;
      version?: string;
    }
  ): Promise<{ images: Record<string, string> }> {
    const url = new URL(`${this.baseUrl}/images/${fileKey}`);
    
    url.searchParams.set('ids', options.ids.join(','));
    if (options.scale) url.searchParams.set('scale', options.scale.toString());
    if (options.format) url.searchParams.set('format', options.format);
    if (options.svg_include_id) url.searchParams.set('svg_include_id', 'true');
    if (options.svg_simplify_stroke) url.searchParams.set('svg_simplify_stroke', 'true');
    if (options.use_absolute_bounds) url.searchParams.set('use_absolute_bounds', 'true');
    if (options.version) url.searchParams.set('version', options.version);

    return await this.makeRequest(url.toString());
  }

  /**
   * Get team projects (requires team access)
   */
  async getTeamProjects(teamId: string): Promise<{
    projects: Array<{
      id: string;
      name: string;
    }>;
  }> {
    const url = `${this.baseUrl}/teams/${teamId}/projects`;
    return await this.makeRequest(url);
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<{
    files: Array<{
      key: string;
      name: string;
      thumbnail_url: string;
      last_modified: string;
    }>;
  }> {
    const url = `${this.baseUrl}/projects/${projectId}/files`;
    return await this.makeRequest(url);
  }

  /**
   * Get user information
   */
  async getMe(): Promise<{
    id: string;
    email: string;
    handle: string;
    img_url: string;
  }> {
    const url = `${this.baseUrl}/me`;
    return await this.makeRequest(url);
  }

  /**
   * Get file version history
   */
  async getFileVersions(fileKey: string): Promise<{
    versions: Array<{
      id: string;
      created_at: string;
      label: string;
      description: string;
      user: {
        id: string;
        handle: string;
        img_url: string;
      };
    }>;
  }> {
    const url = `${this.baseUrl}/files/${fileKey}/versions`;
    return await this.makeRequest(url);
  }

  /**
   * Get components from a file or team
   */
  async getTeamComponents(teamId: string, options: {
    page_size?: number;
    after?: string;
  } = {}): Promise<{
    components: Array<{
      key: string;
      file_key: string;
      node_id: string;
      thumbnail_url: string;
      name: string;
      description: string;
      created_at: string;
      updated_at: string;
      user: {
        id: string;
        handle: string;
        img_url: string;
      };
      containing_frame: {
        node_id: string;
        name: string;
        background_color: string;
        page_id: string;
        page_name: string;
      };
    }>;
  }> {
    const url = new URL(`${this.baseUrl}/teams/${teamId}/components`);
    
    if (options.page_size) url.searchParams.set('page_size', options.page_size.toString());
    if (options.after) url.searchParams.set('after', options.after);

    return await this.makeRequest(url.toString());
  }

  /**
   * Extract assets (images, vectors) from nodes and download them
   */
  async extractAssets(
    fileKey: string, 
    nodes: FigmaNode[],
    options: {
      format?: 'png' | 'svg' | 'jpg';
      scale?: number;
    } = {}
  ): Promise<DesignAsset[]> {
    // Find nodes that contain images or can be exported as assets
    const assetNodes = this.findAssetNodes(nodes);
    
    if (assetNodes.length === 0) {
      return [];
    }

    // Get image URLs from Figma
    const imageResponse = await this.getImages(fileKey, {
      ids: assetNodes.map(node => node.id),
      format: options.format || 'png',
      scale: options.scale || 1
    });

    // Convert to DesignAsset format
    const assets: DesignAsset[] = [];
    
    for (const node of assetNodes) {
      const imageUrl = imageResponse.images[node.id];
      if (imageUrl && node.absoluteBoundingBox) {
        assets.push({
          id: `asset_${node.id}`,
          type: this.determineAssetType(node),
          figmaNodeId: node.id,
          source: imageUrl,
          dimensions: {
            width: node.absoluteBoundingBox.width,
            height: node.absoluteBoundingBox.height
          },
          format: (options.format || 'PNG').toUpperCase() as 'PNG' | 'SVG' | 'JPG'
        });
      }
    }

    return assets;
  }

  /**
   * Make authenticated request to Figma API with retry and rate limiting
   */
  private async makeRequest(url: string, retries: number = 3, useCache: boolean = true): Promise<any> {
    // Check cache first (for GET requests only)
    if (useCache && !url.includes('/images/') && !url.includes('/dev_resources')) { // Don't cache images or dev resources
      const cached = this.getFromCache(url);
      if (cached) {
        if (this.config.debug) {
          console.log(`Using cached response for: ${url}`);
        }
        return cached;
      }
    }
    if (this.config.debug) {
      console.log(`Making Figma API request: ${url}`);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
          headers: {
            'X-Figma-Token': this.config.accessToken,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle rate limiting with exponential backoff
          if (response.status === 429) {
            if (attempt < retries) {
              const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
              if (this.config.debug) {
                console.log(`Rate limited, retrying in ${backoffDelay}ms (attempt ${attempt}/${retries})`);
              }
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
          }

          // Handle temporary server errors with retry
          if (response.status >= 500 && response.status < 600) {
            if (attempt < retries) {
              const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s for server errors
              if (this.config.debug) {
                console.log(`Server error, retrying in ${backoffDelay}ms (attempt ${attempt}/${retries})`);
              }
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
          }
          
          throw new FigmaAPIError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code
          );
        }

        const data = await response.json();
        
        if (data.error) {
          throw new FigmaAPIError(data.message || 'Unknown Figma API error', undefined, data.error);
        }

        // Cache successful responses
        if (useCache && !url.includes('/images/') && !url.includes('/dev_resources')) {
          this.setCache(url, data);
        }

        return data;
        
      } catch (error) {
        // Handle timeout errors
        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < retries) {
            if (this.config.debug) {
              console.log(`Request timeout, retrying (attempt ${attempt}/${retries})`);
            }
            continue;
          }
          throw new FigmaAPIError('Request timeout - Figma API took too long to respond');
        }

        if (error instanceof FigmaAPIError) {
          throw error;
        }
        
        // Handle network errors with retry
        if (attempt < retries && error instanceof Error) {
          if (this.config.debug) {
            console.log(`Network error, retrying (attempt ${attempt}/${retries}): ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        throw new FigmaAPIError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    throw new FigmaAPIError('Max retries exceeded');
  }

  /**
   * Find nodes that can be extracted as assets
   */
  private findAssetNodes(nodes: FigmaNode[]): FigmaNode[] {
    const assetNodes: FigmaNode[] = [];

    const traverse = (node: FigmaNode) => {
      // Check if this node should be treated as an asset
      if (this.isAssetNode(node)) {
        assetNodes.push(node);
      }

      // Recursively check children
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    for (const node of nodes) {
      traverse(node);
    }

    return assetNodes;
  }

  /**
   * Determine if a node should be treated as an asset
   */
  private isAssetNode(node: FigmaNode): boolean {
    // Vector graphics, images, icons
    if (['VECTOR', 'ELLIPSE', 'POLYGON', 'STAR'].includes(node.type)) {
      return true;
    }

    // Rectangles with image fills
    if (node.type === 'RECTANGLE' && node.fills) {
      return node.fills.some(fill => fill.type === 'IMAGE');
    }

    // Components that might be icons
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const name = node.name.toLowerCase();
      return name.includes('icon') || name.includes('logo') || name.includes('image');
    }

    return false;
  }

  /**
   * Determine asset type based on node characteristics
   */
  private determineAssetType(node: FigmaNode): 'image' | 'icon' | 'vector' {
    const name = node.name.toLowerCase();
    
    if (name.includes('icon')) return 'icon';
    if (node.fills?.some(fill => fill.type === 'IMAGE')) return 'image';
    if (['VECTOR', 'ELLIPSE', 'POLYGON', 'STAR'].includes(node.type)) return 'vector';
    
    return 'image';
  }

  /**
   * Get Dev Mode code for specific nodes (CSS/React)
   */
  async getDevModeCode(
    fileKey: string, 
    nodeIds: string[],
    options: {
      format?: 'css' | 'react' | 'flutter' | 'swift' | 'android';
      version?: string;
    } = {}
  ): Promise<{ code: Record<string, string> }> {
    const url = new URL(`${this.baseUrl}/files/${fileKey}/dev_resources`);
    url.searchParams.set('node_ids', nodeIds.join(','));
    
    if (options.format) url.searchParams.set('format', options.format);
    if (options.version) url.searchParams.set('version', options.version);

    return await this.makeRequest(url.toString());
  }

  /**
   * Get enhanced CSS for a node using Dev Mode API
   */
  async getEnhancedCSS(fileKey: string, nodeId: string): Promise<string> {
    try {
      const devResponse = await this.getDevModeCode(fileKey, [nodeId], { format: 'css' });
      return devResponse.code[nodeId] || '';
    } catch (error) {
      if (this.config.debug) {
        console.warn(`Failed to get Dev Mode CSS for node ${nodeId}, falling back to basic generation`);
      }
      return '';
    }
  }

  /**
   * Validate access token and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Figma connection validation failed:', error);
      }
      return false;
    }
  }

  /**
   * Get cached response if available and not expired
   */
  private getFromCache(url: string): any | null {
    const cached = this.requestCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
      return cached.data;
    }
    
    if (cached) {
      // Remove expired cache entry
      this.requestCache.delete(url);
    }
    
    return null;
  }

  /**
   * Cache response data
   */
  private setCache(url: string, data: any): void {
    this.requestCache.set(url, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries if cache is getting large
    if (this.requestCache.size > 100) {
      const cutoff = Date.now() - this.cacheExpiration;
      for (const [key, value] of this.requestCache.entries()) {
        if (value.timestamp < cutoff) {
          this.requestCache.delete(key);
        }
      }
    }
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.requestCache.size
    };
  }
}