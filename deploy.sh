#!/bin/bash
set -e

echo "🚀 NutriSnap Deployment Script"
echo "==============================="

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is required. Install with: npm install -g wrangler"
    exit 1
fi

# Deploy Worker
echo ""
echo "📦 Deploying Worker..."
cd worker
npm install
npx wrangler deploy
cd ..

# Get Worker URL
WORKER_URL=$(grep -o 'https://[^"]*workers.dev' worker/wrangler.toml 2>/dev/null || echo "")
if [ -z "$WORKER_URL" ]; then
    echo "⚠️  Please update NEXT_PUBLIC_WORKER_URL in frontend/.env.local with your Worker URL"
fi

# Build Frontend
echo ""
echo "🏗️  Building Frontend..."
cd frontend
npm install

if [ ! -f .env.local ]; then
    echo "NEXT_PUBLIC_WORKER_URL=$WORKER_URL" > .env.local
    echo "NEXT_PUBLIC_JWT_SECRET=your-jwt-secret-here" >> .env.local
    echo "⚠️  Created .env.local - please update JWT_SECRET"
fi

npm run pages:build

# Deploy Frontend
echo ""
echo "🌐 Deploying to Cloudflare Pages..."
npx wrangler pages deploy .vercel/output/static

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo "Worker API: $WORKER_URL"
echo "Frontend: Check Cloudflare Pages dashboard"
ngler pages deploy .vercel/output/static

echo -e "${GREEN}Frontend deployed successfully!${NC}"

cd ..

echo -e "\n${GREEN}=================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo "Next steps:"
echo "1. Set up your custom domain in Cloudflare Pages dashboard"
echo "2. Update CORS settings in worker if using custom domain"
echo "3. Test the app by registering a new account"
echo ""
echo "API Endpoints:"
echo "  - Auth:     $WORKER_URL/api/auth"
echo "  - Upload:   $WORKER_URL/api/upload"
echo "  - Detect:   $WORKER_URL/api/detect"
echo "  - Nutrition:$WORKER_URL/api/nutrition"
echo ""
