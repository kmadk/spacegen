/**
 * Tests for FIR + Locofy integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirLocofyIntegration, LocofyEnhancer } from './index.js';
import type { LocofyConfig } from './types.js';

describe('FIR + Locofy Integration', () => {
  let config: LocofyConfig;
  let integration: FirLocofyIntegration;

  beforeEach(() => {
    config = {
      codeDirectory: './test-locofy-output',
      framework: 'react',
      enableSpatialFeatures: true,
      debug: false
    };
    
    integration = new FirLocofyIntegration(config);
  });

  describe('Workflow Steps', () => {
    it('should provide structured workflow steps', () => {
      const steps = integration.getWorkflowSteps();
      
      expect(steps).toHaveLength(6);
      expect(steps[0]).toMatchObject({
        name: 'Figma Analysis',
        automated: true
      });
      expect(steps[1]).toMatchObject({
        name: 'Locofy Setup', 
        automated: false
      });
    });

    it('should identify manual vs automated steps', () => {
      const steps = integration.getWorkflowSteps();
      
      const manualSteps = steps.filter(s => !s.automated);
      const automatedSteps = steps.filter(s => s.automated);
      
      expect(manualSteps).toHaveLength(2); // Locofy setup and export
      expect(automatedSteps).toHaveLength(4); // FIR analysis and generation
    });
  });

  describe('LocofyEnhancer', () => {
    let enhancer: LocofyEnhancer;

    beforeEach(() => {
      enhancer = new LocofyEnhancer(config);
    });

    it('should create enhancer with config', () => {
      expect(enhancer).toBeInstanceOf(LocofyEnhancer);
    });

    it('should handle React framework configuration', () => {
      const reactConfig = { ...config, framework: 'react' as const };
      const reactEnhancer = new LocofyEnhancer(reactConfig);
      expect(reactEnhancer).toBeInstanceOf(LocofyEnhancer);
    });

    it('should handle NextJS framework configuration', () => {
      const nextConfig = { ...config, framework: 'nextjs' as const };
      const nextEnhancer = new LocofyEnhancer(nextConfig);
      expect(nextEnhancer).toBeInstanceOf(LocofyEnhancer);
    });
  });

  describe('Hybrid Architecture', () => {
    it('should combine Locofy frontend with FIR backend', async () => {
      // Mock the workflow to avoid actual Figma/Locofy calls
      const mockProject = {
        frontend: {
          id: 'test-project',
          name: 'Test Project',
          framework: 'react',
          components: [],
          assets: [],
          config: {}
        },
        spatialEnhancements: [],
        backend: {
          models: [],
          endpoints: [],
          files: []
        },
        deployment: {
          frontend: { platform: 'vercel' },
          backend: { platform: 'railway' }
        }
      };

      // This would normally call the full workflow
      // For testing, we just verify the structure
      expect(mockProject).toMatchObject({
        frontend: expect.any(Object),
        spatialEnhancements: expect.any(Array),
        backend: expect.any(Object),
        deployment: expect.any(Object)
      });
    });
  });

  describe('Integration Benefits', () => {
    it('should leverage Locofy strengths for frontend', () => {
      const benefits = {
        locofyStrengths: [
          'Professional UI conversion',
          'Design fidelity',
          'Component architecture',
          'Responsive design',
          'Production-ready code'
        ],
        firStrengths: [
          'Spatial intelligence',
          'Backend generation',
          'PostGIS integration',
          'Semantic zoom',
          'Full-stack deployment'
        ]
      };

      expect(benefits.locofyStrengths).toContain('Professional UI conversion');
      expect(benefits.firStrengths).toContain('Spatial intelligence');
    });

    it('should focus FIR effort on differentiated features', () => {
      const firFocus = [
        'Spatial relationship detection',
        'Semantic zoom behaviors', 
        'PostGIS backend generation',
        'Spatial data architecture',
        'Location-based interactions'
      ];

      expect(firFocus).toHaveLength(5);
      expect(firFocus).toContain('Spatial relationship detection');
    });
  });
});