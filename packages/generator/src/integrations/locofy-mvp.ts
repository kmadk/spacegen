/**
 * MVP Locofy Integration for Backend Generator
 * Connects optimized backend generation with existing Locofy deployment infrastructure
 */

import { BackendGenerator } from "../backend-generator.js";
import { VercelAdapter } from "@figma-backend/infrastructure";
import { SupabaseAdapter } from "@figma-backend/infrastructure";
import type {
  BackendGeneratorConfig,
  GeneratedProject,
  DesignData,
} from "../types.js";

export interface LocofyMVPConfig extends BackendGeneratorConfig {
  locofyApiKey?: string;
  vercelToken?: string;
  vercelTeamId?: string;
  supabaseToken?: string;
  supabaseOrgId?: string;
  deploymentTarget?: "vercel" | "netlify" | "local";
  enableAutoDeployment?: boolean;
}

export interface LocofyDeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  backendUrl?: string;
  databaseUrl?: string;
  error?: string;
  deploymentTime: number;
}

/**
 * MVP integration that combines:
 * 1. Our optimized Figma backend generation
 * 2. Existing Locofy deployment infrastructure
 */
export class LocofyMVPIntegration {
  private backendGenerator: BackendGenerator;
  private config: LocofyMVPConfig;
  private vercelAdapter?: VercelAdapter;
  private supabaseAdapter?: SupabaseAdapter;

  constructor(config: LocofyMVPConfig) {
    this.config = config;
    this.backendGenerator = new BackendGenerator(config);

    // Initialize deployment adapters if tokens provided
    if (config.vercelToken) {
      this.vercelAdapter = new VercelAdapter({
        token: config.vercelToken,
        teamId: config.vercelTeamId,
      });
    }

    if (config.supabaseToken) {
      this.supabaseAdapter = new SupabaseAdapter({
        accessToken: config.supabaseToken,
        organizationId: config.supabaseOrgId,
      });
    }
  }

