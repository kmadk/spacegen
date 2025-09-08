/**
 * Global test setup configuration
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import dotenv from 'dotenv';

// Load environment variables from .env file (look in project root)
dotenv.config({ path: '../../../../.env' });

// Global test environment setup
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = "test";
  process.env.VITEST = "true";

  // Mock fetch globally if not already mocked
  if (!global.fetch) {
    global.fetch = vi.fn();
  }

  // Increase timeout for AI operations
  vi.setConfig({ testTimeout: 30000 });

  // Mock console methods in CI to reduce noise
  if (process.env.CI) {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  }

  // Global garbage collection setup for memory tests
  if (global.gc) {
    global.gc();
  }
});

afterAll(() => {
  // Clean up global mocks
  vi.restoreAllMocks();

  // Final garbage collection
  if (global.gc) {
    global.gc();
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset modules to ensure clean state
  vi.resetModules();

  // Reset mock timers if any
  vi.useRealTimers();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();

  // Only cleanup timers if they are mocked
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.runOnlyPendingTimers();
  }
});

// Global error handling for unhandled promises
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection in tests:", error);
});

// Extend Vi with custom matchers if needed
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidUuid(): any;
      toBeValidEmail(): any;
      toBeValidUrl(): any;
      toHaveValidTimestamp(): any;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidUuid(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
    };
  },

  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        pass: true,
        message: () => `Expected ${received} not to be a valid URL`,
      };
    } catch {
      return {
        pass: false,
        message: () => `Expected ${received} to be a valid URL`,
      };
    }
  },

  toHaveValidTimestamp(received: any) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime()) && timestamp instanceof Date;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid timestamp`
          : `Expected ${received} to be a valid timestamp`,
    };
  },
});
