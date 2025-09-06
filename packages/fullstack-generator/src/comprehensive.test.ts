import { describe, it, expect, beforeEach } from 'vitest';
import { FullstackGenerator } from './index.js';
import { AIPatternAnalyzer } from './ai-analyzer.js';
import { SmartDataGenerator } from './smart-data-generator.js';
import type { SpatialElement } from '@fir/spatial-runtime';
import type { FullstackGeneratorConfig } from './types.js';

// Mock realistic design data that simulates a complex e-commerce app
const createRealisticEcommerceDesign = (): SpatialElement[] => [
  // Header/Navigation
  {
    id: 'header-nav',
    type: 'navigation',
    position: { x: 0, y: 0 },
    bounds: { width: 1200, height: 80 },
    semanticData: {
      system: 'Main Navigation',
      standard: 'Logo + Menu + Search + Cart'
    }
  },
  
  // Product Cards (repeating pattern - key for entity detection)
  {
    id: 'product-card-1',
    type: 'product-item',
    position: { x: 50, y: 120 },
    bounds: { width: 280, height: 350 },
    semanticData: {
      standard: 'Wireless Headphones - $89.99',
      atomic: {
        title: 'Wireless Headphones',
        price: 89.99,
        rating: 4.5,
        image: 'headphones.jpg',
        inStock: true
      }
    }
  },
  {
    id: 'product-card-2', 
    type: 'product-item',
    position: { x: 350, y: 120 },
    bounds: { width: 280, height: 350 },
    semanticData: {
      standard: 'Smart Watch - $299.99',
      atomic: {
        title: 'Smart Watch',
        price: 299.99,
        rating: 4.2,
        image: 'watch.jpg',
        inStock: true
      }
    }
  },
  {
    id: 'product-card-3',
    type: 'product-item', 
    position: { x: 650, y: 120 },
    bounds: { width: 280, height: 350 },
    semanticData: {
      standard: 'Laptop Stand - $49.99',
      atomic: {
        title: 'Laptop Stand',
        price: 49.99,
        rating: 4.8,
        image: 'stand.jpg',
        inStock: false
      }
    }
  },
  
  // User Profile Section
  {
    id: 'user-profile',
    type: 'user-info',
    position: { x: 1000, y: 20 },
    bounds: { width: 180, height: 120 },
    semanticData: {
      standard: 'John Doe - Premium User',
      atomic: {
        name: 'John Doe',
        email: 'john@example.com',
        membershipType: 'premium',
        joinDate: '2023-01-15'
      }
    }
  },
  
  // Shopping Cart
  {
    id: 'cart-summary',
    type: 'cart',
    position: { x: 50, y: 500 },
    bounds: { width: 400, height: 200 },
    semanticData: {
      standard: 'Cart: 3 items - $439.97',
      atomic: {
        itemCount: 3,
        subtotal: 439.97,
        tax: 35.20,
        shipping: 9.99,
        total: 485.16
      }
    }
  },
  
  // Reviews/Comments (another repeating pattern)
  {
    id: 'review-1',
    type: 'review',
    position: { x: 50, y: 750 },
    bounds: { width: 350, height: 120 },
    semanticData: {
      standard: 'Great product! - Sarah K. - 5 stars',
      atomic: {
        author: 'Sarah K.',
        rating: 5,
        comment: 'Great product! Fast shipping and excellent quality.',
        date: '2024-01-20',
        verified: true
      }
    }
  },
  {
    id: 'review-2',
    type: 'review',
    position: { x: 420, y: 750 },
    bounds: { width: 350, height: 120 },
    semanticData: {
      standard: 'Good value - Mike R. - 4 stars',
      atomic: {
        author: 'Mike R.',
        rating: 4,
        comment: 'Good value for money. Could be better packaged.',
        date: '2024-01-18',
        verified: true
      }
    }
  },
  
  // Category Navigation (spatial relationship test)
  {
    id: 'category-electronics',
    type: 'category',
    position: { x: 50, y: 900 },
    bounds: { width: 200, height: 80 },
    semanticData: {
      standard: 'Electronics Category',
      atomic: { name: 'Electronics', itemCount: 1250, featured: true }
    }
  },
  {
    id: 'category-accessories',
    type: 'category', 
    position: { x: 270, y: 900 },
    bounds: { width: 200, height: 80 },
    semanticData: {
      standard: 'Accessories Category',
      atomic: { name: 'Accessories', itemCount: 890, featured: false }
    }
  }
];

