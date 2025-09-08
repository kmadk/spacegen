#!/usr/bin/env node

/**
 * Figma Backend Generator CLI
 * Simple command-line interface for Figma → Backend generation
 */

import { BackendGenerator } from './backend-generator.js';
import { LocofyMVPIntegration } from './integrations/locofy-mvp.js';

interface CLIArgs {
  figmaFile?: string;
  projectName?: string;
  openaiKey?: string;
  figmaToken?: string;
  deploy?: boolean;
  debug?: boolean;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--figma-file':
      case '-f':
        args.figmaFile = next;
        i++;
        break;
      case '--project-name':
      case '-n':
        args.projectName = next;
        i++;
        break;
      case '--openai-key':
      case '-o':
        args.openaiKey = next;
        i++;
        break;
      case '--figma-token':
      case '-t':
        args.figmaToken = next;
        i++;
        break;
      case '--deploy':
      case '-d':
        args.deploy = true;
        break;
      case '--debug':
        args.debug = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function showHelp() {
  console.log(`
🎨 FIR Backend Generator CLI

USAGE:
  figma-backend --figma-file ABC123 --project-name my-app --openai-key sk-... --figma-token figd_...

OPTIONS:
  -f, --figma-file     Figma file ID (e.g., ABC123)
  -n, --project-name   Your project name
  -o, --openai-key     OpenAI API key (sk-...)
  -t, --figma-token    Figma access token (figd_...)
  -d, --deploy         Enable auto-deployment
      --debug          Enable debug logging
  -h, --help          Show this help

EXAMPLES:
  # Figma → Backend
  figma-backend -f ABC123 -n "my-ecommerce-app" -o sk-... -t figd_...

  # Figma → Backend → Deploy
  figma-backend -f ABC123 -n "my-app" -o sk-... -t figd_... --deploy

ENVIRONMENT VARIABLES:
  OPEN_AI_API_KEY     OpenAI API key
  FIGMA_ACCESS_TOKEN  Figma access token

Get API keys:
  • OpenAI: https://platform.openai.com/api-keys
  • Figma:  https://www.figma.com/settings → Personal Access Tokens
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Get API keys from args or environment
  const openaiKey = args.openaiKey || process.env.OPEN_AI_API_KEY;
  const figmaToken = args.figmaToken || process.env.FIGMA_ACCESS_TOKEN;

  if (!openaiKey) {
    console.error('❌ Error: OpenAI API key required. Use --openai-key or set OPEN_AI_API_KEY environment variable.');
    process.exit(1);
  }

  if (!args.projectName) {
    console.error('❌ Error: Project name required. Use --project-name');
    process.exit(1);
  }

  try {
    if (args.figmaFile) {
      // FIGMA PATHWAY (Optimized)
      console.log('🎨 Using Figma pathway (optimized for performance)');
      
      if (!figmaToken) {
        console.error('❌ Error: Figma access token required for Figma files. Use --figma-token or set FIGMA_ACCESS_TOKEN environment variable.');
        process.exit(1);
      }

      if (args.deploy) {
        // MVP Integration with deployment
        const mvp = new LocofyMVPIntegration({
          projectName: args.projectName,
          openaiApiKey: openaiKey,
          figmaAccessToken: figmaToken,
          enableAutoDeployment: true,
          debug: args.debug || false
        });

        console.log(`🚀 Generating and deploying backend from Figma file: ${args.figmaFile}`);
        const result = await mvp.generateAndDeploy(args.figmaFile, {
          deployImmediately: true
        });

        console.log('✅ Generation completed!');
        console.log(`📊 Models: ${result.backendProject.models.length}`);
        console.log(`🔗 Endpoints: ${result.backendProject.endpoints.length}`);
        console.log(`⚡ Generation time: ${result.performance.generationTime}ms`);
        
        if (result.deployment) {
          console.log(`🌐 Live app: ${result.deployment.deploymentUrl}`);
          console.log(`🔗 API: ${result.deployment.backendUrl}`);
          console.log(`🗄️ Database: ${result.deployment.databaseUrl}`);
        }
      } else {
        // Standard backend generation
        const generator = new BackendGenerator({
          projectName: args.projectName,
          openaiApiKey: openaiKey,
          figmaAccessToken: figmaToken,
          debug: args.debug || false
        });

        console.log(`🎯 Generating backend from Figma file: ${args.figmaFile}`);
        const result = await generator.generateFromFigmaFile(args.figmaFile);

        console.log('✅ Backend generated successfully!');
        console.log(`📊 Generated ${result.models.length} models, ${result.endpoints.length} endpoints`);
        console.log(`📁 Created ${result.files.length} files`);
        
        // Write files to disk
        for (const file of result.files) {
          console.log(`📄 ${file.path}`);
        }
      }

    } else {
      console.error('❌ Error: Missing required --figma-file option');
      console.log('Use --help for usage information');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Generation failed:', error instanceof Error ? error.message : 'Unknown error');
    if (args.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}