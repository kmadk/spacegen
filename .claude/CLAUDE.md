# Claude Code Implementation Guide for FIR

_Version 2.0 - Clean Implementation Strategy_

## Project Overview for Claude Code

**What we're building:** FIR transforms Figma designs into complete full-stack spatial web applications. Designers create in Figma, we generate the database, API, and spatial frontend automatically.

**Key innovation:** Spatial navigation + full-stack generation. Unlike Webflow (frontend-only), we create complete applications with backends.

**Technical approach:** Use proven libraries (deck.gl, D3) for spatial foundation, focus innovation on Figma→App pipeline.

## Repository Structure (Clean Slate)

```
fir-v2/
├── packages/
│   ├── figma-bridge/         # Figma API integration + analysis
│   ├── spatial-runtime/      # deck.gl + semantic zoom + cinematic nav
│   ├── fullstack-generator/  # Database + API generation from designs
│   ├── deployment/           # Production deployment orchestration
│   └── cli/                  # Command-line interface
├── examples/                 # Test Figma files and demos
├── docs/                     # Technical documentation
└── tools/                    # Development utilities
```

## Implementation Priority Order

### Phase 1: Spatial Runtime (Week 1-2)
**Goal**: Replace custom spatial engine with deck.gl + HTML hybrid system

```typescript
// packages/spatial-runtime/src/index.ts
export class HybridSpatialEngine {
  private deck: Deck;
  private htmlOverlay: HTMLOverlaySystem;
  
  constructor(container: HTMLElement) {
    // deck.gl for performance and spatial positioning
    this.deck = new Deck({
      canvas: container.querySelector('.spatial-canvas'),
      initialViewState: { zoom: 1, target: [0, 0] }
    });
    
    // HTML overlay for forms and interactive elements
    this.htmlOverlay = new HTMLOverlaySystem(container);
    
    // Sync deck.gl viewport with HTML transforms
    this.deck.setProps({
      onViewStateChange: (viewState) => this.htmlOverlay.updateTransform(viewState)
    });
  }
}
```

### Phase 2: Figma Integration (Week 3-4)
**Goal**: Figma file → Application structure analysis

```typescript
// packages/figma-bridge/src/analyzer.ts
export class FigmaAnalyzer {
  async analyzeFile(fileId: string, token: string): Promise<ApplicationStructure> {
    // 1. Fetch complete Figma file with dependencies
    const figmaFile = await this.fetchCompleteFile(fileId, token);
    
    // 2. Infer database models from repeated patterns
    const dataModels = this.inferDataModels(figmaFile);
    
    // 3. Extract spatial layout and relationships
    const spatialLayout = this.buildSpatialLayout(figmaFile);
    
    // 4. Detect data bindings ({{variable}} patterns, naming conventions)
    const dataBindings = this.detectDataBindings(figmaFile);
    
    return { dataModels, spatialLayout, dataBindings };
  }
}
```

### Phase 3: Full-Stack Generation (Week 5-6)
**Goal**: Application structure → Complete backend + frontend

```typescript
// packages/fullstack-generator/src/generator.ts
export class FullStackGenerator {
  generate(appStructure: ApplicationStructure): GeneratedApplication {
    return {
      database: this.generateDatabase(appStructure.dataModels),
      api: this.generateAPI(appStructure.dataModels),
      frontend: this.generateSpatialFrontend(appStructure.spatialLayout),
      deployment: this.generateDeploymentConfig()
    };
  }
}
```

### Phase 4: Deployment (Week 7-8)
**Goal**: One-command deployment to production

```bash
# The holy grail command
npx fir deploy --figma-file=ABC123 --domain=myapp.com
```

## Key Technical Decisions for Implementation

### 1. Hybrid Rendering Architecture

**Problem**: Need canvas performance + HTML form elements
**Solution**: deck.gl for positioning, HTML overlay for interactivity

```typescript
// Sync canvas viewport with DOM transforms
class HTMLOverlaySystem {
  updateTransform(viewState: ViewState) {
    const { zoom, target } = viewState;
    for (const element of this.elements) {
      const worldPos = element.worldPosition;
      const screenPos = this.worldToScreen(worldPos, viewState);
      element.dom.style.transform = `translate(${screenPos[0]}px, ${screenPos[1]}px) scale(${zoom})`;
    }
  }
}
```

### 2. Semantic Zoom Implementation

**Key insight**: Different zoom levels show different data, not just visual scale

```typescript
// packages/spatial-runtime/src/semantic-zoom.ts
export function getSemanticLevel(zoom: number): SemanticLevel {
  if (zoom < 0.1) return 'universal';  // High-level summaries
  if (zoom < 0.5) return 'system';     // Aggregated data
  if (zoom < 2.0) return 'standard';   // Normal detailed view
  return 'atomic';                     // Maximum detail + metadata
}

export function collapseDataForLevel(data: any[], level: SemanticLevel): any[] {
  switch (level) {
    case 'universal':
      return [{ type: 'summary', count: data.length, representative: data[0] }];
    case 'system':
      return aggregateByCategory(data);
    case 'standard':
      return data;
    case 'atomic':
      return data.map(item => ({ ...item, metadata: getMetadata(item) }));
  }
}
```

### 3. Database Schema Inference

**Challenge**: Infer database structure from visual design patterns
**Approach**: Pattern matching + heuristics + manual overrides

```typescript
// packages/figma-bridge/src/schema-inference.ts
export class SchemaInferencer {
  inferFromRepeatingPattern(instances: FigmaNode[]): DatabaseTable {
    const fields = [];
    const firstInstance = instances[0];
    
    // Find text nodes and infer field types
    for (const textNode of this.findTextNodes(firstInstance)) {
      const field = this.inferFieldType(textNode.characters, textNode.name);
      if (field) fields.push(field);
    }
    
    return {
      name: this.inferTableName(firstInstance.parent.name),
      fields,
      estimatedRows: instances.length * 100 // Extrapolate
    };
  }
  
  inferFieldType(content: string, nodeName: string): DatabaseField | null {
    // Email detection
    if (content.includes('@') || nodeName.includes('email')) {
      return { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] };
    }
    
    // Price detection
    if (/\$\d+/.test(content) || nodeName.includes('price')) {
      return { name: 'price', type: 'DECIMAL(10,2)' };
    }
    
    // Date detection
    if (/\d{4}-\d{2}-\d{2}/.test(content)) {
      return { name: 'date', type: 'TIMESTAMP' };
    }
    
    // Default to text
    return { name: this.cleanName(nodeName), type: 'TEXT' };
  }
}
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