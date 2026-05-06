# NutriSnap - Quick Start Guide

## 1-Minute Setup (After cloning)

### Step 1: Get Free API Keys

1. **Hugging Face** (AI Detection)
   - Go to https://huggingface.co/settings/tokens
   - Create a free token

2. **USDA** (Nutrition Data)
   - Go to https://fdc.nal.usda.gov/api-key-signup.html
   - Get your free API key

### Step 2: Create Cloudflare Resources

```bash
cd worker

# Create D1 database
npx wrangler d1 create nutrisnap-db
# Copy the database_id into wrangler.toml

# Create R2 bucket
npx wrangler r2 bucket create nutrisnap-images

# Set secrets
npx wrangler secret put HUGGINGFACE_API_KEY
npx wrangler secret put USDA_API_KEY
npx wrangler secret put JWT_SECRET
```

### Step 3: Apply Database Schema

```bash
npx wrangler d1 execute nutrisnap-db --file=../database/schema.sql
```

### Step 4: Deploy

```bash
# Deploy worker
cd worker && npm install && npx wrangler deploy

# Build & deploy frontend
cd ../frontend
npm install
NEXT_PUBLIC_WORKER_URL=https://your-worker-url npm run pages:build
npx wrangler pages deploy .vercel/output/static
```

## Architecture Overview

```
User → Cloudflare Pages (Next.js) → Cloudflare Worker → Hugging Face / USDA
                                          ↓
                                    Cloudflare D1 (SQLite)
                                    Cloudflare R2 (Images)
```

## Key Features

| Feature | Implementation |
|---------|---------------|
| AI Food Detection | Hugging Face Inference API (nateraw/food model) |
| Nutrition Data | USDA FoodData Central + Open Food Facts |
| Indian Food | Built-in database with 50+ dishes |
| Auth | JWT tokens (jose library) |
| Storage | Cloudflare R2 (images) |
| Database | Cloudflare D1 (SQLite) |
| Offline | Service Worker + IndexedDB |

## File Structure

```
calorie-tracker/
├── frontend/          # Next.js 14 + Tailwind CSS
│   ├── app/           # Pages (/, /scan, /log, /profile, /login)
│   ├── components/    # UI components
│   ├── lib/           # API client, auth, offline utils
│   └── public/        # PWA manifest, service worker
├── worker/            # Cloudflare Worker API
│   ├── src/routes/    # API endpoints
│   └── wrangler.toml  # Config
└── database/
    └── schema.sql     # D1 schema
```

## API Routes

All routes require `Authorization: Bearer <token>` except `/api/auth/*`.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/upload` | POST | Upload food image |
| `/api/detect` | POST | AI food detection |
| `/api/nutrition` | POST | Get nutrition data |
| `/api/log` | POST | Log a meal |
| `/api/dashboard` | GET | Today's summary |
| `/api/history` | GET | Meal history |
| `/api/weight` | POST/GET | Weight tracking |
| `/api/water` | POST/GET | Water tracking |
| `/api/profile` | GET/PUT | User profile |

## Free Tier Limits

All services used have generous free tiers:
- Cloudflare Pages: Unlimited requests
- Cloudflare Workers: 100k/day
- Cloudflare D1: 5GB storage
- Cloudflare R2: 10GB/month
- Hugging Face: Rate limited but free
- USDA API: 1,000/hour

## Troubleshooting

**AI detection fails?**
- Hugging Face models load on first request (cold start)
- App has manual entry fallback built-in

**Images not loading?**
- Check R2 bucket public access settings
- Verify Worker has R2 binding

**CORS errors?**
- Worker CORS is set to `*` for development
- Update to your domain for production
