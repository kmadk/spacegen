/**
 * Product 3: Penpot → Full-Stack + Hosting
 * Complete full-stack application with deployment
 */

import type { SpatialElement } from '@fir/spatial-runtime';
import { Product1PenpotSpatial } from './product1-penpot-spatial.js';
import { Product2BackendGeneration } from './product2-backend-generation.js';
import { VercelSupabaseTemplates } from '../vercel-supabase-templates.js';
import { PenpotBridge } from '../penpot-bridge.js';
import type { FullstackGeneratorConfig, GeneratedProject, VercelSupabaseConfig } from '../types.js';

export class Product3PenpotFullstack {
  private product1: Product1PenpotSpatial;
  private product2: Product2BackendGeneration;
  private vercelSupabase: VercelSupabaseTemplates;

  constructor(private config: FullstackGeneratorConfig) {
    this.product1 = new Product1PenpotSpatial({ 
      penpot: config.penpot!, 
      debug: config.debug 
    });
    this.product2 = new Product2BackendGeneration(config);
    
    const vercelSupabaseConfig: VercelSupabaseConfig = {
      projectName: config.projectName,
      supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
      enableAuth: true,
      enableStorage: true,
      enableEdgeFunctions: false,
      vercel: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        installCommand: 'npm install',
        environmentVariables: {}
      }
    };
    
    this.vercelSupabase = new VercelSupabaseTemplates(vercelSupabaseConfig);
  }

  /**
   * Generate complete full-stack application from Penpot file
   */
  async generateFromPenpotFile(fileId: string): Promise<GeneratedProject> {
    if (!this.config.penpot) {
      throw new Error('Penpot configuration required');
    }

    const bridge = new PenpotBridge(this.config.penpot);
    
    // Step 1: Convert Penpot to spatial elements
    const spatialElements = await bridge.convertToSpatialElements(fileId);
    
    if (this.config.debug) {
      console.log(`🔄 Converted ${spatialElements.length} Penpot objects to spatial elements`);
    }

    // Step 2: Generate spatial components (Product 1)
    const spatialProject = await this.product1.generateFromPenpotFile(fileId);
    
    // Step 3: Generate backend (Product 2)
    const backendProject = await this.product2.generateFromElements(spatialElements);
    
    // Step 4: Generate Vercel/Supabase hosting files
    const hostingFiles = this.generateHostingFiles(backendProject.models);
    
    // Step 5: Generate Next.js integration files
    const integrationFiles = this.generateIntegrationFiles(spatialElements);

    // Combine all files
    const allFiles = [
      ...spatialProject.files,
      ...backendProject.files,
      ...hostingFiles,
      ...integrationFiles
    ];

    // Add deployment files
    const deploymentFiles = [
      {
        path: 'vercel.json',
        content: JSON.stringify(this.vercelSupabase.generateVercelJson(), null, 2)
      },
      {
        path: '.env.example',
        content: this.vercelSupabase.generateEnvTemplate()
      },
      {
        path: 'deploy.sh',
        content: this.vercelSupabase.generateDeploymentScript()
      },
      {
        path: 'supabase/migrations/001_initial.sql',
        content: this.vercelSupabase.generateSupabaseMigrations(backendProject.models)
      }
    ];

    if (this.config.debug) {
      console.log(`✅ Product 3: Generated full-stack app with ${allFiles.length} files`);
      console.log(`🗄️  Models: ${backendProject.models.length}`);
      console.log(`🌐 Endpoints: ${backendProject.endpoints.length}`);
      console.log(`🚀 Deployment: Vercel + Supabase`);
    }

    return {
      files: allFiles,
      models: backendProject.models,
      endpoints: backendProject.endpoints,
      config: this.config,
      deploymentFiles
    };
  }

  private generateHostingFiles(models: any[]) {
    const files = [];

    // Generate API routes for Vercel
    const apiRoutes = this.vercelSupabase.generateApiRoutes(models);
    files.push(...apiRoutes.map(route => ({
      path: route.path,
      content: route.content
    })));

    // Generate Supabase client configuration
    files.push({
      path: 'lib/supabase.js',
      content: this.vercelSupabase.generateSupabaseConfig()
    });

    // Generate package.json for Next.js + Supabase
    files.push({
      path: 'package.json',
      content: JSON.stringify(this.vercelSupabase.generatePackageJson(this.config.projectName), null, 2)
    });

    return files;
  }

  private generateIntegrationFiles(spatialElements: SpatialElement[]) {
    const files = [];

    // Generate Next.js pages
    files.push({
      path: 'pages/index.js',
      content: this.generateNextJsHomePage()
    });

    files.push({
      path: 'pages/_app.js',
      content: this.generateNextJsApp()
    });

    // Generate spatial integration
    files.push({
      path: 'components/SpatialCanvas.tsx',
      content: this.generateSpatialCanvas(spatialElements)
    });

    // Generate data hooks
    files.push({
      path: 'hooks/useSupabaseData.ts',
      content: this.generateDataHooks()
    });

    return files;
  }

  private generateNextJsHomePage(): string {
    return `import React from 'react';
import Head from 'next/head';
import SpatialCanvas from '../components/SpatialCanvas';

export default function Home() {
  return (
    <div>
      <Head>
        <title>${this.config.projectName}</title>
        <meta name="description" content="Generated by FIR from Penpot design" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
        <SpatialCanvas />
      </main>
    </div>
  );
}`;
  }

  private generateNextJsApp(): string {
    return `import React from 'react';
import '../styles/globals.css';
import { SpatialRuntimeProvider } from '@fir/spatial-runtime';

function MyApp({ Component, pageProps }) {
  return (
    <SpatialRuntimeProvider>
      <Component {...pageProps} />
    </SpatialRuntimeProvider>
  );
}

export default MyApp;`;
  }

  private generateSpatialCanvas(spatialElements: SpatialElement[]): string {
    const elementTypes = [...new Set(spatialElements.map(el => el.type))];
    
    return `import React, { useEffect, useState } from 'react';
import { SpatialRuntime, SpatialElement } from '@fir/spatial-runtime';
import { useSupabaseData } from '../hooks/useSupabaseData';
${elementTypes.map(type => `import { ${this.toPascalCase(type)} } from './${this.toPascalCase(type)}';`).join('\n')}

const SpatialCanvas = () => {
  const { data, loading, error } = useSupabaseData();
  
  if (loading) return <div>Loading spatial data...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;

  return (
    <SpatialRuntime
      initialViewState={{ 
        zoom: 1, 
        target: [0, 0] 
      }}
      semanticLevels={['universal', 'system', 'standard', 'atomic']}
    >
      <div className="spatial-canvas" style={{ width: '100%', height: '100%' }}>
        {data.map((item, index) => {
          const position = { x: index * 350, y: Math.floor(index / 3) * 450 };
          const bounds = { width: 300, height: 400 };
          
          // Render appropriate component based on data type
          ${elementTypes.map(type => `
          if (item.type === '${type}') {
            return (
              <${this.toPascalCase(type)}
                key={item.id}
                {...item}
                position={position}
                bounds={bounds}
              />
            );
          }`).join('')}
          
          return null;
        })}
      </div>
    </SpatialRuntime>
  );
};

export default SpatialCanvas;`;
  }

  private generateDataHooks(): string {
    return `import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch data from all tables
      const promises = [];
      
      // Add your table queries here
      // Example: promises.push(supabase.from('products').select('*'));
      
      const results = await Promise.all(promises);
      const combinedData = results.flatMap(result => result.data || []);
      
      setData(combinedData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchData };
}`;
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}