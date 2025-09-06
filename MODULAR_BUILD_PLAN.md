# Modular Build Plan: Spatial Kernel

## Overview

Building the spatial kernel in tiny, testable increments. Each module can be tested independently before integration.

---

## Module 1: Basic Viewport (30 min)

### Task 1.1: Create Package Structure

```bash
# TEST POINT 1.1
cd packages
mkdir spatial-kernel
cd spatial-kernel
pnpm init
# Should see: package.json created
```

### Task 1.2: Viewport Class

Create minimal Viewport that just tracks position:

```typescript
class Viewport {
  x: number = 0;
  y: number = 0;
  scale: number = 1;
}
```

### Task 1.3: Test Viewport Standalone

```bash
# TEST POINT 1.2
cd packages/spatial-kernel
npx tsx src/viewport.test.ts
# Should see: Position: 0,0 Scale: 1
```

---

## Module 2: Viewport Methods (20 min)

### Task 2.1: Add Pan Method

```typescript
pan(dx: number, dy: number) {
  this.x += dx
  this.y += dy
}
```

### Task 2.2: Add Zoom Method

```typescript
zoom(factor: number) {
  this.scale *= factor
}
```

### Task 2.3: Test Methods

```bash
# TEST POINT 2.1
npx tsx src/viewport.test.ts
# Should see: After pan: 100,50
# Should see: After zoom: 2
```

---

## Module 3: Semantic Levels (20 min)

### Task 3.1: Create SemanticLevel Enum

```typescript
enum SemanticLevel {
  Quantum = "quantum",
  Atomic = "atomic",
  Standard = "standard",
  System = "system",
}
```

### Task 3.2: Add getSemanticLevel Function

```typescript
function getSemanticLevel(scale: number): SemanticLevel {
  if (scale < 0.1) return SemanticLevel.Quantum;
  if (scale < 0.5) return SemanticLevel.Atomic;
  if (scale < 2) return SemanticLevel.Standard;
  return SemanticLevel.System;
}
```

### Task 3.3: Test Semantic Levels

```bash
# TEST POINT 3.1
npx tsx src/semantic.test.ts
# Should see: Scale 0.05 = quantum
# Should see: Scale 1.0 = standard
# Should see: Scale 10.0 = system
```

---

## Module 4: Query Generator (30 min)

### Task 4.1: Basic Query Generation

```typescript
function generateQuery(viewport: Viewport): string {
  const level = getSemanticLevel(viewport.scale);
  if (level === SemanticLevel.System) {
    return "SELECT COUNT(*) FROM users";
  }
  return "SELECT * FROM users LIMIT 10";
}
```

### Task 4.2: Test Query Generation

```bash
# TEST POINT 4.1
npx tsx src/query.test.ts
# Should see different queries at different scales
```

---

## Module 5: Build & Export (15 min)

### Task 5.1: Create index.ts

Export all modules from single entry point

### Task 5.2: Build Package

```bash
# TEST POINT 5.1
cd packages/spatial-kernel
pnpm build
# Should see: dist/index.js created
```

---

## Module 6: Integrate with Serve (20 min)

### Task 6.1: Import in serve.ts

```typescript
import { Viewport, getSemanticLevel } from "@fir/spatial-kernel";
```

### Task 6.2: Use in Browser

Update HTML to use spatial kernel functions

### Task 6.3: Test Integration

```bash
# TEST POINT 6.1
pnpm serve examples/agency-dashboard/app.ir.json
# Open browser
# Check console for semantic levels
# Check UI shows different queries at different zoom
```

---

## Module 7: Visual Feedback (15 min)

### Task 7.1: Add Debug Overlay

Show current position, scale, semantic level in UI

### Task 7.2: Test Visual Feedback

```bash
# TEST POINT 7.1
# Refresh browser
# Should see overlay with:
# - Position: X, Y
# - Scale: 1.0x
# - Level: standard
# - Query: SELECT * FROM...
```

---

## Success Criteria

### After Module 1-2

- [ ] Can create viewport
- [ ] Can pan viewport
- [ ] Can zoom viewport
- [ ] Console shows position/scale

### After Module 3-4

- [ ] Semantic levels change with zoom
- [ ] Queries change with zoom
- [ ] Console shows correct level

### After Module 5-6

- [ ] Package builds cleanly
- [ ] Serve command uses spatial-kernel
- [ ] Browser shows semantic zoom

### After Module 7

- [ ] Visual overlay works
- [ ] All values update live
- [ ] Smooth 60fps operation

---

## Testing Commands Cheatsheet

```bash
# Quick test viewport
echo "console.log(new Viewport())" | npx tsx

# Test semantic levels
echo "console.log(getSemanticLevel(0.1))" | npx tsx

# Test full integration
pnpm serve examples/agency-dashboard/app.ir.json
curl http://localhost:8080/health

# Browser console tests
viewport.pan(100, 100)
viewport.zoom(2)
getSemanticLevel(viewport.scale)
```

---

## Emergency Rollback

If something breaks:

```bash
# Revert to last working state
git stash
pnpm build
pnpm serve examples/agency-dashboard/app.ir.json
```

---

## Next Modules (Future)

- Module 8: Bounds checking
- Module 9: Smooth animations
- Module 10: Tile system
- Module 11: Portal detection
- Module 12: Journey planning

Each module builds on the previous, but can be tested independently.

**Ready? Start with Module 1!**
