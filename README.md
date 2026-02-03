# Chess Lee

A real-time multiplayer chess platform built with Node.js, featuring WebSocket-based gameplay, server-side move validation, and clean architecture patterns.

Started out as a side project to play chess and variants with friends over Zoom. Now it's a sandbox for experimenting with AI-assisted learning (something I really want to expore), building a chess coaching system that optimizes for insight density (Eurekas per Minute). The goal: figure out how to compress months of pattern recognition into weeks.

Chess engines tell you the best move. They don't teach you **why** it's good or how **you** could have thought of that yourself and then help you internalize the pattern. Current teaching methods are good but let us, for one second, compare to the best case scenario — a Super GM personally invested in your progress (imagine being a GM's kid).

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

## Features

- **Real-time Multiplayer** — Play chess with friends using WebSocket connections with automatic reconnection and state recovery
- **Authoritative Game Server** — Server-side move validation using chess.js prevents illegal moves and ensures game integrity
- **Private Game Rooms** — Create games with join codes for private matches
- **Game Controls** — Timers, resign, and draw functionality
- **Move History** — Full move log with algebraic notation
- **Responsive UI** — Built with HTMX and Tailwind CSS for a dynamic experience with minimal JavaScript

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+ |
| **Framework** | Express 5 (ES Modules) |
| **Database** | PostgreSQL |
| **Cache/Sessions** | Redis |
| **Real-time** | Socket.IO |
| **Chess Engine** | chess.js |
| **Frontend** | HTMX, Chessboard.js, Tailwind CSS |
| **Logging** | Pino (structured JSON) |
| **DevOps** | Docker, nginx, Let's Encrypt |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  HTMX       │  │ Chessboard  │  │  Socket.IO Client   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                     Express Server                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Routes (thin)                    │    │
│  │         /game/create  /game/join  /game/move        │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                │
│  ┌─────────────────────────▼───────────────────────────┐    │
│  │                    Services                         │    │
│  │    GameService (validation, game logic, chess.js)   │    │
│  │    AuthService (registration, login)                │    │
│  └─────────────────────────┬───────────────────────────┘    │
│                            │                                │
│  ┌─────────────────────────▼───────────────────────────┐    │
│  │                  Repositories                       │    │
│  │   GameRepository  UserRepository  MoveRepository    │    │
│  └─────────────────────────┬───────────────────────────┘    │
└────────────────────────────┼────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Redis     │    │  Socket.IO   │
│   (games,    │    │  (sessions)  │    │   (rooms)    │
│ users, moves)│    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

The codebase follows a **Repository + Service pattern**:
- **Routes** — Thin HTTP handlers, delegate to services
- **Services** — Business logic, move validation, game rules
- **Repositories** — Data access layer, SQL queries

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/sarthakMB/ChessLee.git
cd ChessLee

# Copy environment file
cp .env.example .env

# Start all services
docker compose up

# App runs at http://localhost:3000
```

### Local Development

For faster iteration with hot reload:

```bash
# Terminal 1: Start databases
docker compose up postgres redis

# Terminal 2: Run the app with nodemon
npm install
npm run dev

# Terminal 3 (optional): Watch Tailwind CSS
npm run dev:css
```

## Scripts

```bash
npm run dev          # Start with hot reload (nodemon)
npm run dev:css      # Watch Tailwind CSS changes
npm start            # Production start
npm run migrate      # Run database migrations

# Integration Tests
npm run test:ws           # WebSocket smoke test
npm run test:ws:single    # Single-player game tests
npm run test:ws:multi     # Two-player multiplayer tests
npm run test:ws:auth      # Authorization tests
```

## Project Structure

```
src/
├── app.mjs              # Express app setup
├── routes/              # HTTP route handlers
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── ws/                  # WebSocket handlers (Socket.IO)
└── views/               # EJS templates

public/                  # Static frontend assets
├── js/game.js           # Client-side game logic
├── index.html           # Game lobby
└── game.html            # Game board UI

db/
├── pool.mjs             # PostgreSQL connection pool
├── redis.mjs            # Redis client
└── migrations/          # Database migrations

config/                  # Configuration files
utils/                   # Logging, debugging utilities
scripts/                 # Integration test scripts
deploy/                  # Deployment scripts
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `SESSION_SECRET` | Yes (prod) | 'dev-secret' | Session encryption key |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | No | localhost | PostgreSQL connection string |
| `REDIS_URL` | No | localhost:6379 | Redis connection URL |
| `LOG_LEVEL` | No | debug/info | Pino log level |

## Deployment

The app is configured for deployment on a Linux VPS with nginx reverse proxy:

```bash
# One-time VPS setup (installs Docker, nginx, SSL)
./deploy/setup-vps.sh yourdomain.com

# Deploy the application
./deploy/deploy.sh your-session-secret
```

Features:
- Docker Compose orchestration
- nginx reverse proxy with WebSocket upgrade handling
- Let's Encrypt SSL with auto-renewal
- Structured JSON logging for production

## Logging

Two logging systems serve different purposes:

| System | Purpose | Output |
|--------|---------|--------|
| **Pino** | Production logging | Structured JSON (ELK/CloudWatch compatible) |
| **debug** | Development tracing | Human-readable, colored |

```bash
# Enable debug output
DEBUG=app:* npm run dev

# Debug specific namespaces
DEBUG=app:services:* npm run dev
DEBUG=app:ws:* npm run dev
```

## Testing

WebSocket integration tests cover the full game lifecycle:

```bash
# Run all WebSocket tests
npm run test:ws:multi

# Tests cover:
# - Game creation and joining
# - Move validation and synchronization
# - Disconnect/reconnect handling
# - Authorization checks
```

## License

ISC
