# Claude Code Implementation Guide for FIR

_Version 3.0 - Production-Ready AI Backend Generation_

## Project Overview for Claude Code

**What we're building:** FIR uses GPT-5 to automatically generate complete backend systems from Figma and Penpot designs. Upload a design file, get a production-ready PostgreSQL database, REST API, and deployment configuration.

**Key innovation:** AI-powered design → database schema inference. Unlike other design-to-code tools (Lovable, v0), we analyze visual patterns to automatically generate the entire backend data layer.

**Technical approach:** Direct design platform integration → GPT-5 analysis → Standards-validated backend generation → One-command deployment.

## Current Repository Structure (Production-Ready)

```
fir-monorepo/
├── packages/
│   ├── backend-generator/           # Core GPT-5 backend generation engine
│   ├── figma-locofy-backend/        # Product 4: Figma → Locofy → Backend
│   ├── penpot-fullstack-generator/  # Product 3: Penpot → Full-stack + Deploy  
│   ├── penpot-spatial-generator/    # Product 1: Penpot → Spatial UI
│   └── infrastructure/              # Shared: Figma/Penpot/AI/Deployment adapters
├── examples/                        # Test design files and demos
└── docs/                           # Technical documentation

# Planned 2.1/2.2 Split:
├── packages/
│   ├── core/                       # Shared AI analysis & file generation
│   ├── figma-backend-generator/    # Product 2.1: Direct Figma → Backend
│   ├── penpot-backend-generator/   # Product 2.2: Direct Penpot → Backend
│   ├── figma-locofy-backend/       # Product 4: Uses 2.1
│   ├── penpot-fullstack-generator/ # Product 3: Uses 2.2
│   └── infrastructure/             # Shared services
```

## Current Implementation Status (COMPLETE)

### ✅ Core AI Backend Generation Engine
**Status**: Production-ready with 650+ lines of working code

```typescript
// packages/backend-generator/src/backend-generator.ts
export class BackendGenerator {
  async generateFromElements(elements: SpatialElement[]): Promise<GeneratedProject> {
    // GPT-5 analysis of design patterns
    const analysis = await this.aiAnalyzer.analyzeDesignPatterns(elements);
    
    // Generate complete backend project
    return {
      files: [...databaseFiles, ...apiFiles, ...seedFiles],
      models: this.generateModelsFromAnalysis(analysis.entities.entities),
      endpoints: this.generateEndpointsFromAnalysis(analysis.endpoints.endpoints),
      deploymentFiles: []
    };
  }
}
```

**Generates:**
- PostgreSQL schemas with PostGIS spatial support
- Drizzle ORM models and migrations  
- Express.js API routes with full CRUD operations
- Realistic AI-generated seed data
- Complete package.json with dependencies

### ✅ GPT-5 AI Pattern Analyzer
**Status**: Production-ready with 668+ lines of sophisticated analysis

```typescript
// packages/backend-generator/src/analyzers/ai-pattern-analyzer.ts
export class AIPatternAnalyzer {
  async analyzeDesignPatterns(elements: SpatialElement[]): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis; 
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
  }> {
    // Parallel GPT-5 analysis with expert-level system prompts
    const [entities, relationships, endpoints, seedData] = await Promise.all([
      this.analyzeEntities(elements),    // Database schema inference
      this.analyzeRelationships(elements), // Foreign key relationships
      this.analyzeEndpoints(elements),   // REST API generation
      this.analyzeSeedDataRequirements(elements) // Realistic test data
    ]);
  }
}
```

### ✅ Infrastructure & Platform Integration
**Status**: Complete adapters for all major platforms

- **Figma Adapter**: Full API integration with Dev Mode support
- **Penpot Adapter**: Direct API access for open-source designs
- **OpenAI Integration**: GPT-5 with structured JSON responses
- **Deployment Orchestration**: Vercel, AWS, GCP support

### 🔄 Next Phase: Product 2.1/2.2 Split
**Goal**: Direct design platform integration for backend generation (no spatial abstraction)

```bash
# Product 2.1: Direct Figma → Backend (no spatial UI)
npx @fir/figma-backend-generator generate --file-id ABC123

# Product 2.2: Direct Penpot → Backend (no spatial UI)
npx @fir/penpot-backend-generator generate --file-url https://design.penpot.app/...
```

