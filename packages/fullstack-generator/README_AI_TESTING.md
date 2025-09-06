# Testing AI Integration

## 🧠 AI-Powered Backend Generation

The fullstack-generator supports AI-powered analysis using OpenAI's GPT-4 to intelligently detect entities, relationships, and generate contextual backends from spatial designs.

## 🔑 Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Click "Create new secret key" 
4. Copy the key (starts with `sk-proj-...`)
5. **Important**: Add billing information to your OpenAI account (required for API usage)

## ⚡ Quick Test

```bash
# 1. Set your API key
export OPENAI_API_KEY="sk-proj-your-key-here"

# 2. Run the AI test
cd packages/fullstack-generator
npx tsx src/test-with-ai.ts
```

## 🔄 AI vs Rule-Based Comparison

| Feature | Rule-Based | AI-Powered |
|---------|------------|------------|
| **Entity Detection** | Pattern matching | Context-aware analysis |
| **Field Types** | Basic inference | Smart type detection |
| **Relationships** | Spatial proximity | Semantic understanding |
| **Seed Data** | Random generation | Contextual, realistic data |
| **API Design** | CRUD templates | Domain-aware endpoints |

## 📊 Expected AI Improvements

With AI enabled, you should see:

### Better Entity Models
```typescript
// Rule-based: Generic fields
Product_item: id, position, created_at, title, price

// AI-powered: Rich, contextual fields  
Product: id, name, price, description, category, brand, 
         inventory_count, sku, weight, dimensions, rating
```

### Smarter Relationships
```typescript
// Rule-based: Spatial proximity
Product -> User (nearby elements)

// AI-powered: Semantic understanding
User -> Order -> OrderItem -> Product
Category -> Product -> Review
```

### Realistic Seed Data
```json
// Rule-based
{"title": "title_1", "price": 123}

// AI-powered  
{"name": "MacBook Pro 14-inch", "price": 1999.00, "category": "Electronics"}
```

## 🧪 Testing Different Design Patterns

Try these semantic patterns in your spatial elements:

```typescript
// E-commerce pattern
semanticData: {
  atomic: {
    title: "iPhone 15 Pro",
    price: 999.99,
    category: "Smartphones",
    inStock: true
  }
}

// Social media pattern  
semanticData: {
  atomic: {
    author: "John Doe", 
    content: "Great product!",
    likes: 42,
    timestamp: "2024-01-20"
  }
}

// Dashboard pattern
semanticData: {
  atomic: {
    metric: "Revenue",
    value: 125000,
    change: "+12%",
    period: "Q1 2024"
  }
}
```

## 🐛 Troubleshooting

### "Missing API Key" Error
- Set `OPENAI_API_KEY` environment variable
- Or pass it in config: `openaiApiKey: "your-key"`

### "Insufficient Quota" Error  
- Add billing info to your OpenAI account
- API calls cost ~$0.01-0.10 per generation

### "Rate Limit" Error
- Wait a moment and try again
- OpenAI has rate limits for API usage

### AI Analysis Takes Long Time
- Normal for complex designs (30-60 seconds)
- AI processes all patterns in parallel
- Rule-based fallback is instant

## 💡 Pro Tips

1. **Rich Semantic Data**: More detailed `semanticData` = better AI analysis
2. **Consistent Patterns**: Repeating elements help AI detect entities
3. **Realistic Content**: Use real product names, prices, etc. in mock data
4. **Debug Mode**: Enable `debug: true` to see AI reasoning
5. **Fallback**: System gracefully falls back to rules if AI fails

## 🚀 Production Usage

```typescript
const generator = new FullstackGenerator({
  projectName: 'my-app',
  database: 'postgresql',
  apiFramework: 'express', 
  deployment: 'vercel',
  openaiApiKey: process.env.OPENAI_API_KEY, // Enable AI
  debug: false // Disable in production
});
```

The AI integration makes the fullstack-generator the "crown jewel" that powers intelligent backend generation for all FIR products!