# Chess App

## Project Status: Under Construction

This is a **learning/portfolio project** for a Backend SDE role. The goal is to build a professional-grade, production-ready chess application—not a toy project. Emphasis on: **scalability, modularity, reliability, and clean architecture**.

Current state: Core game logic works. Multiplayer foundation exists. Auth, database, and real-time sync are not yet implemented.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+ |
| **Framework** | Express 5 (ES Modules) |
| **Sessions** | express-session |
| **Database** | PostgreSQL (pg) - *not yet integrated* |
| **Chess Logic** | chess.js |
| **Frontend** | HTMX, Chessboard.js, Tailwind CSS |
| **Templating** | EJS (error pages) |
| **DevOps** | Docker, nodemon |

## Project Structure

```
src/
├── app.mjs              # Express app entry, middleware setup
├── routes/              # Route handlers (thin controllers)
│   ├── game.mjs         # Game API: create, join, move, turn polling
│   ├── home.mjs         # Landing page
│   ├── login.mjs        # Auth placeholder
│   └── register.mjs     # Registration placeholder
├── game/
│   ├── game_manager.mjs # Chess game wrapper with metadata
│   └── store.mjs        # In-memory game store (to be replaced with DB)
└── views/               # EJS templates

public/                  # Static frontend
├── js/game.js           # Client-side board logic
├── index.html           # Game lobby
└── game.html            # Game board UI

utils/                   # Shared utilities
db/                      # Database module (placeholder)
```

## Commands

```bash
npm run dev          # Start server with hot reload (nodemon)
npm run dev:css      # Watch Tailwind CSS changes
npm start            # Production start
npm test             # Tests (not yet implemented)
```

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | No | 3000 | Server port |
| `SESSION_SECRET` | **Yes (prod)** | 'dev-secret' | Must set in production |
| `NODE_ENV` | No | development | Set to 'production' for secure cookies |
| `DATABASE_URL` | Soon | - | PostgreSQL connection string |

## Known Issues

- `src/routes/game.mjs:33` - Turn validation bug (see roadmap)
- `src/game/game_manager.mjs:59-61` - `currentState()` not implemented
- `src/routes/game.mjs:137` - `makeComputerMove()` is random moves
- No client-side polling for multiplayer sync yet

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

**Rule**: CLAUDE.md and AGENTS.md contain stable, high-level project info. PLAN.md tracks the current focus and changes frequently. PLAN.md should **ALWAYS** have the plan in checkboxes (so that it is easy to track what is done and what is pending).

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

**Why in-memory store first?**
Rapid prototyping. The `GameStore` interface (`createGame`, `getGame`, `deleteGame`) will map directly to a Repository pattern when PostgreSQL is added.

**Why Express 5?**
Latest stable release with native promise support in route handlers. Modern async/await patterns without wrapper libraries.
