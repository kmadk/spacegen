import { describe, it, expect } from 'vitest';
import { FullstackGenerator } from './index.js';
import type { SpatialElement } from '@fir/spatial-runtime';

describe('FullstackGenerator', () => {
  it('should generate a complete fullstack project from spatial elements', async () => {
    const config = {
      projectName: 'test-app',
      database: 'postgresql' as const,
      apiFramework: 'express' as const,
      deployment: 'vercel' as const,
      enableSpatialQueries: true,
      debug: false
    };

    const mockElements: SpatialElement[] = [
      {
        id: 'test-element',
        type: 'container',
        position: { x: 0, y: 0 },
        bounds: { width: 100, height: 100 },
        semanticData: {
          system: 'Test Element'
        }
      }
    ];

    const generator = new FullstackGenerator(config);
    const project = await generator.generateFromElements(mockElements);

    // Verify project structure
    expect(project.config).toEqual(config);
    expect(project.models.length).toBeGreaterThan(0);
    expect(project.endpoints.length).toBeGreaterThan(0);
    expect(project.files.length).toBeGreaterThan(0);
    expect(project.migrations.length).toBeGreaterThan(0);
    
    // Verify models have spatial support
    const hasGeometryFields = project.models.some(model => 
      model.fields.some(field => field.type === 'geometry')
    );
    expect(hasGeometryFields).toBe(true);
    
    // Verify spatial endpoints are generated
    const hasSpatialEndpoints = project.endpoints.some(endpoint => 
      endpoint.spatialQuery === true
    );
    expect(hasSpatialEndpoints).toBe(true);

    // Verify deployment configuration
    expect(project.deployment.target).toBe('vercel');
    expect(project.deployment.environment.DATABASE_URL).toBeDefined();
    
    // Verify documentation is generated
    expect(project.documentation.apiDocs.length).toBeGreaterThan(0);
    expect(project.documentation.schemaDocs.length).toBeGreaterThan(0);
  });

  it('should handle different database providers', async () => {
    const configs = [
      { database: 'postgresql' as const, expectedExtensions: true },
      { database: 'mysql' as const, expectedExtensions: false },
      { database: 'sqlite' as const, expectedExtensions: false }
    ];

    for (const { database, expectedExtensions } of configs) {
      const config = {
        projectName: 'test-app',
        database,
        apiFramework: 'express' as const,
        deployment: 'local' as const,
        enableSpatialQueries: true
      };

      const mockElements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'item',
          position: { x: 0, y: 0 },
          bounds: { width: 50, height: 50 }
        }
      ];

      const generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(mockElements);

      expect(project.config.database).toBe(database);
      
      if (expectedExtensions) {
        expect(project.migrations.some(m => m.name.includes('spatial_extensions'))).toBe(true);
      }
    }
  });

  it('should generate appropriate API endpoints for different frameworks', async () => {
    const frameworks = ['express', 'nextjs'] as const;

    for (const framework of frameworks) {
      const config = {
        projectName: 'test-app',
        database: 'postgresql' as const,
        apiFramework: framework,
        deployment: 'vercel' as const,
        enableSpatialQueries: false
      };

      const mockElements: SpatialElement[] = [
        {
          id: 'test-item',
          type: 'item',
          position: { x: 10, y: 20 },
          bounds: { width: 30, height: 40 }
        }
      ];

      const generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(mockElements);

      expect(project.endpoints.some(e => e.method === 'GET')).toBe(true);
      expect(project.endpoints.some(e => e.method === 'POST')).toBe(true);
      
      // Framework-specific file generation
      const hasFrameworkFiles = project.files.some(f => 
        f.path.includes('src/') || f.path.includes('package.json')
      );
      expect(hasFrameworkFiles).toBe(true);
    }
  });
});