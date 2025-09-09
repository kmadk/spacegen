# Examples

This directory contains example usage of the Figma Backend Generator.

## Basic Usage

```bash
# 1. Set up your environment variables
export OPEN_AI_API_KEY=sk-...
export FIGMA_ACCESS_TOKEN=figd_...

# 2. Generate backend from your Figma file
figma-backend --figma-file YOUR_FIGMA_FILE_ID --project-name "my-ecommerce-app"
```

## Getting Your Figma File ID

1. Open your Figma file in the browser
2. Copy the file ID from the URL: `https://www.figma.com/file/YOUR_FILE_ID_HERE/filename`
3. Use that ID in the command above

## Example Commands

```bash
# E-commerce app
figma-backend --figma-file ABC123 --project-name "my-store" --openai-key sk-... --figma-token figd_...

# Social media dashboard
figma-backend --figma-file DEF456 --project-name "social-app" --openai-key sk-... --figma-token figd_...

# With deployment
figma-backend --figma-file ABC123 --project-name "my-app" --openai-key sk-... --figma-token figd_... --deploy
```

## What You'll Get

After running the command, you'll get a generated project with:

```
my-app/
├── database/
│   ├── schema.sql          # PostgreSQL schema
│   ├── migrations/         # Database migrations
│   └── seed-data.json      # Realistic test data
├── api/
│   ├── users.ts           # CRUD endpoints
│   ├── products.ts        # CRUD endpoints
│   └── types.ts           # TypeScript types
├── package.json           # Dependencies
└── vercel.json           # Deployment config
```

## Design Tips

For best results with AI analysis, design your Figma file with:

- **Repeated card components** (becomes database tables)
- **Form fields with labels** (becomes table columns)
- **Hierarchical content** (becomes relationships)
- **Navigation elements** (becomes API endpoints)

## Troubleshooting

- **"OpenAI API key required"**: Set your OpenAI API key with `--openai-key` or `OPEN_AI_API_KEY` env var
- **"Figma access token required"**: Set your Figma token with `--figma-token` or `FIGMA_ACCESS_TOKEN` env var
- **"Failed to fetch file"**: Check that your Figma file ID is correct and your token has access
- **"Analysis failed"**: Try with `--debug` flag for detailed error information
