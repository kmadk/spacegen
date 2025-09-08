import { createHash } from 'crypto';
import * as FormData from 'form-data';
import { BaseAdapter } from '../base/base-adapter';
import { 
  VercelConfig, 
  VercelConfigSchema,
  VercelDeployment,
  VercelProject,
  VercelTeam,
  VercelUser,
  CreateDeploymentPayload,
  VercelFileTree,
  VercelEnvironmentVariable,
  VercelDomain,
  VercelCheck
} from './vercel-types';

/**
 * Vercel API adapter for deployment and project management
 */
export class VercelAdapter extends BaseAdapter {
  protected readonly config: VercelConfig;

  constructor(config: VercelConfig) {
    const validatedConfig = VercelConfigSchema.parse(config);
    
    super({
      apiKey: validatedConfig.token,
      baseUrl: validatedConfig.baseUrl,
      timeout: validatedConfig.timeout,
      headers: {
        'Authorization': `Bearer ${validatedConfig.token}`
      }
    });

    this.config = validatedConfig;
    this.log('info', 'Vercel adapter initialized', { teamId: config.teamId });
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<VercelUser> {
    this.log('info', 'Getting current user');
    
    return await this.withRetry(async () => {
      const response = await this.get<{ user: VercelUser }>('/v2/user');
      return response.user;
    });
  }

  /**
   * Get user teams
   */
  async getTeams(): Promise<VercelTeam[]> {
    this.log('info', 'Getting teams');
    
    return await this.withRetry(async () => {
      const response = await this.get<{ teams: VercelTeam[] }>('/v2/teams');
      return response.teams;
    });
  }

  /**
   * Get projects for current user/team
   */
  async getProjects(limit: number = 20): Promise<VercelProject[]> {
    this.log('info', 'Getting projects', { limit });
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    return await this.withRetry(async () => {
      const response = await this.get<{ projects: VercelProject[] }>(`/v9/projects?${params.toString()}`);
      return response.projects;
    });
  }

  /**
   * Get specific project by ID or name
   */
  async getProject(projectIdOrName: string): Promise<VercelProject> {
    this.log('info', 'Getting project', { projectIdOrName });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v9/projects/${projectIdOrName}${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.get<VercelProject>(url);
    });
  }

  /**
   * Create a new project
   */
  async createProject(data: {
    name: string;
    framework?: string;
    buildCommand?: string;
    devCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    environmentVariables?: VercelEnvironmentVariable[];
    gitRepository?: {
      type: 'github';
      repo: string;
    };
  }): Promise<VercelProject> {
    this.log('info', 'Creating project', { name: data.name });
    
    const payload: any = {
      name: data.name,
      framework: data.framework,
    };

    if (data.buildCommand) payload.buildCommand = data.buildCommand;
    if (data.devCommand) payload.devCommand = data.devCommand;
    if (data.installCommand) payload.installCommand = data.installCommand;
    if (data.outputDirectory) payload.outputDirectory = data.outputDirectory;
    if (data.rootDirectory) payload.rootDirectory = data.rootDirectory;
    if (data.environmentVariables) payload.environmentVariables = data.environmentVariables;
    if (data.gitRepository) payload.gitRepository = data.gitRepository;

    if (this.config.teamId) {
      payload.teamId = this.config.teamId;
    }

    return await this.withRetry(async () => {
      return await this.post<VercelProject>('/v9/projects', payload);
    });
  }

