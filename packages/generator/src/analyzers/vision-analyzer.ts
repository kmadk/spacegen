/**
 * GPT-5 Vision Analysis for Design Pattern Recognition
 *
 * Uses OpenAI's vision capabilities to analyze design screenshots and infer:
 * - Database entities from visual UI patterns
 * - Data relationships from layout structures
 * - Form fields and validation patterns
 * - Navigation and user flow patterns
 */

import OpenAI from "openai";
import type {
  AIAnalysisConfig,
  VisionAnalysisResult,
  VisualPattern,
  DetectedEntity,
  SuggestedRelationship,
  DesignScreenshot,
} from "../types.js";
import { createOpenAIParams } from "../utils/openai-utils.js";

export class VisionAnalyzer {
  private openai?: OpenAI;
  private config: AIAnalysisConfig;
  private useVision: boolean;

  constructor(config: AIAnalysisConfig) {
    this.config = {
      model: process.env.OPENAI_VISION_MODEL || "gpt-5",
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "4000"),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.1"),
      enableVision: true,
      ...config,
    };

    this.config = {
      ...this.config,
      enableVision: this.config.enableVision ?? true,
    };

    this.useVision =
      !!(this.config.apiKey || process.env.OPEN_AI_API_KEY) &&
      (this.config.enableVision ?? true);

