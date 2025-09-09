/**
 * Live integration tests for SupabaseAdapter
 * These tests make actual API calls to Supabase
 * 
 * Setup required:
 * 1. Create a Supabase account and get an access token from https://supabase.com/dashboard/account/tokens
 * 2. Set environment variable: SUPABASE_ACCESS_TOKEN=your_token_here
 * 3. Get your organization ID from Supabase dashboard: SUPABASE_ORG_ID=your_org_id
 * 
 * WARNING: These tests will create real Supabase projects that count toward your quota!
 * Make sure to clean up test projects manually if tests fail.
 * 
 * Run with: SUPABASE_ACCESS_TOKEN=your_token SUPABASE_ORG_ID=your_org pnpm test:live
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../deployment/supabase-adapter';
import type { SupabaseConfig } from '../../deployment/supabase-types';

// Skip these tests unless SUPABASE_ACCESS_TOKEN is provided
const hasSupabaseToken = !!(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_ORG_ID);
const describeOrSkip = hasSupabaseToken ? describe : describe.skip;

describeOrSkip('SupabaseAdapter Live Integration', () => {
  let adapter: SupabaseAdapter;
  let testProjectRef: string | null = null;
  let testProjectId: string | null = null;

  beforeAll(async () => {
    if (!hasSupabaseToken) {
      console.log('⚠️ Skipping Supabase live tests - SUPABASE_ACCESS_TOKEN or SUPABASE_ORG_ID not set');
      console.log('💡 To run live tests: SUPABASE_ACCESS_TOKEN=token SUPABASE_ORG_ID=org pnpm test:live');
      return;
    }

    const config: SupabaseConfig = {
      accessToken: process.env.SUPABASE_ACCESS_TOKEN!,
      baseUrl: 'https://api.supabase.com',
      timeout: 60000, // Longer timeout for project creation
      organizationId: process.env.SUPABASE_ORG_ID
    };

    adapter = new SupabaseAdapter(config);
    console.log('🔗 Connected to Supabase API for live testing');
  });

  afterAll(async () => {
    if (!hasSupabaseToken || !adapter) return;

    // Clean up test resources
    try {
      if (testProjectRef) {
        console.log(`🧹 Cleaning up test project: ${testProjectRef}`);
        await adapter.deleteProject(testProjectRef);
        console.log('✅ Test project deleted');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup warning (may need manual cleanup):', error);
      if (testProjectRef) {
        console.log(`🚨 Please manually delete project: ${testProjectRef} from Supabase dashboard`);
      }
    }
  });

  describe('Authentication & Organization', () => {
    it('should authenticate and get organization projects', async () => {
      if (!hasSupabaseToken) return;

      const projects = await adapter.getProjects();
      
      expect(Array.isArray(projects)).toBe(true);
      console.log(`📁 Found ${projects.length} existing Supabase projects`);
      
      if (projects.length > 0) {
        const project = projects[0];
        expect(project.id).toBeTruthy();
        expect(project.name).toBeTruthy();
        expect(project.ref).toBeTruthy();
        expect(project.status).toBeDefined();
        console.log(`📋 Sample project: ${project.name} (${project.ref}) - ${project.status}`);
      }
    });

    it('should perform health check', async () => {
      if (!hasSupabaseToken) return;

      const isHealthy = await adapter.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Project Lifecycle', () => {
    it('should create a new project', async () => {
      if (!hasSupabaseToken) return;

      const projectName = `fir-test-${Date.now()}`;
      const payload = {
        name: projectName,
        region: 'us-east-1', // Use a common region
        plan: 'free'
      };

      console.log(`🚀 Creating Supabase project: ${projectName}`);
      console.log('⏳ This may take 2-3 minutes...');
      
      // Supabase project creation can take a long time
      const project = await adapter.createProject(payload);
      testProjectRef = project.ref;
      testProjectId = project.id;

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.ref).toBeTruthy();
      expect(project.name).toBe(projectName);
      expect(project.region).toBe('us-east-1');
      
      console.log(`✅ Project created: ${project.name}`);
      console.log(`🔗 Project ref: ${project.ref}`);
      console.log(`🌍 Region: ${project.region}`);
      console.log(`📊 Status: ${project.status}`);

      // Wait for project to be ready (may take time)
      if (project.status === 'CREATING') {
        console.log('⏳ Waiting for project to be ready...');
        // Note: We'll test project readiness in the next test
      }
    });

    it('should get project details', async () => {
      if (!hasSupabaseToken || !testProjectRef) {
        console.log('⚠️ Skipping project details test - no test project created');
        return;
      }

      const project = await adapter.getProject(testProjectRef);
      
      expect(project).toBeDefined();
      expect(project.ref).toBe(testProjectRef);
      expect(project.name).toBeTruthy();
      expect(['ACTIVE_HEALTHY', 'CREATING', 'INACTIVE', 'UNKNOWN']).toContain(project.status);
      
      console.log(`📋 Project status: ${project.status}`);
    });

    it('should update project if it exists and is ready', async () => {
      if (!hasSupabaseToken || !testProjectRef) {
        console.log('⚠️ Skipping project update test - no test project created');
        return;
      }

      // First check if project is ready
      const project = await adapter.getProject(testProjectRef);
      if (project.status !== 'ACTIVE_HEALTHY') {
        console.log(`⚠️ Skipping update test - project not ready (status: ${project.status})`);
        return;
      }

      const updates = {
        name: `${project.name}-updated`
      };

      console.log(`📝 Updating project name to: ${updates.name}`);
      const updatedProject = await adapter.updateProject(testProjectRef, updates);
      
      expect(updatedProject).toBeDefined();
      expect(updatedProject.name).toBe(updates.name);
      
      console.log(`✅ Project updated successfully`);
    });
  });

  describe('Database Operations', () => {
    it('should execute SQL queries if project is ready', async () => {
      if (!hasSupabaseToken || !testProjectRef) {
        console.log('⚠️ Skipping SQL test - no test project created');
        return;
      }

      // Check if project is ready for SQL operations
      const project = await adapter.getProject(testProjectRef);
      if (project.status !== 'ACTIVE_HEALTHY') {
        console.log(`⚠️ Skipping SQL test - project not ready (status: ${project.status})`);
        return;
      }

      const query = {
        query: 'SELECT version();'
      };

      console.log('🔍 Testing SQL query execution...');
      const result = await adapter.executeSQL(testProjectRef, query);
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      
      if (result.rows.length > 0) {
        console.log(`✅ SQL executed successfully: ${JSON.stringify(result.rows[0])}`);
      }
    });

    it('should run database migrations if project is ready', async () => {
      if (!hasSupabaseToken || !testProjectRef) {
        console.log('⚠️ Skipping migration test - no test project created');
        return;
      }

      // Check if project is ready
      const project = await adapter.getProject(testProjectRef);
      if (project.status !== 'ACTIVE_HEALTHY') {
        console.log(`⚠️ Skipping migration test - project not ready (status: ${project.status})`);
        return;
      }

      const migration = {
        name: `fir_test_table_${Date.now()}`,
        sql: `
          CREATE TABLE IF NOT EXISTS fir_test_table (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          INSERT INTO fir_test_table (name) VALUES ('test-record-1'), ('test-record-2');
        `
      };

      console.log(`🔄 Running test migration: ${migration.name}`);
      const result = await adapter.runMigration(testProjectRef, migration);
      
      expect(result).toBeDefined();
      console.log(`✅ Migration completed successfully`);

      // Verify the migration worked by querying the table
      const queryResult = await adapter.executeSQL(testProjectRef, {
        query: 'SELECT COUNT(*) as count FROM fir_test_table;'
      });
      
      expect(queryResult.rows.length).toBeGreaterThan(0);
      expect(parseInt(queryResult.rows[0].count)).toBe(2);
      
      console.log(`✅ Migration verification passed: ${queryResult.rows[0].count} records found`);
    });
  });

  describe('Secrets Management', () => {
    it('should manage project secrets if project is ready', async () => {
      if (!hasSupabaseToken || !testProjectRef) {
        console.log('⚠️ Skipping secrets test - no test project created');
        return;
      }

      // Check if project is ready
      const project = await adapter.getProject(testProjectRef);
      if (project.status !== 'ACTIVE_HEALTHY') {
        console.log(`⚠️ Skipping secrets test - project not ready (status: ${project.status})`);
        return;
      }

      const secretName = `FIR_TEST_SECRET_${Date.now()}`;
      const secretValue = `test-secret-value-${Math.random()}`;

      console.log(`🔐 Creating secret: ${secretName}`);
      const secret = await adapter.createSecret(testProjectRef, {
        name: secretName,
        value: secretValue
      });
      
      expect(secret).toBeDefined();
      expect(secret.name).toBe(secretName);
      
      console.log(`✅ Secret created successfully`);

      // Get all secrets to verify
      const secrets = await adapter.getSecrets(testProjectRef);
      expect(Array.isArray(secrets)).toBe(true);
      
      const createdSecret = secrets.find(s => s.name === secretName);
      expect(createdSecret).toBeDefined();
      
      console.log(`✅ Secret verification passed: found in secrets list`);

      // Clean up secret
      try {
        await adapter.deleteSecret(testProjectRef, secretName);
        console.log(`🧹 Secret deleted successfully`);
      } catch (error) {
        console.warn(`⚠️ Could not delete secret: ${error}`);
      }
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid project reference gracefully', async () => {
      if (!hasSupabaseToken) return;

      await expect(
        adapter.getProject('invalid-project-ref')
      ).rejects.toThrow();
    });

    it('should handle malformed SQL queries gracefully', async () => {
      if (!hasSupabaseToken || !testProjectRef) return;

      const project = await adapter.getProject(testProjectRef);
      if (project.status !== 'ACTIVE_HEALTHY') {
        console.log(`⚠️ Skipping malformed SQL test - project not ready`);
        return;
      }

      await expect(
        adapter.executeSQL(testProjectRef, {
          query: 'INVALID SQL QUERY;'
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance & Reliability', () => {
    it('should complete project listing within reasonable time', async () => {
      if (!hasSupabaseToken) return;

      const start = Date.now();
      await adapter.getProjects();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`⚡ Project listing completed in ${duration}ms`);
    });

    it('should handle concurrent project queries', async () => {
      if (!hasSupabaseToken) return;

      const promises = Array.from({ length: 3 }, () => 
        adapter.getProjects()
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(projects => {
        expect(Array.isArray(projects)).toBe(true);
      });
      
      console.log(`✅ Concurrent requests handled successfully`);
    });
  });
});