/**
 * Types for Full-stack Generator - converts spatial elements to database schemas and APIs
 */

// Generator Configuration
export interface FullstackGeneratorConfig {
  /** Project name */
  projectName: string;
  /** Database provider */
  database: DatabaseProvider;
  /** API framework */
  apiFramework: APIFramework;
  /** Deployment target */
  deployment: DeploymentTarget;
  /** Enable spatial queries */
  enableSpatialQueries?: boolean;
  /** Output directory */
  outputDir?: string;
  /** Debug mode */
  debug?: boolean;
}

export type DatabaseProvider = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
export type APIFramework = 'express' | 'fastify' | 'nextjs' | 'trpc' | 'graphql';
export type DeploymentTarget = 'vercel' | 'railway' | 'aws' | 'gcp' | 'docker' | 'local';

// Spatial Data Models
export interface SpatialDataModel {
  /** Model name */
  name: string;
  /** Database table/collection name */
  tableName: string;
  /** Model fields */
  fields: SpatialField[];
  /** Spatial indexes */
  spatialIndexes: SpatialIndex[];
  /** Relationships to other models */
  relationships: ModelRelationship[];
  /** Model metadata */
  metadata: ModelMetadata;
}

export interface SpatialField {
  /** Field name */
  name: string;
  /** Data type */
  type: FieldType;
  /** Whether field is required */
  required: boolean;
  /** Whether field is unique */
  unique?: boolean;
  /** Default value */
  defaultValue?: any;
  /** Field constraints */
  constraints?: FieldConstraints;
  /** Spatial properties if applicable */
  spatial?: SpatialFieldProperties;
}

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'json' 
  | 'geometry' 
  | 'point' 
  | 'polygon'
  | 'reference'
  | 'array';

export interface FieldConstraints {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
}

export interface SpatialFieldProperties {
  /** Coordinate system (SRID) */
  srid?: number;
  /** Geometry type for PostGIS */
  geometryType?: 'POINT' | 'LINESTRING' | 'POLYGON' | 'MULTIPOINT' | 'MULTILINESTRING' | 'MULTIPOLYGON';
  /** Enable spatial indexing */
  spatialIndex?: boolean;
}

export interface SpatialIndex {
  /** Index name */
  name: string;
  /** Fields included in index */
  fields: string[];
  /** Index type */
  type: 'btree' | 'gist' | 'gin' | 'spatial';
  /** Index options */
  options?: Record<string, any>;
}

export interface ModelRelationship {
  /** Relationship name */
  name: string;
  /** Related model */
  model: string;
  /** Relationship type */
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  /** Foreign key field */
  foreignKey?: string;
  /** Junction table for many-to-many */
  junctionTable?: string;
}

export interface ModelMetadata {
  /** Source Figma element ID */
  figmaElementId?: string;
  /** Element type */
  elementType?: string;
  /** Spatial bounds */
  spatialBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Creation timestamp */
  createdAt: string;
  /** Auto-generated */
  generated: boolean;
}

// API Generation
export interface APIEndpoint {
  /** Endpoint path */
  path: string;
  /** HTTP method */
  method: HTTPMethod;
  /** Handler function name */
  handler: string;
  /** Request schema */
  requestSchema?: APISchema;
  /** Response schema */
  responseSchema?: APISchema;
  /** Query parameters */
  queryParams?: QueryParameter[];
  /** Path parameters */
  pathParams?: PathParameter[];
  /** Authentication required */
  auth?: boolean;
  /** Rate limiting */
  rateLimit?: RateLimitConfig;
  /** Spatial query support */
  spatialQuery?: boolean;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APISchema {
  /** Schema type */
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  /** Object properties */
  properties?: Record<string, APISchemaProperty>;
  /** Required fields */
  required?: string[];
  /** Array item type */
  items?: APISchema;
}

export interface APISchemaProperty {
  /** Property type */
  type: string;
  /** Property description */
  description?: string;
  /** Property format */
  format?: string;
  /** Enum values */
  enum?: any[];
  /** Nested properties */
  properties?: Record<string, APISchemaProperty>;
  /** Array item type */
  items?: APISchemaProperty;
}

export interface QueryParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Required parameter */
  required?: boolean;
  /** Default value */
  default?: any;
  /** Parameter description */
  description?: string;
}

export interface PathParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Parameter description */
  description?: string;
}

export interface RateLimitConfig {
  /** Requests per window */
  requests: number;
  /** Time window in seconds */
  window: number;
}

