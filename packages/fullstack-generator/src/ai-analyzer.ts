/**
 * AI-Powered Pattern Analysis for Backend Generation
 * 
 * Uses GPT-4/GPT-5 to analyze spatial design patterns and infer:
 * - Database entities and relationships
 * - API endpoints and handlers
 * - Form validation and submission logic
 * - Realistic seed data generation
 */

import OpenAI from 'openai';
import type {
  AIAnalysisConfig,
  AIEntityAnalysis,
  AIRelationshipAnalysis,
  AIEndpointAnalysis,
  AISeedDataAnalysis,
  DetectedEntity,
  SuggestedRelationship,
  APIEndpoint
} from './types.js';
import type { SpatialElement } from '@fir/spatial-runtime';
import { createOpenAIParams } from './openai-utils.js';

export class AIPatternAnalyzer {
  private openai?: OpenAI;
  private config: AIAnalysisConfig;
  private useAI: boolean;

  constructor(config: AIAnalysisConfig) {
    this.config = {
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview', // GPT-4 Turbo is the latest available
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'), // Low temperature for consistent analysis
      ...config
    };

    this.useAI = !!(this.config.apiKey || process.env.OPENAI_API_KEY);
    
    if (this.useAI) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Comprehensive AI analysis of spatial design patterns
   */
  async analyzeDesignPatterns(elements: SpatialElement[]): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis;
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
  }> {
    if (!this.useAI) {
      if (this.config.debug) {
        console.log('📐 Using rule-based pattern analysis (no AI available)...');
      }
      return this.analyzeWithRules(elements);
    }

    if (this.config.debug) {
      console.log('🤖 Starting AI analysis of spatial design...');
    }

    try {
      // Parallel analysis for better performance
      const [entities, relationships, endpoints, seedData] = await Promise.all([
        this.analyzeEntities(elements),
        this.analyzeRelationships(elements),
        this.analyzeEndpoints(elements),
        this.analyzeSeedDataRequirements(elements)
      ]);

      if (this.config.debug) {
        console.log('🎯 AI analysis complete:', {
          entities: entities.entities.length,
          relationships: relationships.relationships.length,
          endpoints: endpoints.endpoints.length,
          seedDataTypes: seedData.dataTypes.length
        });
      }

      return { entities, relationships, endpoints, seedData };
    } catch (error) {
      console.warn('⚠️ AI analysis failed, falling back to rule-based analysis:', error);
      return this.analyzeWithRules(elements);
    }
  }

