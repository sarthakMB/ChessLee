# Chess App

## Project Status: Under Construction

This is a **learning/portfolio project** for a Backend SDE role. The goal is to build a professional-grade, production-ready chess application—not a toy project. Emphasis on: **scalability, modularity, reliability, and clean architecture**.

Current state: Core game logic works. Database (PostgreSQL + Redis) integrated. Real-time multiplayer via WebSocket (Socket.IO) implemented. Auth login/register routes exist but are placeholders.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+ |
| **Framework** | Express 5 (ES Modules) |
| **Sessions** | express-session + connect-redis |
| **Database** | PostgreSQL (pg) |
| **Cache/Sessions** | Redis |
| **Real-time** | Socket.IO |
| **Auth** | bcrypt (password hashing) |
| **Chess Logic** | chess.js |
| **Frontend** | HTMX, Chessboard.js, Tailwind CSS |
| **Templating** | EJS (error pages) |
| **DevOps** | Docker, nodemon |

## Project Structure

```
src/
├── app.mjs              # Express app entry, middleware setup
├── routes/              # Route handlers (thin controllers)
│   ├── game.mjs         # Game API: create, join, move
│   ├── home.mjs         # Landing page
│   ├── login.mjs        # Auth placeholder
│   └── register.mjs     # Registration placeholder
├── repositories/        # Data access layer (Repository pattern)
│   ├── GameRepository.mjs
│   ├── GuestRepository.mjs
│   ├── MoveRepository.mjs
│   ├── UserRepository.mjs
│   └── index.mjs
├── services/            # Business logic layer
│   ├── GameService.mjs  # Game lifecycle, move validation
│   ├── AuthService.mjs  # Registration, login
│   └── index.mjs
├── ws/                  # WebSocket handlers (Socket.IO)
│   ├── index.mjs        # Socket.IO setup
│   └── gameHandlers.mjs # join_game, move events
└── views/               # EJS templates

public/                  # Static frontend
├── js/game.js           # Client-side board logic
├── index.html           # Game lobby
└── game.html            # Game board UI

config/                  # Configuration
└── database.mjs         # PostgreSQL + Redis config

db/                      # Database module
├── pool.mjs             # PostgreSQL connection pool
├── redis.mjs            # Redis client
├── migrations/          # Schema migrations
└── utils/               # DB introspection utilities

utils/                   # Shared utilities
├── debug.mjs            # debug library namespaces
├── logger.mjs           # Pino logger
└── request_logger.mjs   # HTTP request logging

scripts/                 # Test scripts
└── ws-test-*.mjs        # WebSocket integration tests
```

## Commands

```bash
npm run dev          # Start server with hot reload (nodemon)
npm run dev:css      # Watch Tailwind CSS changes
npm start            # Production start
npm run migrate      # Run database migrations

# WebSocket integration tests
npm run test:ws           # Smoke test
npm run test:ws:single    # Single-player (vs computer) tests
npm run test:ws:multi     # Two-player multiplayer tests
npm run test:ws:auth      # Authorization tests

npm run dump-schema  # Export PostgreSQL schema to db/schema.sql
```

## Running the Application

### Local Development

Run everything in Docker (recommended for parity with production):

```bash
cp .env.example .env                 # First time only
docker compose up                    # Foreground (see logs)
docker compose up -d                 # Detached (background)
docker compose logs -f --no-log-prefix app  # Follow app logs
docker compose down                  # Stop all services
```

**Alternative:** Run databases in Docker, app with nodemon for hot reload:

```bash
# Terminal 1: Start PostgreSQL and Redis
docker compose up postgres redis

# Terminal 2: Run the app (requires Node.js installed locally)
# Note: Update .env to use localhost instead of Docker service names
npm run dev
```

---

## VPS Deployment

### Infrastructure Setup

- **VPS:** AWS Lightsail (or any Ubuntu VPS)
- **Reverse Proxy:** Nginx (handles SSL termination, WebSocket upgrade)
- **SSL:** Let's Encrypt via Certbot (auto-renewal)
- **App:** Docker Compose (app + postgres + redis)

### First-Time Setup

```bash
# 1. SSH into VPS
ssh -i your-key.pem ubuntu@your-vps-ip

# 2. Create app directory
sudo mkdir -p /opt/apps
sudo chown $USER:$USER /opt/apps

# 3. Clone repository
cd /opt/apps
git clone https://github.com/YOUR_USERNAME/NeonChess.git
cd NeonChess

# 4. Run setup script (installs Docker, Nginx, SSL)
./deploy/setup-vps.sh yourdomain.com

# 5. Log out and back in (for Docker group)
exit
ssh -i your-key.pem ubuntu@your-vps-ip

# 6. Deploy the app
cd /opt/apps/NeonChess
./deploy/test_deploy.sh your-session-secret
```

### Subsequent Deployments

```bash
ssh -i your-key.pem ubuntu@your-vps-ip
cd /opt/apps/NeonChess
./deploy/test_deploy.sh your-session-secret
```

### Deploy Scripts

