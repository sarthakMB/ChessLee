#!/bin/bash
#
# Deploy Script
# Run to deploy latest changes to production
#
# Usage: ./deploy/deploy.sh <session_secret>
#

set -e

SESSION_SECRET=${1:-}

if [ -z "$SESSION_SECRET" ]; then
    echo "Usage: $0 <session_secret>"
    echo "Example: $0 my-super-secret-key-here"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "=== Deploying Chess App ==="
echo "Directory: $APP_DIR"
echo ""

# Pull latest code
echo ">>> Pulling latest code..."
git pull origin main

# Copy .env.example to .env
echo ">>> Setting up .env..."
cp .env.example .env

# Replace SESSION_SECRET in .env
sed -i.bak "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
rm -f .env.bak

echo ">>> SESSION_SECRET configured"

# Build and start containers
echo ">>> Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for healthy containers
echo ">>> Waiting for containers to be healthy..."
sleep 5

# Run migrations
echo ">>> Running database migrations..."
docker compose exec -T app npm run migrate || echo "Migration failed or no migrations to run"

# Show status
echo ""
echo "=== Deployment Complete ==="
docker compose ps
echo ""
