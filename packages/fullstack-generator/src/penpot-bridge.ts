/**
 * Penpot API Bridge for FIR Full-Stack Generator
 * 
 * Integrates with Penpot files to extract design elements and generate
 * spatial components and backend schemas
 */

import type { SpatialElement } from '@fir/spatial-runtime';

export interface PenpotConfig {
  apiUrl?: string;
  accessToken: string;
  debug?: boolean;
}

export interface PenpotFile {
  id: string;
  name: string;
  pages: PenpotPage[];
}

export interface PenpotPage {
  id: string;
  name: string;
  objects: PenpotObject[];
}

export interface PenpotObject {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: PenpotFill[];
  content?: string;
  children?: PenpotObject[];
  // Add more properties as needed
}

export interface PenpotFill {
  type: string;
  color?: string;
  opacity?: number;
}

export class PenpotBridge {
  private config: PenpotConfig;
  private apiUrl: string;

  constructor(config: PenpotConfig) {
    this.config = {
      apiUrl: 'https://design.penpot.app',
      debug: false,
      ...config
    };
    this.apiUrl = this.config.apiUrl!;
  }

  /**
   * Convert Penpot file object to spatial elements
   */
  async convertToSpatialElements(fileIdOrFile: string | PenpotFile): Promise<SpatialElement[]> {
    let file: PenpotFile;
    
    if (typeof fileIdOrFile === 'string') {
      file = await this.fetchFile(fileIdOrFile);
    } else {
      file = fileIdOrFile;
    }

    const elements: SpatialElement[] = [];

    for (const page of file.pages) {
      for (const object of page.objects) {
        const spatialElement = this.convertObjectToSpatialElement(object, page.name);
        if (spatialElement) {
          elements.push(spatialElement);
        }
      }
    }

    if (this.config.debug) {
      console.log(`🔄 Converted ${elements.length} Penpot objects to spatial elements`);
    }

    return elements;
  }

  /**
   * Fetch Penpot file from URL
   */
  async fetchPenpotFile(fileUrl: string): Promise<PenpotFile> {
    // Extract file ID from URL if needed
    const fileId = this.extractFileIdFromUrl(fileUrl);
    return this.fetchFile(fileId);
  }

  private extractFileIdFromUrl(url: string): string {
    // Extract file ID from Penpot URL patterns
    const match = url.match(/\/workspace\/[^\/]+\/([^\/]+)/);
    return match ? match[1] : url;
  }

