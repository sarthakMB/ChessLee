#!/bin/bash
#
# Test Deploy Script
# Same as deploy.sh but uses base config only (dev mode, pretty logs)
#
# Usage: ./deploy/test_deploy.sh <session_secret>
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

echo "=== Test Deploying Chess App (Dev Mode) ==="
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

# Build and start containers (base config only - no prod overrides)
echo ">>> Building and starting containers (dev mode)..."
docker compose up -d --build

# Wait for healthy containers
echo ">>> Waiting for containers to be healthy..."
sleep 5

# Run migrations
echo ">>> Running database migrations..."
docker compose exec -T app npm run migrate || echo "Migration failed or no migrations to run"

# Show status
echo ""
echo "=== Test Deployment Complete ==="
docker compose ps
echo ""
echo "View logs: docker compose logs -f --no-log-prefix app"
echo ""
