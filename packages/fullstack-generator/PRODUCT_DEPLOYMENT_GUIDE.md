# FIR Product Deployment Guide

## Product Overview

### **Product 1**: Figma → Working Backend
- **Default**: Code generation only
- **Optional**: Backend-only deployment (Supabase database + API)

### **Product 2**: Penpot/Figma → Working Backend  
- **Default**: Code generation only
- **Optional**: Backend-only deployment (Supabase database + API)

### **Product 3**: Penpot → Working Backend + Auto-Deployment
- **Main feature**: Full deployment (Vercel frontend + Supabase backend)
- **Fallback**: Code generation available

### **Product 4**: Figma → Locofy → Full-Stack + Hosting
- **Main feature**: Full deployment (Vercel frontend + Supabase backend + Locofy integration)

## Usage Examples

### Product 2: Backend-Only Deployment (Optional)

```typescript
const generator = new FullstackGenerator({
  projectName: 'my-penpot-app',
  deployment: 'vercel-supabase'
});

// Option 1: Code generation only (default)
const project = await generator.generateFromPenpotFile(penpotFile);
// Returns: Generated files for manual deployment

// Option 2: Deploy just the backend (optional)
generator.enableAutoDeployment({
  supabase: { accessToken: process.env.SUPABASE_TOKEN }
});

const result = await generator.deployBackendOnly(penpotFile, {
  projectName: 'my-backend',
  enableAuth: true,
  enableStorage: false
});

// Returns: 
// {
//   success: true,
//   appUrl: 'https://abc123.supabase.co/rest/v1', // API endpoint
//   databaseUrl: 'https://abc123.supabase.co',
//   dashboardUrl: 'https://supabase.com/dashboard/project/abc123'
// }
```

### Product 3: Full Deployment

```typescript
// Full deployment with frontend + backend
const result = await generator.deployPenpotToLive(penpotFile, {
  projectName: 'my-app',
  domain: 'myapp.com',
  enableAuth: true,
  enableStorage: true
});

// Returns:
// {
//   success: true,
//   appUrl: 'https://myapp.vercel.app', // Live frontend
//   databaseUrl: 'https://abc123.supabase.co',
//   dashboardUrl: 'https://supabase.com/dashboard/project/abc123'
// }
```

### Product 4: Locofy + Full Deployment

```typescript
// Locofy integration with full hosting
const result = await generator.deployLocofyToLive(figmaExtraction, {
  projectName: 'my-locofy-app',
  locofyProjectPath: './locofy-frontend',
  domain: 'mylocofyapp.com'
});

// Returns: Live app with Locofy frontend + FIR backend
```

## Deployment Credentials

### Backend-Only (Products 1 & 2)
```typescript
generator.enableAutoDeployment({
  supabase: { 
    accessToken: 'your-supabase-token',
    organizationId: 'optional-org-id' 
  }
});
```

### Full Deployment (Products 3 & 4)
```typescript
generator.enableAutoDeployment({
  vercel: { 
    token: 'your-vercel-token',
    teamId: 'optional-team-id' 
  },
  supabase: { 
    accessToken: 'your-supabase-token',
    organizationId: 'optional-org-id' 
  }
});
```

## What Gets Created

### Backend-Only Deployment (Products 1 & 2 Optional)
- ✅ Supabase database with PostGIS
- ✅ Auto-generated tables and relationships
- ✅ REST API endpoints (`/rest/v1/table_name`)
- ✅ Row Level Security policies
- ✅ Optional: Authentication setup
- ✅ Optional: File storage buckets
- ❌ No frontend hosting

### Full Deployment (Products 3 & 4)
- ✅ Everything from backend-only, plus:
- ✅ Vercel frontend hosting
- ✅ Custom domain configuration
- ✅ Environment variables setup
- ✅ SSL certificates
- ✅ CDN and edge functions

## API Access After Deployment

### Backend-Only Deployment
Your API will be available at:
- **Base URL**: `https://your-project.supabase.co/rest/v1/`
- **Authentication**: `Authorization: Bearer your-anon-key`
- **Example**: `GET https://your-project.supabase.co/rest/v1/items`

### Full Deployment  
Your app will be available at:
- **Frontend**: `https://your-app.vercel.app`
- **API**: Accessible from frontend via environment variables
- **Dashboard**: `https://supabase.com/dashboard/project/your-project`

## Cost Considerations

### Backend-Only (Supabase Free Tier)
- ✅ 2 projects
- ✅ 500MB database
- ✅ 5GB bandwidth
- ✅ 50,000 monthly active users
- **Cost**: Free

### Full Deployment (Vercel + Supabase Free Tiers)
- ✅ Vercel: 100GB bandwidth, unlimited deployments
- ✅ Supabase: Same as above
- **Cost**: Free for most apps

Perfect for prototyping and small-scale production apps!