/**
 * Vercel/Supabase Deployment Templates
 * Auto-hosting stack for Products 3 & 4
 */

import type { SpatialDataModel, VercelSupabaseConfig } from './types.js';

export class VercelSupabaseTemplates {
  constructor(private config: VercelSupabaseConfig) {}

  /**
   * Generate Vercel configuration
   */
  generateVercelJson() {
    return {
      "version": 2,
      "framework": this.config.vercel?.framework || "nextjs",
      "buildCommand": this.config.vercel?.buildCommand || "npm run build",
      "outputDirectory": this.config.vercel?.outputDirectory || ".next",
      "installCommand": this.config.vercel?.installCommand || "npm install",
      "env": this.config.vercel?.environmentVariables || {},
      "functions": {
        "pages/api/**/*.js": {
          "runtime": "nodejs18.x"
        }
      },
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "/api/$1"
        }
      ],
      "headers": [
        {
          "source": "/api/(.*)",
          "headers": [
            { "key": "Access-Control-Allow-Origin", "value": "*" },
            { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
            { "key": "Access-Control-Allow-Headers", "value": "X-Requested-With, Content-Type, Authorization" }
          ]
        }
      ]
    };
  }

  /**
   * Generate Next.js API routes for Supabase
   */
  generateApiRoutes(models: SpatialDataModel[]) {
    const routes: { path: string; content: string }[] = [];

    for (const model of models) {
      // GET all items
      routes.push({
        path: `pages/api/${model.tableName}/index.js`,
        content: this.generateGetAllRoute(model)
      });

      // GET single item
      routes.push({
        path: `pages/api/${model.tableName}/[id].js`,
        content: this.generateGetSingleRoute(model)
      });

      // POST create item
      routes.push({
        path: `pages/api/${model.tableName}/create.js`,
        content: this.generateCreateRoute(model)
      });

      // Spatial query route
      if (model.spatialIndexes.length > 0) {
        routes.push({
          path: `pages/api/${model.tableName}/spatial.js`,
          content: this.generateSpatialRoute(model)
        });
      }
    }

    return routes;
  }

  /**
   * Generate Supabase client configuration
   */
  generateSupabaseConfig() {
    return `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '${this.config.supabaseUrl}';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '${this.config.supabaseAnonKey}';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database type definitions
export interface Database {
  public: {
    Tables: {
      // Add your table types here
    };
  };
}`;
  }

  /**
   * Generate environment variables template
   */
  generateEnvTemplate() {
    return `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${this.config.supabaseUrl || 'https://your-project.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${this.config.supabaseAnonKey || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: PostGIS/Spatial Features
ENABLE_SPATIAL_QUERIES=true

# Optional: Authentication
${this.config.enableAuth ? 'SUPABASE_AUTH_ENABLED=true' : '# SUPABASE_AUTH_ENABLED=false'}

# Optional: Storage
${this.config.enableStorage ? 'SUPABASE_STORAGE_ENABLED=true' : '# SUPABASE_STORAGE_ENABLED=false'}

# Optional: Edge Functions
${this.config.enableEdgeFunctions ? 'SUPABASE_EDGE_FUNCTIONS_ENABLED=true' : '# SUPABASE_EDGE_FUNCTIONS_ENABLED=false'}`;
  }

  /**
   * Generate Supabase database setup SQL
   */
  generateSupabaseMigrations(models: SpatialDataModel[]) {
    const migrations: string[] = [];

    // Enable PostGIS if spatial features are used
    const hasSpatialFeatures = models.some(m => m.spatialIndexes.length > 0);
    if (hasSpatialFeatures) {
      migrations.push(`-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;`);
    }

    // Create tables
    for (const model of models) {
      migrations.push(this.generateTableMigration(model));
    }

    // Enable Row Level Security
    for (const model of models) {
      migrations.push(`-- Enable RLS for ${model.tableName}
ALTER TABLE ${model.tableName} ENABLE ROW LEVEL SECURITY;

-- Create policies (customize as needed)
CREATE POLICY "Users can view all ${model.tableName}" ON ${model.tableName}
  FOR SELECT USING (true);

CREATE POLICY "Users can insert ${model.tableName}" ON ${model.tableName}
  FOR INSERT WITH CHECK (true);`);
    }

    return migrations.join('\n\n');
  }

  /**
   * Generate deployment script
   */
  generateDeploymentScript() {
    return `#!/bin/bash
# Vercel/Supabase Auto-Deployment Script

set -e

echo "🚀 Starting Vercel/Supabase deployment..."

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL is required"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

# Run Supabase migrations if supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "🗄️  Running Supabase migrations..."
  supabase db push
else
  echo "⚠️  Supabase CLI not found. Please run migrations manually in Supabase dashboard."
fi

echo "✅ Deployment complete!"
echo "🌐 Your app is now live on Vercel with Supabase backend"`;
  }

  /**
   * Generate package.json for Vercel/Supabase project
   */
  generatePackageJson(projectName: string) {
    return {
      name: projectName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        "db:types": "supabase gen types typescript --local > lib/database.types.ts"
      },
      dependencies: {
        "@supabase/supabase-js": "^2.38.0",
        "next": "14.0.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "@fir/spatial-runtime": "^0.1.0"
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "eslint": "^8.0.0",
        "eslint-config-next": "14.0.0",
        "typescript": "^5.0.0"
      }
    };
  }

  private generateGetAllRoute(model: SpatialDataModel) {
    return `import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}`;
  }

  private generateGetSingleRoute(model: SpatialDataModel) {
    return `import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}`;
  }

  private generateCreateRoute(model: SpatialDataModel) {
    return `import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('${model.tableName}')
      .insert([req.body])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}`;
  }

  private generateSpatialRoute(model: SpatialDataModel) {
    return `import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bounds, lat, lng, radius } = req.query;

  try {
    let query = supabase.from('${model.tableName}').select('*');

    if (bounds) {
      // Within bounds query: ?bounds=minX,minY,maxX,maxY
      const [minX, minY, maxX, maxY] = bounds.split(',').map(Number);
      query = query.rpc('within_bounds', {
        min_x: minX,
        min_y: minY,
        max_x: maxX,
        max_y: maxY
      });
    } else if (lat && lng && radius) {
      // Nearby query: ?lat=40.7128&lng=-74.0060&radius=1000
      query = query.rpc('nearby', {
        lat: Number(lat),
        lng: Number(lng),
        radius_meters: Number(radius)
      });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}`;
  }

  private generateTableMigration(model: SpatialDataModel) {
    let sql = `-- Create table: ${model.tableName}\n`;
    sql += `CREATE TABLE ${model.tableName} (\n`;

    // Add id field if not present
    const hasId = model.fields.some(f => f.name === 'id');
    if (!hasId) {
      sql += '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n';
    }

    // Add fields
    for (const field of model.fields) {
      const nullable = field.required ? 'NOT NULL' : '';
      const unique = field.unique ? 'UNIQUE' : '';
      const defaultValue = field.defaultValue ? `DEFAULT ${JSON.stringify(field.defaultValue)}` : '';
      
      let sqlType = this.mapFieldTypeToPostgreSQL(field.type);
      
      sql += `  ${field.name} ${sqlType} ${nullable} ${unique} ${defaultValue},\n`;
    }

    // Add timestamps
    sql += '  created_at TIMESTAMPTZ DEFAULT NOW(),\n';
    sql += '  updated_at TIMESTAMPTZ DEFAULT NOW()\n';
    sql += ');\n\n';

    // Add spatial indexes
    for (const index of model.spatialIndexes) {
      if (index.type === 'gist') {
        sql += `CREATE INDEX ${index.name} ON ${model.tableName} USING GIST (${index.fields.join(', ')});\n`;
      } else {
        sql += `CREATE INDEX ${index.name} ON ${model.tableName} (${index.fields.join(', ')});\n`;
      }
    }

    return sql;
  }

  private mapFieldTypeToPostgreSQL(fieldType: string): string {
    const typeMap: Record<string, string> = {
      string: 'TEXT',
      number: 'NUMERIC',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMPTZ',
      json: 'JSONB',
      array: 'TEXT[]',
      geometry: 'GEOMETRY',
      point: 'POINT',
      polygon: 'POLYGON',
      reference: 'UUID'
    };

    return typeMap[fieldType] || 'TEXT';
  }
}