  /**
   * Complete Figma → Backend → Locofy → Deployment pipeline
   */
  async generateAndDeploy(
    figmaFileId: string,
    options: {
      includeScreenshots?: boolean;
      screenshotUrls?: string[];
      deployImmediately?: boolean;
      customDomain?: string;
    } = {},
  ): Promise<{
    backendProject: GeneratedProject;
    deployment?: LocofyDeploymentResult;
    performance: {
      generationTime: number;
      deploymentTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      if (this.config.debug) {
        console.log(
          `🚀 Starting Figma → Locofy pipeline for file: ${figmaFileId}`,
        );
      }

      // Step 1: Generate optimized backend from Figma
      const generationStart = Date.now();
      const backendResult = await this.backendGenerator.generateFromFigmaFile(
        figmaFileId,
        {
          includeScreenshots: options.includeScreenshots,
          screenshotUrls: options.screenshotUrls,
        },
      );
      const generationTime = Date.now() - generationStart;

      if (this.config.debug) {
        console.log(`✅ Backend generated in ${generationTime}ms`);
        console.log(
          `📊 Generated ${backendResult.models.length} models, ${backendResult.endpoints.length} endpoints`,
        );
      }

      // Step 2: Deploy via existing infrastructure (if enabled)
      let deployment: LocofyDeploymentResult | undefined;
      let deploymentTime = 0;

      if (options.deployImmediately && this.config.enableAutoDeployment) {
        deployment = await this.deployToLocofy(
          backendResult,
          options.customDomain,
        );
        deploymentTime = deployment.deploymentTime;
      }

      const totalTime = Date.now() - startTime;

      return {
        backendProject: backendResult,
        deployment,
        performance: {
          generationTime,
          deploymentTime,
          totalTime,
        },
      };
    } catch (error) {
      if (this.config.debug) {
        console.error("❌ Pipeline failed:", error);
      }
      throw new Error(
        `Locofy MVP pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate deployment-ready Locofy project structure
   */
  async generateLocofyProject(backendProject: GeneratedProject): Promise<{
    projectStructure: Record<string, string>;
    packageJson: any;
    deploymentConfig: any;
  }> {
    // Convert backend project to Locofy-compatible structure
    const projectStructure: Record<string, string> = {};

    // Next.js pages for each model
    for (const model of backendProject.models) {
      const pagePath = `pages/${model.tableName}/index.tsx`;
      projectStructure[pagePath] = this.generateNextJSPage(model);

      // API routes
      const apiPath = `pages/api/${model.tableName}/index.ts`;
      projectStructure[apiPath] = this.generateAPIRoute(model);
    }

    // Database configuration
    projectStructure["lib/database.ts"] =
      this.generateDatabaseConfig(backendProject);

    // Package.json with required dependencies
    const packageJson = {
      name: this.config.projectName.toLowerCase().replace(/\s+/g, "-"),
      version: "0.1.0",
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^14.0.0",
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        "@supabase/supabase-js": "^2.38.0",
        "drizzle-orm": "^0.29.0",
        postgres: "^3.4.0",
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        typescript: "^5.0.0",
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0",
      },
    };

    // Deployment configuration
    const deploymentConfig = {
      platform: this.config.deploymentTarget || "vercel",
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: "${DATABASE_URL}", // Template variables
        SUPABASE_URL: "${SUPABASE_URL}",
        SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
      },
      buildCommand: "npm run build",
      outputDirectory: ".next",
      installCommand: "npm install",
    };

    return {
      projectStructure,
      packageJson,
      deploymentConfig,
    };
  }

  /**
   * Deploy to real infrastructure (using Vercel + Supabase adapters)
   */
  private async deployToLocofy(
    backendProject: GeneratedProject,
    customDomain?: string,
  ): Promise<LocofyDeploymentResult> {
    const deploymentStart = Date.now();

    try {
      if (this.config.debug) {
        console.log("🚀 Starting real deployment...");
      }

      // Check that we have the required adapters
      if (!this.vercelAdapter || !this.supabaseAdapter) {
        throw new Error(
          "Deployment adapters not configured. Provide vercelToken and supabaseToken.",
        );
      }

      // Step 1: Create Supabase project and database
      const supabaseProject = await this.supabaseAdapter.createProject({
        name: this.config.projectName.toLowerCase().replace(/\s+/g, "-"),
        region: "us-east-1",
        plan: "free",
      });

      if (this.config.debug) {
        console.log(`✅ Supabase project created: ${supabaseProject.name}`);
      }

      // Step 2: Generate deployment files
      const deploymentFiles = await this.generateDeploymentFiles(
        backendProject,
        supabaseProject,
      );

      // Step 3: Deploy to Vercel
      const deployment = await this.vercelAdapter.createDeployment({
        name: this.config.projectName.toLowerCase().replace(/\s+/g, "-"),
        files: deploymentFiles,
        target: "production",
        env: {
          DATABASE_URL: supabaseProject.database.connectionString,
          SUPABASE_URL: supabaseProject.url,
          SUPABASE_ANON_KEY: supabaseProject.anonKey,
        },
      });

      const deploymentTime = Date.now() - deploymentStart;
      const deploymentUrl = deployment.url;
      const backendUrl = `${deploymentUrl}/api`;

      if (this.config.debug) {
        console.log(`✅ Deployed successfully in ${deploymentTime}ms`);
        console.log(`🌐 App: ${deploymentUrl}`);
        console.log(`🔗 API: ${backendUrl}`);
        console.log(`🗄️ Database: ${supabaseProject.url}`);
      }

      return {
        success: true,
        deploymentUrl,
        backendUrl,
        databaseUrl: supabaseProject.url,
        deploymentTime,
      };
    } catch (error) {
      if (this.config.debug) {
        console.error("❌ Deployment failed:", error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Deployment failed",
        deploymentTime: Date.now() - deploymentStart,
      };
    }
  }

  /**
   * Generate deployment files for Vercel deployment
   */
  private async generateDeploymentFiles(
    backendProject: GeneratedProject,
    supabaseProject: any,
  ): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Generate Next.js project structure
    const locofyProject = await this.generateLocofyProject(backendProject);

    // Add all project files
    Object.entries(locofyProject.projectStructure).forEach(
      ([path, content]) => {
        files[path] = content;
      },
    );

    // Add package.json
    files["package.json"] = JSON.stringify(locofyProject.packageJson, null, 2);

    // Add vercel.json configuration
    files["vercel.json"] = JSON.stringify(
      {
        version: 2,
        builds: [
          {
            src: "package.json",
            use: "@vercel/next",
          },
        ],
        env: {
          DATABASE_URL: "@database_url",
          SUPABASE_URL: "@supabase_url",
          SUPABASE_ANON_KEY: "@supabase_anon_key",
        },
      },
      null,
      2,
    );

    // Add database schema migration
    files["lib/schema.sql"] = this.generateDatabaseSchema(backendProject);

    // Add README for the deployed project
    files["README.md"] = this.generateDeploymentReadme(
      backendProject,
      supabaseProject,
    );

    return files;
  }

  /**
   * Generate database schema SQL
   */
  private generateDatabaseSchema(backendProject: GeneratedProject): string {
    let schema = "-- Generated database schema from Figma design\n\n";

    for (const model of backendProject.models) {
      schema += `CREATE TABLE IF NOT EXISTS ${model.tableName} (\n`;
      schema += model.fields
        .map((field: any) => `  ${field.name} ${field.type}`)
        .join(",\n");
      schema += "\n);\n\n";
    }

    return schema;
  }

  /**
   * Generate deployment README
   */
  private generateDeploymentReadme(
    backendProject: GeneratedProject,
    supabaseProject: any,
  ): string {
    return `# ${this.config.projectName}

Generated from Figma design using @figma-backend/generator

## Generated Resources

### Database (Supabase)
- **URL**: ${supabaseProject.url}
- **Tables**: ${backendProject.models.map((m: any) => m.tableName).join(", ")}

### API Endpoints
${backendProject.models
  .map(
    (model: any) =>
      `- GET /api/${model.tableName} - List all ${model.name}
- POST /api/${model.tableName} - Create new ${model.name}`,
  )
  .join("\n")}

### Frontend Pages
${backendProject.models
  .map(
    (model: any) =>
      `- /${model.tableName} - ${model.name} management interface`,
  )
  .join("\n")}

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

This project is automatically deployed to Vercel with Supabase backend.
`;
  }

  /**
   * Generate Next.js page for a model
   */
  private generateNextJSPage(model: any): string {
    return `import { useState, useEffect } from 'react';
import type { NextPage } from 'next';

interface ${model.name} {
${model.fields.map((f: any) => `  ${f.name}: ${this.mapTypeToTS(f.type)};`).join("\n")}
}

const ${model.name}Page: NextPage = () => {
  const [items, setItems] = useState<${model.name}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/${model.tableName}')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">${model.name} List</h1>
      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="border p-4 rounded">
            <h3 className="font-semibold">{item.name || item.title || item.id}</h3>
            {/* Add more fields as needed */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ${model.name}Page;`;
  }

  /**
   * Generate API route for a model
   */
  private generateAPIRoute(model: any): string {
    return `import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const items = await db.select().from(${model.tableName});
      res.status(200).json(items);
    } else if (req.method === 'POST') {
      const newItem = await db.insert(${model.tableName}).values(req.body).returning();
      res.status(201).json(newItem[0]);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end('Method Not Allowed');
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}`;
  }

  /**
   * Generate database configuration
   */
  private generateDatabaseConfig(backendProject: GeneratedProject): string {
    return `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);

// Schema definitions
${backendProject.models
  .map(
    (model) => `
export const ${model.tableName} = pgTable('${model.tableName}', {
${model.fields.map((f: any) => `  ${f.name}: ${this.mapTypeToDrizzle(f.type)},`).join("\n")}
});
`,
  )
  .join("\n")}`;
  }

  /**
   * Map database types to TypeScript types
   */
  private mapTypeToTS(dbType: string): string {
    const typeMap: Record<string, string> = {
      uuid: "string",
      varchar: "string",
      text: "string",
      integer: "number",
      decimal: "number",
      boolean: "boolean",
      timestamp: "Date",
      date: "Date",
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (dbType.includes(key)) return value;
    }
    return "string";
  }

  /**
   * Map database types to Drizzle types
   */
  private mapTypeToDrizzle(dbType: string): string {
    const typeMap: Record<string, string> = {
      uuid: 'uuid("id").defaultRandom().primaryKey()',
      varchar: "varchar({ length: 255 })",
      text: "text()",
      integer: "integer()",
      decimal: "decimal({ precision: 10, scale: 2 })",
      boolean: "boolean().default(false)",
      timestamp: "timestamp().defaultNow()",
      date: "date()",
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (dbType.includes(key)) return value;
    }
    return "text()";
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentUrl: string): Promise<{
    status: "building" | "ready" | "error";
    uptime: number;
    lastCheck: Date;
  }> {
    // Mock implementation - in reality this would check Vercel/Netlify status
    return {
      status: "ready",
      uptime: 99.9,
      lastCheck: new Date(),
    };
  }
}