**Note**: Products 1 and 3 still use spatial runtime for spatial UI generation. The 2.1/2.2 split only affects backend-only generation.

## Key Technical Achievements

### 1. GPT-5 AI-Powered Schema Inference

**Innovation**: First tool to use AI for visual design → database schema inference
**Implementation**: Multi-phase parallel analysis with expert system prompts

```typescript
// packages/backend-generator/src/analyzers/ai-pattern-analyzer.ts
export class AIPatternAnalyzer {
  async analyzeDesignPatterns(elements: SpatialElement[]): Promise<AnalysisResult> {
    // Parallel GPT-5 analysis for maximum accuracy
    const [entities, relationships, endpoints, seedData] = await Promise.all([
      this.analyzeEntities(elements),      // Database table inference
      this.analyzeRelationships(elements), // Foreign key relationships  
      this.analyzeEndpoints(elements),     // REST API generation
      this.analyzeSeedDataRequirements(elements) // Realistic test data
    ]);
    
    return { entities, relationships, endpoints, seedData };
  }
  
  private buildEntityAnalysisPrompt(elements: SpatialElement[]): string {
    return `# Database Entity Analysis Task
    
You are an expert database architect analyzing spatial UI elements to design a production-ready PostgreSQL schema.

## Sample Data from UI Elements:
${JSON.stringify(sampleData, null, 2)}

Generate entities that are:
- Normalized with proper relationships
- Spatial-aware with PostGIS geometry fields  
- Performance-optimized with appropriate indexes
- Production-ready with standard fields (id, timestamps)

Response format: {entities: [...], spatialConsiderations: [...]}`;
  }
}
```

### 2. Complete Backend Code Generation

**Achievement**: Generates production-ready backend projects with zero manual coding
**Output**: PostgreSQL + Drizzle ORM + Express.js + Migrations + Seeds

```typescript
// packages/backend-generator/src/backend-generator.ts 
export class BackendGenerator {
  async generateFromElements(elements: SpatialElement[]): Promise<GeneratedProject> {
    const analysis = await this.aiAnalyzer.analyzeDesignPatterns(elements);
    
    return {
      files: [
        // Database layer
        ...this.generateDatabaseFiles(models),     // schema.sql + migrations
        ...this.generateAPIFiles(endpoints),       // Express.js routes
        ...await this.generateSeedData(models),    // AI-generated test data
        { path: 'package.json', content: this.generatePackageJson() }
      ],
      models,
      endpoints,
      deploymentFiles: []
    };
  }
}
```

### 3. Industry Standards Validation

**Innovation**: Auto-validates generated schemas against OAuth 2.0, GDPR, PostGIS best practices
**Implementation**: Multi-round AI refinement with compliance checking

```typescript
// Built-in standards validation
const validatedSchema = await this.validateAgainstStandards(schema, [
  'oauth2',    // Email field length (320 chars), proper user table structure
  'gdpr',      // Consent fields, data retention policies  
  'postgis',   // Spatial indexing optimization
  'stripe'     // Payment field compatibility
]);
```

## Development Workflow for Claude Code

### Setting Up New Clean Repository

1. **Initialize fresh monorepo**:
```bash
mkdir fir-v2 && cd fir-v2
npm init -y
npm install -D typescript @types/node tsup vitest
npm install deck.gl d3 react react-dom
```

2. **Create package structure**:
```bash
mkdir -p packages/{figma-bridge,spatial-runtime,fullstack-generator,deployment,cli}
mkdir -p examples docs tools
```

3. **Configure workspace**:
```json
// package.json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test"
  }
}
```

### Key Dependencies by Package

```json
// packages/spatial-runtime/package.json
{
  "dependencies": {
    "deck.gl": "^8.9.0",
    "d3-zoom": "^3.0.0",
    "d3-selection": "^3.0.0"
  }
}

// packages/figma-bridge/package.json  
{
  "dependencies": {
    "axios": "^1.0.0"
  }
}

// packages/fullstack-generator/package.json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0"
  }
}
```

### Testing Strategy

