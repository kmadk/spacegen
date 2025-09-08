/**
 * Backend Generator Types
 */

// Design data input types
export interface DesignData {
  source: 'figma' | 'penpot';
  fileId: string;
  fileName: string;
  nodes: DesignNode[];
  metadata?: {
    version?: string;
    lastModified?: string;
    author?: string;
  };
}

export interface DesignNode {
  id: string;
  name: string;
  type: string;
  characters?: string;
  fills?: any[];
  children?: DesignNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  [key: string]: any; // Allow additional platform-specific properties
}

// Core configuration
export interface BackendGeneratorConfig {
  projectName: string;
  outputDir?: string;
  openaiApiKey?: string;
  figmaAccessToken?: string; // Added for direct Figma integration
  enableSpatialQueries?: boolean;
  debug?: boolean;
  database?: {
    type: 'postgresql' | 'mysql' | 'sqlite';
    enablePostGIS?: boolean;
  };
  deployment?: {
    enabled: boolean;
    provider: 'supabase' | 'custom';
    autoMigrations?: boolean;
  };
}

// AI Analysis Configuration
export interface AIAnalysisConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  enableVision?: boolean; // Enable GPT-5 vision analysis
  visionModel?: string;   // Specific vision model
}

// Vision Analysis Types
export interface DesignScreenshot {
  pageId: string;
  name: string;
  imageUrl: string;
}

export interface VisionAnalysisResult {
  entities: DetectedEntity[];
  relationships: SuggestedRelationship[];
  insights: string[];
  confidence: number;
  visualPatterns: VisualPattern[];
}

export interface VisualPattern {
  type: 'layout_grid' | 'card_pattern' | 'form_structure' | 'navigation' | 'data_list';
  description: string;
  confidence: number;
  suggestedEntity?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CombinedAnalysis {
  textAnalysis: AIEntityAnalysis;
  visionAnalysis: VisionAnalysisResult;
  combinedEntities: DetectedEntity[];
  confidenceScore: number;
  analysisMethod: 'text_only' | 'vision_only' | 'combined';
}

// Data Models
export interface DataModel {
  name: string;
  tableName: string;
  fields: DatabaseField[];
  indexes: DatabaseIndex[];
  relationships: EntityRelationship[];
}

export interface DatabaseField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  primary?: boolean;
  indexed?: boolean;
  default?: any;
  constraints?: string[];
  description?: string;
}

export interface DatabaseIndex {
  name: string;
  field: string;
  type: 'gist' | 'btree' | 'gin' | 'hash';
  unique?: boolean;
}

export interface EntityRelationship {
  type: 'oneToOne' | 'oneToMany' | 'manyToMany';
  model: string;
  foreignKey: string;
  backReference?: string;
}

// API Endpoints
export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  description: string;
  requiresAuth?: boolean;
  queryParams?: QueryParameter[];
  bodySchema?: any;
}

export interface QueryParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

// Generated Files
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'database' | 'api' | 'config' | 'data' | 'migration' | 'test';
}

export interface GeneratedProject {
  files: GeneratedFile[];
  models: DataModel[];
  endpoints: APIEndpoint[];
  config: BackendGeneratorConfig;
  deploymentFiles: GeneratedFile[];
  metadata?: {
    generatedAt: Date;
    aiAnalysisUsed: boolean;
    totalEndpoints: number;
    spatialEndpoints: number;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

// AI Analysis Results
export interface DetectedEntity {
  name: string;
  tableName: string;
  description?: string;
  fields: DatabaseField[];
  indexes?: string[];
  sourceElements: string[];
  confidence: number;
  reasoning: string;
}

export interface SuggestedRelationship {
  from: string;
  to: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToMany';
  confidence: number;
  reasoning: string;
  foreignKey?: string;
  spatialContext?: string;
}

export interface AIEntityAnalysis {
  entities: DetectedEntity[];
  insights: string[];
  confidence: number;
  businessDomain?: string;
}

export interface AIRelationshipAnalysis {
  relationships: SuggestedRelationship[];
  insights: string[];
  confidence: number;
}

export interface AIEndpointAnalysis {
  endpoints: APIEndpoint[];
  authEndpoints: string[];
  spatialEndpoints: string[];
  confidence: number;
}

export interface AISeedDataAnalysis {
  dataTypes: Array<{
    entity: string;
    sampleCount: number;
    theme: string;
    spatialPattern: string;
    examples: any[];
  }>;
  themes: string[];
  spatialPatterns: Record<string, any>;
  confidence: number;
}

// Smart Data Generation
export interface SmartDataConfig {
  recordsPerEntity?: number;
  spatialBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  useRealisticData?: boolean;
  includeRelationships?: boolean;
  openaiApiKey?: string;
  debug?: boolean;
}

export interface GeneratedSeedData {
  entities: Record<string, Record<string, any>[]>;
  relationships: Array<{
    from: string;
    to: string;
    fromId: any;
    toId: any;
  }>;
  spatialDistribution: Record<string, any>;
  metadata: {
    generatedAt: Date;
    totalRecords: number;
    themes: string[];
    confidence: number;
  };
}

// Database Generation
export interface DatabaseMigration {
  version: string;
  name: string;
  up: string;
  down: string;
  spatial?: boolean;
}

export interface DatabaseSchema {
  tables: DataModel[];
  migrations: DatabaseMigration[];
  indexes: DatabaseIndex[];
  extensions: string[];
}

// Deployment Configuration
export interface DeploymentConfig {
  provider: 'supabase' | 'custom';
  database: {
    url?: string;
    name?: string;
    user?: string;
    password?: string;
  };
  api: {
    port?: number;
    cors?: boolean;
    rateLimiting?: boolean;
  };
  environment: 'development' | 'staging' | 'production';
}

// Error Handling
export interface BackendGenerationError {
  type: 'ai_analysis_error' | 'database_error' | 'api_error' | 'file_error';
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}

// Performance Metrics
export interface BackendGenerationMetrics {
  generationTime: number;
  aiAnalysisTime?: number;
  modelsGenerated: number;
  endpointsGenerated: number;
  filesGenerated: number;
  estimatedDatabaseSize: string;
  estimatedAPIResponseTime: string;
  spatialQuerySupport: boolean;
}