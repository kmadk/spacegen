/**
 * Test fixtures for design data
 */

import type { DesignData, DesignNode, DesignScreenshot } from '../../types.js';

export const mockFigmaDesignData: DesignData = {
  source: 'figma',
  fileId: 'mock-figma-file-123',
  fileName: 'E-commerce App Design',
  nodes: [
    {
      id: '1:1',
      name: 'Product Card',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
      children: [
        {
          id: '1:2',
          name: 'Product Name',
          type: 'TEXT',
          characters: 'Wireless Headphones',
          absoluteBoundingBox: { x: 20, y: 20, width: 260, height: 24 }
        },
        {
          id: '1:3',
          name: 'Price',
          type: 'TEXT',
          characters: '$99.99',
          absoluteBoundingBox: { x: 20, y: 50, width: 80, height: 20 }
        },
        {
          id: '1:4',
          name: 'Description',
          type: 'TEXT',
          characters: 'High-quality wireless headphones with noise cancellation',
          absoluteBoundingBox: { x: 20, y: 80, width: 260, height: 40 }
        }
      ]
    },
    {
      id: '2:1',
      name: 'User Profile',
      type: 'FRAME',
      absoluteBoundingBox: { x: 320, y: 0, width: 280, height: 180 },
      children: [
        {
          id: '2:2',
          name: 'User Name',
          type: 'TEXT',
          characters: 'John Doe',
          absoluteBoundingBox: { x: 340, y: 20, width: 120, height: 24 }
        },
        {
          id: '2:3',
          name: 'Email',
          type: 'TEXT',
          characters: 'john.doe@example.com',
          absoluteBoundingBox: { x: 340, y: 50, width: 200, height: 20 }
        },
        {
          id: '2:4',
          name: 'Join Date',
          type: 'TEXT',
          characters: '2024-01-15',
          absoluteBoundingBox: { x: 340, y: 80, width: 100, height: 20 }
        }
      ]
    },
    {
      id: '3:1',
      name: 'Order Form',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 220, width: 400, height: 300 },
      children: [
        {
          id: '3:2',
          name: 'Customer Name Input',
          type: 'TEXT',
          characters: 'Enter your name',
          absoluteBoundingBox: { x: 20, y: 240, width: 360, height: 40 }
        },
        {
          id: '3:3',
          name: 'Shipping Address',
          type: 'TEXT',
          characters: '123 Main St, City, State',
          absoluteBoundingBox: { x: 20, y: 290, width: 360, height: 40 }
        },
        {
          id: '3:4',
          name: 'Order Total',
          type: 'TEXT',
          characters: '$156.47',
          absoluteBoundingBox: { x: 20, y: 340, width: 100, height: 30 }
        }
      ]
    }
  ],
  metadata: {
    version: '1.0.0',
    lastModified: '2024-01-15T10:00:00Z',
    author: 'Design Team'
  }
};