    if (this.useVision) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPEN_AI_API_KEY,
      });
    }
  }

  /**
   * Analyze design screenshots for database entity patterns
   */
  async analyzeScreenshots(
    screenshots: DesignScreenshot[],
  ): Promise<VisionAnalysisResult> {
    if (!this.useVision || screenshots.length === 0) {
      return {
        entities: [],
        relationships: [],
        insights: ["Vision analysis not available or no screenshots provided"],
        confidence: 0,
        visualPatterns: [],
      };
    }

    if (this.config.debug) {
      console.log(
        "🎯 Starting GPT-5 vision analysis of design screenshots...",
        {
          screenshotCount: screenshots.length,
        },
      );
    }

    try {
      // Analyze each screenshot
      const results = await Promise.all(
        screenshots.map((screenshot) => this.analyzeScreenshot(screenshot)),
      );

      // Combine results from all screenshots
      return this.combineVisionResults(results);
    } catch (error) {
      console.warn("⚠️ Vision analysis failed:", error);
      return {
        entities: [],
        relationships: [],
        insights: [
          `Vision analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        confidence: 0,
        visualPatterns: [],
      };
    }
  }

  /**
   * Analyze a single screenshot for patterns
   */
  private async analyzeScreenshot(
    screenshot: DesignScreenshot,
  ): Promise<VisionAnalysisResult> {
    const prompt = this.buildVisionAnalysisPrompt(screenshot);

    if (this.config.debug) {
      console.log(`🔍 Analyzing screenshot: ${screenshot.name}`);
    }

    const apiParams = createOpenAIParams({
      model: this.config.model!,
      messages: [
        {
          role: "system",
          content: `You are an expert database architect and UI/UX analyst with deep expertise in visual pattern recognition.

Your task is to analyze design screenshots and identify database entities, relationships, and data patterns that would power the application.

Key capabilities:
- Recognize visual UI patterns (cards, forms, lists, navigation)
- Infer data structures from layout patterns
- Identify relationships between different UI components
- Understand user flows and data dependencies
- Generate realistic database schemas from visual cues

Focus on practical, production-ready database design based on what you see in the interface.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: screenshot.imageUrl,
                detail: "high", // High detail for better pattern recognition
              },
            },
          ],
        } as any,
      ],
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      response_format: { type: "json_object" },
    });

    const response = await this.openai!.chat.completions.create(apiParams);
    const analysis = JSON.parse(response.choices[0].message.content || "{}");

    return this.validateVisionAnalysis(analysis, screenshot);
  }

  /**
   * Build vision analysis prompt for screenshot
   */
  private buildVisionAnalysisPrompt(screenshot: DesignScreenshot): string {
    return `# Visual Database Schema Analysis

## Task
Analyze this design screenshot to infer the database entities and relationships that would power this application.

## Screenshot Context
- **Page**: ${screenshot.name}
- **Analysis Focus**: Database schema inference from visual UI patterns

## Analysis Process

### Step 1: Visual Pattern Recognition
Identify these UI patterns in the screenshot:
- **Card/List Patterns**: Repeated elements that suggest entities
- **Form Structures**: Input fields that indicate data collection
- **Navigation Elements**: Menu items that suggest different data types
- **Data Display Patterns**: Tables, grids, or lists showing structured data
- **Relationship Indicators**: Visual connections between different data types

### Step 2: Entity Inference
For each pattern you identify:
- What type of data does this pattern represent?
- What fields would be needed to store this data?
- How many instances of this entity might exist?
- What are the key attributes you can infer from the visual design?

### Step 3: Relationship Analysis
Look for visual cues that suggest relationships:
- Items contained within other items (one-to-many)
- References between different sections (foreign keys)
- User flows that show data dependencies

## Required JSON Response Format

\`\`\`json
{
  "visualPatterns": [
    {
      "type": "card_pattern" | "form_structure" | "data_list" | "navigation" | "layout_grid",
      "description": "Detailed description of what you see",
      "confidence": 0.0-1.0,
      "suggestedEntity": "entity_name",
      "boundingBox": { "x": 0, "y": 0, "width": 100, "height": 100 }
    }
  ],
  "entities": [
    {
      "name": "EntityName",
      "tableName": "entity_names",
      "description": "What this entity represents",
      "fields": [
        {
          "name": "field_name",
          "type": "varchar(255)" | "integer" | "timestamp" | "boolean" | "text" | "uuid",
          "required": true|false,
          "description": "Field purpose"
        }
      ],
      "confidence": 0.0-1.0,
      "reasoning": "Why you inferred this entity from the visual design",
      "visualEvidence": "What specific visual elements led to this inference"
    }
  ],
  "relationships": [
    {
      "from": "EntityA",
      "to": "EntityB", 
      "type": "oneToMany" | "manyToMany" | "oneToOne",
      "confidence": 0.0-1.0,
      "reasoning": "Visual cues that suggest this relationship",
      "foreignKey": "suggested_foreign_key_name"
    }
  ],
  "insights": [
    "Key observations about the application domain based on visual analysis",
    "Patterns that suggest specific business logic or user workflows"
  ],
  "confidence": 0.0-1.0
}
\`\`\`

Focus on extracting practical, implementable database schemas based on what you can actually see in the interface.`;
  }

  /**
   * Validate and enhance vision analysis results
   */
  private validateVisionAnalysis(
    analysis: any,
    screenshot: DesignScreenshot,
  ): VisionAnalysisResult {
    const visualPatterns: VisualPattern[] = (analysis.visualPatterns || []).map(
      (pattern: any) => ({
        type: pattern.type || "layout_grid",
        description: pattern.description || "Visual pattern detected",
        confidence: Math.max(0, Math.min(1, pattern.confidence || 0.5)),
        suggestedEntity: pattern.suggestedEntity,
        boundingBox: pattern.boundingBox,
      }),
    );

    const entities: DetectedEntity[] = (analysis.entities || []).map(
      (entity: any) => ({
        name: entity.name || "VisualEntity",
        tableName:
          entity.tableName ||
          entity.name?.toLowerCase().replace(/[^a-z0-9]/g, "_") + "s",
        description:
          entity.description || "Entity detected from visual analysis",
        fields: this.validateEntityFields(entity.fields || []),
        indexes: [],
        sourceElements: [`vision:${screenshot.pageId}`],
        confidence: Math.max(0.1, Math.min(1.0, entity.confidence || 0.6)),
        reasoning: entity.reasoning || "Inferred from visual pattern analysis",
      }),
    );

    const relationships: SuggestedRelationship[] = (
      analysis.relationships || []
    ).map((rel: any) => ({
      from: rel.from,
      to: rel.to,
      type: rel.type || "oneToMany",
      confidence: Math.max(0.1, Math.min(1.0, rel.confidence || 0.5)),
      reasoning: rel.reasoning || "Visual relationship detected",
      foreignKey: rel.foreignKey,
    }));

    return {
      entities,
      relationships,
      insights: analysis.insights || [],
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7)),
      visualPatterns,
    };
  }

  /**
   * Validate entity fields from vision analysis
   */
  private validateEntityFields(fields: any[]): any[] {
    return fields.map((field) => ({
      name: field.name || "unknown_field",
      type: field.type || "varchar(255)",
      required: field.required ?? false,
      description: field.description || "Field detected from visual analysis",
    }));
  }

  /**
   * Combine results from multiple screenshot analyses
   */
  private combineVisionResults(
    results: VisionAnalysisResult[],
  ): VisionAnalysisResult {
    const allEntities: DetectedEntity[] = [];
    const allRelationships: SuggestedRelationship[] = [];
    const allInsights: string[] = [];
    const allPatterns: VisualPattern[] = [];

    // Combine all results
    for (const result of results) {
      allEntities.push(...result.entities);
      allRelationships.push(...result.relationships);
      allInsights.push(...result.insights);
      allPatterns.push(...result.visualPatterns);
    }

    // Deduplicate entities by name (keep highest confidence)
    const entityMap = new Map<string, DetectedEntity>();
    for (const entity of allEntities) {
      const existing = entityMap.get(entity.name);
      if (!existing || entity.confidence > existing.confidence) {
        entityMap.set(entity.name, entity);
      }
    }

    // Deduplicate relationships
    const relationshipMap = new Map<string, SuggestedRelationship>();
    for (const rel of allRelationships) {
      const key = `${rel.from}-${rel.to}-${rel.type}`;
      const existing = relationshipMap.get(key);
      if (!existing || rel.confidence > existing.confidence) {
        relationshipMap.set(key, rel);
      }
    }

    const combinedConfidence =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

    return {
      entities: Array.from(entityMap.values()),
      relationships: Array.from(relationshipMap.values()),
      insights: [...new Set(allInsights)], // Remove duplicates
      confidence: combinedConfidence,
      visualPatterns: allPatterns,
    };
  }
}