  /**
   * AI-powered entity detection with context understanding
   */
  private async analyzeEntities(elements: SpatialElement[]): Promise<AIEntityAnalysis> {
    const prompt = this.buildEntityAnalysisPrompt(elements);
    
    if (this.config.debug) {
      console.log('🔍 Entity Analysis Prompt:');
      console.log(prompt.substring(0, 800) + '...');
    }
    
    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a database schema generator. Your task is to analyze data samples and create database entities. You must return valid JSON following the exact format specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const response = await this.openai.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateAndEnhanceEntityAnalysis(analysis, elements);
      
    } catch (error) {
      console.warn('AI entity analysis failed, falling back to rule-based:', error);
      return this.fallbackEntityAnalysis(elements);
    }
  }

  /**
   * AI-powered relationship inference
   */
  private async analyzeRelationships(elements: SpatialElement[]): Promise<AIRelationshipAnalysis> {
    const prompt = this.buildRelationshipAnalysisPrompt(elements);
    
    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a database architect specializing in entity relationships. Analyze spatial UI layouts to infer logical data relationships.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const response = await this.openai.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateRelationshipAnalysis(analysis);
      
    } catch (error) {
      console.warn('AI relationship analysis failed, using fallback');
      return this.fallbackRelationshipAnalysis(elements);
    }
  }

  /**
   * AI-powered API endpoint generation
   */
  private async analyzeEndpoints(elements: SpatialElement[]): Promise<AIEndpointAnalysis> {
    const prompt = this.buildEndpointAnalysisPrompt(elements);
    
    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a full-stack developer designing REST APIs. Analyze UI patterns to generate appropriate API endpoints with proper HTTP methods and spatial query capabilities.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const response = await this.openai.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateEndpointAnalysis(analysis);
      
    } catch (error) {
      console.warn('AI endpoint analysis failed, using fallback');
      return this.fallbackEndpointAnalysis(elements);
    }
  }

  /**
   * AI-powered seed data requirements analysis
   */
  private async analyzeSeedDataRequirements(elements: SpatialElement[]): Promise<AISeedDataAnalysis> {
    const prompt = this.buildSeedDataAnalysisPrompt(elements);
    
    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a data architect generating realistic test data. Analyze UI designs to determine what kind of sample data would make the application feel realistic and functional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: this.config.maxTokens,
        temperature: 0.3, // Slightly higher for more creative data
        response_format: { type: 'json_object' }
      });

      const response = await this.openai.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateSeedDataAnalysis(analysis);
      
    } catch (error) {
      console.warn('AI seed data analysis failed, using fallback');
      return this.fallbackSeedDataAnalysis(elements);
    }
  }

  /**
   * Build comprehensive entity analysis prompt
   */
  private buildEntityAnalysisPrompt(elements: SpatialElement[]): string {
    const elementSample = elements.slice(0, 20).map(el => ({
      id: el.id,
      type: el.type,
      position: el.position,
      bounds: el.bounds,
      semanticData: el.semanticData
    }));

    // Extract sample data from semantic data to highlight the actual content
    const sampleData = elements.slice(0, 3).map(el => el.semanticData?.atomic).filter(Boolean);
    
    return `TASK: Extract database entities from UI element data

DATA TO ANALYZE:
${JSON.stringify(sampleData, null, 2)}

INSTRUCTIONS:
1. ONLY analyze the data objects above
2. Each data object represents a database record
3. Create database entities based on these data patterns
4. IGNORE spatial positioning - focus purely on data structure
5. For each entity, determine:
   - Entity name (PascalCase, singular)
   - Database table name (snake_case, plural)
   - Required fields with appropriate data types
   - Spatial positioning requirements
   - Confidence score (0-1)

3. Focus on common patterns:
   - User profiles and authentication
   - Content items (posts, products, articles)
   - Form submissions and contact info
   - Navigation and menu items
   - Media assets and galleries
   - Comments and interactions

SPATIAL CONTEXT:
- Elements have spatial coordinates and semantic levels (universal/system/standard/atomic)
- Consider spatial relationships in entity design
- Include PostGIS geometry fields for spatial queries

RETURN JSON FORMAT:
{
  "entities": [
    {
      "name": "User",
      "tableName": "users",
      "fields": [
        {"name": "id", "type": "serial", "required": true, "primary": true},
        {"name": "email", "type": "varchar(255)", "required": true, "unique": true},
        {"name": "position", "type": "geometry(Point,4326)", "required": false},
        {"name": "created_at", "type": "timestamp", "required": true}
      ],
      "sourceElements": ["user-profile", "login-form"],
      "confidence": 0.9,
      "reasoning": "Clear user authentication and profile patterns detected"
    }
  ],
  "insights": [
    "Detected user management system with spatial positioning",
    "Form patterns suggest content creation workflow",
    "Navigation elements indicate multi-page application"
  ]
}`;
  }

  /**
   * Build relationship analysis prompt
   */
  private buildRelationshipAnalysisPrompt(elements: SpatialElement[]): string {
    const spatialGroups = this.groupElementsBySpatialProximity(elements);
    
    return `Analyze spatial UI layout to infer database relationships:

SPATIAL GROUPS:
${JSON.stringify(spatialGroups, null, 2)}

RELATIONSHIP ANALYSIS:
1. Identify logical relationships between entities based on:
   - Spatial proximity (nearby elements often relate)
   - Semantic hierarchy (parent-child relationships)
   - Form patterns (forms create/edit entities)
   - Navigation flow (linked entities)

2. Common relationship patterns:
   - User → Profile (one-to-one)
   - User → Posts/Content (one-to-many)
   - Post → Comments (one-to-many)
   - Post → Tags/Categories (many-to-many)
   - Spatial containers → Content items

RETURN JSON FORMAT:
{
  "relationships": [
    {
      "from": "User",
      "to": "Post",
      "type": "oneToMany",
      "confidence": 0.85,
      "reasoning": "User profile elements spatially grouped with content creation forms",
      "foreignKey": "user_id",
      "spatialContext": "Content creation interface suggests user ownership"
    }
  ],
  "spatialInsights": [
    "Elements in same viewport region likely share relationships",
    "Form proximity to content suggests ownership patterns"
  ]
}`;
  }

  /**
   * Build endpoint analysis prompt  
   */
  private buildEndpointAnalysisPrompt(elements: SpatialElement[]): string {
    const interactiveElements = elements.filter(el => 
      el.id?.toLowerCase().includes('button') ||
      el.id?.toLowerCase().includes('form') ||
      el.id?.toLowerCase().includes('link') ||
      el.type === 'form'
    );

    return `Analyze UI patterns to generate REST API endpoints:

INTERACTIVE ELEMENTS:
${JSON.stringify(interactiveElements, null, 2)}

ENDPOINT REQUIREMENTS:
1. Generate appropriate CRUD endpoints for detected entities
2. Include spatial query endpoints for location-based features
3. Add form submission endpoints for user interactions
4. Consider authentication and authorization needs

SPATIAL FEATURES:
- Include endpoints for spatial queries (within bounds, nearby, distance)
- Support semantic zoom level filtering
- Enable spatial aggregation and clustering

RETURN JSON FORMAT:
{
  "endpoints": [
    {
      "path": "/api/users",
      "method": "GET",
      "handler": "getUsers",
      "description": "Retrieve users with optional spatial filtering",
      "spatialQuery": true,
      "queryParams": [
        {"name": "bounds", "type": "string", "description": "Spatial bounding box"},
        {"name": "level", "type": "string", "description": "Semantic zoom level"}
      ]
    },
    {
      "path": "/api/users",
      "method": "POST", 
      "handler": "createUser",
      "description": "Create new user from form submission",
      "spatialQuery": false,
      "bodySchema": {
        "email": "string",
        "position": "geometry"
      }
    }
  ],
  "authEndpoints": [
    "/api/auth/login",
    "/api/auth/register"
  ],
  "spatialEndpoints": [
    "/api/spatial/within-bounds",
    "/api/spatial/nearby",
    "/api/spatial/distance"
  ]
}`;
  }

  /**
   * Build seed data analysis prompt
   */
  private buildSeedDataAnalysisPrompt(elements: SpatialElement[]): string {
    const contentElements = elements.filter(el => 
      el.semanticData && Object.values(el.semanticData).some(data => 
        typeof data === 'string' && data.length > 3
      )
    );

    return `Analyze UI content to generate realistic seed data:

CONTENT ELEMENTS:
${JSON.stringify(contentElements.slice(0, 10), null, 2)}

SEED DATA REQUIREMENTS:
1. Generate realistic sample data that matches the UI patterns
2. Consider spatial distribution of content
3. Create coherent, realistic examples (not Lorem Ipsum)
4. Include proper relationships between entities

CONTENT ANALYSIS:
- Extract apparent themes/domains from element names and content
- Determine appropriate data volume (10-100 records per entity)
- Consider spatial positioning for location-based content

RETURN JSON FORMAT:
{
  "dataTypes": [
    {
      "entity": "User",
      "sampleCount": 25,
      "theme": "professional_profiles", 
      "spatialPattern": "distributed_global",
      "examples": [
        {
          "email": "sarah.chen@example.com",
          "name": "Sarah Chen",
          "position": {"x": 150.5, "y": -45.2},
          "bio": "UX Designer passionate about spatial interfaces"
        }
      ]
    }
  ],
  "themes": [
    "professional_networking",
    "content_creation",
    "spatial_collaboration"
  ],
  "spatialPatterns": {
    "clustered": "Content grouped in regions",
    "distributed": "Content spread across space",
    "hierarchical": "Content organized by semantic levels"
  }
}`;
  }

  /**
   * Group elements by spatial proximity for relationship analysis
   */
  private groupElementsBySpatialProximity(elements: SpatialElement[], maxDistance: number = 200): any[] {
    const groups: { center: {x: number, y: number}, elements: SpatialElement[] }[] = [];
    const processed = new Set<string>();

    for (const element of elements) {
      if (processed.has(element.id)) continue;

      const group = {
        center: element.position,
        elements: [element]
      };
      processed.add(element.id);

      // Find nearby elements
      for (const other of elements) {
        if (processed.has(other.id)) continue;
        
        const distance = Math.sqrt(
          Math.pow(element.position.x - other.position.x, 2) +
          Math.pow(element.position.y - other.position.y, 2)
        );

        if (distance <= maxDistance) {
          group.elements.push(other);
          processed.add(other.id);
        }
      }

      if (group.elements.length > 1) {
        groups.push(group);
      }
    }

    return groups.slice(0, 5); // Return top 5 groups for prompt
  }

  /**
   * Validation and fallback methods
   */
  private validateAndEnhanceEntityAnalysis(analysis: any, elements: SpatialElement[]): AIEntityAnalysis {
    // Validate AI response and add fallbacks if needed
    const entities = analysis.entities || [];
    const insights = analysis.insights || [];

    // Ensure each entity has required fields
    const validatedEntities = entities.map((entity: any) => ({
      name: entity.name || 'UnknownEntity',
      tableName: entity.tableName || entity.name?.toLowerCase() + 's',
      fields: entity.fields || [
        { name: 'id', type: 'serial', required: true, primary: true },
        { name: 'created_at', type: 'timestamp', required: true }
      ],
      sourceElements: entity.sourceElements || [],
      confidence: Math.max(0.1, Math.min(1.0, entity.confidence || 0.5)),
      reasoning: entity.reasoning || 'AI-detected entity pattern'
    }));

    return {
      entities: validatedEntities,
      insights,
      confidence: validatedEntities.reduce((sum, e) => sum + e.confidence, 0) / validatedEntities.length
    };
  }

  private validateRelationshipAnalysis(analysis: any): AIRelationshipAnalysis {
    const relationships = analysis.relationships || [];
    const insights = analysis.spatialInsights || [];

    return {
      relationships: relationships.map((rel: any) => ({
        from: rel.from,
        to: rel.to,
        type: rel.type || 'oneToMany',
        confidence: Math.max(0.1, Math.min(1.0, rel.confidence || 0.5)),
        reasoning: rel.reasoning || 'AI-inferred relationship',
        foreignKey: rel.foreignKey,
        spatialContext: rel.spatialContext
      })),
      insights,
      confidence: relationships.reduce((sum: number, r: any) => sum + (r.confidence || 0.5), 0) / Math.max(relationships.length, 1)
    };
  }

  private validateEndpointAnalysis(analysis: any): AIEndpointAnalysis {
    const endpoints = analysis.endpoints || [];
    const authEndpoints = analysis.authEndpoints || [];
    const spatialEndpoints = analysis.spatialEndpoints || [];

    return {
      endpoints: endpoints.map((endpoint: any) => ({
        path: endpoint.path,
        method: endpoint.method || 'GET',
        handler: endpoint.handler,
        description: endpoint.description || 'AI-generated endpoint',
        spatialQuery: endpoint.spatialQuery || false,
        queryParams: endpoint.queryParams || [],
        bodySchema: endpoint.bodySchema
      })),
      authEndpoints,
      spatialEndpoints,
      confidence: 0.8 // Default confidence for endpoint analysis
    };
  }

  private validateSeedDataAnalysis(analysis: any): AISeedDataAnalysis {
    return {
      dataTypes: analysis.dataTypes || [],
      themes: analysis.themes || ['general'],
      spatialPatterns: analysis.spatialPatterns || {},
      confidence: 0.7
    };
  }

  /**
   * Fallback methods for when AI analysis fails
   */
  private fallbackEntityAnalysis(elements: SpatialElement[]): AIEntityAnalysis {
    return {
      entities: [
        {
          name: 'SpatialElement',
          tableName: 'spatial_elements',
          fields: [
            { name: 'id', type: 'serial', required: true, primary: true },
            { name: 'position', type: 'geometry(Point,4326)', required: true },
            { name: 'content', type: 'text', required: false },
            { name: 'created_at', type: 'timestamp', required: true }
          ],
          sourceElements: elements.slice(0, 5).map(el => el.id),
          confidence: 0.3,
          reasoning: 'Fallback entity from spatial elements'
        }
      ],
      insights: ['AI analysis unavailable, using basic spatial entity'],
      confidence: 0.3
    };
  }

  private fallbackRelationshipAnalysis(elements: SpatialElement[]): AIRelationshipAnalysis {
    return {
      relationships: [],
      insights: ['AI relationship analysis unavailable'],
      confidence: 0.2
    };
  }

  private fallbackEndpointAnalysis(elements: SpatialElement[]): AIEndpointAnalysis {
    return {
      endpoints: [
        {
          path: '/api/elements',
          method: 'GET',
          handler: 'getElements',
          description: 'Get spatial elements',
          spatialQuery: true,
          queryParams: []
        }
      ],
      authEndpoints: [],
      spatialEndpoints: ['/api/spatial/within-bounds'],
      confidence: 0.3
    };
  }

  private fallbackSeedDataAnalysis(elements: SpatialElement[]): AISeedDataAnalysis {
    return {
      dataTypes: [],
      themes: ['spatial'],
      spatialPatterns: {},
      confidence: 0.2
    };
  }

  /**
   * Rule-based analysis fallback when AI is not available
   */
  private async analyzeWithRules(elements: SpatialElement[]): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis;
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
  }> {
    const patterns = this.extractPatterns(elements);

    return {
      entities: this.rulesBasedEntityAnalysis(patterns),
      relationships: this.rulesBasedRelationshipAnalysis(patterns),
      endpoints: this.rulesBasedEndpointAnalysis(patterns),
      seedData: this.rulesBasedSeedDataAnalysis(patterns)
    };
  }

  /**
   * Extract patterns from spatial elements for rule-based analysis
   */
  extractPatterns(elements: SpatialElement[]): {
    repeatingTypes: Array<{ type: string; count: number; elements: SpatialElement[] }>;
    spatialClusters: Array<{ center: { x: number; y: number }; elements: SpatialElement[] }>;
    semanticData: Record<string, any>;
  } {
    // Group by type to find repeating patterns
    const typeGroups: Record<string, SpatialElement[]> = {};
    for (const element of elements) {
      if (!typeGroups[element.type]) {
        typeGroups[element.type] = [];
      }
      typeGroups[element.type].push(element);
    }

    const repeatingTypes = Object.entries(typeGroups)
      .filter(([_, elements]) => elements.length >= 1)
      .map(([type, elements]) => ({ type, count: elements.length, elements }));

    // Simple spatial clustering (group nearby elements)
    const clusters: Array<{ center: { x: number; y: number }; elements: SpatialElement[] }> = [];
    const processed = new Set<string>();
    const clusterRadius = 200;

    for (const element of elements) {
      if (processed.has(element.id)) continue;

      const cluster = {
        center: element.position,
        elements: [element]
      };

      // Find nearby elements
      for (const other of elements) {
        if (other.id === element.id || processed.has(other.id)) continue;

        const distance = Math.sqrt(
          Math.pow(element.position.x - other.position.x, 2) +
          Math.pow(element.position.y - other.position.y, 2)
        );

        if (distance <= clusterRadius) {
          cluster.elements.push(other);
          processed.add(other.id);
        }
      }

      clusters.push(cluster);
      processed.add(element.id);
    }

    // Extract semantic data from elements
    const semanticData: Record<string, any> = {};
    for (const element of elements) {
      if (element.semanticData) {
        semanticData[element.id] = element.semanticData;
      }
    }

    return { repeatingTypes, spatialClusters: clusters, semanticData };
  }

  private rulesBasedEntityAnalysis(patterns: any): AIEntityAnalysis {
    const entities = patterns.repeatingTypes.map((pattern: any) => ({
      name: this.capitalize(pattern.type.replace('-', '_')),
      tableName: pattern.type.replace('-', '_') + 's',
      fields: this.extractFieldsFromElements(pattern.elements),
      sourceElements: pattern.elements.map((e: SpatialElement) => e.id),
      confidence: pattern.count > 1 ? 0.8 : 0.5,
      reasoning: `Detected ${pattern.count} instances of ${pattern.type}`
    }));

    return {
      entities,
      insights: [`Found ${entities.length} entity types from spatial patterns`],
      confidence: entities.length > 0 ? 0.7 : 0.3
    };
  }

  private rulesBasedRelationshipAnalysis(patterns: any): AIRelationshipAnalysis {
    const relationships = [];

    // Simple spatial proximity-based relationships
    for (const cluster of patterns.spatialClusters) {
      if (cluster.elements.length > 1) {
        const types = [...new Set(cluster.elements.map(e => e.type))];
        if (types.length >= 2) {
          relationships.push({
            from: this.capitalize(types[0].replace('-', '_')),
            to: this.capitalize(types[1].replace('-', '_')),
            type: 'oneToMany' as const,
            confidence: 0.6,
            reasoning: 'Spatial proximity suggests relationship',
            spatialContext: 'Elements clustered together'
          });
        }
      }
    }

    return {
      relationships,
      insights: [`Detected ${relationships.length} spatial relationships`],
      confidence: 0.5
    };
  }

  private rulesBasedEndpointAnalysis(patterns: any): AIEndpointAnalysis {
    const endpoints = [];
    
    for (const pattern of patterns.repeatingTypes) {
      const entityName = pattern.type.replace('-', '_');
      endpoints.push(
        {
          path: `/api/${entityName}s`,
          method: 'GET',
          handler: `get${this.capitalize(entityName)}s`,
          description: `Get all ${entityName} items`,
          spatialQuery: true
        },
        {
          path: `/api/${entityName}s`,
          method: 'POST',
          handler: `create${this.capitalize(entityName)}`,
          description: `Create new ${entityName}`,
          spatialQuery: false
        }
      );
    }

    return {
      endpoints,
      authEndpoints: [],
      spatialEndpoints: endpoints.filter(e => e.spatialQuery).map(e => e.path),
      confidence: 0.6
    };
  }

  private rulesBasedSeedDataAnalysis(patterns: any): AISeedDataAnalysis {
    const dataTypes = patterns.repeatingTypes.map((pattern: any) => ({
      entity: this.capitalize(pattern.type.replace('-', '_')),
      sampleCount: Math.min(pattern.count * 5, 50),
      theme: 'general',
      spatialPattern: 'distributed',
      examples: pattern.elements.slice(0, 2).map((e: SpatialElement) => ({
        id: e.id,
        type: e.type,
        semanticData: e.semanticData
      }))
    }));

    return {
      dataTypes,
      themes: ['general', 'spatial'],
      spatialPatterns: { default: 'distributed' },
      confidence: 0.6
    };
  }

  private extractFieldsFromElements(elements: SpatialElement[]): Array<{
    name: string;
    type: string;
    required: boolean;
    primary?: boolean;
  }> {
    const fields = [
      { name: 'id', type: 'string', required: true, primary: true },
      { name: 'position', type: 'point', required: true },
      { name: 'created_at', type: 'date', required: true }
    ];

    // Extract fields from semantic data
    const semanticFields = new Set<string>();
    for (const element of elements) {
      if (element.semanticData) {
        for (const level of Object.keys(element.semanticData)) {
          const data = element.semanticData[level];
          if (typeof data === 'object' && data !== null) {
            for (const key of Object.keys(data)) {
              semanticFields.add(key);
            }
          }
        }
      }
    }

    for (const fieldName of semanticFields) {
      fields.push({
        name: fieldName,
        type: this.inferFieldType(fieldName),
        required: false
      });
    }

    return fields;
  }

  private inferFieldType(fieldName: string): string {
    const name = fieldName.toLowerCase();
    if (name.includes('price') || name.includes('cost')) return 'number';
    if (name.includes('email')) return 'string';
    if (name.includes('date') || name.includes('time')) return 'date';
    if (name.includes('rating') || name.includes('score')) return 'number';
    if (name.includes('active') || name.includes('enabled') || name.includes('stock')) return 'boolean';
    return 'string';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}