export const mockFigmaDesignData2: DesignData = {
  source: 'figma',
  fileId: 'mock-figma-file-789',
  fileName: 'Social Media Dashboard',
  nodes: [
    {
      id: 'rect-1',
      name: 'Post Card',
      type: 'rect',
      absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 180 },
      children: [
        {
          id: 'text-1',
          name: 'Post Title',
          type: 'text',
          characters: 'Amazing sunset at the beach',
          absoluteBoundingBox: { x: 20, y: 20, width: 280, height: 24 }
        },
        {
          id: 'text-2',
          name: 'Author',
          type: 'text',
          characters: '@photographer_jane',
          absoluteBoundingBox: { x: 20, y: 50, width: 150, height: 18 }
        },
        {
          id: 'text-3',
          name: 'Timestamp',
          type: 'text',
          characters: '2 hours ago',
          absoluteBoundingBox: { x: 20, y: 75, width: 80, height: 16 }
        },
        {
          id: 'text-4',
          name: 'Like Count',
          type: 'text',
          characters: '324 likes',
          absoluteBoundingBox: { x: 20, y: 140, width: 80, height: 16 }
        }
      ]
    },
    {
      id: 'rect-2',
      name: 'User Stats',
      type: 'rect',
      absoluteBoundingBox: { x: 340, y: 0, width: 200, height: 120 },
      children: [
        {
          id: 'text-5',
          name: 'Followers',
          type: 'text',
          characters: '1,234 followers',
          absoluteBoundingBox: { x: 360, y: 20, width: 160, height: 20 }
        },
        {
          id: 'text-6',
          name: 'Following',
          type: 'text',
          characters: '567 following',
          absoluteBoundingBox: { x: 360, y: 50, width: 160, height: 20 }
        },
        {
          id: 'text-7',
          name: 'Posts Count',
          type: 'text',
          characters: '89 posts',
          absoluteBoundingBox: { x: 360, y: 80, width: 160, height: 20 }
        }
      ]
    }
  ],
  metadata: {
    version: '2.1.0',
    lastModified: '2024-01-16T14:30:00Z'
  }
};

export const mockScreenshots: DesignScreenshot[] = [
  {
    pageId: 'page-1',
    name: 'Main Dashboard',
    imageUrl: 'https://example.com/screenshots/page-1.png'
  },
  {
    pageId: 'page-2', 
    name: 'Product Catalog',
    imageUrl: 'https://example.com/screenshots/page-2.png'
  }
];

export const mockVisionAnalysisResponse = {
  visualPatterns: [
    {
      type: 'card_pattern',
      description: 'Product card with title, price, and description layout',
      confidence: 0.9,
      suggestedEntity: 'Product',
      boundingBox: { x: 0, y: 0, width: 300, height: 200 }
    },
    {
      type: 'form_structure',
      description: 'Order form with customer input fields',
      confidence: 0.85,
      suggestedEntity: 'Order',
      boundingBox: { x: 0, y: 220, width: 400, height: 300 }
    }
  ],
  entities: [
    {
      name: 'Product',
      tableName: 'products',
      description: 'E-commerce product entity',
      fields: [
        {
          name: 'name',
          type: 'varchar(255)',
          required: true,
          description: 'Product name'
        },
        {
          name: 'price',
          type: 'decimal(10,2)',
          required: true,
          description: 'Product price'
        },
        {
          name: 'description',
          type: 'text',
          required: false,
          description: 'Product description'
        }
      ],
      confidence: 0.9,
      reasoning: 'Identified from product card visual pattern',
      visualEvidence: 'Card layout with name, price, and description fields'
    }
  ],
  relationships: [
    {
      from: 'Order',
      to: 'Product',
      type: 'manyToMany',
      confidence: 0.8,
      reasoning: 'Orders can contain multiple products',
      foreignKey: 'order_items'
    }
  ],
  insights: [
    'E-commerce application with product catalog and ordering system',
    'User management system with profiles and authentication'
  ],
  confidence: 0.87
};

export const mockEntityAnalysisResponse = {
  entities: [
    {
      name: 'User',
      tableName: 'users',
      description: 'Application user',
      fields: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          primary: true,
          description: 'User identifier'
        },
        {
          name: 'name',
          type: 'varchar(255)',
          required: true,
          description: 'User full name'
        },
        {
          name: 'email',
          type: 'varchar(320)',
          required: true,
          unique: true,
          description: 'User email address'
        },
        {
          name: 'created_at',
          type: 'timestamptz',
          required: true,
          description: 'Account creation date'
        }
      ],
      indexes: [],
      sourceElements: ['2:1'],
      confidence: 0.92,
      reasoning: 'User profile pattern detected with name, email, and join date'
    }
  ],
  insights: [
    'User management system identified',
    'E-commerce product catalog detected',
    'Order processing workflow found'
  ],
  confidence: 0.88,
  businessDomain: 'E-commerce platform'
};