/**
 * AI-Powered Pattern Analysis for Backend Generation
 *
 * Uses GPT-5 to analyze design patterns and infer:
 * - Database entities and relationships
 * - API endpoints and handlers
 * - Form validation and submission logic
 * - Realistic seed data generation
 */

import OpenAI from "openai";
import type {
  AIAnalysisConfig,
  AIEntityAnalysis,
  AIRelationshipAnalysis,
  AIEndpointAnalysis,
  AISeedDataAnalysis,
  DetectedEntity,
  SuggestedRelationship,
  APIEndpoint,
  DesignData,
  DesignNode,
  DesignScreenshot,
  CombinedAnalysis,
  VisionAnalysisResult,
} from "../types.js";
import { createOpenAIParams } from "../utils/openai-utils.js";
import { VisionAnalyzer } from "./vision-analyzer.js";
import { PromptOptimizer, TokenCounter } from "../utils/prompt-optimizer.js";
import { AICache } from "../utils/ai-cache.js";
import { CostOptimizer } from "../utils/cost-optimizer.js";
import { createLogger } from "../utils/logger.js";

export class AIPatternAnalyzer {
  private openai?: OpenAI;
  private config: AIAnalysisConfig;
  private useAI: boolean;
  private visionAnalyzer: VisionAnalyzer;
  private cache: AICache;
  private costOptimizer: CostOptimizer;
  private logger = createLogger('AIPatternAnalyzer');

  constructor(config: AIAnalysisConfig) {
    this.config = {
      model: process.env.OPENAI_MODEL || "gpt-5", // Use GPT-5 as default
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "16000"), // GPT-5 can handle much more
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.1"),
      enableVision: process.env.ENABLE_VISION_ANALYSIS !== "false", // Default to enabled
      ...config,
    };

    const apiKey = this.config.apiKey || process.env.OPEN_AI_API_KEY;
    this.useAI = !!apiKey;

    if (this.useAI) {
      // Validate API key format (skip validation in test environment)
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
      if (!isTestEnv && (!apiKey?.startsWith('sk-') || apiKey.length < 20)) {
        throw new Error('Invalid OpenAI API key format. Expected format: sk-...');
      }
      
      this.openai = new OpenAI({
        apiKey,
      });
    }

    // Initialize vision analyzer
    this.visionAnalyzer = new VisionAnalyzer(this.config);
    