  /**
   * Fetch a Penpot file by ID
   */
  async fetchFile(fileId: string): Promise<PenpotFile> {
    const response = await fetch(`${this.apiUrl}/api/rpc/command/get-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'get-file',
        file_id: fileId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Penpot file: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (this.config.debug) {
      console.log('📱 Fetched Penpot file:', data.name);
    }

    return this.normalizePenpotFile(data);
  }

  /**
   * Convert Penpot file structure to normalized format
   */
  private normalizePenpotFile(rawFile: any): PenpotFile {
    return {
      id: rawFile.id,
      name: rawFile.name,
      pages: rawFile.data?.pages ? Object.values(rawFile.data.pages).map((page: any) => ({
        id: page.id,
        name: page.name,
        objects: page.objects ? Object.values(page.objects).map((obj: any) => this.normalizePenpotObject(obj)) : []
      })) : []
    };
  }

  /**
   * Convert Penpot objects to normalized format
   */
  private normalizePenpotObject(rawObject: any): PenpotObject {
    return {
      id: rawObject.id,
      type: rawObject.type || 'frame',
      name: rawObject.name || 'Unnamed',
      x: rawObject.x || 0,
      y: rawObject.y || 0,
      width: rawObject.width || 0,
      height: rawObject.height || 0,
      fills: rawObject.fills,
      content: rawObject.content,
      children: rawObject.children ? rawObject.children.map((child: any) => this.normalizePenpotObject(child)) : []
    };
  }


  /**
   * Convert individual Penpot object to spatial element
   */
  private convertObjectToSpatialElement(object: PenpotObject, pageName: string): SpatialElement | null {
    // Extract semantic data from object name and content
    const semanticData = this.extractSemanticData(object);
    
    if (!semanticData) {
      return null; // Skip objects without semantic data
    }

    return {
      id: object.id,
      type: this.inferElementType(object),
      position: { x: object.x, y: object.y },
      bounds: { width: object.width, height: object.height },
      semanticData: {
        atomic: semanticData
      },
      metadata: {
        source: 'penpot',
        pageName,
        originalType: object.type
      }
    };
  }

  /**
   * Extract semantic data from Penpot object
   */
  private extractSemanticData(object: PenpotObject): Record<string, any> | null {
    const data: Record<string, any> = {};

    // Extract data from object name patterns
    const name = object.name.toLowerCase();
    
    // Product card detection
    if (name.includes('product') || name.includes('item')) {
      // Look for price patterns in content or name
      if (object.content) {
        const priceMatch = object.content.match(/\$?(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          data.price = parseFloat(priceMatch[1]);
        }
        
        // Extract title (first line or non-price text)
        const lines = object.content.split('\n');
        const title = lines.find(line => !line.match(/\$\d+/) && line.trim().length > 0);
        if (title) {
          data.title = title.trim();
        }
      }

      // Infer category from context
      if (name.includes('electronics') || data.title?.toLowerCase().includes('macbook') || data.title?.toLowerCase().includes('iphone')) {
        data.category = 'Electronics';
      }

      // Infer brand from content
      if (data.title?.toLowerCase().includes('apple') || data.title?.toLowerCase().includes('macbook') || data.title?.toLowerCase().includes('iphone')) {
        data.brand = 'Apple';
      }

      return Object.keys(data).length > 0 ? data : null;
    }

    // User profile detection
    if (name.includes('profile') || name.includes('user') || name.includes('avatar')) {
      if (object.content) {
        const emailMatch = object.content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          data.email = emailMatch[0];
        }

        // Extract name
        const lines = object.content.split('\n');
        const nameCandidate = lines.find(line => !line.includes('@') && line.trim().length > 0 && line.trim().length < 50);
        if (nameCandidate) {
          data.name = nameCandidate.trim();
        }
      }
      return Object.keys(data).length > 0 ? data : null;
    }

    // Form field detection
    if (name.includes('input') || name.includes('field') || object.type === 'text-input') {
      if (name.includes('email')) {
        data.type = 'email';
      } else if (name.includes('password')) {
        data.type = 'password';
      } else if (name.includes('name')) {
        data.type = 'text';
        data.field = 'name';
      }
      return Object.keys(data).length > 0 ? data : null;
    }

    return null;
  }

  /**
   * Infer element type from Penpot object
   */
  private inferElementType(object: PenpotObject): string {
    const name = object.name.toLowerCase();
    
    if (name.includes('product') || name.includes('item')) {
      return 'product-card';
    }
    if (name.includes('profile') || name.includes('user')) {
      return 'user-profile';
    }
    if (name.includes('button')) {
      return 'button';
    }
    if (name.includes('input') || name.includes('field')) {
      return 'form-field';
    }
    if (name.includes('list') || name.includes('grid')) {
      return 'collection';
    }
    
    return object.type || 'element';
  }

  /**
   * Generate spatial component code from Penpot objects
   */
  async generateSpatialComponents(fileId: string): Promise<{ [componentName: string]: string }> {
    const spatialElements = await this.convertToSpatialElements(fileId);
    const components: { [componentName: string]: string } = {};

    // Group elements by type
    const elementsByType = spatialElements.reduce((acc, element) => {
      if (!acc[element.type]) {
        acc[element.type] = [];
      }
      acc[element.type].push(element);
      return acc;
    }, {} as { [type: string]: SpatialElement[] });

    // Generate component for each type
    for (const [type, elements] of Object.entries(elementsByType)) {
      const componentName = this.toPascalCase(type);
      components[componentName] = this.generateSpatialComponent(componentName, type, elements[0]);
    }

    if (this.config.debug) {
      console.log(`🧩 Generated ${Object.keys(components).length} spatial components`);
    }

    return components;
  }

  /**
   * Generate spatial component code
   */
  private generateSpatialComponent(componentName: string, type: string, sampleElement: SpatialElement): string {
    const semanticFields = sampleElement.semanticData?.atomic || {};
    const fieldNames = Object.keys(semanticFields);

    return `import React from 'react';
import { SpatialElement } from '@fir/spatial-runtime';

export interface ${componentName}Props {
${fieldNames.map(field => `  ${field}: ${typeof semanticFields[field] === 'number' ? 'number' : 'string'};`).join('\n')}
  position: { x: number; y: number };
  bounds: { width: number; height: number };
}

export const ${componentName}: React.FC<${componentName}Props> = ({
${fieldNames.map(field => `  ${field},`).join('\n')}
  position,
  bounds
}) => {
  return (
    <SpatialElement
      position={position}
      bounds={bounds}
      semanticLevel="standard"
    >
      <div className="${type.replace('_', '-')}" style={{
        width: bounds.width,
        height: bounds.height,
        padding: '16px',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        backgroundColor: '#ffffff'
      }}>
${fieldNames.map(field => {
  if (field === 'price') {
    return `        <div className="price">\${${field}}</div>`;
  } else if (field === 'title') {
    return `        <h3 className="title">{${field}}</h3>`;
  } else {
    return `        <div className="${field}">{${field}}</div>`;
  }
}).join('\n')}
      </div>
    </SpatialElement>
  );
};

export default ${componentName};
`;
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}