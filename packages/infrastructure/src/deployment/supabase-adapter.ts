import { BaseAdapter } from '../base/base-adapter';
import {
  SupabaseConfig,
  SupabaseConfigSchema,
  SupabaseProject,
  SupabaseOrganization,
  CreateSupabaseProjectPayload,
  UpdateSupabaseProjectPayload,
  SupabaseFunction,
  SupabaseFunctionBody,
  SupabaseSecret,
  SupabaseBucket,
  SupabaseMigration,
  SupabaseExtension,
  SQLQueryPayload,
  SQLQueryResponse,
  SupabaseBackup,
  SupabaseLog,
  SupabaseLogQuery
} from './supabase-types';

/**
 * Supabase API adapter for project management and database operations
 */
export class SupabaseAdapter extends BaseAdapter {
  protected readonly config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    const validatedConfig = SupabaseConfigSchema.parse(config);
    
    super({
      apiKey: validatedConfig.accessToken,
      baseUrl: validatedConfig.baseUrl,
      timeout: validatedConfig.timeout,
      headers: {
        'Authorization': `Bearer ${validatedConfig.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.config = validatedConfig;
    this.log('info', 'Supabase adapter initialized', { organizationId: config.organizationId });
  }

  /**
   * Get all projects for the current user/organization
   */
  async getProjects(): Promise<SupabaseProject[]> {
    this.log('info', 'Getting Supabase projects');
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseProject[]>('/projects');
    });
  }

  /**
   * Get specific project by reference ID
   */
  async getProject(projectRef: string): Promise<SupabaseProject> {
    this.log('info', 'Getting Supabase project', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseProject>(`/projects/${projectRef}`);
    });
  }

  /**
   * Create a new Supabase project
   */
  async createProject(data: CreateSupabaseProjectPayload): Promise<SupabaseProject> {
    this.log('info', 'Creating Supabase project', { name: data.name, region: data.region });
    
    return await this.withRetry(async () => {
      return await this.post<SupabaseProject>('/projects', data);
    });
  }

  /**
   * Update project settings
   */
  async updateProject(projectRef: string, updates: UpdateSupabaseProjectPayload): Promise<SupabaseProject> {
    this.log('info', 'Updating Supabase project', { projectRef, updates });
    
    return await this.withRetry(async () => {
      return await this.patch<SupabaseProject>(`/projects/${projectRef}`, updates);
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectRef: string): Promise<void> {
    this.log('info', 'Deleting Supabase project', { projectRef });
    
    await this.withRetry(async () => {
      await this.delete(`/projects/${projectRef}`);
    });
  }

  /**
   * Get organizations for the current user
   */
  async getOrganizations(): Promise<SupabaseOrganization[]> {
    this.log('info', 'Getting Supabase organizations');
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseOrganization[]>('/organizations');
    });
  }

  /**
   * Execute SQL query on a project
   */
  async executeSQL(projectRef: string, query: string): Promise<SQLQueryResponse> {
    this.log('info', 'Executing SQL query', { projectRef, queryLength: query.length });
    
    const payload: SQLQueryPayload = { query };
    
    return await this.withRetry(async () => {
      return await this.post<SQLQueryResponse>(`/projects/${projectRef}/database/query`, payload);
    });
  }

  /**
   * Run database migrations
   */
  async runMigrations(projectRef: string, migrations: SupabaseMigration[]): Promise<any> {
    this.log('info', 'Running database migrations', { projectRef, migrationsCount: migrations.length });
    
    const results = [];
    
    for (const migration of migrations) {
      this.log('info', 'Running migration', { version: migration.version });
      
      for (const statement of migration.statements) {
        const result = await this.executeSQL(projectRef, statement.sql);
        if (result.error) {
          throw new Error(`Migration failed (${migration.version}): ${result.error}`);
        }
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Enable PostGIS extension
   */
  async enablePostGIS(projectRef: string): Promise<void> {
    this.log('info', 'Enabling PostGIS extension', { projectRef });
    
    const result = await this.executeSQL(projectRef, 'CREATE EXTENSION IF NOT EXISTS postgis;');
    if (result.error) {
      throw new Error(`Failed to enable PostGIS: ${result.error}`);
    }
  }

  /**
   * Get available extensions
   */
  async getExtensions(projectRef: string): Promise<SupabaseExtension[]> {
    this.log('info', 'Getting database extensions', { projectRef });
    
    const result = await this.executeSQL(
      projectRef, 
      'SELECT name, installed_version, default_version, comment FROM pg_available_extensions ORDER BY name;'
    );
    
    if (result.error) {
      throw new Error(`Failed to get extensions: ${result.error}`);
    }
    
    return (result.result || []).map((row: any) => ({
      name: row.name,
      installed_version: row.installed_version,
      default_version: row.default_version,
      comment: row.comment
    }));
  }

  /**
   * Enable extension by name
   */
  async enableExtension(projectRef: string, extensionName: string): Promise<void> {
    this.log('info', 'Enabling extension', { projectRef, extensionName });
    
    const result = await this.executeSQL(projectRef, `CREATE EXTENSION IF NOT EXISTS ${extensionName};`);
    if (result.error) {
      throw new Error(`Failed to enable extension ${extensionName}: ${result.error}`);
    }
  }

  /**
   * Get project secrets/environment variables
   */
  async getSecrets(projectRef: string): Promise<SupabaseSecret[]> {
    this.log('info', 'Getting project secrets', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseSecret[]>(`/projects/${projectRef}/secrets`);
    });
  }

  /**
   * Create/update project secrets
   */
  async updateSecrets(projectRef: string, secrets: SupabaseSecret[]): Promise<SupabaseSecret[]> {
    this.log('info', 'Updating project secrets', { projectRef, secretsCount: secrets.length });
    
    return await this.withRetry(async () => {
      return await this.post<SupabaseSecret[]>(`/projects/${projectRef}/secrets`, { secrets });
    });
  }

  /**
   * Get Edge Functions
   */
  async getFunctions(projectRef: string): Promise<SupabaseFunction[]> {
    this.log('info', 'Getting Edge Functions', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseFunction[]>(`/projects/${projectRef}/functions`);
    });
  }

  /**
   * Create Edge Function
   */
  async createFunction(projectRef: string, functionData: SupabaseFunctionBody): Promise<SupabaseFunction> {
    this.log('info', 'Creating Edge Function', { projectRef, slug: functionData.slug });
    
    return await this.withRetry(async () => {
      return await this.post<SupabaseFunction>(`/projects/${projectRef}/functions`, functionData);
    });
  }

  /**
   * Update Edge Function
   */
  async updateFunction(projectRef: string, functionSlug: string, functionData: Partial<SupabaseFunctionBody>): Promise<SupabaseFunction> {
    this.log('info', 'Updating Edge Function', { projectRef, functionSlug });
    
    return await this.withRetry(async () => {
      return await this.patch<SupabaseFunction>(`/projects/${projectRef}/functions/${functionSlug}`, functionData);
    });
  }

  /**
   * Delete Edge Function
   */
  async deleteFunction(projectRef: string, functionSlug: string): Promise<void> {
    this.log('info', 'Deleting Edge Function', { projectRef, functionSlug });
    
    await this.withRetry(async () => {
      await this.delete(`/projects/${projectRef}/functions/${functionSlug}`);
    });
  }

  /**
   * Get storage buckets
   */
  async getBuckets(projectRef: string): Promise<SupabaseBucket[]> {
    this.log('info', 'Getting storage buckets', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseBucket[]>(`/projects/${projectRef}/storage/buckets`);
    });
  }

  /**
   * Create storage bucket
   */
  async createBucket(projectRef: string, bucketData: {
    name: string;
    public?: boolean;
    file_size_limit?: number;
    allowed_mime_types?: string[];
  }): Promise<SupabaseBucket> {
    this.log('info', 'Creating storage bucket', { projectRef, name: bucketData.name });
    
    return await this.withRetry(async () => {
      return await this.post<SupabaseBucket>(`/projects/${projectRef}/storage/buckets`, bucketData);
    });
  }

  /**
   * Wait for project to be ready
   */
  async waitForProject(
    projectRef: string,
    timeoutMs: number = 600000, // 10 minutes
    pollIntervalMs: number = 10000 // 10 seconds
  ): Promise<SupabaseProject> {
    this.log('info', 'Waiting for project to be ready', { projectRef, timeoutMs });
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const project = await this.getProject(projectRef);
      
      if (project.status === 'ACTIVE_HEALTHY') {
        this.log('info', 'Project is ready', { projectRef, status: project.status });
        return project;
      }
      
      if (project.status === 'INACTIVE' || project.status === 'REMOVED') {
        throw new Error(`Project failed to initialize: ${project.status}`);
      }

      this.log('info', 'Project still initializing', { projectRef, status: project.status });
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Project initialization timed out after ${timeoutMs}ms`);
  }

  /**
   * Get project configuration including API keys
   */
  async getProjectConfig(projectRef: string): Promise<{
    project: SupabaseProject;
    database: {
      connectionString: string;
      restUrl: string;
      anonKey: string;
      serviceRoleKey: string;
    };
  }> {
    this.log('info', 'Getting project configuration', { projectRef });
    
    const project = await this.getProject(projectRef);
    
    if (!project.api_keys || project.api_keys.length === 0) {
      throw new Error('Project API keys not available');
    }

    const anonKey = project.api_keys.find(key => key.name === 'anon')?.api_key;
    const serviceRoleKey = project.api_keys.find(key => key.name === 'service_role')?.api_key;

    if (!anonKey || !serviceRoleKey) {
      throw new Error('Required API keys not found');
    }

    return {
      project,
      database: {
        connectionString: `postgresql://postgres:[YOUR-PASSWORD]@${project.database.host}:5432/postgres`,
        restUrl: `https://${projectRef}.supabase.co/rest/v1`,
        anonKey,
        serviceRoleKey
      }
    };
  }

  /**
   * Get project backups
   */
  async getBackups(projectRef: string): Promise<SupabaseBackup[]> {
    this.log('info', 'Getting project backups', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseBackup[]>(`/projects/${projectRef}/backups`);
    });
  }

  /**
   * Create backup
   */
  async createBackup(projectRef: string): Promise<SupabaseBackup> {
    this.log('info', 'Creating project backup', { projectRef });
    
    return await this.withRetry(async () => {
      return await this.post<SupabaseBackup>(`/projects/${projectRef}/backups`, {});
    });
  }

  /**
   * Get project logs
   */
  async getLogs(projectRef: string, query: SupabaseLogQuery = {}): Promise<SupabaseLog[]> {
    this.log('info', 'Getting project logs', { projectRef, query });
    
    const params = new URLSearchParams();
    if (query.sql) params.append('sql', query.sql);
    if (query.severity) params.append('severity', query.severity);
    if (query.timestamp_start) params.append('timestamp_start', query.timestamp_start);
    if (query.timestamp_end) params.append('timestamp_end', query.timestamp_end);
    if (query.count) params.append('count', query.count.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const url = `/projects/${projectRef}/logs${queryString ? `?${queryString}` : ''}`;
    
    return await this.withRetry(async () => {
      return await this.get<SupabaseLog[]>(url);
    });
  }

  /**
   * Health check - verify API access
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch (error) {
      this.log('error', 'Supabase health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }
}