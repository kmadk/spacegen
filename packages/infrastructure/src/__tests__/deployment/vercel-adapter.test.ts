/**
 * Tests for VercelAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelAdapter } from '../../deployment/vercel-adapter';
import type { VercelConfig } from '../../deployment/vercel-types';

// Mock axios
const mockAxiosCreate = vi.fn();
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

vi.mock('axios', () => ({
  default: {
    create: mockAxiosCreate
  }
}));

describe('VercelAdapter', () => {
  let adapter: VercelAdapter;
  let config: VercelConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      token: 'test-token',
      baseUrl: 'https://api.vercel.com',
      timeout: 30000,
      teamId: 'team-123'
    };

    mockAxiosCreate.mockReturnValue(mockAxiosInstance);
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      adapter = new VercelAdapter(config);
      
      expect(adapter).toBeDefined();
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        timeout: 30000,
        headers: {
          'User-Agent': 'FIR/1.0.0',
          'Authorization': `Bearer ${config.token}`
        }
      });
    });

    it('should validate config schema', () => {
      const invalidConfig = { token: '' } as VercelConfig;
      
      expect(() => new VercelAdapter(invalidConfig)).toThrow();
    });

    it('should set up interceptors', () => {
      adapter = new VercelAdapter(config);
      
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('User Operations', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should get current user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      const result = await adapter.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v2/user', { params: undefined });
    });

    it('should handle user API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(adapter.getCurrentUser()).rejects.toThrow('API Error');
    });
  });

  describe('Project Operations', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should get projects with default limit', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' }
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { projects: mockProjects }
      });

      const result = await adapter.getProjects();

      expect(result).toEqual(mockProjects);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v9/projects?limit=20&teamId=team-123',
        { params: undefined }
      );
    });

    it('should get projects with custom limit', async () => {
      const mockProjects = [{ id: 'proj-1', name: 'Project 1' }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { projects: mockProjects }
      });

      await adapter.getProjects(5);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v9/projects?limit=5&teamId=team-123',
        { params: undefined }
      );
    });

    it('should get specific project by ID', async () => {
      const mockProject = { id: 'proj-123', name: 'Test Project' };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockProject
      });

      const result = await adapter.getProject('proj-123');

      expect(result).toEqual(mockProject);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v9/projects/proj-123?teamId=team-123',
        { params: undefined }
      );
    });
  });

  describe('Deployment Operations', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should create deployment', async () => {
      const mockDeployment = {
        id: 'deploy-123',
        url: 'test-app.vercel.app',
        state: 'READY'
      };

      const deploymentPayload = {
        name: 'test-app',
        files: {
          'index.html': {
            file: 'PGh0bWw+SGVsbG8gV29ybGQ8L2h0bWw+', // base64 encoded
            sha: 'sha123',
            size: 25
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockDeployment
      });

      const result = await adapter.createDeployment(deploymentPayload);

      expect(result).toEqual(mockDeployment);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v13/deployments',
        {
          ...deploymentPayload,
          version: 2,
          teamId: 'team-123'
        },
        { headers: undefined }
      );
    });

    it('should get deployment by ID', async () => {
      const mockDeployment = {
        id: 'deploy-123',
        state: 'READY',
        url: 'test-app.vercel.app'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockDeployment
      });

      const result = await adapter.getDeployment('deploy-123');

      expect(result).toEqual(mockDeployment);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v13/deployments/deploy-123?teamId=team-123',
        { params: undefined }
      );
    });
  });

  describe('Environment Variables', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should set environment variables', async () => {
      const variables = [
        {
          key: 'API_KEY',
          value: 'secret-key',
          target: ['production'] as ('production' | 'preview' | 'development')[]
        }
      ];

      const mockResponse = {
        id: 'env-123',
        key: 'API_KEY',
        value: 'secret-key'
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockResponse
      });

      const result = await adapter.setEnvironmentVariables('proj-123', variables);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v9/projects/proj-123/env?teamId=team-123',
        variables[0],
        { headers: undefined }
      );
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should return true for successful health check', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } }
      });

      const result = await adapter.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false for failed health check', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Auth failed'));

      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Wait for Deployment', () => {
    beforeEach(() => {
      adapter = new VercelAdapter(config);
    });

    it('should wait for deployment to complete', async () => {
      const deploymentId = 'deploy-123';
      
      // First call returns BUILDING, second returns READY
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { id: deploymentId, state: 'BUILDING' }
        })
        .mockResolvedValueOnce({
          data: { id: deploymentId, state: 'READY', url: 'test.vercel.app' }
        });

      const result = await adapter.waitForDeployment(deploymentId, 10000, 100);

      expect(result.state).toBe('READY');
      expect(result.url).toBe('test.vercel.app');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should timeout if deployment takes too long', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'deploy-123', state: 'BUILDING' }
      });

      await expect(
        adapter.waitForDeployment('deploy-123', 100, 50)
      ).rejects.toThrow('Deployment timed out');
    });

    it('should throw error if deployment fails', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { id: 'deploy-123', state: 'ERROR' }
      });

      await expect(
        adapter.waitForDeployment('deploy-123')
      ).rejects.toThrow('Deployment failed with state: ERROR');
    });
  });
});