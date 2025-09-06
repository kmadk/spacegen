import type {
  DeploymentConfig,
  DeploymentTarget,
  FullstackGeneratorConfig,
  GeneratedFile,
  SpatialDataModel,
  APIEndpoint
} from './types.js';
import { VercelSupabaseTemplates } from './vercel-supabase-templates.js';

export class DeploymentGenerator {
  private config: FullstackGeneratorConfig;

  constructor(config: FullstackGeneratorConfig) {
    this.config = config;
  }

  generateDeploymentConfig(models: SpatialDataModel[], endpoints: APIEndpoint[]): DeploymentConfig {
    const baseConfig: DeploymentConfig = {
      target: this.config.deployment,
      environment: this.generateEnvironmentVariables(),
      buildCommands: this.generateBuildCommands(),
      startCommand: this.generateStartCommand(),
      healthCheck: '/health'
    };

    // Add target-specific configurations
    switch (this.config.deployment) {
      case 'vercel':
        return { ...baseConfig, ...this.generateVercelConfig() };
      case 'vercel-supabase':
        return { ...baseConfig, ...this.generateVercelSupabaseConfig() };
      case 'railway':
        return { ...baseConfig, ...this.generateRailwayConfig() };
      case 'aws':
        return { ...baseConfig, ...this.generateAWSConfig() };
      case 'gcp':
        return { ...baseConfig, ...this.generateGCPConfig() };
      case 'docker':
        return { ...baseConfig, ...this.generateDockerConfig() };
      case 'local':
        return { ...baseConfig, ...this.generateLocalConfig() };
      default:
        return baseConfig;
    }
  }

  generateDeploymentFiles(config: DeploymentConfig, models: SpatialDataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Package.json with deployment scripts
    files.push(this.generatePackageJson());

    // Environment template
    files.push(this.generateEnvTemplate(config));

    // Target-specific files
    switch (config.target) {
      case 'vercel':
        files.push(...this.generateVercelFiles(config));
        break;
      case 'vercel-supabase':
        files.push(...this.generateVercelSupabaseFiles(config, models));
        break;
      case 'railway':
        files.push(...this.generateRailwayFiles(config));
        break;
      case 'aws':
        files.push(...this.generateAWSFiles(config, models));
        break;
      case 'gcp':
        files.push(...this.generateGCPFiles(config));
        break;
      case 'docker':
        files.push(...this.generateDockerFiles(config));
        break;
      case 'local':
        files.push(...this.generateLocalFiles(config));
        break;
    }

    // Database deployment files
    files.push(...this.generateDatabaseFiles(models));

    // Monitoring and logging
    files.push(...this.generateMonitoringFiles());

    return files;
  }

  private generateEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {
      NODE_ENV: 'production',
      PORT: '3000',
      API_VERSION: 'v1'
    };

    // Database configuration
    switch (this.config.database) {
      case 'postgresql':
        env.DATABASE_URL = 'postgresql://user:password@host:5432/database';
        if (this.config.enableSpatialQueries) {
          env.POSTGIS_ENABLED = 'true';
        }
        break;
      case 'mysql':
        env.DATABASE_URL = 'mysql://user:password@host:3306/database';
        break;
      case 'sqlite':
        env.DATABASE_FILE = './database.sqlite';
        break;
      case 'mongodb':
        env.MONGODB_URI = 'mongodb://host:27017/database';
        break;
    }

    // API framework specific
    switch (this.config.apiFramework) {
      case 'nextjs':
        env.NEXTAUTH_SECRET = 'your-secret-key';
        env.NEXTAUTH_URL = 'https://your-domain.com';
        break;
    }

    // Spatial configuration
    if (this.config.enableSpatialQueries) {
      env.SPATIAL_QUERIES_ENABLED = 'true';
      env.DEFAULT_SRID = '4326';
    }

