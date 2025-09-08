/**
 * Cost optimization for AI API calls
 * Automatically selects cheapest model that meets quality requirements
 */

export interface ModelConfig {
  name: string;
  costPer1kTokens: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  maxTokens: number;
  qualityScore: number; // 1-10
  speedScore: number; // 1-10
}

export class CostOptimizer {
  private models: ModelConfig[] = [
    {
      name: 'gpt-5',
      costPer1kTokens: 0.05, // Estimated GPT-5 pricing
      inputCostPer1kTokens: 0.05,
      outputCostPer1kTokens: 0.15,
      maxTokens: 200000,
      qualityScore: 10,
      speedScore: 9
    }
  ];

  /**
   * Always return GPT-5 since that's the requirement
   */
  selectOptimalModel(options: {
    taskComplexity: 'simple' | 'medium' | 'complex';
    maxCostPer1kTokens?: number;
    prioritizeSpeed?: boolean;
    minimumQuality?: number;
  }): ModelConfig {
    // Always use GPT-5 as requested
    return this.models[0];
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(model: string, inputTokens: number, expectedOutputTokens: number = 500): number {
    const modelConfig = this.models.find(m => m.name === model);
    if (!modelConfig) return 0;

    const inputCost = (inputTokens / 1000) * modelConfig.inputCostPer1kTokens;
    const outputCost = (expectedOutputTokens / 1000) * modelConfig.outputCostPer1kTokens;
    
    return inputCost + outputCost;
  }

  /**
   * Batch multiple prompts to reduce overhead
   */
  batchPrompts(prompts: Array<{
    systemPrompt: string;
    userPrompt: string;
    id: string;
  }>): string {
    return `Process these ${prompts.length} analysis tasks in one response:

${prompts.map((p, i) => `
## Task ${i + 1} (ID: ${p.id})
System: ${p.systemPrompt}
User: ${p.userPrompt}
`).join('\n')}

Return JSON array with ${prompts.length} objects, each with "id" and "result" fields.`;
  }

  /**
   * Smart prompt compression using abbreviations and structured format
   */
  compressPrompt(originalPrompt: string, maxTokens: number): string {
    const abbreviations = {
      'database': 'DB',
      'PostgreSQL': 'PG',
      'application': 'app',
      'interface': 'UI',
      'component': 'comp',
      'element': 'elem',
      'function': 'fn',
      'parameter': 'param',
      'configuration': 'config',
      'implementation': 'impl',
      'relationship': 'rel',
      'foreign key': 'FK',
      'primary key': 'PK',
      'user interface': 'UI',
      'programming': 'dev'
    };

    let compressed = originalPrompt;
    
    // Apply abbreviations
    for (const [full, abbrev] of Object.entries(abbreviations)) {
      compressed = compressed.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbrev);
    }

    // Remove verbose phrases
    const verbosePhrases = [
      'Please note that',
      'It is important to',
      'Keep in mind that',
      'Make sure to',
      'Don\'t forget to',
      'Remember that',
      'In order to',
      'For the purpose of'
    ];

    for (const phrase of verbosePhrases) {
      compressed = compressed.replace(new RegExp(phrase, 'gi'), '');
    }

    // Truncate if still too long
    const estimatedTokens = Math.ceil(compressed.length / 4);
    if (estimatedTokens > maxTokens) {
      const maxChars = maxTokens * 4;
      compressed = compressed.substring(0, maxChars) + '...';
    }

    return compressed.trim();
  }

  /**
   * Single attempt with GPT-5 only
   */
  async tryWithFallback<T>(
    operation: (model: string) => Promise<T>,
    maxAttempts: number = 1
  ): Promise<T> {
    const model = this.models[0]; // Always GPT-5
    console.log(`🤖 Using ${model.name} (${model.costPer1kTokens * 1000}¢/1k tokens)`);
    
    try {
      return await operation(model.name);
    } catch (error) {
      console.error(`GPT-5 failed:`, error);
      throw error;
    }
  }
}