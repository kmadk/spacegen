import type {
  APIEndpoint,
  APISchema,
  QueryParameter,
  PathParameter,
  SpatialDataModel,
  HTTPMethod,
  APIFramework,
  FullstackGeneratorConfig,
  GeneratedFile
} from './types.js';

export class APIGenerator {
  private config: FullstackGeneratorConfig;

  constructor(config: FullstackGeneratorConfig) {
    this.config = config;
  }

  generateEndpointsFromModels(models: SpatialDataModel[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    for (const model of models) {
      // CRUD endpoints for each model
      endpoints.push(...this.generateCRUDEndpoints(model));
      
      // Spatial query endpoints if enabled
      if (this.config.enableSpatialQueries) {
        endpoints.push(...this.generateSpatialEndpoints(model));
      }
    }

    // Health check endpoint
    endpoints.push(this.generateHealthCheckEndpoint());

    return endpoints;
  }

  generateAPIFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    switch (this.config.apiFramework) {
      case 'express':
        files.push(...this.generateExpressFiles(endpoints, models));
        break;
      case 'fastify':
        files.push(...this.generateFastifyFiles(endpoints, models));
        break;
      case 'nextjs':
        files.push(...this.generateNextJSFiles(endpoints, models));
        break;
      case 'trpc':
        files.push(...this.generateTRPCFiles(endpoints, models));
        break;
      case 'graphql':
        files.push(...this.generateGraphQLFiles(endpoints, models));
        break;
    }

    return files;
  }

