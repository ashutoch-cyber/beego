# NutriSnap - AI Calorie Tracker

A full-stack AI-powered calorie tracking app built entirely on the **free Cloudflare stack**.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│ Cloudflare Worker│────▶│   Hugging Face  │
│  (Cloudflare    │     │   (API + Auth)   │     │  Inference API  │
│    Pages)       │◄────│                  │◄────│   (Free Tier)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │    │
                               ▼    ▼
                        ┌────────┐ ┌────────┐
                        │  D1    │ │   R2   │
                        │(SQLite)│ │(Images)│
                        └────────┘ └────────┘
```

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 14 + Tailwind CSS | Free (Cloudflare Pages) |
| Backend | Cloudflare Workers + Hono | Free (100k req/day) |
| Database | Cloudflare D1 (SQLite) | Free (5GB) |
| Storage | Cloudflare R2 | Free (10GB/mo) |
| AI | Hugging Face Inference API | Free (rate limited) |
| Nutrition | USDA FoodData Central | Free |
| Auth | JWT (jose library) | Free |

## Features

- **AI Food Detection** - Upload a photo, AI identifies the food
- **Nutrition Lookup** - Automatic calorie/macro fetching from USDA + Open Food Facts
- **Meal Logging** - Track breakfast, lunch, dinner, snacks
- **Dashboard** - Daily calorie ring, macro breakdown, water tracker
- **Weight Tracker** - Log and view weight history
- **Smart Correction** - Edit AI detections manually
- **Indian Food Support** - Built-in database for common Indian dishes
- **Offline Mode** - Service worker caches last logs
- **PWA** - Installable on mobile with manifest

## Project Structure

```
calorie-tracker/
├── frontend/          # Next.js app (deployed to Cloudflare Pages)
│   ├── app/           # App router pages
│   ├── components/    # Reusable components
│   ├── lib/           # API client, auth, utils
│   └── public/        # Static assets
├── worker/            # Cloudflare Worker (API)
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   └── utils/     # Auth, helpers
│   └── wrangler.toml
└── database/
    └── schema.sql     # D1 database schema
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Cloudflare account (free)
- Hugging Face account (free) - get API token at huggingface.co/settings/tokens
- USDA API key (free) - get at https://fdc.nal.usda.gov/api-key-signup.html

### 2. Clone and Install

```bash
git clone <repo-url>
cd calorie-tracker

# Install frontend dependencies
cd frontend
npm install

# Install worker dependencies
cd ../worker
npm install
```

### 3. Set up Cloudflare D1 Database

```bash
cd worker

# Create database
npx wrangler d1 create nutrisnap-db

# Note the database_id from output, update wrangler.toml

# Apply schema
npx wrangler d1 execute nutrisnap-db --file=../database/schema.sql
```

### 4. Set up Cloudflare R2 Bucket

```bash
# Create bucket
npx wrangler r2 bucket create nutrisnap-images

# Make it public (optional - for direct image access)
# Or use Worker to serve images
```

### 5. Configure Secrets

```bash
cd worker

# Set secrets (never commit these!)
npx wrangler secret put HUGGINGFACE_API_KEY
# Enter your Hugging Face token

npx wrangler secret put USDA_API_KEY
# Enter your USDA API key

npx wrangler secret put JWT_SECRET
# Enter a random 32+ character string
```

### 6. Update wrangler.toml

Edit `worker/wrangler.toml`:
```toml
name = "nutrisnap-api"
main = "src/index.ts"
compatibility_date = "2024-07-01"

[[d1_databases]]
binding = "DB"
database_name = "nutrisnap-db"
database_id = "YOUR_DATABASE_ID_HERE"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "nutrisnap-images"
```

### 7. Deploy Worker

```bash
cd worker
npm run deploy
```

Note the Worker URL (e.g., `https://nutrisnap-api.your-account.workers.dev`)

### 8. Configure Frontend

Edit `frontend/.env.local`:
```
NEXT_PUBLIC_WORKER_URL=https://nutrisnap-api.your-account.workers.dev
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret-here
```

### 9. Build and Deploy Frontend

```bash
cd frontend
npm run pages:build
npx wrangler pages deploy .vercel/output/static
```

### 10. Set up Custom Domain (Optional)

1. In Cloudflare Pages dashboard, go to your project
2. Click "Custom domains" 
3. Add your domain
4. Update `NEXT_PUBLIC_WORKER_URL` if using custom domain for API

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/upload | Upload image to R2 |
| POST | /api/detect | AI food detection |
| POST | /api/nutrition | Get nutrition data |
| POST | /api/log | Log a meal |
| DELETE | /api/log/:id | Delete meal |
| GET | /api/dashboard | Get dashboard data |
| GET | /api/history?date=YYYY-MM-DD | Get meal history |
| POST | /api/weight | Log weight |
| GET | /api/weight | Get weight history |
| POST | /api/water | Log water |
| GET | /api/water | Get water intake |
| GET | /api/profile | Get profile |
| PUT | /api/profile | Update goals |

## Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Cloudflare Pages | Unlimited requests, 500 builds/mo |
| Cloudflare Workers | 100,000 requests/day |
| Cloudflare D1 | 5GB storage, 100k queries/day |
| Cloudflare R2 | 10GB storage, 1M ops/mo |
| Hugging Face Inference | Rate limited (no hard limit) |
| USDA API | 1,000 requests/hour |

## Troubleshooting

### AI Detection Returns "Unknown"
- Hugging Face free tier may load models slowly on first request
- Add retry logic or use manual entry fallback
- Consider using `microsoft/swinv2-base-patch4-window8-256` as more reliable fallback

### USDA API Rate Limited
- The app automatically falls back to Open Food Facts
- Then falls back to built-in Indian food database
- Finally returns estimated values

### Images Not Loading
- Check R2 bucket CORS settings
- Ensure Worker has R2 binding configured
- Verify image URL format in upload response

### CORS Errors
- Worker CORS middleware is configured for `*`
- For production, restrict to your domain

## Development

```bash
# Run worker locally
cd worker
npm run dev

# Run frontend locally (in another terminal)
cd frontend
npm run dev
```

## License

MIT - Free to use and modify.

## Credits

- Nutrition data: USDA FoodData Central & Open Food Facts
- AI models: Hugging Face
- Icons: Lucide React
- UI Framework: Tailwind CSS
