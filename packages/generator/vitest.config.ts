import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Global setup and teardown
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test/**',
        'vitest.config.ts'
      ],
      // Minimum coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        './src/analyzers/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        './src/backend-generator.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // Test timeout configuration
    testTimeout: 30000, // 30 seconds for complex AI operations
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Test file patterns - only actual test files
    include: [
      'src/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      '**/setup.ts',
      '**/test-helpers.ts',
      '**/fixtures/**',
      '**/utils/**',
      '**/*.bench.test.ts' // Exclude benchmark tests from regular test run
    ],
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Performance and benchmark configuration
    benchmark: {
      include: ['**/*.bench.{test,spec}.{js,ts}'],
      exclude: ['node_modules/**', 'dist/**'],
      outputFile: 'benchmark-results.json'
    },
    
    // Reporter configuration
    reporter: process.env.CI 
      ? ['verbose', 'junit', 'json']
      : ['verbose', 'html'],
    
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Retry configuration for flaky tests
    retry: process.env.CI ? 2 : 0,
    
    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0,
    
    // Server configuration for dependencies
    server: {
      deps: {
        inline: ['openai']
      }
    },
    
    // Global test configuration
    globals: true,
    
    // Watch mode configuration
    watch: !process.env.CI,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      VITEST: 'true'
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/__tests__')
    }
  },
  
  // Build configuration for tests
  esbuild: {
    target: 'node18'
  }
});