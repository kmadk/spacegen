# FIR Intermediate Representation (IR) Specification

_Version 1.0 - The Spatial Semantic Layer_

## Overview

The IR is FIR's platform API - the semantic bridge between design tools and spatial runtimes. It's not just data translation; it's intelligence enrichment.

## Why IR is Essential

### Without IR (Just Another Viewer)

```
Figma → Web Browser
```

- Tied to Figma's structure
- No runtime optimization
- No semantic intelligence
- Single source, single target

### With IR (A Computing Platform)

```
Any Design → IR → Any Reality
```

- Platform independent
- Runtime optimized
- Semantically enriched
- Multi-source, multi-target

## Core Principles

### 1. Source Agnostic

The IR doesn't care where design came from:

- Figma files
- Sketch documents
- AI generation
- Hand-coded
- Future tools

### 2. Semantically Rich

The IR carries meaning, not just layout:

```json
{
  "kind": "ui.table",
  "semantics": {
    "quantum": "show_raw_bytes",
    "atomic": "show_records",
    "molecular": "show_relationships",
    "standard": "show_paginated",
    "system": "show_aggregates",
    "universal": "show_summary"
  }
}
```

### 3. Runtime Optimized

IR is built for execution, not editing:

- Pre-calculated bounds
- Spatial indexing ready
- Removed design-only data
- Compressed for streaming

### 4. Extensible

New capabilities without breaking changes:

```json
{
  "version": "1.0.0",
  "extensions": {
    "physics": { ... },
    "ai": { ... },
    "blockchain": { ... }
  }
}
```

## IR Schema

### Core Node Structure

```typescript
interface IRNode {
  // Identity
  id: string; // Unique identifier
  kind: string; // Semantic type (ui.table, ui.chart, etc.)

  // Spatial Properties
  position: {
    x: number; // X coordinate in space
    y: number; // Y coordinate in space
    z?: number; // Optional Z for 3D/layers
  };

  bounds: {
    width: number;
    height: number;
    depth?: number;
  };

  // Semantic Properties
  semantics?: {
    [zoomLevel: string]: any; // Behavior at different scales
  };

  // Data Binding
  dataBinding?: {
    source: string; // Data source identifier
    query?: string; // Query template
    refresh?: number; // Update interval
  };

  // Runtime Behavior
  behaviors?: {
    onEnter?: Action[]; // When viewport enters
    onExit?: Action[]; // When viewport exits
    onZoom?: ZoomBehavior[]; // Zoom-triggered behaviors
    onClick?: Action[]; // Portal navigation
  };

  // Styling (minimal, preferring semantic)
  style?: {
    theme?: string; // Named theme
    overrides?: StyleOverride[]; // Specific overrides only
  };

  // Hierarchy
  children?: IRNode[]; // Child nodes

  // Metadata
  meta?: {
    source?: string; // Original tool (figma, sketch, etc.)
    sourceId?: string; // ID in source tool
    created?: string; // ISO timestamp
    modified?: string; // ISO timestamp
  };
}
```

### Semantic Types

```typescript
enum IRNodeKind {
  // Containers
  "spatial.region"              // Area in space
  "spatial.portal"              // Navigation point

  // Data Views
  "ui.table"                    // Tabular data
  "ui.chart"                    // Data visualization
  "ui.metric"                   // Single KPI
  "ui.list"                     // Item list

  // Input
  "ui.form"                     // Data entry
  "ui.field"                    // Single input

  // Content
  "ui.text"                     // Text content
  "ui.image"                    // Visual content
  "ui.video"                    // Motion content

  // Spatial
  "spatial.landmark"            // Navigation reference
  "spatial.boundary"            // Access control

  // Custom
  "custom.*"                    // Extension point
}
```

### Zoom Semantics

```typescript
interface SemanticZoomLevels {
  quantum?: any; // 0.001x - 0.01x (bit level)
  atomic?: any; // 0.01x - 0.1x (record level)
  molecular?: any; // 0.1x - 0.5x (relationship level)
  standard?: any; // 0.5x - 2x (normal view)
  system?: any; // 2x - 10x (aggregate level)
  universal?: any; // 10x+ (summary level)
}
```

