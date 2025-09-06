import { describe, it, expect } from 'vitest';
import { getSemanticLevel, DEFAULT_SEMANTIC_LEVELS } from './semantic-zoom.js';
import { HTMLOverlaySystem } from './html-overlay.js';

describe('SpatialRuntime', () => {
  describe('SemanticZoom', () => {
    it('should return correct semantic level for zoom values', () => {
      expect(getSemanticLevel(0.05)).toBe('universal');
      expect(getSemanticLevel(0.3)).toBe('system');
      expect(getSemanticLevel(1.0)).toBe('standard');
      expect(getSemanticLevel(5.0)).toBe('atomic');
    });

    it('should handle edge cases', () => {
      expect(getSemanticLevel(0.005)).toBe('universal'); // Below minimum
      expect(getSemanticLevel(1000)).toBe('atomic'); // Above maximum
    });
  });

  describe('HTMLOverlaySystem', () => {
    it('should create overlay system', () => {
      const container = document.createElement('div');
      const overlay = new HTMLOverlaySystem(container);
      expect(overlay).toBeDefined();
    });

    it('should convert world coordinates to screen coordinates', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'clientWidth', { value: 800 });
      Object.defineProperty(container, 'clientHeight', { value: 600 });
      
      const overlay = new HTMLOverlaySystem(container);
      
      // Test coordinate conversion - center of screen should map to viewport center
      const screenPos = overlay.screenToWorld({ x: 400, y: 300 });
      expect(screenPos.x).toBe(400); // With default zoom=1, screen coords equal world coords
      expect(screenPos.y).toBe(300);
    });
  });
});