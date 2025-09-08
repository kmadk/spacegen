/**
 * AI-Powered Smart Data Generator
 *
 * Generates realistic, contextual seed data based on:
 * - Detected entities and their relationships
 * - Design themes and content patterns
 * - Spatial distribution requirements
 * - AI-powered content generation
 */

import OpenAI from "openai";
import type {
  AIAnalysisConfig,
  AISeedDataAnalysis,
  DataModel,
  DetectedEntity,
  GeneratedSeedData,
  SmartDataConfig,
} from "../types.js";
import { createOpenAIParams } from "../utils/openai-utils.js";

export class SmartDataGenerator {
  private openai?: OpenAI;
  private config: SmartDataConfig;
  private useAI: boolean;

  constructor(config: SmartDataConfig = {}) {
    this.config = {
      recordsPerEntity: 25,
      spatialBounds: { minX: -180, maxX: 180, minY: -90, maxY: 90 },
      useRealisticData: true,
      includeRelationships: true,
      ...config,
    };

    this.useAI = !!(config.openaiApiKey || process.env.OPEN_AI_API_KEY);

    if (this.useAI) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey || process.env.OPEN_AI_API_KEY,
      });
    }
  }

  /**
   * Generate realistic data for a model
   */
  async generateRealisticData(
    model: DataModel,
    options: { count: number; useAI?: boolean },
  ): Promise<Record<string, any>[]> {
    if (options.useAI && this.openai) {
      return this.generateWithAI(model, options.count);
    } else {
      return this.generateWithRules(model, options.count);
    }
  }

  /**
   * AI-powered data generation
   */
  private async generateWithAI(
    model: DataModel,
    count: number,
  ): Promise<Record<string, any>[]> {
    const prompt = this.buildDataGenerationPrompt(model, count);

    const apiParams = createOpenAIParams({
      model: process.env.OPENAI_MODEL || "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a data architect generating realistic, diverse seed data for applications. Create coherent, professional data that feels authentic.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "3000"),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.3"),
      response_format: { type: "json_object" },
    });

    const response = await this.openai!.chat.completions.create(apiParams);
    const aiResponse = JSON.parse(response.choices[0].message.content || "{}");

    return this.validateAndEnhanceRecords(aiResponse.records || [], model);
  }

  /**
   * Rule-based data generation
   */
  private generateWithRules(
    model: DataModel,
    count: number,
  ): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (let i = 0; i < count; i++) {
      const record: Record<string, any> = {};

      for (const field of model.fields) {
        record[field.name] = this.generateFieldValue(field, i);
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Build AI prompt for data generation
   */
  private buildDataGenerationPrompt(
    model: DataModel,
    recordCount: number,
  ): string {
    const spatialFields = model.fields.filter(
      (f) =>
        f.type === "geometry" ||
        f.type === "point" ||
        f.name.includes("position"),
    );

    return `Generate ${recordCount} realistic seed data records for a "${model.name}" entity.

ENTITY SCHEMA:
${JSON.stringify(model.fields, null, 2)}

REQUIREMENTS:
1. Create diverse, realistic data (no Lorem Ipsum)
2. Ensure data relationships make sense
3. ${spatialFields.length > 0 ? "Include realistic spatial coordinates within reasonable bounds" : ""}
4. Follow proper data types and constraints

RETURN JSON FORMAT:
{
  "records": [
    {
      "id": 1,
      "field_name": "realistic_value",
      ${spatialFields.length > 0 ? '"spatial_field": {"x": 100.5, "y": 200.3},' : ""}
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}`;
  }

  /**
   * Validate and enhance AI-generated records
   */
  private validateAndEnhanceRecords(
    aiRecords: Record<string, any>[],
    model: DataModel,
  ): Record<string, any>[] {
    return aiRecords.map((record, index) => {
      const enhancedRecord: Record<string, any> = {};

      // Ensure all required fields are present
      for (const field of model.fields) {
        if (record[field.name] !== undefined) {
          enhancedRecord[field.name] = this.validateFieldValue(
            record[field.name],
            field,
          );
        } else if (field.required) {
          enhancedRecord[field.name] = this.generateFieldValue(field, index);
        }
      }

      // Add auto-generated fields if missing
      if (!enhancedRecord.id) {
        enhancedRecord.id = index + 1;
      }
      if (!enhancedRecord.created_at) {
        enhancedRecord.created_at = new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
      }

      return enhancedRecord;
    });
  }

  /**
   * Generate a single field value using rules
   */
  private generateFieldValue(field: any, index: number): any {
    switch (field.type) {
      case "number":
        return field.name === "id"
          ? index + 1
          : Math.floor(Math.random() * 1000);

      case "string":
        if (field.name.includes("email")) {
          return `user${index + 1}@example.com`;
        }
        if (field.name.includes("name")) {
          const names = [
            "Alice Johnson",
            "Bob Smith",
            "Carol Davis",
            "David Wilson",
            "Eva Brown",
          ];
          return names[index % names.length];
        }
        return `${field.name}_${index + 1}`;

      case "boolean":
        return Math.random() > 0.5;

      case "date":
        return new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ).toISOString();

      case "geometry":
      case "point":
        return {
          x:
            this.config.spatialBounds.minX +
            Math.random() *
              (this.config.spatialBounds.maxX - this.config.spatialBounds.minX),
          y:
            this.config.spatialBounds.minY +
            Math.random() *
              (this.config.spatialBounds.maxY - this.config.spatialBounds.minY),
        };

      case "json":
        return { metadata: `data_${index}` };

      default:
        return `value_${index}`;
    }
  }

  /**
   * Validate and convert field values to proper types
   */
  private validateFieldValue(value: any, field: any): any {
    switch (field.type) {
      case "number":
        return typeof value === "number" ? value : parseFloat(value) || 0;
      case "boolean":
        return Boolean(value);
      case "date":
        return typeof value === "string"
          ? value
          : new Date(value).toISOString();
      case "geometry":
      case "point":
        if (
          typeof value === "object" &&
          value.x !== undefined &&
          value.y !== undefined
        ) {
          return value;
        }
        return { x: 0, y: 0 };
      default:
        return String(value);
    }
  }
}
