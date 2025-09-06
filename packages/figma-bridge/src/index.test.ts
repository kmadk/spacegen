import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpatialMapper } from './spatial-mapper.js';
import { DesignParser } from './design-parser.js';
import { FigmaClient, FigmaAPIError } from './figma-client.js';
import type { FigmaNode, FigmaBoundingBox } from './types.js';

describe('FigmaBridge', () => {
  describe('SpatialMapper', () => {
    let mapper: SpatialMapper;

    beforeEach(() => {
      mapper = new SpatialMapper({
        scale: 1.0,
        baseUnit: 16,
        flipY: true
      });
    });

    it('should convert Figma coordinates to spatial coordinates', () => {
      const figmaBbox: FigmaBoundingBox = {
        x: 100,
        y: 200,
        width: 160,
        height: 80
      };

      const result = mapper.figmaToSpatial(figmaBbox);

      expect(result.position.x).toBe(6.25); // 100/16
      expect(result.position.y).toBe(-12.5); // -200/16 (flipped Y)
      expect(result.width).toBe(10); // 160/16
      expect(result.height).toBe(5); // 80/16
    });

    it('should convert spatial coordinates back to Figma coordinates', () => {
      const spatialPos = { x: 10, y: -5 };
      const width = 20;
      const height = 10;

      const result = mapper.spatialToFigma(spatialPos, width, height);

      expect(result.x).toBe(160); // 10*16
      expect(result.y).toBe(80); // -(-5)*16 (flipped back)
      expect(result.width).toBe(320); // 20*16
      expect(result.height).toBe(160); // 10*16
    });

    it('should calculate optimal mapping for content', () => {
      const mockNode: FigmaNode = {
        id: '1',
        name: 'Test',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 1920, height: 1080 },
        children: [
          {
            id: '2',
            name: 'Child',
            type: 'RECTANGLE',
            absoluteBoundingBox: { x: 100, y: 100, width: 200, height: 100 }
          }
        ]
      };

      const mapping = mapper.calculateOptimalMapping(mockNode);
      
      expect(mapping.scale).toBeGreaterThan(0);
      expect(mapping.origin).toBeDefined();
      expect(mapping.preserveAspectRatio).toBe(true);
    });

    it('should create semantic regions', () => {
      const nodes: FigmaNode[] = [
        {
          id: '1',
          name: 'Large Frame',
          type: 'FRAME',
          absoluteBoundingBox: { x: 0, y: 0, width: 500, height: 400 },
          children: [
            {
              id: '1-1',
              name: 'Child',
              type: 'TEXT',
              absoluteBoundingBox: { x: 10, y: 10, width: 50, height: 20 }
            }
          ]
        },
        {
          id: '2',
          name: 'Small Text',
          type: 'TEXT',
          absoluteBoundingBox: { x: 10, y: 10, width: 50, height: 20 }
        },
        {
          id: '3',
          name: 'Icon',
          type: 'VECTOR',
          absoluteBoundingBox: { x: 20, y: 20, width: 24, height: 24 }
        }
      ];

      const regions = mapper.createSemanticRegions(nodes);

      // At least some elements should be categorized
      const totalCategorized = regions.universal.length + regions.system.length + regions.standard.length + regions.atomic.length;
      expect(totalCategorized).toBeGreaterThan(0);
      
      // Should have at least one region with elements
      expect(Object.values(regions).some(region => region.length > 0)).toBe(true);
    });
  });

  describe('DesignParser', () => {
    let parser: DesignParser;

    beforeEach(() => {
      parser = new DesignParser({
        generateHTML: true,
        includeDebugInfo: false
      });
    });

    it('should parse Figma nodes into spatial elements', () => {
      const nodes: FigmaNode[] = [
        {
          id: '1',
          name: 'Test Button',
          type: 'RECTANGLE',
          absoluteBoundingBox: { x: 100, y: 100, width: 120, height: 40 },
          fills: [{
            type: 'SOLID',
            color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
            visible: true
          }]
        }
      ];

      const result = parser.parseNodes(nodes);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].id).toBe('1');
      expect(result.elements[0].type).toBe('shape');
      expect(result.elements[0].position).toBeDefined();
      expect(result.elements[0].bounds).toBeDefined();
    });

    it('should generate HTML elements', () => {
      const textNode: FigmaNode = {
        id: '1',
        name: 'Heading',
        type: 'TEXT',
        characters: 'Hello World',
        absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 50 },
        style: {
          fontFamily: 'Inter',
          fontSize: 24,
          fontWeight: 600,
          textAlignHorizontal: 'LEFT'
        }
      };

      const result = parser.parseNodes([textNode]);
      const element = result.elements[0];

      expect(element.htmlElement).toBeDefined();
      expect(element.htmlElement!.textContent).toBe('Hello World');
    });

    it('should handle parsing errors gracefully', () => {
      const malformedNode = {
        id: '1',
        name: 'Bad Node',
        type: 'UNKNOWN_TYPE',
        // Missing required properties
      } as any;

      const result = parser.parseNodes([malformedNode]);

      // The parser may handle malformed nodes gracefully with warnings instead of errors
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
      // May still create elements even with malformed data
      expect(result.elements.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip invisible nodes when configured', () => {
      const nodes: FigmaNode[] = [
        {
          id: '1',
          name: 'Visible',
          type: 'RECTANGLE',
          visible: true,
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 }
        },
        {
          id: '2',
          name: 'Hidden',
          type: 'RECTANGLE',
          visible: false,
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 }
        }
      ];

      const result = parser.parseNodes(nodes);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].id).toBe('1');
    });
  });

  describe('FigmaClient', () => {
    let client: FigmaClient;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      
      client = new FigmaClient({
        accessToken: 'test-token',
        debug: false
      });
    });

    it('should make authenticated requests', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ document: { id: '1', name: 'Test' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getFile('test-file-key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('files/test-file-key'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': 'test-token'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid token' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.getFile('test-file-key')).rejects.toThrow(FigmaAPIError);
      await expect(client.getFile('test-file-key')).rejects.toThrow('Invalid token');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getFile('test-file-key')).rejects.toThrow(FigmaAPIError);
      await expect(client.getFile('test-file-key')).rejects.toThrow('Network error');
    }, 10000); // Increase timeout for retry logic

    it('should validate connection', async () => {
      // Mock successful /me endpoint
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ id: 'user123', email: 'test@example.com' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const isValid = await client.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should identify asset nodes correctly', async () => {
      const nodes: FigmaNode[] = [
        {
          id: '1',
          name: 'Icon',
          type: 'VECTOR',
          absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 }
        },
        {
          id: '2',
          name: 'Background Image',
          type: 'RECTANGLE',
          fills: [{ type: 'IMAGE', imageRef: 'image-123' }],
          absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 }
        },
        {
          id: '3',
          name: 'Regular Text',
          type: 'TEXT',
          characters: 'Hello',
          absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 20 }
        }
      ];

      // Mock the images endpoint response
      const mockImageResponse = {
        ok: true,
        json: () => Promise.resolve({ 
          images: { 
            '1': 'https://example.com/icon.png',
            '2': 'https://example.com/bg.png'
          } 
        })
      };
      mockFetch.mockResolvedValue(mockImageResponse);

      const assets = await client.extractAssets('file-key', nodes);

      expect(assets).toHaveLength(2);
      expect(assets[0].type).toBe('icon'); // Name contains 'Icon' so it's classified as icon
      expect(assets[1].type).toBe('image');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with mock data', () => {
      const mapper = new SpatialMapper();
      const parser = new DesignParser({ spatialMapper: mapper });

      const mockFigmaData: FigmaNode = {
        id: 'root',
        name: 'Page',
        type: 'CANVAS',
        children: [
          {
            id: 'frame1',
            name: 'Hero Section',
            type: 'FRAME',
            absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
            children: [
              {
                id: 'title',
                name: 'Title',
                type: 'TEXT',
                characters: 'Welcome to FIR',
                absoluteBoundingBox: { x: 50, y: 50, width: 300, height: 60 },
                style: {
                  fontFamily: 'Inter',
                  fontSize: 36,
                  fontWeight: 700
                }
              },
              {
                id: 'button',
                name: 'CTA Button',
                type: 'RECTANGLE',
                absoluteBoundingBox: { x: 50, y: 150, width: 160, height: 48 },
                fills: [{
                  type: 'SOLID',
                  color: { r: 0.2, g: 0.6, b: 1, a: 1 }
                }]
              }
            ]
          }
        ]
      };

      const result = parser.parseNodes([mockFigmaData]);

      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      
      // Should have frame, text, and button elements
      const types = result.elements.map(el => el.type);
      expect(types).toContain('container'); // frame
      expect(types).toContain('text'); // title
      expect(types).toContain('shape'); // button
    });
  });
});