    return env;
  }

  private generateBuildCommands(): string[] {
    const commands: string[] = [];

    switch (this.config.apiFramework) {
      case 'nextjs':
        commands.push('npm run build');
        break;
      case 'express':
      case 'fastify':
        commands.push('npm run build');
        break;
      default:
        commands.push('npm run build');
    }

    return commands;
  }

  private generateStartCommand(): string {
    switch (this.config.apiFramework) {
      case 'nextjs':
        return 'npm start';
      case 'express':
      case 'fastify':
        return 'node dist/server.js';
      default:
        return 'npm start';
    }
  }

  private generateVercelConfig(): Partial<DeploymentConfig> {
    return {
      staticDirs: ['public', 'static'],
      domains: ['your-domain.vercel.app']
    };
  }

  private generateVercelSupabaseConfig(): Partial<DeploymentConfig> {
    const vercelSupabaseConfig = this.config.vercelSupabase || {
      enableAuth: true,
      enableStorage: false,
      enableEdgeFunctions: false
    };

    return {
      staticDirs: ['public', 'static'],
      domains: ['your-domain.vercel.app'],
      vercelSupabase: vercelSupabaseConfig
    };
  }

  private generateRailwayConfig(): Partial<DeploymentConfig> {
    return {
      domains: ['your-app.railway.app']
    };
  }

  private generateAWSConfig(): Partial<DeploymentConfig> {
    return {
      domains: ['your-domain.com']
    };
  }

  private generateGCPConfig(): Partial<DeploymentConfig> {
    return {
      domains: ['your-app.googleware.com']
    };
  }

  private generateDockerConfig(): Partial<DeploymentConfig> {
    return {
      startCommand: 'docker-compose up'
    };
  }

  private generateLocalConfig(): Partial<DeploymentConfig> {
    return {
      startCommand: 'npm run dev'
    };
  }

  private generatePackageJson(): GeneratedFile {
    const packageJson = {
      name: this.config.projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: this.config.apiFramework === 'nextjs' ? 'next dev' : 'tsx watch src/server.ts',
        build: this.config.apiFramework === 'nextjs' ? 'next build' : 'tsup',
        start: this.generateStartCommand(),
        'db:migrate': 'node scripts/migrate.js',
        'db:seed': 'node scripts/seed.js',
        test: 'vitest run',
        'test:watch': 'vitest',
        lint: 'eslint src/',
        'type-check': 'tsc --noEmit'
      },
      dependencies: this.generateDependencies(),
      devDependencies: this.generateDevDependencies()
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'json',
      description: 'Package configuration with deployment scripts'
    };
  }

  private generateDependencies(): Record<string, string> {
    const deps: Record<string, string> = {};

    // API framework dependencies
    switch (this.config.apiFramework) {
      case 'express':
        deps.express = '^4.18.0';
        deps.cors = '^2.8.5';
        deps.helmet = '^7.0.0';
        deps['express-rate-limit'] = '^7.0.0';
        deps['express-validator'] = '^7.0.0';
        break;
      case 'fastify':
        deps.fastify = '^4.24.0';
        deps['@fastify/cors'] = '^8.4.0';
        deps['@fastify/helmet'] = '^11.1.0';
        deps['@fastify/rate-limit'] = '^9.0.0';
        break;
      case 'nextjs':
        deps.next = '^14.0.0';
        deps.react = '^18.2.0';
        deps['react-dom'] = '^18.2.0';
        break;
      case 'trpc':
        deps['@trpc/server'] = '^10.44.0';
        deps['@trpc/client'] = '^10.44.0';
        deps.zod = '^3.22.0';
        break;
    }

    // Database dependencies
    switch (this.config.database) {
      case 'postgresql':
        deps.pg = '^8.11.0';
        // Note: PostGIS support is provided by the database server extension, not a Node.js package
        // The pg driver handles PostGIS data types automatically
        break;
      case 'mysql':
        deps.mysql2 = '^3.6.0';
        break;
      case 'sqlite':
        deps.sqlite3 = '^5.1.0';
        break;
      case 'mongodb':
        deps.mongodb = '^6.3.0';
        break;
    }

    return deps;
  }

  private generateDevDependencies(): Record<string, string> {
    return {
      '@types/node': '^20.0.0',
      typescript: '^5.2.0',
      tsx: '^4.0.0',
      tsup: '^8.0.0',
      vitest: '^1.0.0',
      eslint: '^8.0.0',
      '@typescript-eslint/eslint-plugin': '^6.0.0',
      '@typescript-eslint/parser': '^6.0.0'
    };
  }

  private generateEnvTemplate(config: DeploymentConfig): GeneratedFile {
    const envContent = Object.entries(config.environment)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    return {
      path: '.env.example',
      content: `# Environment Configuration Template
# Copy this file to .env and update with your actual values

${envContent}

# Additional configuration
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring (optional)
LOG_LEVEL=info
ENABLE_METRICS=true
`,
      type: 'text',
      description: 'Environment variables template'
    };
  }

  private generateVercelFiles(config: DeploymentConfig): GeneratedFile[] {
    const vercelConfig = {
      version: 2,
      builds: [
        {
          src: this.config.apiFramework === 'nextjs' ? 'package.json' : 'src/server.ts',
          use: this.config.apiFramework === 'nextjs' ? '@vercel/next' : '@vercel/node'
        }
      ],
      routes: this.config.apiFramework === 'nextjs' ? undefined : [
        {
          src: '/(.*)',
          dest: '/src/server.ts'
        }
      ],
      env: this.convertEnvForVercel(config.environment)
    };

    return [
      {
        path: 'vercel.json',
        content: JSON.stringify(vercelConfig, null, 2),
        type: 'json',
        description: 'Vercel deployment configuration'
      }
    ];
  }

  private generateVercelSupabaseFiles(config: DeploymentConfig, models: SpatialDataModel[]): GeneratedFile[] {
    if (!config.vercelSupabase) {
      throw new Error('Vercel/Supabase config not found');
    }

    const templates = new VercelSupabaseTemplates(config.vercelSupabase);
    const files: GeneratedFile[] = [];

    // Vercel configuration
    files.push({
      path: 'vercel.json',
      content: JSON.stringify(templates.generateVercelJson(), null, 2),
      type: 'json',
      description: 'Vercel deployment configuration for Supabase integration'
    });

    // Package.json
    files.push({
      path: 'package.json',
      content: JSON.stringify(templates.generatePackageJson(this.config.projectName), null, 2),
      type: 'json',
      description: 'Package.json with Supabase dependencies'
    });

    // Supabase client configuration
    files.push({
      path: 'lib/supabase.js',
      content: templates.generateSupabaseConfig(),
      type: 'javascript',
      description: 'Supabase client configuration'
    });

    // Environment template
    files.push({
      path: '.env.example',
      content: templates.generateEnvTemplate(),
      type: 'text',
      description: 'Environment variables template for Vercel/Supabase'
    });

    // API routes
    const apiRoutes = templates.generateApiRoutes(models);
    for (const route of apiRoutes) {
      files.push({
        path: route.path,
        content: route.content,
        type: 'javascript',
        description: `API route for ${route.path}`
      });
    }

    // Supabase migrations
    files.push({
      path: 'supabase/migrations/001_initial_schema.sql',
      content: templates.generateSupabaseMigrations(models),
      type: 'sql',
      description: 'Supabase database migrations with PostGIS support'
    });

    // Deployment script
    files.push({
      path: 'deploy.sh',
      content: templates.generateDeploymentScript(),
      type: 'text',
      description: 'Automated deployment script for Vercel/Supabase',
      executable: true
    });

    // Next.js pages if framework is Next.js
    if (this.config.apiFramework === 'nextjs') {
      files.push({
        path: 'pages/_app.js',
        content: this.generateNextjsApp(),
        type: 'javascript',
        description: 'Next.js app component with Supabase integration'
      });

      files.push({
        path: 'pages/index.js',
        content: this.generateNextjsHomePage(models),
        type: 'javascript',
        description: 'Next.js home page with spatial features'
      });
    }

    return files;
  }

  private generateRailwayFiles(config: DeploymentConfig): GeneratedFile[] {
    const railwayConfig = {
      build: {
        builder: 'NIXPACKS'
      },
      deploy: {
        startCommand: config.startCommand,
        healthcheckPath: config.healthCheck
      }
    };

    return [
      {
        path: 'railway.json',
        content: JSON.stringify(railwayConfig, null, 2),
        type: 'json',
        description: 'Railway deployment configuration'
      }
    ];
  }

  private generateAWSFiles(config: DeploymentConfig, models: SpatialDataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // AWS Lambda handler
    files.push({
      path: 'lambda.js',
      content: this.generateLambdaHandler(),
      type: 'javascript',
      description: 'AWS Lambda handler'
    });

    // CloudFormation template
    files.push({
      path: 'cloudformation.yaml',
      content: this.generateCloudFormationTemplate(config, models),
      type: 'yaml',
      description: 'CloudFormation infrastructure template'
    });

    // Serverless framework config
    files.push({
      path: 'serverless.yml',
      content: this.generateServerlessConfig(config),
      type: 'yaml',
      description: 'Serverless framework configuration'
    });

    return files;
  }

  private generateGCPFiles(config: DeploymentConfig): GeneratedFile[] {
    const appYaml = `runtime: nodejs20
env: standard

automatic_scaling:
  min_instances: 1
  max_instances: 10

env_variables:
${Object.entries(config.environment).map(([key, value]) => `  ${key}: "${value}"`).join('\n')}
`;

    return [
      {
        path: 'app.yaml',
        content: appYaml,
        type: 'yaml',
        description: 'Google App Engine configuration'
      }
    ];
  }

  private generateDockerFiles(config: DeploymentConfig): GeneratedFile[] {
    const dockerfile = `FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
`;

    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
${Object.entries(config.environment).map(([key, value]) => `      ${key}: "${value}"`).join('\n')}
    depends_on:
      - database
    restart: unless-stopped

  database:
    image: ${this.getDatabaseImage()}
    ports:
      - "${this.getDatabasePort()}"
    environment:
${this.getDatabaseEnvVars().map(([key, value]) => `      ${key}: "${value}"`).join('\n')}
    volumes:
      - db_data:/var/lib/${this.config.database === 'postgresql' ? 'postgresql' : 'mysql'}/data
    restart: unless-stopped

volumes:
  db_data:
`;

    return [
      {
        path: 'Dockerfile',
        content: dockerfile,
        type: 'dockerfile',
        description: 'Docker container configuration'
      },
      {
        path: 'docker-compose.yml',
        content: dockerCompose,
        type: 'yaml',
        description: 'Docker Compose orchestration'
      }
    ];
  }

  private generateLocalFiles(config: DeploymentConfig): GeneratedFile[] {
    const setupScript = `#!/bin/bash
set -e

echo "🚀 Setting up local development environment..."

# Install dependencies
npm install

# Set up database
echo "📅 Setting up database..."
npm run db:migrate
npm run db:seed

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please update .env with your actual configuration"
fi

echo "✅ Setup complete! Run 'npm run dev' to start development server"
`;

    return [
      {
        path: 'setup.sh',
        content: setupScript,
        type: 'text',
        description: 'Local development setup script',
        executable: true
      }
    ];
  }

  private generateDatabaseFiles(models: SpatialDataModel[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Migration script
    files.push({
      path: 'scripts/migrate.js',
      content: this.generateMigrationScript(),
      type: 'javascript',
      description: 'Database migration script'
    });

    // Seed script
    files.push({
      path: 'scripts/seed.js',
      content: this.generateSeedScript(models),
      type: 'javascript',
      description: 'Database seeding script'
    });

    return files;
  }

  private generateMonitoringFiles(): GeneratedFile[] {
    const healthCheck = `import type { Request, Response } from 'express';

export async function healthCheck(req: Request, res: Response) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    database: await checkDatabase(),
    spatial: ${this.config.enableSpatialQueries},
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };

  const isHealthy = checks.database;
  const status = isHealthy ? 200 : 503;

  res.status(status).json(checks);
}

