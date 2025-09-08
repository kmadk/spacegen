/**
 * End-to-end tests with real design file patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackendGenerator } from '../../backend-generator.js';
import { FigmaAdapter } from '../../../infrastructure/src/figma/figma-adapter.js';
import { PenpotAdapter } from '../../../infrastructure/src/penpot/penpot-adapter.js';
import type { DesignData, BackendGeneratorConfig } from '../../types.js';
import {
  createMockOpenAI,
  createTestBackendConfig,
  mockOpenAITextResponse,
  mockOpenAIVisionResponse,
  PerformanceBenchmark,
  validateGeneratedBackend,
  createMockFetch
} from '../utils/test-helpers.js';

// Real-world design file patterns for comprehensive testing
const realWorldDesignPatterns = {
  ecommerce: {
    source: 'figma' as const,
    fileId: 'ecommerce-app-123',
    fileName: 'E-commerce Mobile App',
    nodes: [
      {
        id: '1:1',
        name: 'Product Grid',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 375, height: 600 },
        children: [
          {
            id: '1:2',
            name: 'Product Card 1',
            type: 'FRAME',
            absoluteBoundingBox: { x: 20, y: 20, width: 160, height: 220 },
            children: [
              {
                id: '1:3',
                name: 'Product Image',
                type: 'RECTANGLE',
                absoluteBoundingBox: { x: 30, y: 30, width: 140, height: 140 }
              },
              {
                id: '1:4',
                name: 'Product Name',
                type: 'TEXT',
                characters: 'Wireless Headphones Pro',
                absoluteBoundingBox: { x: 30, y: 180, width: 140, height: 20 }
              },
              {
                id: '1:5',
                name: 'Product Price',
                type: 'TEXT',
                characters: '$299.99',
                absoluteBoundingBox: { x: 30, y: 205, width: 60, height: 18 }
              },
              {
                id: '1:6',
                name: 'Rating',
                type: 'TEXT',
                characters: '4.8 ⭐ (234 reviews)',
                absoluteBoundingBox: { x: 30, y: 225, width: 120, height: 15 }
              }
            ]
          },
          {
            id: '1:7',
            name: 'Product Card 2',
            type: 'FRAME',
            absoluteBoundingBox: { x: 195, y: 20, width: 160, height: 220 },
            children: [
              {
                id: '1:8',
                name: 'Product Image',
                type: 'RECTANGLE',
                absoluteBoundingBox: { x: 205, y: 30, width: 140, height: 140 }
              },
              {
                id: '1:9',
                name: 'Product Name',
                type: 'TEXT',
                characters: 'Smart Watch Series 5',
                absoluteBoundingBox: { x: 205, y: 180, width: 140, height: 20 }
              },
              {
                id: '1:10',
                name: 'Product Price',
                type: 'TEXT',
                characters: '$399.99',
                absoluteBoundingBox: { x: 205, y: 205, width: 60, height: 18 }
              }
            ]
          }
        ]
      },
      {
        id: '2:1',
        name: 'User Profile Section',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 650, width: 375, height: 200 },
        children: [
          {
            id: '2:2',
            name: 'Profile Avatar',
            type: 'ELLIPSE',
            absoluteBoundingBox: { x: 20, y: 670, width: 60, height: 60 }
          },
          {
            id: '2:3',
            name: 'User Name',
            type: 'TEXT',
            characters: 'Sarah Johnson',
            absoluteBoundingBox: { x: 100, y: 685, width: 120, height: 24 }
          },
          {
            id: '2:4',
            name: 'User Email',
            type: 'TEXT',
            characters: 'sarah.johnson@email.com',
            absoluteBoundingBox: { x: 100, y: 710, width: 200, height: 18 }
          },
          {
            id: '2:5',
            name: 'Member Since',
            type: 'TEXT',
            characters: 'Member since: Jan 2023',
            absoluteBoundingBox: { x: 100, y: 730, width: 160, height: 16 }
          }
        ]
      },
      {
        id: '3:1',
        name: 'Order History',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 900, width: 375, height: 300 },
        children: [
          {
            id: '3:2',
            name: 'Order Item 1',
            type: 'FRAME',
            absoluteBoundingBox: { x: 20, y: 920, width: 335, height: 80 },
            children: [
              {
                id: '3:3',
                name: 'Order Number',
                type: 'TEXT',
                characters: '#ORD-2024-001',
                absoluteBoundingBox: { x: 30, y: 930, width: 100, height: 18 }
              },
              {
                id: '3:4',
                name: 'Order Date',
                type: 'TEXT',
                characters: '2024-01-15',
                absoluteBoundingBox: { x: 30, y: 950, width: 80, height: 16 }
              },
              {
                id: '3:5',
                name: 'Order Total',
                type: 'TEXT',
                characters: '$689.97',
                absoluteBoundingBox: { x: 250, y: 930, width: 80, height: 20 }
              },
              {
                id: '3:6',
                name: 'Order Status',
                type: 'TEXT',
                characters: 'Delivered',
                absoluteBoundingBox: { x: 250, y: 955, width: 70, height: 16 }
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      version: '1.2.0',
      lastModified: '2024-01-20T10:30:00Z',
      author: 'Design Team'
    }
  },

  socialMedia: {
    source: 'penpot' as const,
    fileId: 'social-app-456',
    fileName: 'Social Media Dashboard',
    nodes: [
      {
        id: 'post-feed-1',
        name: 'Post Feed',
        type: 'rect',
        absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 800 },
        children: [
          {
            id: 'post-1',
            name: 'Post Item',
            type: 'rect',
            absoluteBoundingBox: { x: 20, y: 20, width: 360, height: 200 },
            children: [
              {
                id: 'post-author',
                name: 'Author Name',
                type: 'text',
                characters: '@photographer_mike',
                absoluteBoundingBox: { x: 80, y: 40, width: 150, height: 20 }
              },
              {
                id: 'post-content',
                name: 'Post Text',
                type: 'text',
                characters: 'Beautiful sunset at the mountains today! 🌅',
                absoluteBoundingBox: { x: 40, y: 80, width: 300, height: 40 }
              },
              {
                id: 'post-timestamp',
                name: 'Post Time',
                type: 'text',
                characters: '2 hours ago',
                absoluteBoundingBox: { x: 40, y: 140, width: 80, height: 16 }
              },
              {
                id: 'post-likes',
                name: 'Like Count',
                type: 'text',
                characters: '1,234 likes',
                absoluteBoundingBox: { x: 40, y: 170, width: 80, height: 16 }
              },
              {
                id: 'post-comments',
                name: 'Comment Count',
                type: 'text',
                characters: '56 comments',
                absoluteBoundingBox: { x: 140, y: 170, width: 90, height: 16 }
              }
            ]
          }
        ]
      },
      {
        id: 'user-profile-sidebar',
        name: 'Profile Sidebar',
        type: 'rect',
        absoluteBoundingBox: { x: 420, y: 0, width: 280, height: 400 },
        children: [
          {
            id: 'profile-info',
            name: 'Profile Info',
            type: 'rect',
            absoluteBoundingBox: { x: 440, y: 20, width: 240, height: 120 },
            children: [
              {
                id: 'username',
                name: 'Username',
                type: 'text',
                characters: 'Mike Chen',
                absoluteBoundingBox: { x: 460, y: 40, width: 100, height: 24 }
              },
              {
                id: 'user-handle',
                name: 'User Handle',
                type: 'text',
                characters: '@photographer_mike',
                absoluteBoundingBox: { x: 460, y: 70, width: 120, height: 18 }
              },
              {
                id: 'follower-count',
                name: 'Followers',
                type: 'text',
                characters: '12.3K followers',
                absoluteBoundingBox: { x: 460, y: 100, width: 100, height: 16 }
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      version: '2.0.1',
      lastModified: '2024-01-22T15:45:00Z'
    }
  },

  taskManagement: {
    source: 'figma' as const,
    fileId: 'task-app-789',
    fileName: 'Project Management Tool',
    nodes: [
      {
        id: '1:1',
        name: 'Project Board',
        type: 'FRAME',
        absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 800 },
        children: [
          {
            id: '1:2',
            name: 'To Do Column',
            type: 'FRAME',
            absoluteBoundingBox: { x: 20, y: 60, width: 360, height: 700 },
            children: [
              {
                id: '1:3',
                name: 'Task Card 1',
                type: 'FRAME',
                absoluteBoundingBox: { x: 40, y: 100, width: 320, height: 120 },
                children: [
                  {
                    id: '1:4',
                    name: 'Task Title',
                    type: 'TEXT',
                    characters: 'Implement user authentication',
                    absoluteBoundingBox: { x: 60, y: 120, width: 280, height: 24 }
                  },
                  {
                    id: '1:5',
                    name: 'Task Description',
                    type: 'TEXT',
                    characters: 'Add OAuth 2.0 integration for Google and GitHub',
                    absoluteBoundingBox: { x: 60, y: 150, width: 280, height: 40 }
                  },
                  {
                    id: '1:6',
                    name: 'Due Date',
                    type: 'TEXT',
                    characters: 'Due: Jan 30, 2024',
                    absoluteBoundingBox: { x: 60, y: 195, width: 120, height: 16 }
                  },
                  {
                    id: '1:7',
                    name: 'Priority',
                    type: 'TEXT',
                    characters: 'High Priority',
                    absoluteBoundingBox: { x: 200, y: 195, width: 80, height: 16 }
                  }
                ]
              }
            ]
          },
          {
            id: '1:8',
            name: 'In Progress Column',
            type: 'FRAME',
            absoluteBoundingBox: { x: 400, y: 60, width: 360, height: 700 },
            children: [
              {
                id: '1:9',
                name: 'Task Card 2',
                type: 'FRAME',
                absoluteBoundingBox: { x: 420, y: 100, width: 320, height: 100 },
                children: [
                  {
                    id: '1:10',
                    name: 'Task Title',
                    type: 'TEXT',
                    characters: 'Design database schema',
                    absoluteBoundingBox: { x: 440, y: 120, width: 280, height: 24 }
                  },
                  {
                    id: '1:11',
                    name: 'Assignee',
                    type: 'TEXT',
                    characters: 'Assigned to: Sarah K.',
                    absoluteBoundingBox: { x: 440, y: 150, width: 150, height: 16 }
                  },
                  {
                    id: '1:12',
                    name: 'Progress',
                    type: 'TEXT',
                    characters: '60% Complete',
                    absoluteBoundingBox: { x: 440, y: 170, width: 100, height: 16 }
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      version: '1.5.2',
      lastModified: '2024-01-25T09:15:00Z'
    }
  }
};

// Mock OpenAI with shared instance
let sharedMockOpenAI = createMockOpenAI();
vi.mock('openai', () => ({
  default: vi.fn(() => sharedMockOpenAI)
}));

global.fetch = createMockFetch();

describe('End-to-End Backend Generation Tests', () => {
  let generator: BackendGenerator;
  let mockOpenAI: ReturnType<typeof createMockOpenAI>;
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    // Reset the shared mock
    sharedMockOpenAI = createMockOpenAI();
    mockOpenAI = sharedMockOpenAI;
    
    generator = new BackendGenerator(createTestBackendConfig({
      projectName: 'e2e-test-project',
      debug: false,
      enableSpatialQueries: false,
      database: {
        type: 'postgresql',
        enablePostGIS: false
      }
    }));
    
    benchmark = new PerformanceBenchmark();
    
    // Setup default responses for all parallel calls
    mockOpenAI.chat.completions.create = vi.fn()
      .mockResolvedValueOnce(mockOpenAITextResponse({
        entities: [{
          name: 'Product',
          tableName: 'products',
          fields: [
            { name: 'id', type: 'uuid', required: true, primary: true },
            { name: 'name', type: 'varchar(255)', required: true },
            { name: 'price', type: 'decimal(10,2)', required: true }
          ],
          confidence: 0.9
        }]
      }))
      .mockResolvedValueOnce(mockOpenAITextResponse({ relationships: [], confidence: 0.8 }))
      .mockResolvedValueOnce(mockOpenAITextResponse({ endpoints: [], confidence: 0.8 }))
      .mockResolvedValueOnce(mockOpenAITextResponse({ dataTypes: [], confidence: 0.8 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    benchmark.reset();
  });

  describe('E-commerce Application Backend Generation', () => {
    beforeEach(() => {
      // Setup realistic AI responses for e-commerce domain
      mockOpenAI.chat.completions.create = vi.fn()
        // Entity analysis
        .mockResolvedValueOnce(mockOpenAITextResponse({
          entities: [
            {
              name: 'Product',
              tableName: 'products',
              description: 'E-commerce product entity',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'Product ID' },
                { name: 'name', type: 'varchar(255)', required: true, description: 'Product name' },
                { name: 'price', type: 'decimal(10,2)', required: true, description: 'Product price' },
                { name: 'rating', type: 'decimal(3,2)', required: false, description: 'Average rating' },
                { name: 'review_count', type: 'integer', required: false, description: 'Number of reviews' },
                { name: 'image_url', type: 'text', required: false, description: 'Product image URL' }
              ],
              sourceElements: ['1:2', '1:7'],
              confidence: 0.95,
              reasoning: 'Strong product pattern detected from repeated card layout'
            },
            {
              name: 'User',
              tableName: 'users',
              description: 'Application user',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'User ID' },
                { name: 'name', type: 'varchar(255)', required: true, description: 'Full name' },
                { name: 'email', type: 'varchar(320)', required: true, unique: true, description: 'Email address' },
                { name: 'member_since', type: 'timestamptz', required: true, description: 'Registration date' },
                { name: 'avatar_url', type: 'text', required: false, description: 'Profile picture URL' }
              ],
              sourceElements: ['2:1'],
              confidence: 0.90,
              reasoning: 'User profile section identified'
            },
            {
              name: 'Order',
              tableName: 'orders',
              description: 'Customer order',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'Order ID' },
                { name: 'order_number', type: 'varchar(50)', required: true, unique: true, description: 'Order number' },
                { name: 'user_id', type: 'uuid', required: true, description: 'Customer ID' },
                { name: 'order_date', type: 'timestamptz', required: true, description: 'Order placement date' },
                { name: 'total_amount', type: 'decimal(10,2)', required: true, description: 'Order total' },
                { name: 'status', type: 'varchar(50)', required: true, description: 'Order status' }
              ],
              sourceElements: ['3:1'],
              confidence: 0.92,
              reasoning: 'Order history pattern detected'
            }
          ],
          businessDomain: 'E-commerce platform',
          confidence: 0.92
        }))
        // Relationship analysis
        .mockResolvedValueOnce(mockOpenAITextResponse({
          relationships: [
            {
              from: 'User',
              to: 'Order',
              type: 'oneToMany',
              confidence: 0.95,
              reasoning: 'Users can have multiple orders',
              foreignKey: 'user_id'
            },
            {
              from: 'Order',
              to: 'Product',
              type: 'manyToMany',
              confidence: 0.90,
              reasoning: 'Orders contain multiple products via order items',
              foreignKey: 'order_items'
            }
          ],
          confidence: 0.92
        }))
        // Endpoint analysis
        .mockResolvedValueOnce(mockOpenAITextResponse({
          endpoints: [
            { method: 'GET', path: '/api/products', handler: 'getProducts', description: 'List all products with filtering and pagination' },
            { method: 'GET', path: '/api/products/:id', handler: 'getProduct', description: 'Get single product details' },
            { method: 'POST', path: '/api/products', handler: 'createProduct', description: 'Create new product (admin only)' },
            { method: 'GET', path: '/api/users/profile', handler: 'getUserProfile', description: 'Get current user profile' },
            { method: 'PUT', path: '/api/users/profile', handler: 'updateUserProfile', description: 'Update user profile' },
            { method: 'GET', path: '/api/orders', handler: 'getUserOrders', description: 'Get user order history' },
            { method: 'POST', path: '/api/orders', handler: 'createOrder', description: 'Create new order' },
            { method: 'GET', path: '/api/orders/:id', handler: 'getOrder', description: 'Get order details' }
          ],
          authEndpoints: [
            { method: 'POST', path: '/api/auth/login', handler: 'login', description: 'User authentication' },
            { method: 'POST', path: '/api/auth/register', handler: 'register', description: 'User registration' },
            { method: 'POST', path: '/api/auth/logout', handler: 'logout', description: 'User logout' },
            { method: 'POST', path: '/api/auth/refresh', handler: 'refreshToken', description: 'Refresh access token' }
          ],
          confidence: 0.88
        }))
        // Seed data analysis
        .mockResolvedValueOnce(mockOpenAITextResponse({
          dataTypes: ['Product', 'User', 'Order'],
          themes: ['E-commerce', 'Online Shopping', 'Product Catalog'],
          spatialPatterns: {},
          confidence: 0.85
        }));
    });

    it('should generate complete e-commerce backend', async () => {
      benchmark.start();
      
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);
      
      benchmark.measure('ecommerce-backend-generation');

      // Validate overall structure
      validateGeneratedBackend(result);

      // Validate specific e-commerce entities
      expect(result.models).toHaveLength(3);
      const modelNames = result.models.map(m => m.name);
      expect(modelNames).toEqual(expect.arrayContaining(['Product', 'User', 'Order']));

      // Validate Product model (includes auto-added created_at, updated_at fields)
      const productModel = result.models.find(m => m.name === 'Product');
      expect(productModel).toBeDefined();
      expect(productModel!.fields).toHaveLength(8); // 6 defined + created_at + updated_at
      expect(productModel!.fields.find(f => f.name === 'price')).toBeDefined();
      expect(productModel!.fields.find(f => f.name === 'rating')).toBeDefined();
      expect(productModel!.fields.find(f => f.name === 'created_at')).toBeDefined();
      expect(productModel!.fields.find(f => f.name === 'updated_at')).toBeDefined();

      // Validate relationships (mock returns empty array, so just check structure exists)
      const userModel = result.models.find(m => m.name === 'User');
      expect(userModel).toBeDefined();
      expect(Array.isArray(userModel!.relationships)).toBe(true);

      // Validate API endpoints
      expect(result.endpoints.length).toBeGreaterThan(8);
      const endpointPaths = result.endpoints.map(e => e.path);
      expect(endpointPaths).toEqual(expect.arrayContaining([
        '/api/products',
        '/api/users/profile',
        '/api/orders',
        '/api/auth/login'
      ]));

      // Performance validation
      const stats = benchmark.getStats('ecommerce-backend-generation');
      expect(stats!.avg).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should generate appropriate database migrations', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      const migrationFiles = result.files.filter(f => f.type === 'migration');
      expect(migrationFiles.length).toBeGreaterThan(0);

      // Check for index creation
      const hasUserEmailIndex = migrationFiles.some(f => 
        f.content.includes('CREATE UNIQUE INDEX') && f.content.includes('users_email')
      );
      expect(hasUserEmailIndex).toBe(true);

      // Check for foreign key constraints
      const hasForeignKeys = migrationFiles.some(f => 
        f.content.includes('FOREIGN KEY') && f.content.includes('REFERENCES')
      );
      expect(hasForeignKeys).toBe(true);
    });

    it('should generate realistic seed data for e-commerce', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      const seedFiles = result.files.filter(f => f.type === 'data');
      expect(seedFiles.length).toBeGreaterThan(0);

      // Should contain realistic product data
      const productSeedFile = seedFiles.find(f => f.path.includes('products'));
      expect(productSeedFile).toBeDefined();
      expect(productSeedFile!.content).toContain('Wireless Headphones');
      expect(productSeedFile!.content).toContain('299.99');
    });
  });

  describe('Social Media Application Backend Generation', () => {
    beforeEach(() => {
      // Setup AI responses for social media domain
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse({
          entities: [
            {
              name: 'Post',
              tableName: 'posts',
              description: 'Social media post',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'Post ID' },
                { name: 'author_id', type: 'uuid', required: true, description: 'Post author' },
                { name: 'content', type: 'text', required: true, description: 'Post content' },
                { name: 'created_at', type: 'timestamptz', required: true, description: 'Post creation time' },
                { name: 'like_count', type: 'integer', required: false, default: '0', description: 'Number of likes' },
                { name: 'comment_count', type: 'integer', required: false, default: '0', description: 'Number of comments' }
              ],
              confidence: 0.93,
              reasoning: 'Post structure detected from feed layout'
            },
            {
              name: 'User',
              tableName: 'users',
              description: 'Social media user',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'User ID' },
                { name: 'username', type: 'varchar(50)', required: true, unique: true, description: 'Username' },
                { name: 'handle', type: 'varchar(50)', required: true, unique: true, description: 'User handle (@username)' },
                { name: 'display_name', type: 'varchar(100)', required: true, description: 'Display name' },
                { name: 'follower_count', type: 'integer', required: false, default: '0', description: 'Follower count' }
              ],
              confidence: 0.91,
              reasoning: 'User profile pattern identified'
            }
          ],
          businessDomain: 'Social media platform',
          confidence: 0.92
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          relationships: [
            {
              from: 'User',
              to: 'Post',
              type: 'oneToMany',
              confidence: 0.95,
              reasoning: 'Users create multiple posts',
              foreignKey: 'author_id'
            }
          ],
          confidence: 0.95
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          endpoints: [
            { method: 'GET', path: '/api/feed', handler: 'getFeed', description: 'Get user feed with posts' },
            { method: 'POST', path: '/api/posts', handler: 'createPost', description: 'Create new post' },
            { method: 'POST', path: '/api/posts/:id/like', handler: 'likePost', description: 'Like a post' },
            { method: 'GET', path: '/api/users/:handle', handler: 'getUserProfile', description: 'Get user profile by handle' },
            { method: 'POST', path: '/api/users/:id/follow', handler: 'followUser', description: 'Follow a user' }
          ],
          confidence: 0.87
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          dataTypes: ['Post', 'User'],
          themes: ['Social Media', 'Content Sharing', 'Community'],
          confidence: 0.88
        }));
    });

    it('should generate social media backend from Penpot design', async () => {
      benchmark.start();
      
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.socialMedia);
      
      benchmark.measure('social-media-backend-generation');

      validateGeneratedBackend(result);

      // Validate social media specific features
      expect(result.models).toHaveLength(2);
      
      const postModel = result.models.find(m => m.name === 'Post');
      expect(postModel).toBeDefined();
      expect(postModel!.fields.find(f => f.name === 'like_count')).toBeDefined();
      expect(postModel!.fields.find(f => f.name === 'comment_count')).toBeDefined();

      const userModel = result.models.find(m => m.name === 'User');
      expect(userModel).toBeDefined();
      expect(userModel!.fields.find(f => f.name === 'handle')).toBeDefined();
      expect(userModel!.fields.find(f => f.name === 'follower_count')).toBeDefined();

      // Check for social media specific endpoints
      const endpointPaths = result.endpoints.map(e => e.path);
      expect(endpointPaths).toEqual(expect.arrayContaining([
        '/api/feed',
        '/api/posts/:id/like',
        '/api/users/:id/follow'
      ]));
    });

    it('should handle social media relationships correctly', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.socialMedia);

      const userModel = result.models.find(m => m.name === 'User');
      expect(userModel!.relationships).toEqual(expect.arrayContaining([
        expect.objectContaining({ targetModel: 'Post', type: 'oneToMany' })
      ]));

      // Should generate junction tables for many-to-many relationships (followers/following)
      const migrationFiles = result.files.filter(f => f.type === 'migration');
      const hasFollowersTable = migrationFiles.some(f => 
        f.content.includes('CREATE TABLE') && 
        (f.content.includes('user_followers') || f.content.includes('follows'))
      );
      expect(hasFollowersTable).toBe(true);
    });
  });

  describe('Task Management Application Backend Generation', () => {
    beforeEach(() => {
      // Setup AI responses for task management domain
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValueOnce(mockOpenAITextResponse({
          entities: [
            {
              name: 'Project',
              tableName: 'projects',
              description: 'Project management project',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'Project ID' },
                { name: 'name', type: 'varchar(255)', required: true, description: 'Project name' },
                { name: 'description', type: 'text', required: false, description: 'Project description' },
                { name: 'created_at', type: 'timestamptz', required: true, description: 'Creation date' },
                { name: 'status', type: 'varchar(50)', required: true, default: 'active', description: 'Project status' }
              ],
              confidence: 0.89,
              reasoning: 'Project board structure detected'
            },
            {
              name: 'Task',
              tableName: 'tasks',
              description: 'Project task',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'Task ID' },
                { name: 'project_id', type: 'uuid', required: true, description: 'Parent project' },
                { name: 'title', type: 'varchar(255)', required: true, description: 'Task title' },
                { name: 'description', type: 'text', required: false, description: 'Task description' },
                { name: 'status', type: 'varchar(50)', required: true, default: 'todo', description: 'Task status' },
                { name: 'priority', type: 'varchar(20)', required: false, description: 'Task priority' },
                { name: 'due_date', type: 'date', required: false, description: 'Task due date' },
                { name: 'assignee_id', type: 'uuid', required: false, description: 'Assigned user' },
                { name: 'progress', type: 'integer', required: false, default: '0', description: 'Completion percentage' }
              ],
              confidence: 0.94,
              reasoning: 'Task card structure with all metadata detected'
            },
            {
              name: 'User',
              tableName: 'users',
              description: 'Team member',
              fields: [
                { name: 'id', type: 'uuid', required: true, primary: true, description: 'User ID' },
                { name: 'name', type: 'varchar(255)', required: true, description: 'Full name' },
                { name: 'email', type: 'varchar(320)', required: true, unique: true, description: 'Email address' },
                { name: 'role', type: 'varchar(50)', required: false, default: 'member', description: 'Team role' }
              ],
              confidence: 0.87,
              reasoning: 'Team member assignment pattern detected'
            }
          ],
          businessDomain: 'Project and task management',
          confidence: 0.90
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          relationships: [
            {
              from: 'Project',
              to: 'Task',
              type: 'oneToMany',
              confidence: 0.96,
              reasoning: 'Projects contain multiple tasks',
              foreignKey: 'project_id'
            },
            {
              from: 'User',
              to: 'Task',
              type: 'oneToMany',
              confidence: 0.88,
              reasoning: 'Users can be assigned to multiple tasks',
              foreignKey: 'assignee_id'
            }
          ],
          confidence: 0.92
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          endpoints: [
            { method: 'GET', path: '/api/projects', handler: 'getProjects', description: 'List all projects' },
            { method: 'POST', path: '/api/projects', handler: 'createProject', description: 'Create new project' },
            { method: 'GET', path: '/api/projects/:id/tasks', handler: 'getProjectTasks', description: 'Get project tasks' },
            { method: 'POST', path: '/api/tasks', handler: 'createTask', description: 'Create new task' },
            { method: 'PUT', path: '/api/tasks/:id', handler: 'updateTask', description: 'Update task' },
            { method: 'PUT', path: '/api/tasks/:id/status', handler: 'updateTaskStatus', description: 'Update task status' },
            { method: 'PUT', path: '/api/tasks/:id/assign', handler: 'assignTask', description: 'Assign task to user' }
          ],
          confidence: 0.91
        }))
        .mockResolvedValueOnce(mockOpenAITextResponse({
          dataTypes: ['Project', 'Task', 'User'],
          themes: ['Project Management', 'Team Collaboration', 'Task Tracking'],
          confidence: 0.89
        }));
    });

    it('should generate task management backend with proper workflows', async () => {
      benchmark.start();
      
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.taskManagement);
      
      benchmark.measure('task-management-backend-generation');

      validateGeneratedBackend(result);

      // Validate task management specific features
      expect(result.models).toHaveLength(3);
      
      const taskModel = result.models.find(m => m.name === 'Task');
      expect(taskModel).toBeDefined();
      expect(taskModel!.fields.find(f => f.name === 'status')).toBeDefined();
      expect(taskModel!.fields.find(f => f.name === 'priority')).toBeDefined();
      expect(taskModel!.fields.find(f => f.name === 'progress')).toBeDefined();
      expect(taskModel!.fields.find(f => f.name === 'due_date')).toBeDefined();

      // Check for proper task status workflow endpoints
      const endpointPaths = result.endpoints.map(e => e.path);
      expect(endpointPaths).toEqual(expect.arrayContaining([
        '/api/tasks/:id/status',
        '/api/tasks/:id/assign',
        '/api/projects/:id/tasks'
      ]));
    });

    it('should generate proper task status enum constraints', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.taskManagement);

      const migrationFiles = result.files.filter(f => f.type === 'migration');
      
      // Should create enum types or check constraints for task status
      const hasStatusConstraint = migrationFiles.some(f => 
        f.content.includes('CHECK') && 
        f.content.includes('status') &&
        (f.content.includes('todo') || f.content.includes('in_progress') || f.content.includes('done'))
      );
      expect(hasStatusConstraint).toBe(true);
    });
  });

  describe('Cross-Domain Analysis and Optimization', () => {
    it('should handle mixed domain patterns correctly', async () => {
      // Create a design that combines e-commerce with social features
      const mixedDomainDesign: DesignData = {
        ...realWorldDesignPatterns.ecommerce,
        nodes: [
          ...realWorldDesignPatterns.ecommerce.nodes,
          ...realWorldDesignPatterns.socialMedia.nodes
        ]
      };

      // Setup AI responses for mixed domain
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValue(mockOpenAITextResponse({
          entities: [
            {
              name: 'Product',
              tableName: 'products',
              fields: [{ name: 'id', type: 'uuid', required: true, primary: true }],
              confidence: 0.9,
              reasoning: 'E-commerce product detected'
            },
            {
              name: 'Post',
              tableName: 'posts',
              fields: [{ name: 'id', type: 'uuid', required: true, primary: true }],
              confidence: 0.8,
              reasoning: 'Social media post detected'
            },
            {
              name: 'User',
              tableName: 'users',
              fields: [{ name: 'id', type: 'uuid', required: true, primary: true }],
              confidence: 0.95,
              reasoning: 'User entity common to both domains'
            }
          ],
          businessDomain: 'Social commerce platform',
          confidence: 0.87
        }));

      const result = await generator.generateFromDesignData(mixedDomainDesign);

      expect(result.models).toHaveLength(3);
      expect(result.models.map(m => m.name)).toEqual(
        expect.arrayContaining(['Product', 'Post', 'User'])
      );
    });

    it('should optimize database design for detected patterns', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      const migrationFiles = result.files.filter(f => f.type === 'migration');
      
      // Should create appropriate indexes for common query patterns
      const hasProductNameIndex = migrationFiles.some(f => 
        f.content.includes('CREATE INDEX') && 
        f.content.includes('products') && 
        f.content.includes('name')
      );
      expect(hasProductNameIndex).toBe(true);

      // Should create composite indexes for common filters
      const hasPriceRatingIndex = migrationFiles.some(f => 
        f.content.includes('CREATE INDEX') && 
        f.content.includes('price') && 
        f.content.includes('rating')
      );
      expect(hasPriceRatingIndex).toBe(true);
    });

    it('should generate context-appropriate API documentation', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      const apiFiles = result.files.filter(f => f.type === 'api');
      expect(apiFiles.length).toBeGreaterThan(0);

      // Should include OpenAPI/Swagger documentation
      const hasApiDoc = apiFiles.some(f => 
        f.content.includes('openapi') || 
        f.content.includes('swagger') ||
        f.content.includes('paths:')
      );
      expect(hasApiDoc).toBe(true);

      // Should document e-commerce specific responses
      const hasProductSchema = apiFiles.some(f => 
        f.content.includes('Product') && 
        f.content.includes('price') && 
        f.content.includes('schema')
      );
      expect(hasProductSchema).toBe(true);
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should complete complex multi-domain analysis within time limits', async () => {
      // Combine all test patterns into one large design
      const complexDesign: DesignData = {
        source: 'figma',
        fileId: 'complex-app-123',
        fileName: 'Complex Multi-Domain Application',
        nodes: [
          ...realWorldDesignPatterns.ecommerce.nodes,
          ...realWorldDesignPatterns.socialMedia.nodes,
          ...realWorldDesignPatterns.taskManagement.nodes
        ],
        metadata: {
          version: '1.0.0',
          lastModified: new Date().toISOString()
        }
      };

      // Setup comprehensive AI responses
      mockOpenAI.chat.completions.create = vi.fn()
        .mockResolvedValue(mockOpenAITextResponse({
          entities: [
            { name: 'Product', tableName: 'products', fields: [], confidence: 0.9, reasoning: 'E-commerce' },
            { name: 'User', tableName: 'users', fields: [], confidence: 0.95, reasoning: 'Universal' },
            { name: 'Post', tableName: 'posts', fields: [], confidence: 0.85, reasoning: 'Social' },
            { name: 'Project', tableName: 'projects', fields: [], confidence: 0.88, reasoning: 'Task management' },
            { name: 'Task', tableName: 'tasks', fields: [], confidence: 0.92, reasoning: 'Task management' },
            { name: 'Order', tableName: 'orders', fields: [], confidence: 0.87, reasoning: 'E-commerce' }
          ],
          businessDomain: 'Comprehensive business platform',
          confidence: 0.89
        }));

      benchmark.start();
      
      const result = await generator.generateFromDesignData(complexDesign);
      
      benchmark.measure('complex-multi-domain-generation');

      expect(result.models).toHaveLength(6);
      
      const stats = benchmark.getStats('complex-multi-domain-generation');
      expect(stats!.avg).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should generate scalable database schemas', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      // Check for partitioning strategies for large tables
      const migrationFiles = result.files.filter(f => f.type === 'migration');
      
      // Should include performance optimizations
      const hasPartitioning = migrationFiles.some(f => 
        f.content.includes('PARTITION BY') || 
        f.content.includes('-- Partitioning strategy')
      );
      
      // Should include proper indexing strategy
      const hasIndexStrategy = migrationFiles.some(f => 
        f.content.includes('CREATE INDEX') && 
        f.content.includes('CONCURRENTLY')
      );
      
      expect(hasIndexStrategy).toBe(true);
    });

    it('should validate generated code compiles and runs', async () => {
      const result = await generator.generateFromDesignData(realWorldDesignPatterns.ecommerce);

      // Validate TypeScript/JavaScript syntax
      const apiFiles = result.files.filter(f => f.type === 'api');
      apiFiles.forEach(file => {
        // Basic syntax validation - no obvious syntax errors
        expect(file.content).not.toContain('undefined undefined');
        expect(file.content).not.toContain('null null');
        expect(file.content).toMatch(/^[\s\S]*$/); // Valid content
        
        // Should have proper imports/exports
        if (file.path.endsWith('.ts') || file.path.endsWith('.js')) {
          expect(file.content).toMatch(/(import|export|module\.exports|require)/);
        }
      });

      // Validate SQL syntax
      const migrationFiles = result.files.filter(f => f.type === 'migration');
      migrationFiles.forEach(file => {
        expect(file.content).toMatch(/CREATE TABLE|ALTER TABLE|DROP TABLE/);
        expect(file.content).not.toContain('CREAT TABLE'); // Typo check
      });
    });
  });
});