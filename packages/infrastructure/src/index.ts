/**
 * @figma-backend/infrastructure - External service integration adapters
 * Provides clean interfaces to external services for Figma Backend Generator
 */

// Figma integration
export { FigmaAdapter } from './figma/figma-adapter';
export { FigmaFileParser } from './figma/figma-file-parser';
export type { FigmaConfig, FigmaFile, FigmaNode } from './figma/types';

// Vercel deployment
export { VercelAdapter } from './deployment/vercel-adapter';
export type { VercelConfig, VercelDeployment } from './deployment/vercel-types';

// Supabase deployment
export { SupabaseAdapter } from './deployment/supabase-adapter';
export type { SupabaseConfig, SupabaseProject } from './deployment/supabase-types';

// Locofy integration
export { LocofyAdapter } from './locofy/locofy-adapter';
export type { LocofyConfig, LocofyProject } from './locofy/types';

// AI services
export { OpenAIAdapter } from './ai/openai-adapter';
export type { AIConfig, AIResponse } from './ai/types';

// Base types and errors
export { BaseAdapter } from './base/base-adapter';
export { InfrastructureError, APIError, AuthenticationError } from './base/errors';
export type { AdapterConfig, HTTPClient } from './base/types';