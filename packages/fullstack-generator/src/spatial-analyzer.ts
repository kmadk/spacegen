import type {
  SpatialAnalysis,
  DetectedEntity,
  DetectedField,
  SuggestedRelationship,
  SpatialQueryType,
  PerformanceRecommendation,
  EntityType,
  FieldType,
  AIAnalysisConfig
} from './types.js';
import type { SpatialElement } from '@fir/spatial-runtime';
import type { DesignExtraction } from '@fir/figma-bridge';
import { AIPatternAnalyzer } from './ai-analyzer.js';

export class SpatialAnalyzer {
  private aiAnalyzer: AIPatternAnalyzer;
  private useAI: boolean;

  constructor(aiConfig?: AIAnalysisConfig) {
    this.useAI = !!(aiConfig?.apiKey || process.env.OPENAI_API_KEY);
    
    // Always create AI analyzer for rule-based fallback methods
    this.aiAnalyzer = new AIPatternAnalyzer({
      debug: true,
      ...aiConfig
    });
  }

  async analyzeDesignForDatabase(extraction: DesignExtraction): Promise<SpatialAnalysis> {
    if (this.useAI) {
      return this.analyzeWithAI(extraction.elements);
    } else {
      return this.analyzeWithRules(extraction);
    }
  }

  /**
   * AI-powered analysis with fallback to rule-based
   */
  private async analyzeWithAI(elements: SpatialElement[]): Promise<SpatialAnalysis> {
    try {
      console.log('🤖 Using AI-powered spatial analysis...');
      
      const aiAnalysis = await this.aiAnalyzer.analyzeDesignPatterns(elements);
      
      // Convert AI analysis to standard format
      const entities = this.convertAIEntitiesToDetectedEntities(aiAnalysis.entities);
      const relationships = this.convertAIRelationshipsToSuggested(aiAnalysis.relationships);
      const spatialQueries = this.identifyRequiredSpatialQueries(elements);
      const performance = this.generatePerformanceRecommendations(entities, spatialQueries);

      console.log('✅ AI analysis completed successfully');
      
      return {
        entities,
        relationships,
        spatialQueries,
        performance,
        aiInsights: {
          entityInsights: aiAnalysis.entities.insights,
          relationshipInsights: aiAnalysis.relationships.insights,
          confidence: {
            entities: aiAnalysis.entities.confidence,
            relationships: aiAnalysis.relationships.confidence,
            endpoints: aiAnalysis.endpoints.confidence
          }
        }
      };
      
    } catch (error) {
      console.warn('⚠️ AI analysis failed, falling back to rule-based analysis:', error);
      return await this.analyzeWithRules({ elements } as DesignExtraction);
    }
  }

  /**
   * Traditional rule-based analysis (enhanced with AI analyzer rule-based methods)
   */
  private async analyzeWithRules(extraction: DesignExtraction): SpatialAnalysis {
    console.log('📐 Using rule-based spatial analysis...');
    
    // Use AI analyzer's improved rule-based methods if available
    if (this.aiAnalyzer) {
      try {
        const aiAnalysis = await this.aiAnalyzer.analyzeDesignPatterns(extraction.elements);
        const entities = this.convertAIEntitiesToDetectedEntities(aiAnalysis.entities);
        const relationships = this.convertAIRelationshipsToSuggested(aiAnalysis.relationships);
        const spatialQueries = this.identifyRequiredSpatialQueries(extraction.elements);
        const performance = this.generatePerformanceRecommendations(entities, spatialQueries);

        return {
          entities,
          relationships,
          spatialQueries,
          performance
        };
      } catch (error) {
        console.warn('⚠️ Enhanced rule-based analysis failed, using basic rules:', error);
      }
    }
    
    // Fallback to basic rule-based analysis
    const entities = this.detectEntities(extraction.elements);
    const relationships = this.suggestRelationships(entities);
    const spatialQueries = this.identifyRequiredSpatialQueries(extraction.elements);
    const performance = this.generatePerformanceRecommendations(entities, spatialQueries);

    return {
      entities,
      relationships,
      spatialQueries,
      performance
    };
  }

