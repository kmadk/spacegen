import { BaseAdapter } from '../base/base-adapter';
import { 
  FigmaConfig, 
  FigmaConfigSchema, 
  FigmaFile, 
  FigmaTeam, 
  FigmaProject,
  FileImagesResponse,
  FileVersionsResponse
} from './types';

/**
 * Figma API adapter for accessing design files and metadata
 */
export class FigmaAdapter extends BaseAdapter {
  protected readonly config: FigmaConfig;

  constructor(config: FigmaConfig) {
    const validatedConfig = FigmaConfigSchema.parse(config);
    
    super({
      apiKey: validatedConfig.accessToken,
      baseUrl: validatedConfig.baseUrl,
      timeout: validatedConfig.timeout,
      headers: {
        'X-Figma-Token': validatedConfig.accessToken
      }
    });

    this.config = validatedConfig;
    this.log('info', 'Figma adapter initialized', { teamId: config.teamId });
  }

  /**
   * Fetch a Figma file by ID
   */
  async getFile(fileId: string, options: {
    version?: string;
    ids?: string[];
    depth?: number;
    geometry?: 'paths' | 'vector_paths';
    plugin_data?: string;
    branch_data?: boolean;
  } = {}): Promise<FigmaFile> {
    this.log('info', 'Fetching Figma file', { fileId, options });

    const params = new URLSearchParams();
    if (options.version) params.append('version', options.version);
    if (options.ids?.length) params.append('ids', options.ids.join(','));
    if (options.depth !== undefined) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);
    if (options.branch_data) params.append('branch_data', 'true');