```typescript
// packages/spatial-runtime/src/__tests__/semantic-zoom.test.ts
import { describe, it, expect } from 'vitest';
import { getSemanticLevel, collapseDataForLevel } from '../semantic-zoom';

describe('Semantic Zoom', () => {
  it('should return correct semantic level for zoom values', () => {
    expect(getSemanticLevel(0.05)).toBe('universal');
    expect(getSemanticLevel(0.3)).toBe('system');
    expect(getSemanticLevel(1.0)).toBe('standard');
    expect(getSemanticLevel(5.0)).toBe('atomic');
  });
  
  it('should collapse data appropriately for universal level', () => {
    const data = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    const result = collapseDataForLevel(data, 'universal');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('summary');
  });
});
```

## Common Implementation Patterns

### 1. Error Handling Pattern

```typescript
// All async operations should follow this pattern
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Usage:
const figmaFile = await withRetry(() => 
  fetch(`https://api.figma.com/v1/files/${fileId}`, {
    headers: { 'X-Figma-Token': token }
  })
);
```

### 2. Configuration Management

```typescript
// packages/cli/src/config.ts
export interface FIRConfig {
  figma: {
    token?: string;
    fileId?: string;
  };
  deployment: {
    domain?: string;
    tier: 'starter' | 'pro' | 'enterprise';
    provider: 'vercel' | 'aws' | 'gcp';
  };
  spatial: {
    tileSize: number;
    semanticLevels: Record<string, { min?: number; max?: number }>;
  };
}
```

### 3. Logging Pattern

```typescript
// packages/cli/src/logger.ts
export class Logger {
  constructor(private context: string) {}
  
  info(message: string, data?: any) {
    console.log(`ℹ️ [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  
  success(message: string, data?: any) {
    console.log(`✅ [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  
  error(message: string, error?: any) {
    console.error(`❌ [${this.context}] ${message}`, error?.message || error);
  }
}
```

## Debugging & Development Tools

### 1. Development Server with Hot Reload

```typescript
// packages/cli/src/dev-server.ts
export async function startDevServer(figmaFileId: string) {
  const logger = new Logger('DevServer');
  
  // Watch for Figma file changes (polling)
  const watcher = setInterval(async () => {
    try {
      const latestFile = await fetchFigmaFile(figmaFileId);
      if (this.hasChanged(latestFile)) {
        logger.info('Figma file changed, regenerating...');
        await this.regenerateAndReload();
      }
    } catch (error) {
      logger.error('Error checking for changes', error);
    }
  }, 5000); // Check every 5 seconds
}
```

### 2. Visual Debugging for Spatial Layout

```typescript
// packages/spatial-runtime/src/debug-overlay.ts
export class SpatialDebugOverlay {
  constructor(private canvas: HTMLCanvasElement) {}
  
  showDebugInfo(enabled: boolean) {
    if (!enabled) return;
    
    // Show spatial grid
    this.drawGrid();
    
    // Show semantic zoom levels as color-coded regions
    this.drawSemanticRegions();
    
    // Show viewport bounds
    this.drawViewportBounds();
  }
}
```

## Performance Monitoring

```typescript
// packages/spatial-runtime/src/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    frameTime: [],
    queryTime: [],
    renderTime: []
  };
  
  startFrame() {
    return performance.now();
  }
  
  endFrame(startTime: number) {
    const frameTime = performance.now() - startTime;
    this.metrics.frameTime.push(frameTime);
    
    if (frameTime > 16.67) {
      console.warn(`Frame time exceeded budget: ${frameTime.toFixed(2)}ms`);
    }
  }
}
```

## Key Success Metrics for Claude Code Sessions

1. **Development Velocity**: Time to implement each phase
2. **Code Quality**: Test coverage, TypeScript coverage, ESLint compliance
3. **Performance Targets**: 60fps spatial navigation, <100ms API responses
4. **User Experience**: Smooth transitions, no loading states for adjacent regions
5. **Deployment Success**: <5 minute Figma→Production time

## Common Pitfalls to Avoid

1. **Over-engineering spatial engine**: Use proven libraries, focus on unique value
2. **Ignoring mobile experience**: Plan responsive fallbacks early
3. **Complex data binding logic**: Start simple, add complexity incrementally
4. **Insufficient error handling**: Network requests fail, plan for it
5. **Performance assumptions**: Measure everything, optimize based on data

---

*This guide provides Claude Code with the complete context and implementation strategy for building FIR. The focus is on practical implementation steps, proven patterns, and clear success criteria.*