// Generated Output
export interface GeneratedProject {
  /** Project configuration */
  config: FullstackGeneratorConfig;
  /** Generated files */
  files: GeneratedFile[];
  /** Data models */
  models: SpatialDataModel[];
  /** API endpoints */
  endpoints: APIEndpoint[];
  /** Database migrations */
  migrations: DatabaseMigration[];
  /** Deployment configuration */
  deployment: DeploymentConfig;
  /** Generated documentation */
  documentation: GeneratedDocumentation;
}

export interface GeneratedFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'typescript' | 'javascript' | 'sql' | 'json' | 'yaml' | 'markdown' | 'dockerfile' | 'text';
  /** File description */
  description: string;
  /** Whether file is executable */
  executable?: boolean;
}

export interface DatabaseMigration {
  /** Migration ID */
  id: string;
  /** Migration name */
  name: string;
  /** Up migration SQL */
  up: string;
  /** Down migration SQL */
  down: string;
  /** Migration timestamp */
  timestamp: string;
  /** Dependencies */
  dependencies?: string[];
}

export interface DeploymentConfig {
  /** Deployment target */
  target: DeploymentTarget;
  /** Environment variables */
  environment: Record<string, string>;
  /** Build commands */
  buildCommands: string[];
  /** Start command */
  startCommand: string;
  /** Health check endpoint */
  healthCheck?: string;
  /** Static file directories */
  staticDirs?: string[];
  /** Domain configuration */
  domains?: string[];
}

export interface GeneratedDocumentation {
  /** API documentation */
  apiDocs: string;
  /** Database schema docs */
  schemaDocs: string;
  /** Setup instructions */
  setup: string;
  /** Deployment guide */
  deployment: string;
  /** Example usage */
  examples: string;
}

// Analysis Types
export interface SpatialAnalysis {
  /** Detected data entities */
  entities: DetectedEntity[];
  /** Suggested relationships */
  relationships: SuggestedRelationship[];
  /** Spatial queries to support */
  spatialQueries: SpatialQueryType[];
  /** Performance recommendations */
  performance: PerformanceRecommendation[];
}

export interface DetectedEntity {
  /** Entity name */
  name: string;
  /** Source spatial elements */
  sourceElements: string[];
  /** Detected fields */
  fields: DetectedField[];
  /** Entity type (form, content, navigation, etc.) */
  type: EntityType;
  /** Confidence score */
  confidence: number;
}

export type EntityType = 'form' | 'content' | 'navigation' | 'media' | 'user' | 'spatial' | 'metadata';

export interface DetectedField {
  /** Field name */
  name: string;
  /** Inferred type */
  type: FieldType;
  /** Source element property */
  source: string;
  /** Whether field appears required */
  required: boolean;
  /** Example values */
  examples?: any[];
}

export interface SuggestedRelationship {
  /** From entity */
  from: string;
  /** To entity */
  to: string;
  /** Relationship type */
  type: ModelRelationship['type'];
  /** Confidence score */
  confidence: number;
  /** Reasoning */
  reasoning: string;
}

export type SpatialQueryType = 
  | 'withinBounds' 
  | 'nearby' 
  | 'contains' 
  | 'intersects' 
  | 'distance'
  | 'clustering'
  | 'routing';

export interface PerformanceRecommendation {
  /** Recommendation type */
  type: 'index' | 'caching' | 'partitioning' | 'denormalization';
  /** Description */
  description: string;
  /** Implementation */
  implementation: string;
  /** Expected impact */
  impact: 'low' | 'medium' | 'high';
}

// Template System
export interface CodeTemplate {
  /** Template name */
  name: string;
  /** Template content with placeholders */
  template: string;
  /** Template variables */
  variables: Record<string, any>;
  /** Output file extension */
  extension: string;
}

export interface TemplateContext {
  /** Project configuration */
  config: FullstackGeneratorConfig;
  /** Data models */
  models: SpatialDataModel[];
  /** API endpoints */
  endpoints: APIEndpoint[];
  /** Utility functions */
  utils: TemplateUtils;
}

export interface TemplateUtils {
  /** Convert to camelCase */
  camelCase: (str: string) => string;
  /** Convert to PascalCase */
  pascalCase: (str: string) => string;
  /** Convert to snake_case */
  snakeCase: (str: string) => string;
  /** Convert to kebab-case */
  kebabCase: (str: string) => string;
  /** Pluralize word */
  pluralize: (str: string) => string;
  /** Singularize word */
  singularize: (str: string) => string;
}

// Validation Types
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Suggestions for improvement */
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Source location */
  source?: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Source location */
  source?: string;
}

export interface ValidationSuggestion {
  /** Suggestion type */
  type: 'optimization' | 'best-practice' | 'feature' | 'security';
  /** Suggestion message */
  message: string;
  /** Implementation details */
  implementation?: string;
}