    const queryString = params.toString();
    const url = `/files/${fileId}${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      const response = await this.get<{ document: FigmaFile }>(url);
      return response.document;
    });
  }

  /**
   * Get file nodes by IDs
   */
  async getFileNodes(fileId: string, nodeIds: string[], options: {
    version?: string;
    depth?: number;
    geometry?: 'paths' | 'vector_paths';
    plugin_data?: string;
  } = {}): Promise<Record<string, any>> {
    this.log('info', 'Fetching Figma file nodes', { fileId, nodeIds, options });

    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.version) params.append('version', options.version);
    if (options.depth !== undefined) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);

    const url = `/files/${fileId}/nodes?${params.toString()}`;

    return await this.withRetry(async () => {
      const response = await this.get<{ nodes: Record<string, any> }>(url);
      return response.nodes;
    });
  }

  /**
   * Get images for specific nodes
   */
  async getImages(fileId: string, nodeIds: string[], options: {
    scale?: number;
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
    svg_include_id?: boolean;
    svg_simplify_stroke?: boolean;
    use_absolute_bounds?: boolean;
    version?: string;
  } = {}): Promise<FileImagesResponse> {
    this.log('info', 'Getting node images', { fileId, nodeIds, options });

    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.scale) params.append('scale', options.scale.toString());
    if (options.format) params.append('format', options.format);
    if (options.svg_include_id) params.append('svg_include_id', 'true');
    if (options.svg_simplify_stroke) params.append('svg_simplify_stroke', 'true');
    if (options.use_absolute_bounds) params.append('use_absolute_bounds', 'true');
    if (options.version) params.append('version', options.version);

    const url = `/images/${fileId}?${params.toString()}`;

    return await this.withRetry(async () => {
      return await this.get<FileImagesResponse>(url);
    });
  }

  /**
   * Get file versions/history
   */
  async getFileVersions(fileId: string): Promise<FileVersionsResponse> {
    this.log('info', 'Getting file versions', { fileId });

    return await this.withRetry(async () => {
      return await this.get<FileVersionsResponse>(`/files/${fileId}/versions`);
    });
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId?: string): Promise<FigmaProject[]> {
    const resolvedTeamId = teamId || this.config.teamId;
    if (!resolvedTeamId) {
      throw new Error('Team ID is required');
    }

    this.log('info', 'Getting team projects', { teamId: resolvedTeamId });

    return await this.withRetry(async () => {
      const response = await this.get<{ projects: FigmaProject[] }>(`/teams/${resolvedTeamId}/projects`);
      return response.projects;
    });
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<any[]> {
    this.log('info', 'Getting project files', { projectId });

    return await this.withRetry(async () => {
      const response = await this.get<{ files: any[] }>(`/projects/${projectId}/files`);
      return response.files;
    });
  }

  /**
   * Get user teams
   */
  async getUserTeams(): Promise<FigmaTeam[]> {
    this.log('info', 'Getting user teams');

    return await this.withRetry(async () => {
      const response = await this.get<{ teams: FigmaTeam[] }>('/me');
      return response.teams;
    });
  }

  /**
   * Get file components
   */
  async getFileComponents(fileId: string): Promise<any> {
    this.log('info', 'Getting file components', { fileId });

    return await this.withRetry(async () => {
      return await this.get(`/files/${fileId}/components`);
    });
  }

  /**
   * Get file styles
   */
  async getFileStyles(fileId: string): Promise<any> {
    this.log('info', 'Getting file styles', { fileId });

    return await this.withRetry(async () => {
      return await this.get(`/files/${fileId}/styles`);
    });
  }

  /**
   * Get team components
   */
  async getTeamComponents(teamId?: string, options: {
    page_size?: number;
    cursor?: string;
  } = {}): Promise<any> {
    const resolvedTeamId = teamId || this.config.teamId;
    if (!resolvedTeamId) {
      throw new Error('Team ID is required');
    }

    this.log('info', 'Getting team components', { teamId: resolvedTeamId, options });

    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.cursor) params.append('cursor', options.cursor);

    const queryString = params.toString();
    const url = `/teams/${resolvedTeamId}/components${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.get(url);
    });
  }

  /**
   * Get team styles
   */
  async getTeamStyles(teamId?: string, options: {
    page_size?: number;
    cursor?: string;
  } = {}): Promise<any> {
    const resolvedTeamId = teamId || this.config.teamId;
    if (!resolvedTeamId) {
      throw new Error('Team ID is required');
    }

    this.log('info', 'Getting team styles', { teamId: resolvedTeamId, options });

    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.cursor) params.append('cursor', options.cursor);

    const queryString = params.toString();
    const url = `/teams/${resolvedTeamId}/styles${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.get(url);
    });
  }

  /**
   * Generate screenshots of entire Figma file pages for GPT-5 Vision analysis
   */
  async getFileScreenshots(fileId: string, options: {
    format?: 'png' | 'jpg';
    scale?: number;
    version?: string;
  } = {}): Promise<{ pageId: string; name: string; imageUrl: string }[]> {
    this.log('info', 'Generating file screenshots for vision analysis', { fileId, options });

    // First get the file structure to identify pages
    const file = await this.getFile(fileId, { depth: 1 });
    
    if (!file.document || !file.document.children) {
      throw new Error('Invalid Figma file structure - no pages found');
    }

    const screenshots: { pageId: string; name: string; imageUrl: string }[] = [];

    // Generate screenshot for each page
    for (const page of file.document.children) {
      if (page.type === 'CANVAS') {
        try {
          const imageResponse = await this.getImages(fileId, [page.id], {
            format: options.format || 'png',
            scale: options.scale || 2, // 2x for better quality for AI analysis
            version: options.version,
            use_absolute_bounds: true
          });

          const imageUrl = imageResponse.images?.[page.id];
          if (imageUrl) {
            screenshots.push({
              pageId: page.id,
              name: page.name || 'Unnamed Page',
              imageUrl
            });
          }
        } catch (error) {
          this.log('warn', 'Failed to generate screenshot for page', { 
            pageId: page.id, 
            pageName: page.name,
            error: error instanceof Error ? error.message : error 
          });
          // Continue with other pages even if one fails
        }
      }
    }

    this.log('info', 'Generated screenshots for vision analysis', { 
      fileId, 
      screenshotCount: screenshots.length 
    });

    return screenshots;
  }

  /**
   * Generate component screenshots for detailed analysis
   */
  async getComponentScreenshots(fileId: string, componentIds: string[], options: {
    format?: 'png' | 'jpg';
    scale?: number;
    version?: string;
  } = {}): Promise<{ componentId: string; imageUrl: string }[]> {
    this.log('info', 'Generating component screenshots', { fileId, componentIds, options });

    const imageResponse = await this.getImages(fileId, componentIds, {
      format: options.format || 'png',
      scale: options.scale || 3, // Higher scale for component details
      version: options.version,
      use_absolute_bounds: true
    });

    const screenshots: { componentId: string; imageUrl: string }[] = [];

    for (const componentId of componentIds) {
      if (imageResponse.images && imageResponse.images[componentId]) {
        screenshots.push({
          componentId,
          imageUrl: imageResponse.images[componentId]
        });
      }
    }

    return screenshots;
  }

  /**
   * Health check - verify API access
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getUserTeams();
      return true;
    } catch (error) {
      this.log('error', 'Figma health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }
}