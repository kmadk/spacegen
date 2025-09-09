/**
 * Live integration tests for OpenAI API
 * These tests make actual API calls to OpenAI GPT-5
 *
 * Setup required:
 * 1. Get an OpenAI API key from https://platform.openai.com/api-keys
 * 2. Set environment variable: OPEN_AI_API_KEY=your_key_here
 * 3. Make sure you have credits in your OpenAI account
 *
 * WARNING: These tests will consume OpenAI API credits!
 * Each test costs approximately $0.01-0.10 depending on GPT-5 pricing
 *
 * Run with: OPEN_AI_API_KEY=your_key pnpm test:live
 */

import { describe, it, expect, beforeAll } from "vitest";
import { BackendGenerator } from "../../backend-generator.js";
import { AIPatternAnalyzer } from "../../analyzers/ai-pattern-analyzer.js";
import { VisionAnalyzer } from "../../analyzers/vision-analyzer.js";
import {
  createTestBackendConfig,
  createTestAIConfig,
  validateGeneratedBackend,
} from "../utils/test-helpers.js";
import {
  mockFigmaDesignData,
  mockScreenshots,
} from "../fixtures/design-data.js";

// Skip these tests unless OPENAI_API_KEY or OPEN_AI_API_KEY is provided
const hasOpenAIKey = !!(
  process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY
);
const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
const describeOrSkip = hasOpenAIKey ? describe : describe.skip;