  /**
   * Update project settings
   */
  async updateProject(projectId: string, updates: {
    name?: string;
    framework?: string;
    buildCommand?: string;
    devCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    nodeVersion?: string;
  }): Promise<VercelProject> {
    this.log('info', 'Updating project', { projectId, updates });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v9/projects/${projectId}${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.patch<VercelProject>(url, updates);
    });
  }

  /**
   * Create deployment from files
   */
  async createDeployment(payload: CreateDeploymentPayload): Promise<VercelDeployment> {
    this.log('info', 'Creating deployment', { name: payload.name, filesCount: Object.keys(payload.files).length });
    
    const deploymentData: any = {
      ...payload,
      version: 2
    };

    if (this.config.teamId) {
      deploymentData.teamId = this.config.teamId;
    }

    return await this.withRetry(async () => {
      return await this.post<VercelDeployment>('/v13/deployments', deploymentData);
    });
  }

  /**
   * Create deployment from directory
   */
  async createDeploymentFromDirectory(
    projectPath: string, 
    options: {
      name: string;
      target?: 'production' | 'staging';
      alias?: string[];
      env?: Record<string, string>;
      regions?: string[];
    }
  ): Promise<VercelDeployment> {
    this.log('info', 'Creating deployment from directory', { projectPath, options });
    
    // Generate file tree from directory
    const files = await this.generateFileTree(projectPath);
    
    const payload: CreateDeploymentPayload = {
      name: options.name,
      files,
      target: options.target,
      alias: options.alias,
      env: options.env,
      regions: options.regions
    };

    return await this.createDeployment(payload);
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    this.log('info', 'Getting deployment', { deploymentId });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v13/deployments/${deploymentId}${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.get<VercelDeployment>(url);
    });
  }

  /**
   * Get deployments for a project
   */
  async getProjectDeployments(projectId: string, limit: number = 20): Promise<VercelDeployment[]> {
    this.log('info', 'Getting project deployments', { projectId, limit });
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('projectId', projectId);
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    return await this.withRetry(async () => {
      const response = await this.get<{ deployments: VercelDeployment[] }>(`/v6/deployments?${params.toString()}`);
      return response.deployments;
    });
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(deploymentId: string): Promise<void> {
    this.log('info', 'Deleting deployment', { deploymentId });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v13/deployments/${deploymentId}${queryString ? `?${queryString}` : ''}`;

    await this.withRetry(async () => {
      await this.delete(url);
    });
  }

  /**
   * Set environment variables for a project
   */
  async setEnvironmentVariables(
    projectId: string, 
    variables: VercelEnvironmentVariable[]
  ): Promise<VercelEnvironmentVariable[]> {
    this.log('info', 'Setting environment variables', { projectId, count: variables.length });
    
    const results: VercelEnvironmentVariable[] = [];

    for (const variable of variables) {
      const params = new URLSearchParams();
      if (this.config.teamId) {
        params.append('teamId', this.config.teamId);
      }

      const queryString = params.toString();
      const url = `/v9/projects/${projectId}/env${queryString ? `?${queryString}` : ''}`;

      const result = await this.withRetry(async () => {
        return await this.post<VercelEnvironmentVariable>(url, variable);
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Get environment variables for a project
   */
  async getEnvironmentVariables(projectId: string): Promise<VercelEnvironmentVariable[]> {
    this.log('info', 'Getting environment variables', { projectId });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v9/projects/${projectId}/env${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      const response = await this.get<{ envs: VercelEnvironmentVariable[] }>(url);
      return response.envs;
    });
  }

  /**
   * Add custom domain to project
   */
  async addDomain(projectId: string, domain: string): Promise<VercelDomain> {
    this.log('info', 'Adding domain', { projectId, domain });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v9/projects/${projectId}/domains${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      return await this.post<VercelDomain>(url, { name: domain });
    });
  }

  /**
   * Get domains for a project
   */
  async getProjectDomains(projectId: string): Promise<VercelDomain[]> {
    this.log('info', 'Getting project domains', { projectId });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v9/projects/${projectId}/domains${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      const response = await this.get<{ domains: VercelDomain[] }>(url);
      return response.domains;
    });
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(
    deploymentId: string, 
    timeoutMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 5000 // 5 seconds
  ): Promise<VercelDeployment> {
    this.log('info', 'Waiting for deployment to complete', { deploymentId, timeoutMs });
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const deployment = await this.getDeployment(deploymentId);
      
      if (deployment.state === 'READY') {
        this.log('info', 'Deployment completed successfully', { deploymentId, url: deployment.url });
        return deployment;
      }
      
      if (deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${deployment.state}`);
      }

      this.log('info', 'Deployment still building', { deploymentId, state: deployment.state });
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Deployment timed out after ${timeoutMs}ms`);
  }

  /**
   * Get deployment checks/status
   */
  async getDeploymentChecks(deploymentId: string): Promise<VercelCheck[]> {
    this.log('info', 'Getting deployment checks', { deploymentId });
    
    const params = new URLSearchParams();
    if (this.config.teamId) {
      params.append('teamId', this.config.teamId);
    }

    const queryString = params.toString();
    const url = `/v1/deployments/${deploymentId}/checks${queryString ? `?${queryString}` : ''}`;

    return await this.withRetry(async () => {
      const response = await this.get<{ checks: VercelCheck[] }>(url);
      return response.checks;
    });
  }

  /**
   * Health check - verify API access
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      this.log('error', 'Vercel health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }

  /**
   * Generate file tree from directory path
   */
  private async generateFileTree(directoryPath: string): Promise<VercelFileTree> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const files: VercelFileTree = {};
    
    const processDirectory = async (dir: string, basePath: string = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        // Skip common ignore patterns
        if (this.shouldIgnoreFile(relativePath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath, relativePath);
        } else {
          const content = await fs.readFile(fullPath);
          const sha = createHash('sha1').update(content).digest('hex');
          
          files[relativePath] = {
            file: content.toString('base64'),
            sha,
            size: content.length
          };
        }
      }
    };
    
    await processDirectory(directoryPath);
    return files;
  }

  /**
   * Check if file should be ignored during deployment
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const ignorePatterns = [
      'node_modules/',
      '.git/',
      '.next/',
      'dist/',
      'build/',
      '.vercel/',
      '.env.local',
      '.env.*.local',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];

    return ignorePatterns.some(pattern => {
      if (pattern.endsWith('/')) {
        return filePath.startsWith(pattern) || filePath.includes(`/${pattern}`);
      }
      return filePath.endsWith(pattern) || filePath.includes(`/${pattern}`);
    });
  }
}