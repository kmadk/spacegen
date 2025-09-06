/**
 * Product 1: Penpot → Spatial Code
 * Generates React spatial components from Penpot designs
 */

import type { SpatialElement } from '@fir/spatial-runtime';
import { PenpotBridge } from '../penpot-bridge.js';
import type { PenpotConfig, GeneratedProject } from '../types.js';

export class Product1PenpotSpatial {
  constructor(private config: { penpot: PenpotConfig; debug?: boolean }) {}

  /**
   * Generate spatial React components from Penpot file
   */
  async generateFromPenpotFile(fileId: string): Promise<GeneratedProject> {
    const bridge = new PenpotBridge(this.config.penpot);
    
    // Convert Penpot to spatial elements
    const spatialElements = await bridge.convertToSpatialElements(fileId);
    
    // Generate React components
    const components = await bridge.generateSpatialComponents(fileId);
    
    const files = Object.entries(components).map(([name, content]) => ({
      path: `src/components/${name}.tsx`,
      content
    }));

    // Add spatial runtime setup
    files.push({
      path: 'src/spatial-app.tsx',
      content: this.generateSpatialApp(Object.keys(components))
    });

    if (this.config.debug) {
      console.log(`✅ Product 1: Generated ${files.length} spatial component files`);
    }

    return {
      files,
      models: [],
      endpoints: [],
      config: this.config,
      deploymentFiles: []
    };
  }

  private generateSpatialApp(componentNames: string[]): string {
    return `import React from 'react';
import { SpatialRuntime } from '@fir/spatial-runtime';
${componentNames.map(name => `import { ${name} } from './components/${name}';`).join('\n')}

export const SpatialApp: React.FC = () => {
  return (
    <SpatialRuntime
      initialViewState={{ zoom: 1, target: [0, 0] }}
      semanticLevels={['universal', 'system', 'standard', 'atomic']}
    >
      {/* Your spatial components will be positioned here */}
      <div className="spatial-canvas">
${componentNames.map(name => `        <${name} />`).join('\n')}
      </div>
    </SpatialRuntime>
  );
};

export default SpatialApp;`;
  }
}