    // Initialize cost optimization tools
    this.cache = new AICache({ enabled: process.env.AI_CACHE_ENABLED !== 'false' });
    this.costOptimizer = new CostOptimizer();
  }

  /**
   * Cost-optimized batch analysis using compressed prompts and caching
   */
  async analyzeCostOptimized(
    designData: DesignData
  ): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis;
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
  }> {
    if (!this.useAI) {
      return this.analyzeWithRules(designData);
    }

    try {
      // Check cache first
      const cacheKey = 'batch_analysis';
      const cached = await this.cache.get(designData, cacheKey);
      if (cached) {
        return cached;
      }

      // Use batch analysis to reduce API calls from 4 to 1
      const batchPrompt = PromptOptimizer.createBatchPrompt(designData);
      const estimatedTokens = TokenCounter.estimate(batchPrompt);
      
      // Always use GPT-5 as requested
      const model = this.costOptimizer.selectOptimalModel({
        taskComplexity: 'complex' // Always treat as complex for GPT-5
      });

      this.logger.info(`💰 Using ${model.name} for batch analysis (${estimatedTokens} tokens, ~$${this.costOptimizer.estimateCost(model.name, estimatedTokens).toFixed(4)})`);

      const response = await this.openai!.chat.completions.create({
        model: model.name,
        messages: [{
          role: 'user',
          content: batchPrompt
        }],
        max_tokens: 2000,
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Transform to expected format
      const analysis = {
        entities: { entities: result.entities || [], spatialConsiderations: [] },
        relationships: { relationships: result.relationships || [] },
        endpoints: { endpoints: result.endpoints || [] },
        seedData: { dataTypes: result.seedData || [] }
      };

      // Cache the result
      await this.cache.set(designData, cacheKey, analysis, estimatedTokens);

      return analysis;
    } catch (error) {
      this.logger.warn('💸 Cost-optimized analysis failed, falling back:', error);
      return this.analyzeWithRules(designData);
    }
  }

  /**
   * Assess task complexity to choose appropriate model
   */
  private assessTaskComplexity(designData: DesignData): 'simple' | 'medium' | 'complex' {
    const formCount = designData.forms?.length || 0;
    const listCount = designData.lists?.length || 0;
    const hasAuth = designData.hasAuthentication;
    const hasSpatial = designData.hasSpatialData;
    
    if (hasSpatial || formCount > 5 || listCount > 3) {
      return 'complex';
    } else if (hasAuth || formCount > 2 || listCount > 1) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Enhanced AI analysis combining text and vision analysis
   */
  async analyzeDesignPatternsWithVision(
    designData: DesignData,
    screenshots?: DesignScreenshot[],
  ): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis;
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
    combinedAnalysis?: CombinedAnalysis;
  }> {
    if (!this.useAI) {
      if (this.config.debug) {
        this.logger.info(
          "📐 Using rule-based pattern analysis (no AI available)...",
        );
      }
      return this.analyzeWithRules(designData);
    }

    if (this.config.debug) {
      this.logger.info("🤖 Starting enhanced AI analysis with vision support...", {
        hasScreenshots: screenshots && screenshots.length > 0,
        visionEnabled: this.config.enableVision,
      });
    }

    try {
      // Run text-based analysis in parallel with vision analysis
      const [textAnalysis, visionAnalysis] = await Promise.all([
        this.analyzeDesignPatterns(designData),
        screenshots && this.config.enableVision
          ? this.visionAnalyzer.analyzeScreenshots(screenshots)
          : Promise.resolve(null),
      ]);

      // If we have both text and vision analysis, combine them
      if (visionAnalysis) {
        const combinedAnalysis = this.combineAnalysisResults(
          textAnalysis.entities,
          visionAnalysis,
        );

        return {
          ...textAnalysis,
          combinedAnalysis,
        };
      }

      return textAnalysis;
    } catch (error) {
      this.logger.warn(
        "⚠️ Enhanced AI analysis failed, falling back to rule-based analysis:",
        error,
      );
      return this.analyzeWithRules(designData);
    }
  }

  /**
   * Original comprehensive AI analysis of design patterns (text-only)
   */
  async analyzeDesignPatterns(designData: DesignData): Promise<{
    entities: AIEntityAnalysis;
    relationships: AIRelationshipAnalysis;
    endpoints: AIEndpointAnalysis;
    seedData: AISeedDataAnalysis;
  }> {
    if (!this.useAI) {
      if (this.config.debug) {
        this.logger.info(
          "📐 Using rule-based pattern analysis (no AI available)...",
        );
      }
      return this.analyzeWithRules(designData);
    }

    if (this.config.debug) {
      this.logger.info("🤖 Starting AI analysis of design patterns...");
    }

    try {
      // Parallel analysis for better performance
      const [entities, relationships, endpoints, seedData] = await Promise.all([
        this.analyzeEntities(designData),
        this.analyzeRelationships(designData),
        this.analyzeEndpoints(designData),
        this.analyzeSeedDataRequirements(designData),
      ]);

      if (this.config.debug) {
        this.logger.info("🎯 AI analysis complete:", {
          entities: entities.entities.length,
          relationships: relationships.relationships.length,
          endpoints: endpoints.endpoints.length,
          seedDataTypes: seedData.dataTypes.length,
        });
      }

      return { entities, relationships, endpoints, seedData };
    } catch (error) {
      this.logger.warn(
        "⚠️ AI analysis failed, falling back to rule-based analysis:",
        error,
      );
      return this.analyzeWithRules(designData);
    }
  }

  /**
   * AI-powered entity detection with context understanding
   */
  private async analyzeEntities(
    designData: DesignData,
  ): Promise<AIEntityAnalysis> {
    const prompt = this.buildEntityAnalysisPrompt(designData);

    if (this.config.debug) {
      this.logger.info("🔍 Entity Analysis Prompt:");
      this.logger.info(prompt.substring(0, 800) + "...");
    }

    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: "system",
            content: `You are an expert database architect and full-stack developer with deep expertise in spatial applications, UI/UX patterns, and PostgreSQL with PostGIS. 

Your task is to analyze spatial UI elements and their semantic data to intelligently infer database entities that would power a real-world application.

Key capabilities you should demonstrate:
- Recognizing common UI patterns (user profiles, content cards, form structures, navigation elements)
- Inferring relationships between different UI components
- Understanding spatial context and PostGIS requirements
- Generating realistic, production-ready database schemas
- Considering performance implications and indexing strategies

Think step-by-step:
1. First, identify the core business domain from the UI patterns
2. Then, extract distinct entity types from the data patterns
3. Finally, design a normalized schema with appropriate relationships

Return only valid JSON following the exact format specified. Be thorough but concise in your analysis.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: "json_object" },
      });

      const response = await this.openai!.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return this.validateAndEnhanceEntityAnalysis(analysis, designData);
    } catch (error) {
      this.logger.warn(
        "AI entity analysis failed, falling back to rule-based:",
        error,
      );
      return this.fallbackEntityAnalysis(designData);
    }
  }

  /**
   * AI-powered relationship inference
   */
  private async analyzeRelationships(
    designData: DesignData,
  ): Promise<AIRelationshipAnalysis> {
    const prompt = this.buildRelationshipAnalysisPrompt(designData);

    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: "system",
            content: `You are a senior database architect specializing in complex entity relationships and spatial data modeling.

Your expertise includes:
- Identifying implicit relationships from UI layout and user flow patterns
- Understanding foreign key constraints and junction tables
- Recognizing many-to-many, one-to-many, and hierarchical relationships
- Spatial relationship modeling (proximity, containment, overlap)
- Performance optimization through proper indexing and relationship design

Analyze the spatial UI elements and infer logical data relationships that would exist in a production database. Consider:
1. Which entities naturally reference each other
2. What relationships are implied by the spatial positioning
3. How users would navigate between different data types
4. What foreign keys and indexes would be needed for optimal performance

Be precise and practical in your relationship definitions.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: "json_object" },
      });

      const response = await this.openai!.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return this.validateRelationshipAnalysis(analysis);
    } catch (error) {
      this.logger.warn("AI relationship analysis failed, using fallback");
      return this.fallbackRelationshipAnalysis(designData);
    }
  }

  /**
   * AI-powered API endpoint generation
   */
  private async analyzeEndpoints(
    designData: DesignData,
  ): Promise<AIEndpointAnalysis> {
    const prompt = this.buildEndpointAnalysisPrompt(designData);

    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: "system",
            content: `You are a principal software architect specializing in RESTful API design and spatial web applications.

Your expertise includes:
- Designing RESTful APIs that follow industry best practices
- Understanding CRUD operations, pagination, filtering, and search
- Spatial API design with PostGIS integration (radius queries, bounding box searches, nearest neighbor)
- Authentication patterns and authorization levels
- Real-time features (WebSockets, Server-Sent Events)
- Performance optimization (caching, rate limiting, database indexing)

Analyze the spatial UI patterns and generate a comprehensive API design that would power this application. Consider:

1. **Core CRUD Operations**: Standard Create, Read, Update, Delete for each entity
2. **Spatial Endpoints**: Location-based queries, proximity searches, geofencing
3. **User Experience**: Pagination, filtering, sorting, search functionality
4. **Authentication**: Login, registration, profile management, role-based access
5. **Real-time Features**: Live updates, notifications, collaborative features
6. **Performance**: Bulk operations, caching strategies, rate limiting

Design endpoints that are intuitive, scalable, and follow RESTful conventions.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: "json_object" },
      });

      const response = await this.openai!.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return this.validateEndpointAnalysis(analysis);
    } catch (error) {
      this.logger.warn("AI endpoint analysis failed, using fallback");
      return this.fallbackEndpointAnalysis(designData);
    }
  }

  /**
   * AI-powered seed data requirements analysis
   */
  private async analyzeSeedDataRequirements(
    designData: DesignData,
  ): Promise<AISeedDataAnalysis> {
    const prompt = this.buildSeedDataAnalysisPrompt(designData);

    try {
      const apiParams = createOpenAIParams({
        model: this.config.model!,
        messages: [
          {
            role: "system",
            content: `You are a senior data engineer and UX researcher specializing in realistic test data generation for production applications.

Your expertise includes:
- Understanding user behavior patterns and realistic data distributions
- Generating contextually appropriate sample data that demonstrates application value
- Spatial data generation (realistic coordinates, geographic patterns, clustering)
- Maintaining referential integrity in generated datasets
- Creating data that showcases application features effectively
- Understanding cultural and demographic diversity in sample data

Analyze the spatial UI design and determine what realistic sample data would:
1. **Demonstrate Value**: Show the application's core functionality effectively
2. **Feel Realistic**: Use authentic patterns, realistic names, plausible relationships
3. **Showcase Spatial Features**: Include geographic distribution, proximity patterns, meaningful spatial relationships
4. **Support Testing**: Cover edge cases, various data sizes, different user scenarios
5. **Maintain Quality**: Consistent formatting, proper data types, referential integrity

Generate data specifications that would result in a compelling, functional demonstration of the application.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: this.config.maxTokens,
        temperature: 0.3, // Slightly higher for more creative data
        response_format: { type: "json_object" },
      });

      const response = await this.openai!.chat.completions.create(apiParams);

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return this.validateSeedDataAnalysis(analysis);
    } catch (error) {
      this.logger.warn("AI seed data analysis failed, using fallback");
      return this.fallbackSeedDataAnalysis(designData);
    }
  }

  /**
   * Extract text nodes from design hierarchy
   */
  private extractTextNodes(nodes: DesignNode[]): DesignNode[] {
    const textNodes: DesignNode[] = [];

    const traverse = (node: DesignNode) => {
      if (node.type === "TEXT" && node.characters) {
        textNodes.push(node);
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    nodes.forEach(traverse);
    return textNodes;
  }

  /**
   * Build comprehensive entity analysis prompt
   */
  private buildEntityAnalysisPrompt(designData: DesignData): string {
    const nodeSample = designData.nodes.slice(0, 20).map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      characters: node.characters,
      children: node.children?.length || 0,
    }));

    // Extract text content for analysis
    const textNodes = this.extractTextNodes(designData.nodes);
    const sampleTexts = textNodes.slice(0, 10).map((node) => ({
      name: node.name,
      text: node.characters,
      context: node.type,
    }));

    return `# Database Entity Analysis Task

## Context
You are analyzing a ${designData.source} design file to design a production-ready database schema. Focus on inferring entities from repeated patterns and text content.

## Design File Information
- **Source**: ${designData.source}
- **File**: ${designData.fileName}
- **Total Nodes**: ${designData.nodes.length} design components

## Sample Text Content
\`\`\`json
${JSON.stringify(sampleTexts, null, 2)}
\`\`\`

## Sample Node Structure  
\`\`\`json
${JSON.stringify(nodeSample, null, 2)}
\`\`\`

## Your Analysis Process

### Step 1: Pattern Recognition
Examine the sample data for:
- Repeated data structures that suggest entity types
- Field patterns that indicate relationships (IDs, references)
- Content patterns that reveal business domain (user profiles, content items, locations)
- Spatial positioning hints that suggest geographic or layout relationships

### Step 2: Business Domain Inference
From the UI patterns, determine:
- What kind of application this appears to be (social, marketplace, content management, etc.)
- Who the primary users would be
- What core actions users would perform
- What data needs to be persisted and queried

### Step 3: Database Design
Create entities that are:
- **Normalized**: Minimize redundancy, proper relationships
- **Spatial-Aware**: Include PostGIS geometry fields where relevant
- **Performance-Optimized**: Consider indexing strategies
- **Production-Ready**: Include standard fields (id, timestamps, soft deletes if needed)

## Required Response Format
\`\`\`json
{
  "businessDomain": "Brief description of what this application appears to be",
  "entities": [
    {
      "name": "EntityName",
      "tableName": "entity_names",
      "description": "What this entity represents in the business domain",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "primary": true,
          "description": "Primary identifier"
        },
        {
          "name": "position",
          "type": "geometry(Point,4326)",
          "required": false,
          "indexed": true,
          "description": "Spatial position for location-based queries"
        }
      ],
      "indexes": [
        "CREATE INDEX idx_entity_position ON entity_names USING GIST (position)"
      ],
      "sourceElements": ["element-id-1", "element-id-2"],
      "confidence": 0.95,
      "reasoning": "Detailed explanation of why this entity was inferred"
    }
  ],
  "spatialConsiderations": [
    "How spatial data will be used in this application"
  ],
  "performanceConsiderations": [
    "Expected query patterns and optimization strategies"
  ]
}
\`\`\`

Focus on creating a realistic, production-ready schema that would actually power this type of spatial application.`;
  }

  // Validation and fallback methods would continue here...
  private validateAndEnhanceEntityAnalysis(
    analysis: any,
    designData: DesignData,
  ): AIEntityAnalysis {
    const entities = analysis.entities || [];
    const insights = [
      ...(analysis.insights || []),
      ...(analysis.spatialConsiderations || []),
      ...(analysis.performanceConsiderations || []),
    ];

    // Add business domain context if provided
    if (analysis.businessDomain) {
      insights.unshift(`Business Domain: ${analysis.businessDomain}`);
    }

    const validatedEntities = entities.map((entity: any) => ({
      name: entity.name || "UnknownEntity",
      tableName:
        entity.tableName ||
        entity.name?.toLowerCase().replace(/[^a-z0-9]/g, "_") + "s",
      description: entity.description || "AI-detected entity",
      fields: this.validateEntityFields(entity.fields),
      indexes: entity.indexes || [],
      sourceElements: entity.sourceElements || [],
      confidence: Math.max(0.1, Math.min(1.0, entity.confidence || 0.5)),
      reasoning: entity.reasoning || "AI-detected entity pattern",
    }));

    // Ensure each entity has required fields
    validatedEntities.forEach((entity) => {
      if (!entity.fields.find((f) => f.name === "id")) {
        entity.fields.unshift({
          name: "id",
          type: "uuid",
          required: true,
          primary: true,
          description: "Primary identifier",
        });
      }

      if (!entity.fields.find((f) => f.name === "created_at")) {
        entity.fields.push({
          name: "created_at",
          type: "timestamptz",
          required: true,
          description: "Record creation timestamp",
        });
      }

      if (!entity.fields.find((f) => f.name === "updated_at")) {
        entity.fields.push({
          name: "updated_at",
          type: "timestamptz",
          required: true,
          description: "Record last update timestamp",
        });
      }
    });

    return {
      entities: validatedEntities,
      insights,
      confidence:
        validatedEntities.reduce((sum, e) => sum + e.confidence, 0) /
        validatedEntities.length,
      businessDomain: analysis.businessDomain,
    };
  }

  private validateEntityFields(fields: any[]): any[] {
    if (!Array.isArray(fields)) return [];

    return fields.map((field) => ({
      name: field.name || "unknown_field",
      type: field.type || "text",
      required: field.required ?? false,
      primary: field.primary ?? false,
      unique: field.unique ?? false,
      indexed: field.indexed ?? false,
      description: field.description || `Field: ${field.name}`,
    }));
  }

  // Fallback methods for when AI analysis fails
  private fallbackEntityAnalysis(designData: DesignData): AIEntityAnalysis {
    const entities: any[] = [];
    const entityMap = new Map<string, any>();

    // Extract text nodes and analyze patterns
    const textNodes = this.extractTextNodes(designData.nodes);

    // Look for common patterns in node names and text content
    const nodeTypes = new Set<string>();
    designData.nodes.forEach((node) => {
      if (node.type && node.type !== "GROUP") {
        nodeTypes.add(node.type);
      }
    });

    // Create default entities based on design patterns
    if (textNodes.length > 0) {
      entityMap.set("Content", {
        name: "Content",
        tableName: "content_items",
        fields: [
          { name: "id", type: "uuid", required: true, primary: true },
          { name: "title", type: "text", required: true },
          { name: "content", type: "text", required: false },
          { name: "created_at", type: "timestamptz", required: true },
          { name: "updated_at", type: "timestamptz", required: true },
        ],
        sourceElements: textNodes.slice(0, 5).map((node) => node.id),
        confidence: 0.6,
        reasoning: `Inferred from ${textNodes.length} text nodes in design`,
      });
    }

    // If no meaningful analysis possible, create minimal entity
    if (entityMap.size === 0) {
      entityMap.set("DesignItem", {
        name: "DesignItem",
        tableName: "design_items",
        fields: [
          { name: "id", type: "uuid", required: true, primary: true },
          { name: "name", type: "text", required: true },
          { name: "type", type: "text", required: false },
          { name: "created_at", type: "timestamptz", required: true },
        ],
        sourceElements: designData.nodes.slice(0, 5).map((node) => node.id),
        confidence: 0.3,
        reasoning: "Fallback entity from design nodes",
      });
    }

    return {
      entities: Array.from(entityMap.values()),
      insights: [
        `Generated ${entityMap.size} entities from ${designData.nodes.length} design nodes`,
      ],
      confidence: 0.6,
    };
  }

  // Additional methods would be implemented here following the same pattern...
  private buildRelationshipAnalysisPrompt(designData: DesignData): string {
    const textNodes = this.extractTextNodes(designData.nodes);
    const sampleTexts = textNodes.slice(0, 10).map((node) => ({
      name: node.name,
      text: node.characters,
      context: node.type,
    }));

    return `# Database Relationship Analysis Task

## Context
Analyze the ${designData.source} design file to identify logical relationships between entities based on UI patterns and data flow.

## Design File Information
- **Source**: ${designData.source}
- **File**: ${designData.fileName}
- **Total Nodes**: ${designData.nodes.length} design components

## Sample Text Content
\`\`\`json
${JSON.stringify(sampleTexts, null, 2)}
\`\`\`

Analyze the patterns and suggest entity relationships that would exist in a production database.

Return JSON with relationships array containing type, confidence, and reasoning for each relationship.`;
  }

  private buildEndpointAnalysisPrompt(designData: DesignData): string {
    const textNodes = this.extractTextNodes(designData.nodes);
    const sampleTexts = textNodes.slice(0, 10).map((node) => ({
      name: node.name,
      text: node.characters,
      context: node.type,
    }));

    return `# API Endpoint Analysis Task

## Context
Analyze the ${designData.source} design file to design RESTful API endpoints that would power this application.

## Design File Information
- **Source**: ${designData.source}
- **File**: ${designData.fileName}
- **Total Nodes**: ${designData.nodes.length} design components

## Sample Text Content
\`\`\`json
${JSON.stringify(sampleTexts, null, 2)}
\`\`\`

Design comprehensive REST endpoints including CRUD operations, authentication, and any spatial queries needed.

Return JSON with endpoints array containing method, path, handler, description, and requiresAuth for each endpoint.`;
  }

  private buildSeedDataAnalysisPrompt(designData: DesignData): string {
    const textNodes = this.extractTextNodes(designData.nodes);
    const sampleTexts = textNodes.slice(0, 10).map((node) => ({
      name: node.name,
      text: node.characters,
      context: node.type,
    }));

    return `# Seed Data Analysis Task

## Context
Analyze the ${designData.source} design file to determine realistic test data that would demonstrate this application effectively.

## Design File Information
- **Source**: ${designData.source}
- **File**: ${designData.fileName}
- **Total Nodes**: ${designData.nodes.length} design components

## Sample Text Content
\`\`\`json
${JSON.stringify(sampleTexts, null, 2)}
\`\`\`

Specify what sample data would showcase the application's features with realistic, diverse, and contextually appropriate content.

Return JSON with dataTypes array containing entity, sampleCount, theme, and examples for each data type.`;
  }

  private validateRelationshipAnalysis(analysis: any): AIRelationshipAnalysis {
    return {
      relationships: [],
      insights: [],
      confidence: 0.5,
    };
  }

  private validateEndpointAnalysis(analysis: any): AIEndpointAnalysis {
    return {
      endpoints: [],
      authEndpoints: [],
      spatialEndpoints: [],
      confidence: 0.5,
    };
  }

  private validateSeedDataAnalysis(analysis: any): AISeedDataAnalysis {
    return {
      dataTypes: [],
      themes: [],
      spatialPatterns: {},
      confidence: 0.5,
    };
  }

  private fallbackRelationshipAnalysis(
    designData: DesignData,
  ): AIRelationshipAnalysis {
    return {
      relationships: [],
      insights: [
        `No relationships detected from ${designData.nodes.length} design nodes`,
      ],
      confidence: 0.2,
    };
  }

  private fallbackEndpointAnalysis(designData: DesignData): AIEndpointAnalysis {
    const endpoints: APIEndpoint[] = [];
    const spatialEndpoints: string[] = [];
    const authEndpoints: string[] = [];

    // Default entity type based on design source
    const entityType = "items";

    // Generate standard CRUD endpoints
    endpoints.push({
      method: "GET",
      path: `/${entityType}`,
      handler: `get${entityType}`,
      description: `Get all ${entityType}`,
      requiresAuth: false,
    });

    endpoints.push({
      method: "GET",
      path: `/${entityType}/:id`,
      handler: `get${entityType}ById`,
      description: `Get ${entityType} by ID`,
      requiresAuth: false,
    });

    endpoints.push({
      method: "POST",
      path: `/${entityType}`,
      handler: `create${entityType}`,
      description: `Create new ${entityType}`,
      requiresAuth: true,
    });

    endpoints.push({
      method: "PUT",
      path: `/${entityType}/:id`,
      handler: `update${entityType}`,
      description: `Update ${entityType}`,
      requiresAuth: true,
    });

    endpoints.push({
      method: "DELETE",
      path: `/${entityType}/:id`,
      handler: `delete${entityType}`,
      description: `Delete ${entityType}`,
      requiresAuth: true,
    });

    authEndpoints.push(
      `POST /${entityType}`,
      `PUT /${entityType}/:id`,
      `DELETE /${entityType}/:id`,
    );

    return {
      endpoints,
      authEndpoints,
      spatialEndpoints,
      confidence: 0.6,
    };
  }

  private fallbackSeedDataAnalysis(designData: DesignData): AISeedDataAnalysis {
    const textNodes = this.extractTextNodes(designData.nodes);
    const themes = ["General", "Sample Data"];

    const dataTypes = [
      {
        entity: "items",
        sampleCount: 10,
        theme: "General",
        spatialPattern: "none",
        examples: ["Sample Item 1", "Sample Item 2"],
      },
    ];

    return {
      dataTypes,
      themes,
      spatialPatterns: {},
      confidence: 0.3,
    };
  }

  private async analyzeWithRules(designData: DesignData) {
    // Rule-based fallback implementation
    return {
      entities: this.fallbackEntityAnalysis(designData),
      relationships: this.fallbackRelationshipAnalysis(designData),
      endpoints: this.fallbackEndpointAnalysis(designData),
      seedData: this.fallbackSeedDataAnalysis(designData),
    };
  }

  /**
   * Combine text-based and vision-based analysis results with confidence scoring
   */
  private combineAnalysisResults(
    textAnalysis: AIEntityAnalysis,
    visionAnalysis: VisionAnalysisResult,
  ): CombinedAnalysis {
    const combinedEntities: DetectedEntity[] = [];
    const entityConfidenceMap = new Map<string, DetectedEntity>();

    // Add text-based entities
    for (const entity of textAnalysis.entities) {
      entityConfidenceMap.set(entity.name, {
        ...entity,
        reasoning: `Text analysis: ${entity.reasoning}`,
      });
    }

    // Enhance or add vision-based entities
    for (const visionEntity of visionAnalysis.entities) {
      const existing = entityConfidenceMap.get(visionEntity.name);

      if (existing) {
        // Entity found in both analyses - increase confidence and merge insights
        const mergedConfidence = Math.min(
          1.0,
          (existing.confidence + visionEntity.confidence) / 2 + 0.2, // Boost for agreement
        );

        entityConfidenceMap.set(visionEntity.name, {
          ...existing,
          confidence: mergedConfidence,
          reasoning: `Combined analysis: ${existing.reasoning} + Vision: ${visionEntity.reasoning}`,
          fields: this.mergeEntityFields(existing.fields, visionEntity.fields),
        });
      } else {
        // Vision-only entity
        entityConfidenceMap.set(visionEntity.name, {
          ...visionEntity,
          reasoning: `Vision analysis: ${visionEntity.reasoning}`,
        });
      }
    }

    combinedEntities.push(...Array.from(entityConfidenceMap.values()));

    // Calculate overall confidence score
    const textConfidence = textAnalysis.confidence || 0.5;
    const visionConfidence = visionAnalysis.confidence || 0.5;

    // Combined confidence with boost for having both types of analysis
    const combinedConfidence = Math.min(
      1.0,
      (textConfidence + visionConfidence) / 2 + 0.15,
    );

    // Determine analysis method
    let analysisMethod: "text_only" | "vision_only" | "combined" = "combined";
    if (textAnalysis.entities.length === 0) {
      analysisMethod = "vision_only";
    } else if (visionAnalysis.entities.length === 0) {
      analysisMethod = "text_only";
    }

    if (this.config.debug) {
      this.logger.info("🔗 Combined analysis results:", {
        textEntities: textAnalysis.entities.length,
        visionEntities: visionAnalysis.entities.length,
        combinedEntities: combinedEntities.length,
        analysisMethod,
        confidenceScore: combinedConfidence,
      });
    }

    return {
      textAnalysis,
      visionAnalysis,
      combinedEntities,
      confidenceScore: combinedConfidence,
      analysisMethod,
    };
  }

  /**
   * Merge entity fields from text and vision analysis
   */
  private mergeEntityFields(textFields: any[], visionFields: any[]): any[] {
    const fieldMap = new Map<string, any>();

    // Add text fields
    for (const field of textFields) {
      fieldMap.set(field.name, field);
    }

    // Enhance with vision fields
    for (const visionField of visionFields) {
      const existing = fieldMap.get(visionField.name);
      if (existing) {
        // Field exists in both - enhance description
        fieldMap.set(visionField.name, {
          ...existing,
          description: `${existing.description} (confirmed by visual analysis)`,
        });
      } else {
        // New field from vision
        fieldMap.set(visionField.name, {
          ...visionField,
          description: `${visionField.description} (from visual analysis)`,
        });
      }
    }

    return Array.from(fieldMap.values());
  }
}