  private generateCRUDEndpoints(model: SpatialDataModel): APIEndpoint[] {
    const basePath = `/${this.toKebabCase(model.name)}`;
    const endpoints: APIEndpoint[] = [];

    // List/Search endpoint
    endpoints.push({
      path: basePath,
      method: 'GET',
      handler: `list${model.name}`,
      queryParams: [
        { name: 'page', type: 'number', default: 1, description: 'Page number' },
        { name: 'limit', type: 'number', default: 20, description: 'Items per page' },
        { name: 'search', type: 'string', description: 'Search query' },
        { name: 'semantic_level', type: 'string', description: 'Filter by semantic level' }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', items: this.generateModelSchema(model) },
          pagination: { 
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              totalPages: { type: 'number' }
            }
          }
        },
        required: ['data', 'pagination']
      },
      spatialQuery: this.config.enableSpatialQueries
    });

    // Get single endpoint
    endpoints.push({
      path: `${basePath}/:id`,
      method: 'GET',
      handler: `get${model.name}ById`,
      pathParams: [
        { name: 'id', type: 'string', description: `${model.name} ID` }
      ],
      responseSchema: this.generateModelSchema(model)
    });

    // Create endpoint
    endpoints.push({
      path: basePath,
      method: 'POST',
      handler: `create${model.name}`,
      requestSchema: this.generateCreateSchema(model),
      responseSchema: this.generateModelSchema(model),
      auth: true
    });

    // Update endpoint
    endpoints.push({
      path: `${basePath}/:id`,
      method: 'PUT',
      handler: `update${model.name}`,
      pathParams: [
        { name: 'id', type: 'string', description: `${model.name} ID` }
      ],
      requestSchema: this.generateUpdateSchema(model),
      responseSchema: this.generateModelSchema(model),
      auth: true
    });

    // Delete endpoint
    endpoints.push({
      path: `${basePath}/:id`,
      method: 'DELETE',
      handler: `delete${model.name}`,
      pathParams: [
        { name: 'id', type: 'string', description: `${model.name} ID` }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      auth: true
    });

    return endpoints;
  }

  private generateSpatialEndpoints(model: SpatialDataModel): APIEndpoint[] {
    const basePath = `/${this.toKebabCase(model.name)}`;
    const endpoints: APIEndpoint[] = [];

    // Within bounds query
    endpoints.push({
      path: `${basePath}/spatial/within-bounds`,
      method: 'GET',
      handler: `get${model.name}WithinBounds`,
      queryParams: [
        { name: 'minX', type: 'number', required: true, description: 'Minimum X coordinate' },
        { name: 'minY', type: 'number', required: true, description: 'Minimum Y coordinate' },
        { name: 'maxX', type: 'number', required: true, description: 'Maximum X coordinate' },
        { name: 'maxY', type: 'number', required: true, description: 'Maximum Y coordinate' },
        { name: 'semantic_level', type: 'string', description: 'Filter by semantic level' }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', items: this.generateModelSchema(model) },
          bounds: {
            type: 'object',
            properties: {
              minX: { type: 'number' },
              minY: { type: 'number' },
              maxX: { type: 'number' },
              maxY: { type: 'number' }
            }
          }
        }
      },
      spatialQuery: true
    });

    // Nearby query
    endpoints.push({
      path: `${basePath}/spatial/nearby`,
      method: 'GET',
      handler: `get${model.name}Nearby`,
      queryParams: [
        { name: 'x', type: 'number', required: true, description: 'Center X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Center Y coordinate' },
        { name: 'radius', type: 'number', required: true, description: 'Search radius' },
        { name: 'limit', type: 'number', default: 50, description: 'Maximum results' }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          data: { 
            type: 'array', 
            items: {
              type: 'object',
              properties: {
                ...this.generateModelSchema(model).properties,
                distance: { type: 'number', description: 'Distance from center point' }
              }
            }
          }
        }
      },
      spatialQuery: true
    });

    return endpoints;
  }

  private generateHealthCheckEndpoint(): APIEndpoint {
    return {
      path: '/health',
      method: 'GET',
      handler: 'healthCheck',
      responseSchema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          database: { type: 'boolean' },
          spatial: { type: 'boolean' }
        },
        required: ['status', 'timestamp']
      }
    };
  }

  private generateModelSchema(model: SpatialDataModel): APISchema {
    const properties: Record<string, any> = {};

    for (const field of model.fields) {
      properties[field.name] = {
        type: this.mapFieldTypeToAPIType(field.type),
        description: field.name.replace(/_/g, ' ')
      };

      if (field.constraints?.enum) {
        properties[field.name].enum = field.constraints.enum;
      }
    }

    return {
      type: 'object',
      properties,
      required: model.fields.filter(f => f.required).map(f => f.name)
    };
  }

  private generateCreateSchema(model: SpatialDataModel): APISchema {
    const schema = this.generateModelSchema(model);
    
    // Remove auto-generated fields from create schema
    const autoFields = ['id', 'created_at', 'updated_at'];
    autoFields.forEach(field => {
      delete schema.properties?.[field];
    });
    
    if (schema.required) {
      schema.required = schema.required.filter(field => !autoFields.includes(field));
    }

    return schema;
  }

  private generateUpdateSchema(model: SpatialDataModel): APISchema {
    const schema = this.generateCreateSchema(model);
    
    // Make all fields optional for updates
    schema.required = [];
    
    return schema;
  }

  private mapFieldTypeToAPIType(fieldType: string): string {
    switch (fieldType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'string';
      case 'json': return 'object';
      case 'array': return 'array';
      case 'geometry':
      case 'point':
      case 'polygon': return 'object';
      default: return 'string';
    }
  }

  private generateExpressFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Main server file
    files.push({
      path: 'src/server.ts',
      content: this.generateExpressServer(endpoints, models),
      type: 'typescript',
      description: 'Express.js server with spatial endpoints'
    });

    // Route files for each model
    for (const model of models) {
      const modelEndpoints = endpoints.filter(e => e.path.includes(this.toKebabCase(model.name)));
      files.push({
        path: `src/routes/${this.toKebabCase(model.name)}.ts`,
        content: this.generateExpressRoutes(model, modelEndpoints),
        type: 'typescript',
        description: `Express routes for ${model.name}`
      });
    }

    // Middleware files
    files.push({
      path: 'src/middleware/spatial.ts',
      content: this.generateSpatialMiddleware(),
      type: 'typescript',
      description: 'Spatial query middleware'
    });

    files.push({
      path: 'src/middleware/validation.ts',
      content: this.generateValidationMiddleware(),
      type: 'typescript',
      description: 'Request validation middleware'
    });

    return files;
  }

  private generateFastifyFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    // Similar structure to Express but with Fastify syntax
    return [];
  }

  private generateNextJSFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    // Generate Next.js API routes
    return [];
  }

  private generateTRPCFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    // Generate tRPC routers and procedures
    return [];
  }

  private generateGraphQLFiles(endpoints: APIEndpoint[], models: SpatialDataModel[]): GeneratedFile[] {
    // Generate GraphQL schema and resolvers
    return [];
  }

  private generateExpressServer(endpoints: APIEndpoint[], models: SpatialDataModel[]): string {
    const imports = [
      "import express from 'express';",
      "import cors from 'cors';",
      "import helmet from 'helmet';",
      "import rateLimit from 'express-rate-limit';",
      "import { spatialMiddleware } from './middleware/spatial.js';",
      "import { validationMiddleware } from './middleware/validation.js';"
    ];

    const routeImports = models.map(model => 
      `import ${this.toCamelCase(model.name)}Routes from './routes/${this.toKebabCase(model.name)}.js';`
    );

    const serverSetup = `
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(spatialMiddleware);
app.use(validationMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: true, // TODO: actual database health check
    spatial: ${this.config.enableSpatialQueries}
  });
});
`;

    const routes = models.map(model => 
      `app.use('/api/${this.toKebabCase(model.name)}', ${this.toCamelCase(model.name)}Routes);`
    ).join('\n');

    const serverStart = `
// Start server
app.listen(PORT, () => {
  console.log(\`🚀 API server running on port \${PORT}\`);
  console.log(\`📍 Spatial queries: ${this.config.enableSpatialQueries ? 'enabled' : 'disabled'}\`);
});

export default app;
`;

    return [
      ...imports,
      '',
      ...routeImports,
      '',
      serverSetup,
      '',
      routes,
      '',
      serverStart
    ].join('\n');
  }

  private generateExpressRoutes(model: SpatialDataModel, endpoints: APIEndpoint[]): string {
    const routerSetup = `
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
`;

    const routes = endpoints
      .filter(e => e.path.includes(this.toKebabCase(model.name)))
      .map(endpoint => this.generateExpressRoute(endpoint))
      .join('\n\n');

    return `${routerSetup}\n${routes}\n\nexport default router;`;
  }

  private generateExpressRoute(endpoint: APIEndpoint): string {
    const method = endpoint.method.toLowerCase();
    const path = endpoint.path.replace(`/${this.toKebabCase(endpoint.path.split('/')[1])}`, '');
    
    const validation = this.generateValidationRules(endpoint);
    const handler = this.generateRouteHandler(endpoint);

    return `// ${endpoint.method} ${endpoint.path}
router.${method}('${path || '/'}', ${validation ? validation + ', ' : ''}${handler});`;
  }

  private generateValidationRules(endpoint: APIEndpoint): string | null {
    const rules: string[] = [];

    // Path parameter validation
    if (endpoint.pathParams) {
      rules.push(...endpoint.pathParams.map(param => 
        `param('${param.name}').${this.getValidationChain(param.type)}`
      ));
    }

    // Query parameter validation
    if (endpoint.queryParams) {
      rules.push(...endpoint.queryParams.map(param => {
        let chain = `query('${param.name}')`;
        if (!param.required) chain += '.optional()';
        chain += `.${this.getValidationChain(param.type)}`;
        return chain;
      }));
    }

    return rules.length > 0 ? `[\n    ${rules.join(',\n    ')}\n  ]` : null;
  }

  private getValidationChain(type: string): string {
    switch (type) {
      case 'number': return 'isNumeric()';
      case 'boolean': return 'isBoolean()';
      case 'string': return 'isString().trim()';
      default: return 'isString().trim()';
    }
  }

  private generateRouteHandler(endpoint: APIEndpoint): string {
    return `async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement ${endpoint.handler}
      res.json({ 
        message: 'Handler ${endpoint.handler} not implemented',
        endpoint: '${endpoint.method} ${endpoint.path}'
      });
    } catch (error) {
      console.error('Route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }`;
  }

  private generateSpatialMiddleware(): string {
    return `
import type { Request, Response, NextFunction } from 'express';

export interface SpatialQuery {
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  center?: { x: number; y: number };
  radius?: number;
  semanticLevel?: string;
}

declare global {
  namespace Express {
    interface Request {
      spatial?: SpatialQuery;
    }
  }
}

export function spatialMiddleware(req: Request, res: Response, next: NextFunction) {
  // Parse spatial query parameters
  const { minX, minY, maxX, maxY, x, y, radius, semantic_level } = req.query;

  if (minX && minY && maxX && maxY) {
    req.spatial = {
      bounds: {
        minX: parseFloat(minX as string),
        minY: parseFloat(minY as string),
        maxX: parseFloat(maxX as string),
        maxY: parseFloat(maxY as string)
      }
    };
  }

  if (x && y && radius) {
    req.spatial = {
      center: {
        x: parseFloat(x as string),
        y: parseFloat(y as string)
      },
      radius: parseFloat(radius as string)
    };
  }

  if (semantic_level) {
    req.spatial = req.spatial || {};
    req.spatial.semanticLevel = semantic_level as string;
  }

  next();
}
`;
  }

  private generateValidationMiddleware(): string {
    return `
import type { Request, Response, NextFunction } from 'express';

export function validationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add any global validation logic here
  next();
}
`;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}