/**
 * Live integration tests for VercelAdapter
 * These tests make actual API calls to Vercel
 * 
 * Setup required:
 * 1. Create a Vercel account and get a token from https://vercel.com/account/tokens
 * 2. Set environment variable: VERCEL_TOKEN=your_token_here
 * 3. Set team ID if using a team: VERCEL_TEAM_ID=team_xxx
 * 
 * Run with: VERCEL_TOKEN=your_token pnpm test:live
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VercelAdapter } from '../../deployment/vercel-adapter';
import type { VercelConfig } from '../../deployment/vercel-types';

// Skip these tests unless VERCEL_TOKEN is provided
const hasVercelToken = !!process.env.VERCEL_TOKEN;
const describeOrSkip = hasVercelToken ? describe : describe.skip;

describeOrSkip('VercelAdapter Live Integration', () => {
  let adapter: VercelAdapter;
  let testProjectId: string | null = null;
  let testDeploymentId: string | null = null;

  beforeAll(async () => {
    if (!hasVercelToken) {
      console.log('⚠️ Skipping Vercel live tests - VERCEL_TOKEN not set');
      console.log('💡 To run live tests: VERCEL_TOKEN=your_token pnpm test:live');
      return;
    }

    const config: VercelConfig = {
      token: process.env.VERCEL_TOKEN!,
      baseUrl: 'https://api.vercel.com',
      timeout: 30000,
      teamId: process.env.VERCEL_TEAM_ID
    };

    adapter = new VercelAdapter(config);
    console.log('🔗 Connected to Vercel API for live testing');
  });

  afterAll(async () => {
    if (!hasVercelToken || !adapter) return;

    // Clean up test resources
    try {
      if (testProjectId) {
        console.log(`🧹 Cleaning up test project: ${testProjectId}`);
        // Note: Vercel doesn't have a delete project API in free tier
        // Projects need to be deleted manually from dashboard
      }
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  });

  describe('Authentication & User Info', () => {
    it('should authenticate and get current user', async () => {
      if (!hasVercelToken) return;

      const user = await adapter.getCurrentUser();
      
      expect(user).toBeDefined();
      expect(user.id).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(user.name).toBeTruthy();
      
      console.log(`✅ Authenticated as: ${user.name} (${user.email})`);
    });

    it('should perform health check', async () => {
      if (!hasVercelToken) return;

      const isHealthy = await adapter.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Project Operations', () => {
    it('should get existing projects', async () => {
      if (!hasVercelToken) return;

      const projects = await adapter.getProjects(5);
      
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeLessThanOrEqual(5);
      
      if (projects.length > 0) {
        const project = projects[0];
        expect(project.id).toBeTruthy();
        expect(project.name).toBeTruthy();
        console.log(`📁 Sample project: ${project.name} (${project.id})`);
      }
    });

    it('should get specific project by ID if projects exist', async () => {
      if (!hasVercelToken) return;

      const projects = await adapter.getProjects(1);
      if (projects.length === 0) {
        console.log('ℹ️ No projects found - skipping project details test');
        return;
      }

      const projectId = projects[0].id;
      const project = await adapter.getProject(projectId);
      
      expect(project).toBeDefined();
      expect(project.id).toBe(projectId);
      expect(project.name).toBeTruthy();
    });
  });

  describe('Deployment Operations', () => {
    it('should create and deploy a simple HTML project', async () => {
      if (!hasVercelToken) return;

      const projectName = `fir-test-${Date.now()}`;
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>FIR Test Deploy</title>
</head>
<body>
    <h1>Hello from FIR!</h1>
    <p>This is a test deployment created at ${new Date().toISOString()}</p>
</body>
</html>`;

      // Base64 encode the HTML content
      const base64Content = Buffer.from(htmlContent).toString('base64');

      const deploymentPayload = {
        name: projectName,
        files: {
          'index.html': {
            file: base64Content
          }
        },
        projectSettings: {
          framework: null // Static HTML
        }
      };

      console.log(`🚀 Creating deployment: ${projectName}`);
      const deployment = await adapter.createDeployment(deploymentPayload);
      testDeploymentId = deployment.id;

      expect(deployment).toBeDefined();
      expect(deployment.id).toBeTruthy();
      expect(deployment.url).toBeTruthy();
      expect(deployment.state).toBeDefined();

      console.log(`✅ Deployment created: https://${deployment.url}`);
      console.log(`📊 Deployment state: ${deployment.state}`);

      // Wait for deployment to complete
      if (deployment.state !== 'READY') {
        console.log('⏳ Waiting for deployment to complete...');
        const completedDeployment = await adapter.waitForDeployment(
          deployment.id,
          60000, // 1 minute timeout
          2000   // Check every 2 seconds
        );
        
        expect(completedDeployment.state).toBe('READY');
        console.log(`🎉 Deployment ready: https://${completedDeployment.url}`);
      }
    });

    it('should get deployment details', async () => {
      if (!hasVercelToken || !testDeploymentId) return;

      const deployment = await adapter.getDeployment(testDeploymentId);
      
      expect(deployment).toBeDefined();
      expect(deployment.id).toBe(testDeploymentId);
      expect(deployment.url).toBeTruthy();
      expect(['READY', 'BUILDING', 'QUEUED', 'ERROR']).toContain(deployment.state);
    });
  });

  describe('Environment Variables', () => {
    it('should set environment variables if project exists', async () => {
      if (!hasVercelToken) return;

      // Get first available project
      const projects = await adapter.getProjects(1);
      if (projects.length === 0) {
        console.log('ℹ️ No projects found - skipping env vars test');
        return;
      }

      const projectId = projects[0].id;
      const testEnvVar = {
        key: 'FIR_TEST_VAR',
        value: `test-value-${Date.now()}`,
        target: ['preview'] as ('production' | 'preview' | 'development')[]
      };

      const result = await adapter.setEnvironmentVariables(projectId, [testEnvVar]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].key).toBe(testEnvVar.key);
      
      console.log(`✅ Environment variable set: ${testEnvVar.key}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project ID gracefully', async () => {
      if (!hasVercelToken) return;

      await expect(
        adapter.getProject('invalid-project-id')
      ).rejects.toThrow();
    });

    it('should handle invalid deployment payload', async () => {
      if (!hasVercelToken) return;

      const invalidPayload = {
        name: '', // Invalid: empty name
        files: {}  // Invalid: no files
      };

      await expect(
        adapter.createDeployment(invalidPayload)
      ).rejects.toThrow();
    });
  });

  describe('Performance & Reliability', () => {
    it('should complete user lookup within reasonable time', async () => {
      if (!hasVercelToken) return;

      const start = Date.now();
      await adapter.getCurrentUser();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`⚡ User lookup completed in ${duration}ms`);
    });

    it('should handle concurrent requests', async () => {
      if (!hasVercelToken) return;

      const promises = Array.from({ length: 3 }, () => 
        adapter.getCurrentUser()
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(user => {
        expect(user.id).toBeTruthy();
        expect(user.email).toBeTruthy();
      });
    });
  });
});