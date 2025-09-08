import { z } from 'zod';

export const VercelConfigSchema = z.object({
  token: z.string(),
  teamId: z.string().optional(),
  projectName: z.string().optional(),
  timeout: z.number().int().positive().default(300000), // 5 minutes
  baseUrl: z.string().url().default('https://api.vercel.com')
});

export type VercelConfig = z.infer<typeof VercelConfigSchema>;

// Vercel API response types
export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  source?: 'git' | 'cli' | 'api';
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  type: 'LAMBDAS';
  target?: 'production' | 'staging';
  alias?: string[];
  aliasAssigned?: boolean;
  aliasError?: {
    code: string;
    message: string;
  };
  creator: {
    uid: string;
    email?: string;
    username?: string;
    githubLogin?: string;
  };
  inspectorUrl?: string;
  meta?: Record<string, string>;
  regions: string[];
  functions?: Record<string, VercelFunction>;
  routes?: VercelRoute[];
  env?: Record<string, string>;
  build?: {
    env?: Record<string, string>;
  };
  version: number;
}

export interface VercelFunction {
  runtime: string;
  memory?: number;
  maxDuration?: number;
}

export interface VercelRoute {
  src: string;
  dest?: string;
  status?: number;
  methods?: string[];
  headers?: Record<string, string>;
  continue?: boolean;
  override?: boolean;
  caseSensitive?: boolean;
  check?: boolean;
  important?: boolean;
  middleware?: number;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  framework?: string;
  devCommand?: string;
  installCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  directoryListing: boolean;
  nodeVersion: string;
  createdAt: number;
  updatedAt: number;
  link?: {
    type: 'github';
    repo: string;
    repoId: number;
    org?: string;
    gitCredentialId?: string;
    productionBranch?: string;
    sourceless?: boolean;
    createdAt?: number;
    updatedAt?: number;
  };
  alias?: VercelAlias[];
  latestDeployments?: VercelDeployment[];
  targets?: Record<string, VercelProjectTarget>;
  env?: VercelEnvironmentVariable[];
  settings?: {
    buildCommand?: string;
    commandForIgnoringBuildStep?: string;
    devCommand?: string;
    framework?: string;
    installCommand?: string;
    nodeVersion?: string;
    outputDirectory?: string;
    publicSource?: boolean;
    rootDirectory?: string;
    serverlessFunctionRegion?: string;
    sourceFilesOutsideRootDirectory?: boolean;
    functions?: Record<string, VercelFunction>;
  };
}

export interface VercelProjectTarget {
  alias?: string[];
  aliasAssigned?: boolean;
  builds?: VercelBuild[];
  createdAt?: number;
  createdIn?: string;
  creator?: {
    uid: string;
    username?: string;
  };
  deploymentHostname?: string;
  forced?: boolean;
  id?: string;
  meta?: Record<string, string>;
  plan?: string;
  private?: boolean;
  readyState?: string;
  requestedAt?: number;
  target?: string;
  teamId?: string;
  type?: string;
  url?: string;
  userId?: string;
}

export interface VercelBuild {
  use: string;
  src?: string;
  dest?: string;
  config?: Record<string, unknown>;
}

export interface VercelAlias {
  uid: string;
  alias: string;
  created: string;
  deployment?: {
    id: string;
    url: string;
  };
  creator: {
    uid: string;
    username?: string;
    email?: string;
  };
}

export interface VercelEnvironmentVariable {
  id?: string;
  key: string;
  value: string;
  type: 'system' | 'secret' | 'plain';
  target?: ('production' | 'preview' | 'development')[];
  gitBranch?: string;
  configurationId?: string;
  updatedAt?: number;
  createdAt?: number;
}

export interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
  avatar?: string;
  membership: {
    confirmed: boolean;
    confirmedAt?: number;
    accessRequestedAt?: number;
    role: 'OWNER' | 'MEMBER';
    teamId: string;
    uid: string;
    createdAt: number;
    created: string;
  };
}

export interface VercelUser {
  uid: string;
  email: string;
  name?: string;
  username: string;
  avatar?: string;
  version: 'northstar';
  createdAt?: number;
}

// File upload types
export interface VercelFile {
  file: string;
  sha: string;
  size: number;
}

export interface VercelFileTree {
  [path: string]: VercelFile;
}

// Domain types
export interface VercelDomain {
  name: string;
  apexName: string;
  projectId?: string;
  redirect?: string;
  redirectStatusCode?: number;
  gitBranch?: string;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

// Deployment creation payload
export interface CreateDeploymentPayload {
  name: string;
  files: VercelFileTree;
  source?: 'cli' | 'git' | 'api';
  version?: 2;
  builds?: VercelBuild[];
  routes?: VercelRoute[];
  regions?: string[];
  functions?: Record<string, VercelFunction>;
  env?: Record<string, string>;
  build?: {
    env?: Record<string, string>;
  };
  target?: 'production' | 'staging';
  alias?: string[];
  meta?: Record<string, string>;
  projectSettings?: {
    framework?: string;
    buildCommand?: string;
    devCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    nodeVersion?: string;
  };
}

// Check types for deployment status
export interface VercelCheck {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'skipped' | 'canceled';
  conclusion?: 'succeeded' | 'failed' | 'skipped' | 'canceled';
  blocking: boolean;
  output?: {
    metrics?: Record<string, number>;
    logs?: string[];
  };
  integrationId?: string;
  deploymentId: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  detailsUrl?: string;
}