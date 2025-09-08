/**
 * Prompt optimization utilities to reduce token usage while maintaining quality
 */

export class PromptOptimizer {
  /**
   * Compressed system prompt for entity analysis (90% shorter)
   */
  static getCompactEntityPrompt(): string {
    return `DB architect. Analyze UI elements → PostgreSQL entities.
Output JSON: {entities: [{name, fields: [{name, type, constraints}], indexes, spatial}]}
Rules: Use PostGIS for location data, proper normalization, realistic field names.`;
  }

  /**
   * Compressed relationship analysis prompt
   */
  static getCompactRelationshipPrompt(): string {
    return `Infer DB relationships from UI patterns.
JSON: {relationships: [{from, to, type: "1:1|1:many|many:many", foreignKey}]}`;
  }

  /**
   * Compressed endpoint analysis prompt
   */
  static getCompactEndpointPrompt(): string {
    return `UI → REST endpoints. JSON: {endpoints: [{path, method, entity, operation}]}
Standard CRUD + auth patterns.`;
  }

  /**
   * Extract only essential data from design elements
   */
  static extractEssentialData(designData: any): string {
    const essential = {
      forms: designData.forms?.map((f: any) => ({ 
        fields: f.fields?.slice(0, 5), // Limit to 5 fields
        type: f.type 
      })) || [],
      lists: designData.lists?.slice(0, 3) || [], // Only 3 lists
      buttons: designData.buttons?.slice(0, 8) || [], // Key actions only
      text: designData.textElements?.slice(0, 10)?.map((t: any) => t.content?.substring(0, 50)) || []
    };
    
    return JSON.stringify(essential);
  }

  /**
   * Batch multiple analyses into single API call
   */
  static createBatchPrompt(designData: any): string {
    const essential = this.extractEssentialData(designData);
    
    return `Analyze UI for backend gen. Output JSON with ALL sections:

Data: ${essential}

{
  "entities": [{name, fields: [{name, type}]}],
  "relationships": [{from, to, type}],
  "endpoints": [{path, method, entity}],
  "seedData": [{entity, sampleCount}]
}`;
  }
}

/**
 * Token counting utilities
 */
export class TokenCounter {
  /**
   * Rough token estimation (1 token ≈ 4 characters)
   */
  static estimate(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to max tokens
   */
  static truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  }
}