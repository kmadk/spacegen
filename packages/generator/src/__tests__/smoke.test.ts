/**
 * Smoke tests to verify core functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BackendGenerator } from "../backend-generator.js";
import { createTestBackendConfig } from "./utils/test-helpers.js";
import { mockFigmaDesignData } from "./fixtures/design-data.js";

// Simple mock for OpenAI that always succeeds
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entities: [
                    {
                      name: "TestEntity",
                      tableName: "test_entities",
                      fields: [
                        {
                          name: "id",
                          type: "uuid",
                          required: true,
                          primary: true,
                        },
                        { name: "name", type: "varchar(255)", required: true },
                      ],
                      confidence: 0.8,
                      reasoning: "Test entity",
                    },
                  ],
                  confidence: 0.8,
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe("Smoke Tests", () => {
  let generator: BackendGenerator;

  beforeEach(() => {
    generator = new BackendGenerator(createTestBackendConfig());
  });

  it("should create generator instance", () => {
    expect(generator).toBeDefined();
    expect(generator.generateFromDesignData).toBeDefined();
  });

  it("should generate basic backend from design data", async () => {
    const result = await generator.generateFromDesignData(mockFigmaDesignData);

    expect(result).toBeDefined();
    expect(result.models).toBeDefined();
    expect(result.files).toBeDefined();
    expect(result.endpoints).toBeDefined();
    expect(result.config).toBeDefined();
    expect(Array.isArray(result.models)).toBe(true);
    expect(Array.isArray(result.files)).toBe(true);
    expect(Array.isArray(result.endpoints)).toBe(true);
  });

  it("should handle empty design data", async () => {
    const emptyDesign = {
      ...mockFigmaDesignData,
      nodes: [],
    };

    const result = await generator.generateFromDesignData(emptyDesign);

    expect(result).toBeDefined();
    expect(Array.isArray(result.models)).toBe(true);
  });

  it("should include project name in config", async () => {
    const result = await generator.generateFromDesignData(mockFigmaDesignData);

    expect(result.config.projectName).toBe("test-project");
  });
});
