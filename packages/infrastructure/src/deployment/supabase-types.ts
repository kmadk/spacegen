import { z } from 'zod';

export const SupabaseConfigSchema = z.object({
  accessToken: z.string(),
  organizationId: z.string().optional(),
  timeout: z.number().int().positive().default(60000), // 1 minute
  baseUrl: z.string().url().default('https://api.supabase.com/v1')
});

export type SupabaseConfig = z.infer<typeof SupabaseConfigSchema>;

// Supabase API response types
export interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  organization_id: string;
  status: 'ACTIVE_HEALTHY' | 'ACTIVE_UNHEALTHY' | 'COMING_UP' | 'GOING_DOWN' | 'INACTIVE' | 'PAUSING' | 'PAUSED' | 'REMOVED' | 'RESTORING' | 'UPGRADING';
  database: {
    host: string;
    version: string;
  };
  created_at: string;
  updated_at: string;
  region: string;
  cloud_provider: 'aws' | 'gcp' | 'azure';
  inserted_at: string;
  subscription_id?: string;
  subscription_tier?: string;
  api_keys?: SupabaseAPIKey[];
  settings?: {
    api?: {
      default_to_null_false?: boolean;
      max_rows?: number;
      timeout?: number;
    };
    auth?: {
      site_url?: string;
      uri_allow_list?: string;
      jwt_exp?: number;
      disable_signup?: boolean;
      external_email_enabled?: boolean;
      external_phone_enabled?: boolean;
      mailer_autoconfirm?: boolean;
      phone_autoconfirm?: boolean;
      sms_provider?: string;
      mailer_secure_email_change_enabled?: boolean;
      mailer_subjects?: {
        confirmation?: string;
        recovery?: string;
        email_change?: string;
        magic_link?: string;
      };
      external?: {
        apple_enabled?: boolean;
        azure_enabled?: boolean;
        bitbucket_enabled?: boolean;
        discord_enabled?: boolean;
        facebook_enabled?: boolean;
        github_enabled?: boolean;
        gitlab_enabled?: boolean;
        google_enabled?: boolean;
        keycloak_enabled?: boolean;
        linkedin_enabled?: boolean;
        notion_enabled?: boolean;
        spotify_enabled?: boolean;
        slack_enabled?: boolean;
        twitch_enabled?: boolean;
        twitter_enabled?: boolean;
        workos_enabled?: boolean;
        zoom_enabled?: boolean;
      };
    };
    db?: {
      pool_size?: number;
      ssl_enforced?: boolean;
      log_min_messages?: string;
      log_min_error_statement?: string;
      log_min_duration_statement?: number;
      log_statement?: string;
      log_lock_waits?: boolean;
      log_temp_files?: number;
      log_autovacuum_min_duration?: number;
      shared_preload_libraries?: string;
    };
    storage?: {
      file_size_limit?: number;
      s3_enabled?: boolean;
    };
    functions?: {
      verify_jwt?: boolean;
    };
  };
}

export interface SupabaseAPIKey {
  name: string;
  api_key: string;
  tags: string;
}

export interface SupabaseOrganization {
  id: string;
  name: string;
  slug: string;
  billing_email?: string;
  tier?: string;
  kind: 'personal' | 'team';
  created_at: string;
  updated_at: string;
  members?: SupabaseOrganizationMember[];
}

export interface SupabaseOrganizationMember {
  gotrue_id: string;
  username: string;
  role_ids: number[];
  mfa_enabled: boolean;
}

export interface SupabaseDatabase {
  host: string;
  name: string;
  port: number;
  user: string;
  version: string;
  status: string;
}

export interface SupabaseSecret {
  name: string;
  value: string;
}

// Edge Functions
export interface SupabaseFunction {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'REMOVED' | 'THROTTLED';
  version: number;
  created_at: string;
  updated_at: string;
  verify_jwt?: boolean;
  import_map?: boolean;
}

export interface SupabaseFunctionBody {
  slug: string;
  name?: string;
  source?: string;
  entrypoint?: string;
  import_map?: string;
  verify_jwt?: boolean;
}

// SSL Certificate
export interface SupabaseSSLCertificate {
  id: string;
  domain: string;
  custom_hostname: string;
  status: 'active' | 'pending' | 'initializing' | 'error' | 'moved';
  created_at: string;
  updated_at: string;
}

// Database migrations
export interface SupabaseMigration {
  version: string;
  statements: SupabaseMigrationStatement[];
}

export interface SupabaseMigrationStatement {
  sql: string;
}

// Storage
export interface SupabaseBucket {
  id: string;
  name: string;
  owner?: string;
  public: boolean;
  file_size_limit?: number;
  allowed_mime_types?: string[];
  created_at: string;
  updated_at: string;
}

// Project creation payload
export interface CreateSupabaseProjectPayload {
  name: string;
  organization_id: string;
  plan?: 'free' | 'pro' | 'team' | 'enterprise';
  region?: string;
  cloud_provider?: 'aws' | 'gcp' | 'azure';
  db_pass: string;
  kps_enabled?: boolean;
  custom_access_token?: string;
}

// Configuration update payload
export interface UpdateSupabaseProjectPayload {
  name?: string;
  settings?: {
    api?: {
      default_to_null_false?: boolean;
      max_rows?: number;
      timeout?: number;
    };
    auth?: {
      site_url?: string;
      uri_allow_list?: string;
      jwt_exp?: number;
      disable_signup?: boolean;
      external_email_enabled?: boolean;
      external_phone_enabled?: boolean;
      mailer_autoconfirm?: boolean;
      phone_autoconfirm?: boolean;
      sms_provider?: string;
    };
    db?: {
      pool_size?: number;
      ssl_enforced?: boolean;
    };
    storage?: {
      file_size_limit?: number;
    };
  };
}

// PostGIS/Extensions
export interface SupabaseExtension {
  name: string;
  installed_version?: string;
  default_version: string;
  comment?: string;
}

// Types for SQL execution
export interface SQLQueryPayload {
  query: string;
}

export interface SQLQueryResponse {
  result?: any[];
  error?: string;
  query_performance_ms?: number;
}

// Backup and restore
export interface SupabaseBackup {
  id: string;
  inserted_at: string;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  file_size_bytes: number;
}

// Project logs
export interface SupabaseLogQuery {
  sql?: string;
  severity?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  timestamp_start?: string;
  timestamp_end?: string;
  count?: number;
  limit?: number;
}

export interface SupabaseLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}