| Script | Description |
|--------|-------------|
| `deploy/setup-vps.sh <domain>` | One-time setup: Docker, Nginx, SSL, firewall |
| `deploy/test_deploy.sh <secret>` | Deploy with dev config (pretty logs, colors) |
| `deploy/deploy.sh <secret>` | Deploy with prod config (JSON logs, restart policies) |

### Viewing Logs on VPS

```bash
docker compose logs -f --no-log-prefix app
```

### Multi-App VPS Setup

For running multiple apps on one VPS with nginx routing by domain, see `dev_private/deploy_repo/vps-infra/`. This separates infrastructure (nginx, SSL) from app deployment.

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | No | 3000 | Server port |
| `SESSION_SECRET` | **Yes (prod)** | 'dev-secret' | Must set in production |
| `NODE_ENV` | No | development | Set to 'production' for secure cookies |
| `DATABASE_URL` | No | localhost connection | PostgreSQL connection string |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection (sessions in prod) |
| `PINO` | No | 'compact' (dev) | Logger format: 'verbose', 'compact', or unset for JSON |
| `LOG_LEVEL` | No | 'debug' (dev) / 'info' (prod) | Pino log level |
| `DEBUG` | No | - | debug library namespaces (e.g., `app:*`) |

## Known Issues

- Computer opponent has no AI — games vs computer can be created but computer doesn't make moves
- Auth routes (`/login`, `/register`) are functional but frontend forms may not be fully wired up

---

## Documentation Structure

This project uses a structured documentation approach:

| File | Purpose |
|------|---------|
| `CLAUDE.md` / `AGENTS.md` | **Project-level context** - Tech stack, architecture, commands, key decisions |
| `PLAN.md` | **Current work** - Active plan/feature being implemented (private, not committed) |
| `.claude/private/roadmap.md` | Long-term development roadmap (private, not committed) |
| `.claude/docs/architectural_patterns.md` | Design patterns and conventions |
| `.claude/private/plans/` | Archived/detailed implementation plans (private, not committed) |
| `.claude/learnings/` | Debugging war stories and lessons learned |

**Rule**: CLAUDE.md and AGENTS.md contain stable, high-level project info. PLAN.md tracks the current focus and changes frequently. PLAN.md should **ALWAYS** have the plan in checkboxes (so that it is easy to track what is done and what is pending). After PLAN.md is done it will be archived in the `.claude/private/plans/` with the format `yyyymmdd-<short-name>-PLAN.md` (example : `20260126-database-integration-PLAN.md`).

**Learnings**: When the user asks something similar to "add the learning to .claude/learnings" or "lets document this learning", create a markdown file in the format `yyyymmdd-<short-learning-name>.md` (example : `20260126-orphan-process-debugging.md`) and add it to `.claude/learnings/`.

---

## Additional Documentation

Check these files for deeper context:

| Topic | File |
|-------|------|
| **Current implementation plan** | `PLAN.md` (private) |
| **Development roadmap & TODOs** | `.claude/private/roadmap.md` (private) |
| Design patterns & conventions | `.claude/docs/architectural_patterns.md` |

---

## Key Decisions

**Why HTMX over React/Vue?**
Focus is backend engineering. HTMX provides dynamic UX with minimal JS complexity. Keeps frontend simple so backend work shines.

**Why Repository + Service pattern?**
Clean separation: Repositories handle data access (SQL), Services handle business logic (validation, game rules). Makes testing easier and keeps routes thin.

**Why WebSocket (Socket.IO) over polling?**
Real-time multiplayer requires instant move broadcasts. Socket.IO handles reconnection, rooms, and fallbacks automatically.

**Why Express 5?**
Latest stable release with native promise support in route handlers. Modern async/await patterns without wrapper libraries.

---

## Logging

This project uses two logging systems with distinct purposes:

| | **debug** | **Pino** |
|---|-----------|----------|
| **Purpose** | Dev-time tracing | Production logging |
| **Toggle** | `DEBUG=app:*` env var | Log levels (info, warn, error) |
| **Output** | Human-readable, colored | JSON (for ELK/Datadog/CloudWatch) |
| **When** | Development only | Always (dev + production) |

**Rule of thumb:**
- `debug` = "Would I delete this console.log before committing?" → Use debug
- `Pino` = "Should this appear in production logs?" → Use Pino

### Debug Namespaces

```bash
DEBUG=app:*              # All debug output
DEBUG=app:db:*           # Database connections only
DEBUG=app:services:*     # Services only
DEBUG=app:routes:*       # Routes only
```

Debug instances use the `DEBUG` suffix for clarity (e.g., `servicesGameDEBUG`, `routesGameDEBUG`).

### Pino Log Levels

| Level | Use for |
|-------|---------|
| `trace` | Static asset requests (filtered) |
| `debug` | Detailed debugging (dev only) |
| `info` | HTTP requests, startup messages |
| `warn` | Recoverable issues, deprecations |
| `error` | Failures requiring attention |
| `fatal` | App cannot continue |