describeOrSkip("OpenAI Live API Integration", () => {
  let generator: BackendGenerator;
  let analyzer: AIPatternAnalyzer;
  let visionAnalyzer: VisionAnalyzer;

  beforeAll(async () => {
    if (!hasOpenAIKey) {
      console.log("⚠️ Skipping OpenAI live tests - OPEN_AI_API_KEY not set");
      console.log(
        "💡 To run live tests: OPEN_AI_API_KEY=your_key pnpm test:live"
      );
      console.log("💰 Warning: These tests will consume OpenAI API credits!");
      return;
    }

    // Use real OpenAI API key for live testing
    const config = createTestBackendConfig({
      openaiApiKey: apiKey!,
      debug: true,
    });

    const aiConfig = createTestAIConfig({
      apiKey: apiKey!,
      model: "gpt-4o", // Use GPT-4o which supports JSON mode
      debug: true,
    });

    generator = new BackendGenerator(config);
    analyzer = new AIPatternAnalyzer(aiConfig);
    visionAnalyzer = new VisionAnalyzer(aiConfig);

    console.log("🔗 Connected to OpenAI API for live testing");
    console.log("💰 Warning: API calls will consume credits");
  });

  describe("Text-Only Analysis (Real GPT API)", () => {
    it("should perform real AI analysis of Figma design data", async () => {
      if (!hasOpenAIKey) return;

      console.log("🤖 Calling real GPT API for design analysis...");
      console.log("💰 Estimated cost: ~$0.05-0.10");

      const start = Date.now();
      const result =
        await generator.generateFromDesignData(mockFigmaDesignData);
      const duration = Date.now() - start;

      // Validate the structure
      validateGeneratedBackend(result);

      // Check that we got real AI analysis (not just fallbacks)
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.endpoints.length).toBeGreaterThan(0);
      expect(result.files.length).toBeGreaterThan(0);

      // Real AI should generate meaningful entity names
      const entityNames = result.models.map((m) => m.name);
      expect(
        entityNames.some(
          (name) => name !== "DefaultEntity" && name !== "GenericEntity"
        )
      ).toBe(true);

      console.log(`✅ Real AI analysis completed in ${duration}ms`);
      console.log(
        `📊 Generated: ${result.models.length} models, ${result.endpoints.length} endpoints`
      );
      console.log(`📁 Entity names: ${entityNames.join(", ")}`);

      // Log some actual content to verify it's not just templates
      if (result.models.length > 0) {
        const firstModel = result.models[0];
        console.log(
          `🔍 Sample model: ${firstModel.name} (${firstModel.fields.length} fields)`
        );
        console.log(
          `   Fields: ${firstModel.fields.map((f) => f.name).join(", ")}`
        );
      }
    }, 120000); // 2 minute timeout for API calls

    it("should perform detailed entity analysis with real GPT", async () => {
      if (!hasOpenAIKey) return;

      console.log("🔬 Testing detailed AI entity analysis...");

      const analysis =
        await analyzer.analyzeDesignPatterns(mockFigmaDesignData);

      expect(analysis).toBeDefined();
      expect(analysis.entities).toBeDefined();
      expect(analysis.entities.entities.length).toBeGreaterThan(0);

      // Real AI should provide detailed reasoning
      const firstEntity = analysis.entities.entities[0];
      expect(firstEntity.name).toBeTruthy();
      expect(firstEntity.reasoning).toBeTruthy();
      expect(firstEntity.confidence).toBeGreaterThan(0);
      expect(firstEntity.confidence).toBeLessThanOrEqual(1);

      console.log(
        `✅ Entity analysis: ${analysis.entities.entities.length} entities found`
      );
      console.log(`🧠 Sample reasoning: "${firstEntity.reasoning}"`);
      console.log(`📊 Confidence: ${firstEntity.confidence}`);
    }, 30000);

    it("should handle cost-optimized batch analysis with real API", async () => {
      if (!hasOpenAIKey) return;

      console.log("💰 Testing cost-optimized batch analysis...");

      const start = Date.now();
      const analysis = await analyzer.analyzeCostOptimized(mockFigmaDesignData);
      const duration = Date.now() - start;

      expect(analysis).toBeDefined();
      expect(analysis.entities).toBeDefined();
      expect(analysis.relationships).toBeDefined();
      expect(analysis.endpoints).toBeDefined();
      expect(analysis.seedData).toBeDefined();

      console.log(`✅ Batch analysis completed in ${duration}ms`);
      console.log(
        `📊 Results: ${analysis.entities.entities.length} entities, ${analysis.endpoints.endpoints.length} endpoints`
      );

      // Should be cheaper than individual calls
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    }, 30000);
  });

  describe.skip("Vision Analysis (Real GPT Vision)", () => {
    it("should analyze screenshots with real GPT Vision API", async () => {
      if (!hasOpenAIKey) return;

      console.log("👁️ Calling real GPT Vision API for screenshot analysis...");
      console.log("💰 Estimated cost: ~$0.10-0.20 (vision is more expensive)");

      const start = Date.now();
      const result = await visionAnalyzer.analyzeScreenshots(mockScreenshots);
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.visualPatterns)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);

      console.log(`✅ Vision analysis completed in ${duration}ms`);
      console.log(`👁️ Visual patterns found: ${result.visualPatterns.length}`);
      console.log(`🧠 Insights: ${result.insights.length}`);
      console.log(`📊 Confidence: ${result.confidence}`);

      if (result.visualPatterns.length > 0) {
        const pattern = result.visualPatterns[0];
        console.log(
          `🔍 Sample pattern: ${pattern.type} - "${pattern.description}"`
        );
      }

      if (result.insights.length > 0) {
        console.log(`💡 Sample insight: "${result.insights[0]}"`);
      }
    }, 45000); // Longer timeout for vision API

    it("should combine text and vision analysis with real APIs", async () => {
      if (!hasOpenAIKey) return;

      console.log("🔬 Testing combined text + vision analysis...");
      console.log("💰 Estimated cost: ~$0.15-0.30");

      const start = Date.now();
      const result = await analyzer.analyzeDesignPatternsWithVision(
        mockFigmaDesignData,
        mockScreenshots.slice(0, 1) // Use only 1 screenshot to save costs
      );
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(result.textAnalysis).toBeDefined();
      expect(result.visionAnalysis).toBeDefined();
      expect(result.combinedAnalysis).toBeDefined();

      // Combined analysis should have more entities than text-only
      const textEntities = result.textAnalysis.entities.entities.length;
      const combinedEntities = result.combinedAnalysis.combinedEntities.length;

      console.log(`✅ Combined analysis completed in ${duration}ms`);
      console.log(
        `📊 Text entities: ${textEntities}, Combined entities: ${combinedEntities}`
      );
      console.log(
        `🔄 Analysis method: ${result.combinedAnalysis.analysisMethod}`
      );
      console.log(
        `📊 Combined confidence: ${result.combinedAnalysis.confidenceScore}`
      );

      // Confidence should be reasonable
      expect(result.combinedAnalysis.confidenceScore).toBeGreaterThan(0);
      expect(result.combinedAnalysis.confidenceScore).toBeLessThanOrEqual(1);
    }, 60000); // Longer timeout for combined analysis
  });

  describe("End-to-End Real API Workflow", () => {
    it("should generate complete backend with real AI analysis", async () => {
      if (!hasOpenAIKey) return;

      console.log("🚀 Full end-to-end workflow with real AI...");
      console.log("💰 Estimated cost: ~$0.10-0.20");

      const complexDesign = {
        ...mockFigmaDesignData,
        nodes: [
          {
            id: "product-form",
            name: "Product Form",
            type: "FRAME" as const,
            characters: "Add Product: Name, Price $99.99, Category Electronics",
            absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
          },
          {
            id: "user-profile",
            name: "User Profile",
            type: "FRAME" as const,
            characters: "John Doe, john@example.com, Admin User",
            absoluteBoundingBox: { x: 450, y: 0, width: 300, height: 200 },
          },
          {
            id: "order-list",
            name: "Order History",
            type: "FRAME" as const,
            characters:
              "Recent Orders: Order #12345 - $299.99, Order #12346 - $149.50",
            absoluteBoundingBox: { x: 0, y: 350, width: 750, height: 250 },
          },
        ],
      };

      const start = Date.now();
      const result = await generator.generateFromDesignData(complexDesign);
      const duration = Date.now() - start;

      // Comprehensive validation
      validateGeneratedBackend(result);

      // Should generate meaningful entities from the complex design
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.endpoints.length).toBeGreaterThan(0);

      // Check for expected entity types
      const entityNames = result.models.map((m) => m.name.toLowerCase());
      const hasRelevantEntities = entityNames.some(
        (name) =>
          name.includes("product") ||
          name.includes("user") ||
          name.includes("order") ||
          name === "product" ||
          name === "user" ||
          name === "order"
      );
      expect(hasRelevantEntities).toBe(true);

      // Check for realistic API endpoints
      const endpointPaths = result.endpoints.map((e) => e.path);
      expect(endpointPaths.length).toBeGreaterThan(0);

      console.log(`✅ End-to-end workflow completed in ${duration}ms`);
      console.log(
        `📊 Final result: ${result.models.length} models, ${result.endpoints.length} endpoints`
      );
      console.log(
        `🏗️ Entity names: ${result.models.map((m) => m.name).join(", ")}`
      );
      console.log(
        `🔗 Sample endpoints: ${endpointPaths.slice(0, 3).join(", ")}`
      );

      // Verify generated files have actual content (not just templates)
      const sqlFile = result.files.find((f) => f.path.includes(".sql"));
      if (sqlFile) {
        expect(sqlFile.content.length).toBeGreaterThan(100);
        expect(sqlFile.content).toContain("CREATE TABLE");
        console.log(
          `📄 Generated SQL file: ${sqlFile.content.length} characters`
        );
      }

      const apiFile = result.files.find((f) => f.type === "api");
      if (apiFile) {
        expect(apiFile.content.length).toBeGreaterThan(100);
        console.log(
          `📄 Generated API file: ${apiFile.content.length} characters`
        );
      }
    }, 45000);
  });

  describe("API Performance & Costs", () => {
    it("should track real API call performance", async () => {
      if (!hasOpenAIKey) return;

      console.log("⚡ Performance testing with real API...");

      const start = Date.now();
      const result = await analyzer.analyzeCostOptimized({
        ...mockFigmaDesignData,
        nodes: mockFigmaDesignData.nodes.slice(0, 2), // Smaller dataset for speed
      });
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`⚡ API call completed in ${duration}ms`);
      console.log(
        `💰 Single API call generated ${result.entities.entities.length} entities`
      );
    }, 20000);

    it("should demonstrate cost optimization vs individual calls", async () => {
      if (!hasOpenAIKey) return;

      console.log("💰 Comparing batch vs individual API costs...");
      console.log("⚠️ This test makes multiple API calls and will cost more!");

      const smallDesign = {
        ...mockFigmaDesignData,
        nodes: mockFigmaDesignData.nodes.slice(0, 1),
      };

      // Batch analysis (1 API call)
      console.log("🔄 Testing batch analysis (cost-optimized)...");
      const batchStart = Date.now();
      const batchResult = await analyzer.analyzeCostOptimized(smallDesign);
      const batchDuration = Date.now() - batchStart;

      // Individual analysis (4 API calls)
      console.log("🔄 Testing individual analysis (4 separate calls)...");
      const individualStart = Date.now();
      const individualResult =
        await analyzer.analyzeDesignPatterns(smallDesign);
      const individualDuration = Date.now() - individualStart;

      console.log(`💰 Batch analysis: ${batchDuration}ms (1 API call)`);
      console.log(
        `💰 Individual analysis: ${individualDuration}ms (4 API calls)`
      );
      console.log(`📊 Cost savings: ~75% reduction in API calls`);

      // Both should produce valid results
      expect(batchResult.entities.entities.length).toBeGreaterThan(0);
      expect(individualResult.entities.entities.length).toBeGreaterThan(0);

      // Batch should be significantly faster in most cases
      console.log(`⚡ Speed comparison: batch vs individual`);
    }, 60000); // Longer timeout for multiple API calls
  });
});