  /**
   * Convert AI entity analysis to DetectedEntity format
   */
  private convertAIEntitiesToDetectedEntities(aiAnalysis: any): DetectedEntity[] {
    return aiAnalysis.entities.map((aiEntity: any) => ({
      name: aiEntity.name,
      sourceElements: aiEntity.sourceElements,
      fields: aiEntity.fields.map((field: any) => ({
        name: field.name,
        type: this.mapAIFieldTypeToFieldType(field.type),
        source: 'ai_analysis',
        required: field.required,
        unique: field.unique,
        examples: field.primary ? [1, 2, 3] : ['example_value']
      })),
      type: this.inferEntityTypeFromName(aiEntity.name),
      confidence: aiEntity.confidence
    }));
  }

  /**
   * Convert AI relationship analysis to SuggestedRelationship format
   */
  private convertAIRelationshipsToSuggested(aiAnalysis: any): SuggestedRelationship[] {
    return aiAnalysis.relationships.map((aiRel: any) => ({
      from: aiRel.from,
      to: aiRel.to,
      type: aiRel.type,
      confidence: aiRel.confidence,
      reasoning: aiRel.reasoning
    }));
  }

  /**
   * Map AI field types to our FieldType enum
   */
  private mapAIFieldTypeToFieldType(aiType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      'serial': 'number',
      'varchar': 'string', 
      'varchar(255)': 'string',
      'text': 'string',
      'integer': 'number',
      'decimal': 'number',
      'timestamp': 'date',
      'boolean': 'boolean',
      'geometry': 'geometry',
      'geometry(Point,4326)': 'point',
      'json': 'json',
      'jsonb': 'json'
    };

