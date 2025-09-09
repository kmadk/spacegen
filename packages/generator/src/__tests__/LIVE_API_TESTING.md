# Live API Integration Testing

This directory contains real integration tests that make actual API calls to live services. These tests are designed to validate that our system actually works with real APIs, not just mocks.

## 🚨 **Important Warnings**

- **These tests consume real API credits/usage**
- **These tests may create real resources** (Supabase projects, Vercel deployments)
- **Always clean up resources manually** if tests fail
- **Do not run these tests in CI/CD** without careful consideration of costs

## 🔧 **Setup Requirements**

### OpenAI API Testing

1. Get an OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Make sure you have credits in your OpenAI account
3. Set environment variable: `OPEN_AI_API_KEY=your_key_here`

**Estimated Costs per Test Run:**

- Text analysis: ~$0.05-0.10
- Vision analysis: ~$0.10-0.20
- Full workflow: ~$0.15-0.30

### Vercel API Testing

1. Create a Vercel account at [https://vercel.com](https://vercel.com)
2. Get an access token from [https://vercel.com/account/tokens](https://vercel.com/account/tokens)
3. Set environment variable: `VERCEL_TOKEN=your_token_here`
4. Optional: If using teams, set `VERCEL_TEAM_ID=team_xxx`

**What it Creates:**

- Test HTML deployments (automatically deleted)
- Environment variables in existing projects
- **No charges** for most operations (free tier sufficient)

### Supabase API Testing

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Get an access token from [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
3. Get your organization ID from the Supabase dashboard
4. Set environment variables:
   ```bash
   SUPABASE_ACCESS_TOKEN=your_token_here
   SUPABASE_ORG_ID=your_org_id
   ```

**⚠️ WARNING:**

- **Creates real Supabase projects** that count toward your quota
- **Free tier has project limits** (2 projects max)
- **Projects are automatically cleaned up** but may fail if tests crash
- **Manually delete test projects** if cleanup fails

### Locofy End-to-End Integration Testing

**This is the MAIN workflow** - Full Figma → Supabase → Vercel deployment pipeline

1. Requires **both** Vercel and Supabase tokens (see above)
2. Set environment variables:
   ```bash
   OPEN_AI_API_KEY=your_openai_key
   VERCEL_TOKEN=your_vercel_token
   SUPABASE_ACCESS_TOKEN=your_supabase_token
   SUPABASE_ORG_ID=your_org_id
   ```

**⚠️ MOST EXPENSIVE:**

- **Creates real Supabase project** (~2-3 minutes, counts toward quota)
- **Deploys live Vercel application** with custom domain
- **Makes OpenAI API calls** for backend generation
- **Total estimated cost: $0.20-0.50 per test run**

## 🚀 **Running Live Tests**

### Run All Mock Tests (Safe, No Costs)

```bash
pnpm test:run
```

### Run Specific Live API Tests

#### OpenAI API Only

```bash
OPEN_AI_API_KEY=your_key pnpm test:run src/__tests__/integration/openai-live-api.test.ts
```

#### Vercel API Only

```bash
VERCEL_TOKEN=your_token pnpm test:run src/__tests__/deployment/vercel-adapter.live.test.ts
```

#### Supabase API Only

```bash
SUPABASE_ACCESS_TOKEN=your_token SUPABASE_ORG_ID=your_org pnpm test:run src/__tests__/deployment/supabase-adapter.live.test.ts
```

#### Locofy End-to-End Workflow (THE BIG ONE!)

```bash
OPEN_AI_API_KEY=your_key \
VERCEL_TOKEN=your_vercel_token \
SUPABASE_ACCESS_TOKEN=your_supabase_token \
SUPABASE_ORG_ID=your_org \
pnpm test:run src/__tests__/integration/locofy-e2e.live.test.ts
```

#### All Live Tests (Most Expensive!)

```bash
OPEN_AI_API_KEY=your_key \
VERCEL_TOKEN=your_vercel_token \
SUPABASE_ACCESS_TOKEN=your_supabase_token \
SUPABASE_ORG_ID=your_org \
pnpm test:run --testNamePattern="Live"
```

## 📊 **What These Tests Validate**

### OpenAI Live API Tests (`openai-live-api.test.ts`)

- ✅ Real GPT-4/GPT-5 API calls work
- ✅ Text analysis produces meaningful entities
- ✅ Vision analysis processes screenshots correctly
- ✅ Cost-optimized batch analysis functions
- ✅ Combined text+vision analysis works
- ✅ End-to-end backend generation with real AI
- ✅ Performance is within acceptable limits
- ✅ API costs are optimized (4 calls → 1 call)

### Vercel Live API Tests (`vercel-adapter.live.test.ts`)

- ✅ Authentication and user info retrieval
- ✅ Project listing and details
- ✅ Real HTML deployment creation
- ✅ Deployment status monitoring
- ✅ Environment variable management
- ✅ Error handling for invalid requests
- ✅ Performance within reasonable limits

### Supabase Live API Tests (`supabase-adapter.live.test.ts`)

- ✅ Authentication and project listing
- ✅ Real Supabase project creation (slow, ~2-3 minutes)
- ✅ Database schema creation and SQL execution
- ✅ Migration running and verification
- ✅ Secrets management (environment variables)
- ✅ Project cleanup and deletion
- ✅ Error handling and edge cases

## 🧹 **Cleanup & Safety**

### Automatic Cleanup

Tests are designed to clean up after themselves:

- Vercel deployments: Tracked and cleaned up
- Supabase projects: Automatically deleted in `afterAll`
- OpenAI: No cleanup needed (just API calls)

### Manual Cleanup

If tests fail, you may need to manually delete:

**Vercel:**

```bash
# List deployments
vercel ls

# Delete specific deployment
vercel rm deployment_url
```

**Supabase:**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Find test projects (usually named `fir-test-TIMESTAMP`)
3. Delete them manually

### Cost Monitoring

- Monitor your OpenAI usage: [https://platform.openai.com/usage](https://platform.openai.com/usage)
- Monitor Vercel usage: [https://vercel.com/dashboard/usage](https://vercel.com/dashboard/usage)
- Monitor Supabase usage: [https://supabase.com/dashboard/org/billing](https://supabase.com/dashboard/org/billing)

## 🔄 **Integration with CI/CD**

### GitHub Actions Example

```yaml
name: Live API Tests
on:
  workflow_dispatch: # Manual trigger only

jobs:
  live-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch' # Only manual
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - name: Run OpenAI Live Tests
        env:
          OPEN_AI_API_KEY: ${{ secrets.OPEN_AI_API_KEY }}
        run: pnpm test:run src/__tests__/integration/openai-live-api.test.ts
      # Add other services as needed
```

**⚠️ Never run live tests on every commit!** Only use:

- Manual workflow dispatch
- Nightly scheduled runs
- Pre-release validation

## 📈 **Expected Results**

### Successful Test Run Output

```
✅ OpenAI Live API Integration
  👁️ Vision analysis completed in 3247ms
  🤖 Real AI analysis completed in 2156ms
  💰 API call completed in 1823ms

✅ Vercel Live API Integration
  🔗 Connected to Vercel API for live testing
  📁 Sample project: my-app (proj_abc123)
  🚀 Deployment ready: https://fir-test-xyz.vercel.app

✅ Supabase Live API Integration
  📁 Found 1 existing Supabase projects
  🚀 Project created: fir-test-1699123456789
  ⚡ Project listing completed in 2341ms
```

### Failure Indicators

- API authentication errors → Check tokens
- Rate limiting → Wait and retry
- Project creation failures → Check quotas
- Timeout errors → Increase test timeouts

## 💡 **Tips & Best Practices**

1. **Start Small:** Test one API at a time
2. **Monitor Costs:** Check usage after each test run
3. **Use Free Tiers:** Most tests work within free tier limits
4. **Clean Up Regularly:** Don't let test resources accumulate
5. **Set Timeouts:** Some operations (Supabase project creation) are very slow
6. **Handle Failures:** Tests include comprehensive error handling
7. **Document Costs:** Track how much each test run costs

## 🚨 **Troubleshooting**

### Common Issues

**OpenAI API Errors:**

```
Error: 401 Unauthorized
→ Check OPEN_AI_API_KEY is valid and has credits
```

**Vercel Rate Limiting:**

```
Error: 429 Too Many Requests
→ Wait 60 seconds and retry
```

**Supabase Project Creation Timeout:**

```
Error: Timeout after 60000ms
→ Increase timeout, project creation can take 3+ minutes
```

**Free Tier Limits:**

- Supabase: 2 projects max on free tier
- Vercel: Rate limited but no hard limits for basic operations
- OpenAI: Depends on your credit balance

---

## 🎯 **Summary**

These live API tests prove that our FIR system actually works with real services, not just mocks. They validate the complete integration chain:

**Design → AI Analysis → Backend Generation → Deployment**

Run them carefully, monitor costs, and use the results to confidently deploy FIR in production! 🚀
