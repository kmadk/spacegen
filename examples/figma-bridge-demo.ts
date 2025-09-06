/**
 * FIR Figma Bridge Demo
 * 
 * This example shows how to use the @fir/figma-bridge package to:
 * 1. Connect to Figma API
 * 2. Extract spatial elements from a Figma file
 * 3. Convert designs to spatial coordinates
 * 4. Generate HTML/CSS from Figma nodes
 */

import { FigmaBridge, SpatialMapper, DesignParser } from '@fir/figma-bridge';
import { SpatialEngine } from '@fir/spatial-runtime';

async function demonstrateFigmaBridge() {
  console.log('🚀 FIR Figma Bridge Demo');
  console.log('========================\n');

  // Example 1: Basic Usage with Mock Data
  console.log('1. Creating mock Figma data for demonstration...');
  
  const mockFigmaData = {
    id: 'demo-file',
    name: 'Demo Page',
    type: 'CANVAS' as const,
    children: [
      {
        id: 'hero-section',
        name: 'Hero Section',
        type: 'FRAME' as const,
        absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 800 },
        fills: [{
          type: 'SOLID' as const,
          color: { r: 0.95, g: 0.95, b: 0.98, a: 1 }
        }],
        children: [
          {
            id: 'main-title',
            name: 'Main Title',
            type: 'TEXT' as const,
            characters: 'Welcome to FIR',
            absoluteBoundingBox: { x: 100, y: 100, width: 600, height: 80 },
            style: {
              fontFamily: 'Inter',
              fontSize: 48,
              fontWeight: 700,
              textAlignHorizontal: 'LEFT' as const
            }
          },
          {
            id: 'subtitle',
            name: 'Subtitle',
            type: 'TEXT' as const,
            characters: 'Transform Figma designs into spatial web applications',
            absoluteBoundingBox: { x: 100, y: 200, width: 800, height: 60 },
            style: {
              fontFamily: 'Inter',
              fontSize: 24,
              fontWeight: 400,
              textAlignHorizontal: 'LEFT' as const
            }
          },
          {
            id: 'cta-button',
            name: 'CTA Button',
            type: 'RECTANGLE' as const,
            absoluteBoundingBox: { x: 100, y: 320, width: 200, height: 56 },
            fills: [{
              type: 'SOLID' as const,
              color: { r: 0.2, g: 0.6, b: 1.0, a: 1 }
            }],
            cornerRadius: 8
          }
        ]
      },
      {
        id: 'feature-grid',
        name: 'Feature Grid',
        type: 'FRAME' as const,
        absoluteBoundingBox: { x: 0, y: 900, width: 1200, height: 600 },
        children: [
          {
            id: 'feature-1',
            name: 'Feature Card',
            type: 'FRAME' as const,
            absoluteBoundingBox: { x: 50, y: 950, width: 350, height: 250 },
            fills: [{
              type: 'SOLID' as const,
              color: { r: 1, g: 1, b: 1, a: 1 }
            }],
            cornerRadius: 12
          },
          {
            id: 'feature-2',
            name: 'Feature Card',
            type: 'FRAME' as const,
            absoluteBoundingBox: { x: 425, y: 950, width: 350, height: 250 },
            fills: [{
              type: 'SOLID' as const,
              color: { r: 1, g: 1, b: 1, a: 1 }
            }],
            cornerRadius: 12
          }
        ]
      }
    ]
  };

  // Example 2: Using the Spatial Mapper
  console.log('2. Converting Figma coordinates to spatial coordinates...');
  
  const spatialMapper = new SpatialMapper({
    scale: 0.1, // Scale down from Figma pixels 
    baseUnit: 16, // 16px = 1 spatial unit
    flipY: true // Figma Y+ down, spatial Y+ up
  });

  // Convert the main title position
  const titleBounds = mockFigmaData.children[0].children[0].absoluteBoundingBox;
  const spatialTitle = spatialMapper.figmaToSpatial(titleBounds);
  
  console.log('Title spatial position:', {
    figma: titleBounds,
    spatial: spatialTitle
  });

  // Example 3: Using the Design Parser
  console.log('\n3. Parsing Figma nodes into spatial elements...');
  
  const parser = new DesignParser({
    spatialMapper,
    generateHTML: true,
    includeDebugInfo: false
  });

  const parseResult = parser.parseNodes([mockFigmaData]);
  
  console.log('Parse results:', {
    elements: parseResult.elements.length,
    warnings: parseResult.warnings.length,
    errors: parseResult.errors.length
  });

  // Show first few elements
  parseResult.elements.slice(0, 3).forEach(element => {
    console.log(`Element: ${element.id} (${element.type}) at (${element.position.x.toFixed(1)}, ${element.position.y.toFixed(1)})`);
  });

  // Example 4: Creating semantic regions
  console.log('\n4. Creating semantic regions for spatial navigation...');
  
  const regions = spatialMapper.createSemanticRegions([mockFigmaData]);
  
  console.log('Semantic regions:', {
    universal: regions.universal.length,
    system: regions.system.length,
    standard: regions.standard.length,
    atomic: regions.atomic.length
  });

  // Example 5: Real Figma Bridge Usage (commented out - requires API key)
  console.log('\n5. Example of real Figma API usage:');
  console.log(`
// To use with real Figma files, you would:

const bridge = new FigmaBridge({
  accessToken: 'your-figma-personal-access-token',
  debug: true
});

// Extract from a Figma file
const extraction = await bridge.extractFromFile('figma-file-key', {
  optimizeMapping: true,
  includeAssets: true,
  extractComponents: true
});

// Get navigation regions for cinematic transitions
const navRegions = await bridge.getNavigationRegions('figma-file-key');

// Preview extraction without full processing
const preview = await bridge.previewExtraction('figma-file-key');
  `);

  // Example 6: Integration with Spatial Runtime
  console.log('6. Integration with Spatial Runtime...');
  
  // This would normally use a real HTML container
  console.log(`
// Integration with spatial runtime:

const container = document.getElementById('spatial-container');
const spatialEngine = new SpatialEngine(container);

// Add extracted elements to spatial engine
spatialEngine.addElements(extraction.elements);

// Navigate to different regions
spatialEngine.animateToViewState({
  x: region.spatialBounds.position.x,
  y: region.spatialBounds.position.y,
  zoom: 1.0
});
  `);

  console.log('\n✅ Demo complete! The figma-bridge package provides:');
  console.log('  • Figma API integration with error handling');
  console.log('  • Spatial coordinate mapping and optimization');
  console.log('  • Design node parsing with HTML generation');
  console.log('  • Component extraction and reusability');
  console.log('  • Semantic zoom level organization');
  console.log('  • Asset extraction and management');
  console.log('  • Navigation region creation');
  console.log('\n🎯 Ready for Phase 3: Full-stack Generation!');
}

// Run the demo
if (typeof window === 'undefined') {
  // Node.js environment
  demonstrateFigmaBridge().catch(console.error);
} else {
  // Browser environment
  console.log('FIR Figma Bridge Demo - Run demonstrateFigmaBridge() to start');
  (window as any).demonstrateFigmaBridge = demonstrateFigmaBridge;
}