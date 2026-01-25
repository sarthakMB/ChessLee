# Development Roadmap

This is a living document tracking development priorities.

**Goal:** Build a production-grade chess backend that demonstrates senior-level engineering practices.

**Why this order?**
```
Docker + Postgres + Redis ──► AuthN/AuthZ ──► Testing ──► WebSockets + Pub/Sub ──► Deploy
```
Each phase builds on the previous. Can't test auth without DB. Can't scale WebSockets without Redis pub/sub. Can't deploy professionally without tests.

---

## Phase 0: Initial Setup (Complete)

- [x] Core game logic with chess.js
- [x] Express 5 server setup with ES Modules
- [x] Session middleware configuration
- [x] In-memory game store (`GameStore` class)
- [x] Basic multiplayer foundation (polling endpoint exists)
- [x] HTMX frontend integration
- [x] Project documentation (CLAUDE.md, architectural patterns)

---

## Phase 1: Foundation(databases setup) [CURRENT]

#### 1.1 Bug Fixes
- [ ] Fix turn validation bug at `src/routes/game.mjs:33`
  - Issue: Compares `'w'`/`'b'` with `req.session.game.player.color` (undefined)
  - Session now stores only game ID, not player object
- [ ] Implement `currentState()` at `src/game/game_manager.mjs:59-61`

#### 1.2 Docker Setup
- [x] Create `docker-compose.yml` with app + postgres + redis services
- [x] Update `Dockerfile` for dev/prod modes
- [x] Add `.env.example` with required variables
- [ ] Document local development workflow ?

#### 1.3 PostgreSQL Integration
- [x] Design schema (users, games, moves tables with indexes for history/replay)
- [x] Set up migrations (node-pg-migrate or similar)
- [x] Create connection pool configuration
- [ ] Implement Repository pattern to replace `GameStore`
- [ ] Add transactional move persistence (move log + game state updates)

#### 1.4 Redis Integration
- [x] Configure Redis connection
- [ ] Use `connect-redis` for session storage (ephemeral data)
- [ ] Document Redis vs PostgreSQL usage patterns

---

## Phase 2: Authentication & Security

#### 2.1 Authentication (AuthN)
- [ ] Users table with proper constraints
- [ ] Password hashing with bcrypt (cost factor 12+)
- [ ] Registration endpoint with input validation and sanitization
- [ ] Login endpoint with session creation
- [ ] Logout endpoint with session destruction
- [ ] Guest-to-user upgrade flow

#### 2.2 Authorization (AuthZ)
- [ ] Game ownership validation
- [ ] Player access control (only participants can view/move)
- [ ] Rate limiting on auth endpoints to prevent brute force
- [ ] Input sanitization and parameterized queries

#### 2.3 Session Security
- [ ] Secure cookie configuration (httpOnly, secure, sameSite)
- [ ] Session expiry and cleanup
- [ ] CSRF protection

---

## Phase 3: Testing

- [ ] Set up Jest + supertest
- [ ] API integration tests for game endpoints
- [ ] API integration tests for auth endpoints
- [ ] Unit tests for `GameManager`
- [ ] Unit tests for repositories
- [ ] Test database setup/teardown
- [ ] CI pipeline (GitHub Actions)

---

## Phase 4: Real-Time & WebSockets

#### 4.1 WebSocket Infrastructure
- [ ] WebSocket server setup (Socket.IO or ws)
- [ ] Room-based game connections
- [ ] Connection/disconnection handling with graceful state preservation
- [ ] Reconnection logic with authoritative state re-sync
- [ ] Replace polling with push updates

#### 4.2 Real-Time Game Updates
- [ ] Real-time move broadcasting to connected players
- [ ] Concurrent move resolution (last-write-wins with validation)
- [ ] HTMX WebSocket extensions for partial DOM swaps
- [ ] Client-side state kept minimal (server is authoritative)

#### 4.3 Horizontal Scaling (Optional but High-Signal)
- [ ] Redis pub/sub to decouple game events from WebSocket connections
- [ ] Enable multiple server instances to share game state
- [ ] Load balancer configuration with sticky sessions

#### 4.4 Game Features
- [ ] Move timers (per-player countdown)
- [ ] Resign and draw offer functionality
- [ ] Move history display with notation

---

## Phase 5: Production Readiness

#### 5.1 Deployment
- [ ] Production Docker Compose configuration
- [ ] Environment-based configuration
- [ ] Health check endpoint (`/health`)
- [ ] Graceful shutdown handling (close connections, drain requests)
- [ ] Deploy to Linux VPS with nginx reverse proxy
- [ ] Let's Encrypt SSL/TLS configuration

#### 5.2 Observability & Monitoring
- [ ] Structured logging (Winston or Pino) with log levels
- [ ] Request ID tracing across services
- [ ] Error tracking and alerting
- [ ] Metrics collection: active games, WebSocket connections, move latency
- [ ] Dashboard for system health (optional: Grafana + Prometheus)

#### 5.3 API Quality
- [ ] OpenAPI/Swagger documentation
- [ ] Input validation (Zod or express-validator)
- [ ] Consistent error response format
- [ ] Rate limiting across all endpoints

#### 5.4 CI/CD (Optional but High-Signal)
- [ ] GitHub Actions: run tests on PRs
- [ ] Automated deployment pipeline
- [ ] Database migration automation

---

## Phase 6: Advanced Features (After Core is Solid)

#### 6.1 Game History & Analytics
- [ ] Game history pagination with filters (date, opponent, result)
- [ ] Full game replay with move navigation
- [ ] Move-by-move game analysis
- [ ] Export games in PGN format

#### 6.2 Rating & Matchmaking
- [ ] ELO rating system with K-factor adjustment
- [ ] Rating updates after each game
- [ ] Matchmaking based on rating ranges
- [ ] Leaderboards (global, friends, time-based)

#### 6.3 Enhanced Gameplay
- [ ] Better computer opponent (Stockfish integration)
- [ ] Multiple time controls (blitz, rapid, classical)
- [ ] Tournament mode
- [ ] User profiles with stats and achievements

---

## Learning Objectives

| Phase | Key Skills |
|-------|------------|
| Phase 1 | Docker Compose, PostgreSQL + Redis, repository pattern, data characteristics (ephemeral vs persistent) |
| Phase 2 | Security fundamentals (bcrypt, input validation, parameterized queries), session security, rate limiting |
| Phase 3 | Test-driven development, integration testing, mocking, CI/CD pipelines |
| Phase 4 | WebSocket architecture, Redis pub/sub, horizontal scaling, authoritative state management |
| Phase 5 | Production deployment (nginx, SSL), observability (logs, metrics), DevOps practices |
| Phase 6 | Advanced features (ELO, matchmaking, game analysis) |
