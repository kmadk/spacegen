/**
 * Tests for FigmaClient reliability and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FigmaClient, FigmaAPIError } from './figma-client.js';
import type { FigmaBridgeConfig } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('FigmaClient Reliability Tests', () => {
  let client: FigmaClient;
  let config: FigmaBridgeConfig;

  beforeEach(() => {
    config = {
      accessToken: 'test-token',
      debug: false
    };
    client = new FigmaClient(config);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getFile('test-key')).rejects.toThrow(FigmaAPIError);
      await expect(client.getFile('test-key')).rejects.toThrow('Network error');
    }, 10000); // Increase timeout for retry logic

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({
          message: 'File not found',
          code: 'FILE_NOT_FOUND'
        })
      });

      await expect(client.getFile('invalid-key')).rejects.toThrow(FigmaAPIError);
      
      try {
        await client.getFile('invalid-key');
      } catch (error) {
        expect(error).toBeInstanceOf(FigmaAPIError);
        expect((error as FigmaAPIError).status).toBe(404);
        expect((error as FigmaAPIError).code).toBe('FILE_NOT_FOUND');
      }
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(client.getFile('test-key')).rejects.toThrow(FigmaAPIError);
      await expect(client.getFile('test-key')).rejects.toThrow('HTTP 500: Internal Server Error');
    }, 10000); // Increase timeout for retry logic

    it('should handle missing document in file response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing document field
          name: 'Test File'
        })
      });

      await expect(client.getFile('test-key')).rejects.toThrow('Invalid Figma file response: missing document');
    });

    it('should handle Figma API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          error: 'INVALID_TOKEN',
          message: 'Invalid access token'
        })
      });

      await expect(client.getFile('test-key')).rejects.toThrow('Invalid access token');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting with proper error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn().mockResolvedValue({
          message: 'Rate limit exceeded'
        })
      });

      await expect(client.getFile('test-key')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Authentication', () => {
    it('should validate connection successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'user-id',
          email: 'test@example.com',
          handle: 'testuser',
          img_url: 'https://example.com/avatar.png'
        })
      });

      const isValid = await client.validateConnection();
      expect(isValid).toBe(true);
    });

    it('should handle invalid authentication', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          message: 'Invalid token'
        })
      });

      const isValid = await client.validateConnection();
      expect(isValid).toBe(false);
    });
  });

  describe('Request Parameters', () => {
    it('should properly encode URL parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          document: { id: 'doc' }
        })
      });

      await client.getFile('test-key', {
        ids: ['node-1', 'node-2'],
        depth: 2,
        geometry: 'bounds'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ids=node-1%2Cnode-2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('depth=2'),
        expect.any(Object)
      );
    });

    it('should handle special characters in node IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          nodes: {}
        })
      });

      const nodeIds = ['1:2', '3:4', 'special#node'];
      await client.getFileNodes('test-key', nodeIds);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ids=1%3A2%2C3%3A4%2Cspecial%23node'),
        expect.any(Object)
      );
    });
  });

  describe('Asset Extraction', () => {
    it('should handle empty asset node list', async () => {
      const assets = await client.extractAssets('test-key', [], {});
      expect(assets).toEqual([]);
    });

    it('should identify vector nodes as assets', async () => {
      const vectorNode = {
        id: '1:1',
        name: 'Vector Icon',
        type: 'VECTOR',
        absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: { '1:1': 'https://example.com/image.png' }
        })
      });

      const assets = await client.extractAssets('test-key', [vectorNode]);
      
      expect(assets).toHaveLength(1);
      expect(assets[0]).toMatchObject({
        id: 'asset_1:1',
        type: 'icon', // Vector with "Icon" in name becomes icon type
        figmaNodeId: '1:1',
        source: 'https://example.com/image.png'
      });
    });

    it('should identify components with icon in name as assets', async () => {
      const iconComponent = {
        id: '2:2',
        name: 'Icon/Arrow',
        type: 'COMPONENT',
        absoluteBoundingBox: { x: 0, y: 0, width: 16, height: 16 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: { '2:2': 'https://example.com/icon.svg' }
        })
      });

      const assets = await client.extractAssets('test-key', [iconComponent]);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe('icon');
    });
  });

  describe('Debug Mode', () => {
    it('should log requests in debug mode', async () => {
      const debugConfig = { ...config, debug: true };
      const debugClient = new FigmaClient(debugConfig);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          document: { id: 'doc' }
        })
      });

      await debugClient.getFile('test-key');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Making Figma API request')
      );

      consoleSpy.mockRestore();
    });

    it('should log validation errors in debug mode', async () => {
      const debugConfig = { ...config, debug: true };
      const debugClient = new FigmaClient(debugConfig);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          message: 'Invalid token'
        })
      });

      await debugClient.validateConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Figma connection validation failed:',
        expect.any(FigmaAPIError)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});