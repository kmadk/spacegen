/**
 * Tests for Backend Generator Core Functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BackendGenerator } from "../backend-generator.js";
import type { BackendGeneratorConfig, DesignData } from "../types.js";
import {
  createMockOpenAI,
  createTestBackendConfig,
  mockOpenAITextResponse,
  validateGeneratedBackend,
} from "./utils/test-helpers.js";
import {
  mockFigmaDesignData,
  mockEntityAnalysisResponse,
} from "./fixtures/design-data.js";

// Mock OpenAI
let sharedMockOpenAI = createMockOpenAI();
vi.mock("openai", () => ({
  default: vi.fn(() => sharedMockOpenAI),
}));

describe("BackendGenerator", () => {
  let generator: BackendGenerator;
  let mockOpenAI: ReturnType<typeof createMockOpenAI>;

  beforeEach(() => {
    // Disable caching for tests to ensure predictable API calls
    process.env.AI_CACHE_ENABLED = 'false';

    // Reset the shared mock and reassign it
    sharedMockOpenAI = createMockOpenAI();
    mockOpenAI = sharedMockOpenAI;

    generator = new BackendGenerator(createTestBackendConfig());

    // Setup default successful AI responses
    mockOpenAI.chat.completions.create = vi.fn().mockResolvedValue(
      mockOpenAITextResponse({
        entities: [{
          name: 'DefaultEntity',
          tableName: 'default_entities',
          fields: [{ name: 'id', type: 'uuid', required: true, primary: true }],
          confidence: 0.8
        }]
      })
    );
  });

  describe("Core Generation", () => {
    it("should generate backend from design data", async () => {
      // Setup proper mock responses for AI analysis
      mockOpenAI.chat.completions.create = vi
        .fn()
        .mockResolvedValueOnce(
          mockOpenAITextResponse({
            entities: [{
              name: 'User',
              tableName: 'users',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true },
                { name: 'email', type: 'varchar(320)', required: true }
              ],
              confidence: 0.9
            }]
          }),
        )
        .mockResolvedValueOnce(
          mockOpenAITextResponse({ relationships: [], confidence: 0.8 }),
        )
        .mockResolvedValueOnce(
          mockOpenAITextResponse({ endpoints: [], confidence: 0.8 }),
        )
        .mockResolvedValueOnce(
          mockOpenAITextResponse({ dataTypes: [], confidence: 0.8 }),
        );

      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);

      validateGeneratedBackend(result);
      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe("User");
    });

    it("should handle empty design data gracefully", async () => {
      const emptyDesign: DesignData = {
        ...mockFigmaDesignData,
        nodes: [],
      };

      const result = await generator.generateFromDesignData(emptyDesign);

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.models)).toBe(true);
    });

    it("should include project configuration", async () => {
      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);

      expect(result.config).toBeDefined();
      expect(result.config.projectName).toBe("test-project");
    });
  });

  describe("Error Handling", () => {
    it("should handle AI API failures gracefully", async () => {
      mockOpenAI.chat.completions.create = vi
        .fn()
        .mockRejectedValue(new Error("API Error"));

      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);

      // Should fall back to rule-based generation
      expect(result).toBeDefined();
      expect(result.models).toBeDefined();
    });

    it("should validate configuration", () => {
      const invalidConfig = {} as BackendGeneratorConfig;

      expect(() => {
        new BackendGenerator(invalidConfig);
      }).toThrow();
    });
  });

  describe("Vision Integration", () => {
    it("should handle vision analysis when screenshots provided", async () => {
      const screenshots = [
        {
          pageId: "page-1",
          name: "Test Page",
          imageUrl: "https://example.com/test.png",
        },
      ];

      // Mock cost-optimized batch analysis response (1 call)
      mockOpenAI.chat.completions.create = vi
        .fn()
        .mockResolvedValueOnce(
          mockOpenAITextResponse({
            entities: [
              {
                name: "Product",
                tableName: "products",
                description: "Product entity from batch analysis",
                fields: [
                  {
                    name: "id",
                    type: "uuid",
                    required: true,
                    primary: true,
                    description: "Product identifier",
                  },
                  {
                    name: "name",
                    type: "text",
                    required: true,
                    description: "Product name",
                  },
                ],
                indexes: [],
                sourceElements: ["form"],
                confidence: 0.85,
                reasoning: "Product form detected in design",
              },
            ],
            relationships: [],
            endpoints: [
              {
                path: "/api/products",
                method: "GET",
                entity: "Product",
                operation: "list",
                description: "Get all products",
              },
            ],
            seedData: [
              {
                entity: "Product",
                sampleCount: 10,
                description: "Sample products for testing",
              },
            ],
          }),
        );

      const result = await generator.generateFromDesignData(
        mockFigmaDesignData,
        screenshots,
      );

      expect(result).toBeDefined();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1); // Cost-optimized batch analysis
    });
  });

  describe("Configuration Options", () => {
    it("should respect debug mode", async () => {
      const debugGenerator = new BackendGenerator(
        createTestBackendConfig({
          debug: true,
        }),
      );

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await debugGenerator.generateFromDesignData(mockFigmaDesignData);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle different database types", async () => {
      const postgresGenerator = new BackendGenerator(
        createTestBackendConfig({
          database: { type: "postgresql", enablePostGIS: true },
        }),
      );

      const result =
        await postgresGenerator.generateFromDesignData(mockFigmaDesignData);

      expect(result).toBeDefined();
      expect(result.config.database?.type).toBe("postgresql");
    });
  });

  describe("File Generation", () => {
    it("should generate required file types", async () => {
      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);

      const fileTypes = result.files.map((f) => f.type);
      expect(fileTypes).toContain("database");
      expect(fileTypes).toContain("api");
    });

    it("should generate valid file paths", async () => {
      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);

      result.files.forEach((file) => {
        expect(file.path).toBeTruthy();
        expect(file.path).not.toContain(" ");
        expect(file.content).toBeTruthy();
      });
    });
  });
});