    return typeMap[aiType] || 'string';
  }

  /**
   * Infer entity type from AI-generated name
   */
  private inferEntityTypeFromName(name: string): EntityType {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('user') || lowerName.includes('profile') || lowerName.includes('account')) {
      return 'user';
    }
    if (lowerName.includes('form') || lowerName.includes('submission') || lowerName.includes('contact')) {
      return 'form';
    }
    if (lowerName.includes('nav') || lowerName.includes('menu') || lowerName.includes('link')) {
      return 'navigation';
    }
    if (lowerName.includes('media') || lowerName.includes('image') || lowerName.includes('asset')) {
      return 'media';
    }
    if (lowerName.includes('spatial') || lowerName.includes('location') || lowerName.includes('position')) {
      return 'spatial';
    }
    if (lowerName.includes('content') || lowerName.includes('post') || lowerName.includes('article')) {
      return 'content';
    }
    
    return 'metadata';
  }

  // Legacy sync method - deprecated, use async version above
  analyzeDesignForDatabaseSync(extraction: DesignExtraction): SpatialAnalysis {
    console.warn('⚠️ Using deprecated sync analysis method. Consider upgrading to async AI analysis.');
    return this.analyzeWithRules(extraction);
  }

  private detectEntities(elements: SpatialElement[]): DetectedEntity[] {
    const entityGroups = this.groupElementsByPotentialEntity(elements);
    const entities: DetectedEntity[] = [];

    for (const [entityName, group] of entityGroups) {
      const entity = this.analyzeEntityGroup(entityName, group);
      entities.push(entity);
    }

    return entities;
  }

  private groupElementsByPotentialEntity(elements: SpatialElement[]): Map<string, SpatialElement[]> {
    const groups = new Map<string, SpatialElement[]>();

    for (const element of elements) {
      const entityName = this.inferEntityFromElement(element);
      
      if (!groups.has(entityName)) {
        groups.set(entityName, []);
      }
      groups.get(entityName)!.push(element);
    }

    // Merge semantically similar groups
    return this.mergeSemanticallySimilarGroups(groups);
  }

  private inferEntityFromElement(element: SpatialElement): string {
    // Use element metadata, semantic level, and spatial properties to infer entity type
    const semanticLevel = element.semanticData ? Object.keys(element.semanticData)[0] as 'universal' | 'system' | 'standard' | 'atomic' : 'standard';
    const elementType = element.type;
    const name = element.id;

    // Form detection patterns
    if (this.isFormElement(element)) {
      return this.extractFormEntityName(name);
    }

    // Content patterns
    if (this.isContentElement(element)) {
      return this.extractContentEntityName(name, semanticLevel);
    }

    // Navigation patterns  
    if (this.isNavigationElement(element)) {
      return 'navigation_item';
    }

    // Media patterns
    if (this.isMediaElement(element)) {
      return 'media_asset';
    }

    // Spatial container patterns
    if (this.isSpatialContainer(element)) {
      return this.extractContainerEntityName(name, semanticLevel);
    }

    // Default to generic entity based on semantic level
    return this.getDefaultEntityName(semanticLevel, elementType);
  }

  private isFormElement(element: SpatialElement): boolean {
    const indicators = ['form', 'input', 'button', 'select', 'checkbox', 'radio', 'field'];
    const name = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    
    return indicators.some(indicator => name.includes(indicator) || type.includes(indicator));
  }

  private isContentElement(element: SpatialElement): boolean {
    const indicators = ['text', 'content', 'article', 'post', 'card', 'item'];
    const name = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    
    return indicators.some(indicator => name.includes(indicator) || type.includes(indicator));
  }

  private isNavigationElement(element: SpatialElement): boolean {
    const indicators = ['nav', 'menu', 'link', 'breadcrumb', 'tab'];
    const name = element.id?.toLowerCase() || '';
    
    return indicators.some(indicator => name.includes(indicator));
  }

  private isMediaElement(element: SpatialElement): boolean {
    const indicators = ['image', 'video', 'audio', 'media', 'gallery', 'avatar'];
    const name = element.id?.toLowerCase() || '';
    const type = element.type?.toLowerCase() || '';
    
    return indicators.some(indicator => name.includes(indicator) || type.includes(indicator));
  }

  private isSpatialContainer(element: SpatialElement): boolean {
    const level = element.semanticData ? Object.keys(element.semanticData)[0] : 'standard';
    return level === 'system' || level === 'universal';
  }

  private extractFormEntityName(name: string): string {
    // Extract entity name from form field names
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Remove common form suffixes
    const formSuffixes = ['_form', '_field', '_input', '_button'];
    for (const suffix of formSuffixes) {
      if (cleanName.endsWith(suffix)) {
        return cleanName.slice(0, -suffix.length);
      }
    }
    
    return cleanName;
  }

  private extractContentEntityName(name: string, semanticLevel: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Use semantic level to infer content type
    switch (semanticLevel) {
      case 'universal':
        return 'site_content';
      case 'system':
        return 'page_content';
      case 'standard':
        return 'content_section';
      case 'atomic':
        return 'content_item';
      default:
        return cleanName || 'content_item';
    }
  }

  private extractContainerEntityName(name: string, semanticLevel: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    switch (semanticLevel) {
      case 'universal':
        return 'spatial_universe';
      case 'system':
        return 'spatial_system';
      default:
        return cleanName || 'spatial_container';
    }
  }

  private getDefaultEntityName(semanticLevel: string, elementType: string): string {
    const typeMap: Record<string, string> = {
      universal: 'global_entity',
      system: 'system_entity',
      standard: 'standard_entity',
      atomic: 'atomic_entity'
    };
    
    return typeMap[semanticLevel] || 'spatial_element';
  }

  private mergeSemanticallySimilarGroups(groups: Map<string, SpatialElement[]>): Map<string, SpatialElement[]> {
    // TODO: Implement semantic similarity matching
    // For now, return groups as-is
    return groups;
  }

  private analyzeEntityGroup(entityName: string, elements: SpatialElement[]): DetectedEntity {
    const fields = this.detectFieldsFromElements(elements);
    const entityType = this.classifyEntityType(entityName, elements);
    const confidence = this.calculateEntityConfidence(entityName, elements, fields);

    return {
      name: this.normalizeEntityName(entityName),
      sourceElements: elements.map(el => el.id),
      fields,
      type: entityType,
      confidence
    };
  }

  private detectFieldsFromElements(elements: SpatialElement[]): DetectedField[] {
    const fieldMap = new Map<string, DetectedField>();

    // Always include core spatial fields
    fieldMap.set('position', {
      name: 'position',
      type: 'geometry',
      source: 'spatial_coordinates',
      required: true,
      examples: [{ x: 0, y: 0 }]
    });

    fieldMap.set('semantic_level', {
      name: 'semantic_level',
      type: 'string',
      source: 'element_classification',
      required: true,
      examples: ['universal', 'system', 'standard', 'atomic']
    });

    // Extract fields from element properties
    for (const element of elements) {
      // Extract fields from element dimensions
      if (element.bounds) {
        if (!fieldMap.has('width')) {
          fieldMap.set('width', {
            name: 'width',
            type: 'number',
            source: 'element_bounds',
            required: false,
            examples: [element.bounds.width]
          });
        }

        if (!fieldMap.has('height')) {
          fieldMap.set('height', {
            name: 'height',
            type: 'number',
            source: 'element_bounds',
            required: false,
            examples: [element.bounds.height]
          });
        }
      }

      // Extract semantic data as content
      if (element.semanticData) {
        for (const [level, data] of Object.entries(element.semanticData)) {
          if (typeof data === 'string') {
            fieldMap.set('content', {
              name: 'content',
              type: 'string',
              source: `semantic_data_${level}`,
              required: false,
              examples: [data]
            });
          }
        }
      }
    }

    return Array.from(fieldMap.values());
  }

  private inferFieldType(value: any): FieldType {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'json';
    return 'string';
  }

  private classifyEntityType(entityName: string, elements: SpatialElement[]): EntityType {
    const name = entityName.toLowerCase();
    
    if (name.includes('form') || name.includes('input') || name.includes('field')) {
      return 'form';
    }
    
    if (name.includes('nav') || name.includes('menu') || name.includes('link')) {
      return 'navigation';
    }
    
    if (name.includes('media') || name.includes('image') || name.includes('video')) {
      return 'media';
    }
    
    if (name.includes('user') || name.includes('profile') || name.includes('account')) {
      return 'user';
    }
    
    if (name.includes('spatial') || name.includes('container') || name.includes('universe')) {
      return 'spatial';
    }
    
    if (name.includes('content') || name.includes('text') || name.includes('article')) {
      return 'content';
    }
    
    return 'metadata';
  }

  private calculateEntityConfidence(entityName: string, elements: SpatialElement[], fields: DetectedField[]): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for more elements
    confidence += Math.min(elements.length * 0.1, 0.3);
    
    // Higher confidence for more diverse field types
    const fieldTypes = new Set(fields.map(f => f.type));
    confidence += Math.min(fieldTypes.size * 0.05, 0.2);
    
    // Higher confidence for semantic consistency
    const semanticLevels = new Set(elements.map(el => 
      el.semanticData ? Object.keys(el.semanticData)[0] : 'standard'
    ));
    if (semanticLevels.size === 1) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private suggestRelationships(entities: DetectedEntity[]): SuggestedRelationship[] {
    const relationships: SuggestedRelationship[] = [];
    
    // Analyze spatial proximity for relationships
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const relationship = this.analyzeEntityRelationship(entities[i], entities[j]);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    return relationships.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeEntityRelationship(entityA: DetectedEntity, entityB: DetectedEntity): SuggestedRelationship | null {
    // Analyze semantic relationships
    const semanticRelation = this.getSemanticRelationship(entityA.type, entityB.type);
    if (!semanticRelation) return null;
    
    // Calculate relationship confidence
    const confidence = this.calculateRelationshipConfidence(entityA, entityB, semanticRelation);
    
    if (confidence < 0.3) return null;
    
    return {
      from: entityA.name,
      to: entityB.name,
      type: semanticRelation.type,
      confidence,
      reasoning: semanticRelation.reasoning
    };
  }

  private getSemanticRelationship(typeA: EntityType, typeB: EntityType): { type: SuggestedRelationship['type'], reasoning: string } | null {
    const relationships = new Map([
      [`${typeA}-${typeB}`, this.getDirectionalRelationship(typeA, typeB)],
      [`${typeB}-${typeA}`, this.getDirectionalRelationship(typeB, typeA)]
    ]);
    
    for (const relationship of relationships.values()) {
      if (relationship) return relationship;
    }
    
    return null;
  }

  private getDirectionalRelationship(fromType: EntityType, toType: EntityType): { type: SuggestedRelationship['type'], reasoning: string } | null {
    const relationshipMap: Record<string, { type: SuggestedRelationship['type'], reasoning: string }> = {
      'user-content': { type: 'oneToMany', reasoning: 'Users typically create multiple content items' },
      'user-form': { type: 'oneToMany', reasoning: 'Users can submit multiple forms' },
      'spatial-content': { type: 'oneToMany', reasoning: 'Spatial containers hold multiple content items' },
      'spatial-form': { type: 'oneToMany', reasoning: 'Spatial containers can contain multiple forms' },
      'content-media': { type: 'manyToMany', reasoning: 'Content items can reference multiple media assets' },
      'form-metadata': { type: 'oneToOne', reasoning: 'Forms have associated metadata' }
    };
    
    const key = `${fromType}-${toType}`;
    return relationshipMap[key] || null;
  }

  private calculateRelationshipConfidence(entityA: DetectedEntity, entityB: DetectedEntity, relation: { type: string, reasoning: string }): number {
    let confidence = 0.5;
    
    // Higher confidence for entities with more elements
    confidence += Math.min((entityA.sourceElements.length + entityB.sourceElements.length) * 0.05, 0.2);
    
    // Higher confidence based on entity confidence
    confidence += (entityA.confidence + entityB.confidence) * 0.15;
    
    return Math.min(confidence, 1.0);
  }

  private identifyRequiredSpatialQueries(elements: SpatialElement[]): SpatialQueryType[] {
    const queries = new Set<SpatialQueryType>();
    
    // Always include basic spatial queries
    queries.add('withinBounds');
    queries.add('nearby');
    
    // Analyze element distribution for additional query types
    const spatialSpread = this.calculateSpatialSpread(elements);
    
    if (spatialSpread.requiresClustering) {
      queries.add('clustering');
    }
    
    if (spatialSpread.hasOverlapping) {
      queries.add('intersects');
      queries.add('contains');
    }
    
    if (spatialSpread.hasDistributedElements) {
      queries.add('distance');
    }
    
    if (spatialSpread.hasNavigationPaths) {
      queries.add('routing');
    }
    
    return Array.from(queries);
  }

  private calculateSpatialSpread(elements: SpatialElement[]): {
    requiresClustering: boolean;
    hasOverlapping: boolean;
    hasDistributedElements: boolean;
    hasNavigationPaths: boolean;
  } {
    // Simplified analysis - in practice would use proper spatial algorithms
    const positions = elements.map(el => el.position);
    const bounds = this.calculateBoundingBox(positions);
    
    const area = bounds.width * bounds.height;
    const density = elements.length / area;
    
    return {
      requiresClustering: density > 0.1,
      hasOverlapping: elements.length > 10, // Simplified check
      hasDistributedElements: bounds.width > 1000 || bounds.height > 1000,
      hasNavigationPaths: elements.some(el => {
        const level = el.semanticData ? Object.keys(el.semanticData)[0] : 'standard';
        return level === 'system';
      })
    };
  }

  private calculateBoundingBox(positions: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    if (positions.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private generatePerformanceRecommendations(entities: DetectedEntity[], spatialQueries: SpatialQueryType[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    
    // Index recommendations based on entity fields
    for (const entity of entities) {
      const spatialFields = entity.fields.filter(f => f.type === 'geometry' || f.type === 'point');
      
      if (spatialFields.length > 0) {
        recommendations.push({
          type: 'index',
          description: `Create spatial index for ${entity.name} position fields`,
          implementation: `CREATE INDEX idx_${entity.name.toLowerCase()}_position ON ${entity.name.toLowerCase()} USING GIST (position);`,
          impact: 'high'
        });
      }
    }
    
    // Caching recommendations for frequently accessed data
    if (entities.length > 5) {
      recommendations.push({
        type: 'caching',
        description: 'Implement Redis caching for frequently accessed spatial queries',
        implementation: 'Add Redis client and cache spatial query results with TTL based on update frequency',
        impact: 'medium'
      });
    }
    
    // Partitioning recommendations for large datasets
    if (entities.some(e => e.sourceElements.length > 100)) {
      recommendations.push({
        type: 'partitioning',
        description: 'Consider table partitioning for entities with large spatial datasets',
        implementation: 'Partition tables by spatial bounds or semantic level for better query performance',
        impact: 'high'
      });
    }
    
    // Query-specific optimizations
    if (spatialQueries.includes('clustering')) {
      recommendations.push({
        type: 'index',
        description: 'Optimize clustering queries with specialized spatial indexes',
        implementation: 'Use ST_ClusterDBSCAN with appropriate spatial indexes',
        impact: 'medium'
      });
    }
    
    return recommendations;
  }

  private normalizeEntityName(name: string): string {
    return name
      .split(/[^a-zA-Z0-9]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}