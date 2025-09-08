/**
 * @figma-backend/generator - Figma Backend Generation
 * 
 * AI-powered backend generation from Figma designs with:
 * - Database schema inference from UI patterns
 * - REST API endpoint generation
 * - Smart seed data generation
 * - Vercel + Supabase deployment
 * - Complete full-stack application generation
 */

// Main generator class
export { BackendGenerator } from './backend-generator.js';

// Integrations
export { FigmaIntegration } from './integrations/figma-integration.js';
export { LocofyMVPIntegration } from './integrations/locofy-mvp.js';

// AI-powered analyzers
export { AIPatternAnalyzer } from './analyzers/ai-pattern-analyzer.js';
export { VisionAnalyzer } from './analyzers/vision-analyzer.js';

// Data generators
export { SmartDataGenerator } from './generators/smart-data-generator.js';

// Utilities
export { 
  createOpenAIParams,
  validateOpenAIResponse,
  parseOpenAIJSON,
  buildSystemPrompt,
  validateAPIKey
} from './utils/openai-utils.js';

// Types
export type {
  BackendGeneratorConfig,
  GeneratedProject,
  DesignData,
  DesignNode,
  DataModel,
  APIEndpoint,
  GeneratedFile,
  DatabaseField,
  EntityRelationship,
  AIAnalysisConfig,
  AIEntityAnalysis,
  AIRelationshipAnalysis,
  AIEndpointAnalysis,
  AISeedDataAnalysis,
  DetectedEntity,
  SuggestedRelationship,
  SmartDataConfig,
  GeneratedSeedData,
  DatabaseMigration,
  DatabaseSchema,
  DeploymentConfig,
  BackendGenerationError,
  BackendGenerationMetrics,
  DesignScreenshot,
  VisionAnalysisResult,
  VisualPattern,
  CombinedAnalysis
} from './types.js';