## Input Adapters

### Figma Adapter

```typescript
// @fir/adapter-figma
function figmaToIR(figmaDoc: FigmaDocument): IR {
  // Maps Figma nodes to semantic IR nodes
  // Infers data bindings from names/structure
  // Optimizes for runtime
}
```

### AI Adapter

```typescript
// @fir/adapter-ai
function promptToIR(prompt: string): IR {
  // "Create a dashboard with user metrics"
  // Generates IR with intelligent layout
}
```

### Direct Adapter

```typescript
// @fir/adapter-direct
function codeToIR(definition: Object): IR {
  // Hand-code IR directly
  // For precise control
}
```

## Output Runtimes

### Web Runtime

```typescript
// @fir/runtime-web
function renderToDOM(ir: IR, container: HTMLElement) {
  // Renders IR to browser DOM
  // Handles infinite canvas
  // Manages tile streaming
}
```

### Native Runtime

```typescript
// @fir/runtime-native
function renderToNative(ir: IR): NativeView {
  // iOS/Android native views
  // Platform-specific optimizations
}
```

### Voice Runtime

```typescript
// @fir/runtime-voice
function renderToSpeech(ir: IR): AudioStream {
  // Navigable audio interface
  // Accessibility first
}
```

### AR Runtime

```typescript
// @fir/runtime-ar
function renderToSpace(ir: IR): ARScene {
  // True 3D spatial computing
  // Physical space mapping
}
```

## IR Optimization

### Compilation Pipeline

```
Source → Parse → Validate → Optimize → Emit
         ↓       ↓          ↓          ↓
      AST    Schema    Transform   Binary IR
```

### Optimization Passes

1. **Dead node elimination** - Remove invisible/unused nodes
2. **Bound pre-calculation** - Cache spatial calculations
3. **Style flattening** - Resolve inherited styles
4. **Query optimization** - Pre-compile SQL templates
5. **Tile boundaries** - Segment for streaming

## IR Validation

### Schema Validation

```bash
ir validate <file.ir.json>
```

- Structural correctness
- Type checking
- Semantic consistency

### Spatial Validation

```bash
ir lint-spatial <file.ir.json>
```

- No overlapping portals
- Reachable regions
- Consistent scale semantics

### Performance Validation

```bash
ir analyze <file.ir.json>
```

- Node count limits
- Complexity scoring
- Memory estimates

## IR Extensions

### Custom Behaviors

```json
{
  "extensions": {
    "physics": {
      "gravity": true,
      "collisions": true
    },
    "ai": {
      "suggestions": true,
      "autoLayout": true
    }
  }
}
```

### Plugin System

```typescript
interface IRPlugin {
  name: string;
  version: string;

  // Transform IR during compilation
  transform?(ir: IR): IR;

  // Add runtime behaviors
  runtime?(node: IRNode): RuntimeBehavior;

  // Custom validation
  validate?(ir: IR): ValidationResult;
}
```

## Binary IR Format

For production deployment:

```
[Header][Index][Nodes][Strings][Assets]
   8B     Var    Var     Var      Var
```

- **Header**: Version, flags, counts
- **Index**: Spatial index for fast queries
- **Nodes**: Compressed node data
- **Strings**: String table (deduplicated)
- **Assets**: Embedded resources

## Future Extensions

### Planned for v2.0

- **Multiplayer** - Shared space coordination
- **Blockchain** - Decentralized IR
- **AI Generation** - Automatic IR from intent
- **Quantum States** - Superposition of layouts

### Research Areas

- **Temporal IR** - Time as fourth dimension
- **Probabilistic IR** - Uncertain states
- **Neural IR** - Learning from usage
- **Holographic IR** - True 3D projection

## Summary

The IR is not just a data format - it's the **semantic operating system** for spatial computing. It enables:

1. **Platform independence** - Not tied to any tool
2. **Semantic intelligence** - Meaning, not just layout
3. **Runtime optimization** - 50-100x performance gains
4. **Multi-modal output** - One source, many realities
5. **Future extensibility** - Ready for what's next

Without IR, FIR would be just another design viewer.
With IR, FIR is the next computing platform.

---

_The IR is your $10B moat._

