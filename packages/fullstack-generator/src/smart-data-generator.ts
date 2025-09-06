/**
 * AI-Powered Smart Data Generator
 * 
 * Generates realistic, contextual seed data based on:
 * - Detected entities and their relationships
 * - Design themes and content patterns
 * - Spatial distribution requirements
 * - AI-powered content generation
 */

import OpenAI from 'openai';
import type {
  AIAnalysisConfig,
  AISeedDataAnalysis,
  SpatialDataModel,
  DetectedEntity,
  GeneratedSeedData,
  SmartDataConfig
} from './types.js';
import { createOpenAIParams } from './openai-utils.js';

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
      ...config
    };

    this.useAI = !!(config.openaiApiKey || process.env.OPENAI_API_KEY);
    
    if (this.useAI) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Generate comprehensive seed data for all entities
   */
  async generateSeedData(
    models: SpatialDataModel[],
    seedAnalysis?: AISeedDataAnalysis
  ): Promise<GeneratedSeedData> {
    if (this.useAI && this.openai) {
      return this.generateWithAI(models, seedAnalysis);
    } else {
      return this.generateWithRules(models);
    }
  }

  /**
   * AI-powered seed data generation
   */
  private async generateWithAI(
    models: SpatialDataModel[],
    seedAnalysis?: AISeedDataAnalysis
  ): Promise<GeneratedSeedData> {
    console.log('🤖 Generating realistic seed data with AI...');

    const seedData: GeneratedSeedData = {
      entities: {},
      relationships: [],
      spatialDistribution: {},
      metadata: {
        generatedAt: new Date(),
        totalRecords: 0,
        themes: seedAnalysis?.themes || ['general'],
        confidence: seedAnalysis?.confidence || 0.8
      }
    };

    for (const model of models) {
      try {
        const records = await this.generateEntityRecordsWithAI(model, seedAnalysis);
        seedData.entities[model.name] = records;
        seedData.metadata.totalRecords += records.length;

        if (this.config.debug) {
          console.log(`✅ Generated ${records.length} records for ${model.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ AI generation failed for ${model.name}, using fallback`);
        const fallbackRecords = this.generateEntityRecordsWithRules(model);
        seedData.entities[model.name] = fallbackRecords;
        seedData.metadata.totalRecords += fallbackRecords.length;
      }
    }

    // Generate relationships between entities
    if (this.config.includeRelationships) {
      seedData.relationships = this.generateRelationshipData(models, seedData.entities);
    }

    // Calculate spatial distribution
    seedData.spatialDistribution = this.calculateSpatialDistribution(seedData.entities);

    console.log(`🎯 Generated ${seedData.metadata.totalRecords} total records with AI`);
    return seedData;
  }

  /**
   * Rule-based seed data generation (fallback)
   */
  private generateWithRules(models: SpatialDataModel[]): GeneratedSeedData {
    console.log('📐 Generating seed data with rules-based approach...');

    const seedData: GeneratedSeedData = {
      entities: {},
      relationships: [],
      spatialDistribution: {},
      metadata: {
        generatedAt: new Date(),
        totalRecords: 0,
        themes: ['general'],
        confidence: 0.5
      }
    };

    for (const model of models) {
      const records = this.generateEntityRecordsWithRules(model);
      seedData.entities[model.name] = records;
      seedData.metadata.totalRecords += records.length;
    }

    if (this.config.includeRelationships) {
      seedData.relationships = this.generateRelationshipData(models, seedData.entities);
    }

    seedData.spatialDistribution = this.calculateSpatialDistribution(seedData.entities);

    return seedData;
  }

  /**
   * Generate records for a single entity using AI
   */
  private async generateEntityRecordsWithAI(
    model: SpatialDataModel,
    seedAnalysis?: AISeedDataAnalysis
  ): Promise<Record<string, any>[]> {
    const entityAnalysis = seedAnalysis?.dataTypes.find(dt => dt.entity === model.name);
    const recordCount = entityAnalysis?.sampleCount || this.config.recordsPerEntity;
    const theme = entityAnalysis?.theme || 'professional';

    const prompt = this.buildDataGenerationPrompt(model, recordCount, theme, entityAnalysis);

    const apiParams = createOpenAIParams({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a data architect generating realistic, diverse seed data for applications. Create coherent, professional data that feels authentic.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '3000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
      response_format: { type: 'json_object' }
    });

    const response = await this.openai!.chat.completions.create(apiParams);

    const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
    return this.validateAndEnhanceRecords(aiResponse.records || [], model);
  }

  /**
   * Generate records using rule-based approach
   */
  private generateEntityRecordsWithRules(model: SpatialDataModel): Record<string, any>[] {
    const records: Record<string, any>[] = [];
    const recordCount = this.config.recordsPerEntity;

    for (let i = 0; i < recordCount; i++) {
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
    model: SpatialDataModel,
    recordCount: number,
    theme: string,
    entityAnalysis?: any
  ): string {
    const spatialFields = model.fields.filter(f => 
      f.type === 'geometry' || f.type === 'point' || f.name.includes('position')
    );

    return `Generate ${recordCount} realistic seed data records for a "${model.name}" entity.

ENTITY SCHEMA:
${JSON.stringify(model.fields, null, 2)}

REQUIREMENTS:
1. Theme: ${theme}
2. Create diverse, realistic data (no Lorem Ipsum)
3. Ensure data relationships make sense
4. ${spatialFields.length > 0 ? 'Include realistic spatial coordinates within reasonable bounds' : ''}
5. Follow proper data types and constraints

SPATIAL CONTEXT:
${spatialFields.length > 0 ? `
- Include spatial positioning for fields: ${spatialFields.map(f => f.name).join(', ')}
- Use realistic coordinate ranges (e.g., lat/lng for global, pixel coordinates for UI)
- Consider spatial distribution patterns (clustered, distributed, hierarchical)
` : 'No spatial fields detected'}

EXAMPLE DATA THEMES:
- professional: Business/corporate context
- creative: Design/artistic context  
- social: Social media/community context
- ecommerce: Shopping/retail context
- educational: Learning/academic context

${entityAnalysis?.examples ? `
REFERENCE EXAMPLES:
${JSON.stringify(entityAnalysis.examples.slice(0, 2), null, 2)}
` : ''}

RETURN JSON FORMAT:
{
  "records": [
    {
      "id": 1,
      "field_name": "realistic_value",
      "spatial_field": {"x": 100.5, "y": 200.3},
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "theme_context": "Brief description of the thematic approach used",
  "spatial_pattern": "Description of spatial distribution if applicable"
}`;
  }

  /**
   * Validate and enhance AI-generated records
   */
  private validateAndEnhanceRecords(
    aiRecords: Record<string, any>[],
    model: SpatialDataModel
  ): Record<string, any>[] {
    return aiRecords.map((record, index) => {
      const enhancedRecord: Record<string, any> = {};

      // Ensure all required fields are present
      for (const field of model.fields) {
        if (record[field.name] !== undefined) {
          enhancedRecord[field.name] = this.validateFieldValue(record[field.name], field);
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
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000 // Random date within last 30 days
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
      case 'number':
        return field.name === 'id' ? index + 1 : Math.floor(Math.random() * 1000);
      
      case 'string':
        if (field.name.includes('email')) {
          return `user${index + 1}@example.com`;
        }
        if (field.name.includes('name')) {
          const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Brown'];
          return names[index % names.length];
        }
        return `${field.name}_${index + 1}`;
      
      case 'boolean':
        return Math.random() > 0.5;
      
      case 'date':
        return new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      
      case 'geometry':
      case 'point':
        return {
          x: this.config.spatialBounds.minX + Math.random() * (this.config.spatialBounds.maxX - this.config.spatialBounds.minX),
          y: this.config.spatialBounds.minY + Math.random() * (this.config.spatialBounds.maxY - this.config.spatialBounds.minY)
        };
      
      case 'json':
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
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return typeof value === 'string' ? value : new Date(value).toISOString();
      case 'geometry':
      case 'point':
        if (typeof value === 'object' && value.x !== undefined && value.y !== undefined) {
          return value;
        }
        return { x: 0, y: 0 };
      default:
        return String(value);
    }
  }

  /**
   * Generate relationship data between entities
   */
  private generateRelationshipData(
    models: SpatialDataModel[],
    entityData: Record<string, Record<string, any>[]>
  ): Array<{ from: string; to: string; fromId: any; toId: any }> {
    const relationships: Array<{ from: string; to: string; fromId: any; toId: any }> = [];

    for (const model of models) {
      for (const relationship of model.relationships) {
        const fromRecords = entityData[model.name] || [];
        const toRecords = entityData[relationship.model] || [];

        if (fromRecords.length > 0 && toRecords.length > 0) {
          // Create some relationships based on relationship type
          const relationshipCount = Math.min(
            fromRecords.length,
            relationship.type === 'oneToOne' ? toRecords.length : toRecords.length * 2
          );

          for (let i = 0; i < relationshipCount; i++) {
            const fromRecord = fromRecords[i % fromRecords.length];
            const toRecord = toRecords[i % toRecords.length];

            relationships.push({
              from: model.name,
              to: relationship.model,
              fromId: fromRecord.id,
              toId: toRecord.id
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Calculate spatial distribution patterns
   */
  private calculateSpatialDistribution(
    entityData: Record<string, Record<string, any>[]>
  ): Record<string, any> {
    const distribution: Record<string, any> = {};

    for (const [entityName, records] of Object.entries(entityData)) {
      const spatialRecords = records.filter(r => 
        r.position || r.location || (typeof r.x === 'number' && typeof r.y === 'number')
      );

      if (spatialRecords.length > 0) {
        const positions = spatialRecords.map(r => 
          r.position || r.location || { x: r.x, y: r.y }
        );

        distribution[entityName] = {
          totalRecords: spatialRecords.length,
          boundingBox: this.calculateBoundingBox(positions),
          clusters: this.detectClusters(positions),
          averageDistance: this.calculateAverageDistance(positions)
        };
      }
    }

    return distribution;
  }

  /**
   * Calculate bounding box for positions
   */
  private calculateBoundingBox(positions: { x: number; y: number }[]): {
    minX: number; maxX: number; minY: number; maxY: number;
  } {
    if (positions.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = positions[0].x, maxX = positions[0].x;
    let minY = positions[0].y, maxY = positions[0].y;

    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Simple cluster detection for spatial analysis
   */
  private detectClusters(positions: { x: number; y: number }[]): number {
    // Simplified cluster detection - in practice would use proper clustering algorithm
    const clusters = new Set<string>();
    const clusterRadius = 50; // Adjust based on coordinate system

    for (const pos of positions) {
      const clusterKey = `${Math.floor(pos.x / clusterRadius)},${Math.floor(pos.y / clusterRadius)}`;
      clusters.add(clusterKey);
    }

    return clusters.size;
  }

  /**
   * Calculate average distance between all positions
   */
  private calculateAverageDistance(positions: { x: number; y: number }[]): number {
    if (positions.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        pairCount++;
      }
    }

    return totalDistance / pairCount;
  }
}