async function checkDatabase(): Promise<boolean> {
  try {
    // TODO: Implement actual database health check
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
`;

    return [
      {
        path: 'src/health.ts',
        content: healthCheck,
        type: 'typescript',
        description: 'Health check implementation'
      }
    ];
  }

  private convertEnvForVercel(env: Record<string, string>): Record<string, string> {
    // Convert environment variables to Vercel format
    return Object.fromEntries(
      Object.entries(env).map(([key, value]) => [key, value])
    );
  }

  private generateLambdaHandler(): string {
    return `import serverlessExpress from '@vendia/serverless-express';
import app from './src/server.js';

export const handler = serverlessExpress({ app });
`;
  }

  private generateCloudFormationTemplate(config: DeploymentConfig, models: SpatialDataModel[]): string {
    return `AWSTemplateFormatVersion: '2010-09-09'
Description: '${this.config.projectName} infrastructure'

Resources:
  ApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: ${this.config.projectName}-api
      Description: Spatial API Gateway

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: ${this.config.projectName}-handler
      Runtime: nodejs20.x
      Handler: lambda.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return { statusCode: 200, body: 'Hello World' };
          };

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: ${this.config.projectName}-db
      Engine: ${this.config.database}
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
`;
  }

  private generateServerlessConfig(config: DeploymentConfig): string {
    return `service: ${this.config.projectName}

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-offline
`;
  }

  private generateMigrationScript(): string {
    return `// Database migration script
console.log('🔄 Running database migrations...');

// TODO: Implement actual migration logic based on your database choice
// This would typically read migration files and execute them in order

console.log('✅ Migrations completed successfully');
`;
  }

  private generateSeedScript(models: SpatialDataModel[]): string {
    return `// Database seeding script
console.log('🌱 Seeding database...');

// TODO: Implement seeding logic for your models:
${models.map(model => `// - ${model.name}`).join('\n')}

console.log('✅ Database seeded successfully');
`;
  }

  private getDatabaseImage(): string {
    switch (this.config.database) {
      case 'postgresql':
        return this.config.enableSpatialQueries ? 'postgis/postgis:15-3.3' : 'postgres:15';
      case 'mysql':
        return 'mysql:8.0';
      case 'mongodb':
        return 'mongo:7.0';
      default:
        return 'postgres:15';
    }
  }

  private getDatabasePort(): string {
    switch (this.config.database) {
      case 'postgresql':
        return '5432:5432';
      case 'mysql':
        return '3306:3306';
      case 'mongodb':
        return '27017:27017';
      default:
        return '5432:5432';
    }
  }

  private getDatabaseEnvVars(): [string, string][] {
    switch (this.config.database) {
      case 'postgresql':
        return [
          ['POSTGRES_DB', 'spatial_app'],
          ['POSTGRES_USER', 'admin'],
          ['POSTGRES_PASSWORD', 'password123']
        ];
      case 'mysql':
        return [
          ['MYSQL_DATABASE', 'spatial_app'],
          ['MYSQL_USER', 'admin'],
          ['MYSQL_PASSWORD', 'password123'],
          ['MYSQL_ROOT_PASSWORD', 'rootpassword123']
        ];
      case 'mongodb':
        return [
          ['MONGO_INITDB_DATABASE', 'spatial_app'],
          ['MONGO_INITDB_ROOT_USERNAME', 'admin'],
          ['MONGO_INITDB_ROOT_PASSWORD', 'password123']
        ];
      default:
        return [];
    }
  }

  private generateNextjsApp(): string {
    return `import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState } from 'react';

export default function App({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}`;
  }

  private generateNextjsHomePage(models: SpatialDataModel[]): string {
    const modelName = models[0]?.name || 'Item';
    const tableName = models[0]?.tableName || 'items';

    return `import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [${tableName}, set${modelName}s] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('${tableName}')
        .select('*');

      if (error) {
        console.error('Error fetching data:', error);
      } else {
        set${modelName}s(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>FIR Spatial App</h1>
      <p>Generated from Figma/Penpot with full-stack backend</p>
      
      <h2>${modelName}s ({${tableName}.length})</h2>
      <div>
        {${tableName}.map((item) => (
          <div key={item.id} style={{ 
            border: '1px solid #ccc', 
            margin: '10px 0', 
            padding: '10px',
            borderRadius: '4px'
          }}>
            <pre>{JSON.stringify(item, null, 2)}</pre>
          </div>
        ))}
      </div>

      <style jsx>{\`
        div {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        h1 {
          color: #333;
        }
        
        h2 {
          color: #666;
        }
      \`}</style>
    </div>
  );
}`;
  }
}