describe('Comprehensive AI Integration Tests', () => {
  let generator: FullstackGenerator;
  let mockElements: SpatialElement[];

  beforeEach(() => {
    mockElements = createRealisticEcommerceDesign();
  });

  describe('Rule-based Analysis (No AI)', () => {
    it('should detect entities from repeating patterns without AI', async () => {
      const config: FullstackGeneratorConfig = {
        projectName: 'ecommerce-test',
        database: 'postgresql',
        apiFramework: 'express',
        deployment: 'vercel',
        enableSpatialQueries: true,
        debug: true
        // No openaiApiKey - should use rule-based approach
      };

      generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(mockElements);

      // Should detect at least the major entities
      expect(project.models.length).toBeGreaterThan(0);
      
      // Look for product-related model
      const hasProductModel = project.models.some(m => 
        m.name.toLowerCase().includes('product') || 
        m.name.toLowerCase().includes('item')
      );
      expect(hasProductModel).toBe(true);

      // Should have semantic fields from elements (price should be detected from semanticData)
      const hasSemanticFields = project.models.some(m =>
        m.fields.some(f => 
          ['price', 'title', 'rating', 'name', 'email'].some(semantic => 
            f.name.toLowerCase().includes(semantic)
          )
        )
      );
      expect(hasSemanticFields).toBe(true);

      // Should generate API endpoints
      expect(project.endpoints.length).toBeGreaterThan(0);
      
      // Should have CRUD endpoints
      const hasCRUD = ['GET', 'POST', 'PUT', 'DELETE'].every(method =>
        project.endpoints.some(e => e.method === method)
      );
      expect(hasCRUD).toBe(true);

      console.log('Generated Models:', project.models.map(m => ({
        name: m.name,
        fields: m.fields.map(f => f.name)
      })));
      console.log('Generated Endpoints:', project.endpoints.map(e => `${e.method} ${e.path}`));
    });

    it('should generate appropriate seed data without AI', async () => {
      const config: FullstackGeneratorConfig = {
        projectName: 'seed-test',
        database: 'postgresql', 
        apiFramework: 'express',
        deployment: 'local',
        debug: true
      };

      generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(mockElements);

      // Should have seed data files
      const seedDataFile = project.files.find(f => f.path.includes('seed-data.json'));
      const seedScriptFile = project.files.find(f => f.path.includes('seed-database.js'));

      expect(seedDataFile).toBeDefined();
      expect(seedScriptFile).toBeDefined();

      if (seedDataFile) {
        const seedData = JSON.parse(seedDataFile.content);
        expect(seedData.metadata.totalRecords).toBeGreaterThan(0);
        expect(Object.keys(seedData.entities).length).toBeGreaterThan(0);
      }
    });
  });

  describe('AI Pattern Detection (Mocked)', () => {
    it('should analyze complex spatial patterns with AI analyzer', async () => {
      // Create AI analyzer without API key to test pattern detection logic
      const aiAnalyzer = new AIPatternAnalyzer({
        apiKey: undefined, // Will skip actual API calls
        debug: true
      });

      // Test the pattern extraction logic (without calling OpenAI)
      const patterns = aiAnalyzer.extractPatterns(mockElements);
      
      // Should identify repeating patterns
      expect(patterns.repeatingTypes.length).toBeGreaterThan(0);
      
      // Should find product pattern
      const productPattern = patterns.repeatingTypes.find(p => p.type === 'product-item');
      expect(productPattern).toBeDefined();
      expect(productPattern?.count).toBe(3);
      
      // Should detect spatial clusters
      expect(patterns.spatialClusters.length).toBeGreaterThan(0);
      
      console.log('Detected Patterns:', patterns);
    });

    it('should generate smart data with context understanding', async () => {
      const smartGenerator = new SmartDataGenerator({
        recordsPerEntity: 10,
        useRealisticData: true,
        debug: true
        // No API key - will use rule-based generation
      });

      // Create mock models based on our design
      const mockModels = [
        {
          name: 'Product',
          tableName: 'products',
          fields: [
            { name: 'id', type: 'number', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'rating', type: 'number', required: false },
            { name: 'inStock', type: 'boolean', required: true },
            { name: 'image', type: 'string', required: false }
          ],
          spatialIndexes: [],
          relationships: [],
          metadata: { generated: true, createdAt: new Date().toISOString() }
        }
      ];

      const seedData = await smartGenerator.generateSeedData(mockModels);
      
      expect(seedData.entities.Product).toBeDefined();
      expect(seedData.entities.Product.length).toBe(10);
      expect(seedData.metadata.totalRecords).toBe(10);
      
      // Should have realistic data
      const firstProduct = seedData.entities.Product[0];
      expect(firstProduct.id).toBeDefined();
      expect(firstProduct.title).toBeDefined();
      expect(typeof firstProduct.price).toBe('number');
      expect(typeof firstProduct.inStock).toBe('boolean');
      
      console.log('Generated Seed Data Sample:', firstProduct);
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle empty or minimal design data', async () => {
      const config: FullstackGeneratorConfig = {
        projectName: 'minimal-test',
        database: 'sqlite',
        apiFramework: 'express',
        deployment: 'local'
      };

      const minimalElements: SpatialElement[] = [
        {
          id: 'single-element',
          type: 'item',
          position: { x: 0, y: 0 },
          bounds: { width: 100, height: 100 }
        }
      ];

      generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(minimalElements);

      // Should still generate something functional
      expect(project.models.length).toBeGreaterThan(0);
      expect(project.endpoints.length).toBeGreaterThan(0);
      expect(project.files.length).toBeGreaterThan(0);
    });

    it('should handle different database configurations correctly', async () => {
      const databases = ['postgresql', 'mysql', 'sqlite'] as const;
      
      for (const db of databases) {
        const config: FullstackGeneratorConfig = {
          projectName: `${db}-test`,
          database: db,
          apiFramework: 'express',
          deployment: 'local',
          enableSpatialQueries: db === 'postgresql' // Only PostgreSQL supports PostGIS
        };

        generator = new FullstackGenerator(config);
        const project = await generator.generateFromElements(mockElements.slice(0, 3));

        // Should generate appropriate database files
        const schemaFile = project.files.find(f => f.path.includes('schema.sql'));
        expect(schemaFile).toBeDefined();
        
        if (db === 'postgresql' && config.enableSpatialQueries) {
          // Should include PostGIS extensions (case insensitive)
          expect(schemaFile?.content.toLowerCase()).toContain('postgis');
        }

        // Should generate correct seed script for database type  
        const seedScript = project.files.find(f => f.path.includes('seed-database.js'));
        expect(seedScript).toBeDefined();
        
        if (db === 'postgresql') {
          expect(seedScript?.content).toContain('Pool');
          expect(seedScript?.content).toContain('$1');
        } else if (db === 'mysql') {
          expect(seedScript?.content).toContain('mysql');
          expect(seedScript?.content).toContain('?');
        } else if (db === 'sqlite') {
          expect(seedScript?.content).toContain('better-sqlite3');
          expect(seedScript?.content).toContain('?');
        }
      }
    });

    it('should detect spatial relationships between elements', async () => {
      const config: FullstackGeneratorConfig = {
        projectName: 'spatial-test',
        database: 'postgresql',
        apiFramework: 'express', 
        deployment: 'local',
        enableSpatialQueries: true,
        debug: true
      };

      generator = new FullstackGenerator(config);
      const project = await generator.generateFromElements(mockElements);

      // Should have spatial query endpoints
      const spatialEndpoints = project.endpoints.filter(e => e.spatialQuery === true);
      expect(spatialEndpoints.length).toBeGreaterThan(0);

      // Should include spatial fields in models
      const hasSpatialFields = project.models.some(m =>
        m.fields.some(f => ['geometry', 'point', 'position'].includes(f.type))
      );
      expect(hasSpatialFields).toBe(true);
    });
  });
});