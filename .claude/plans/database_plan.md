# PostgreSQL and Redis Integration Plan

## Overview

Replace in-memory `GameStore` with PostgreSQL for persistence and Redis for session storage/caching. Code remains identical across all deployment configurations - only environment variables change.

---

## 1. PostgreSQL Schema

### Tables

```sql
-- Users table (for future auth)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(32) NOT NULL UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rating          INTEGER DEFAULT 1200,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table (tracks guest sessions for upgrade flow)
CREATE TABLE guests (
    id              UUID PRIMARY KEY,  -- matches session subject.id
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    upgraded_to     UUID REFERENCES users(id)
);

-- Games table
CREATE TABLE games (
    id              UUID PRIMARY KEY,
    mode            VARCHAR(10) NOT NULL CHECK (mode IN ('computer', 'friend')),
    status          VARCHAR(10) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),

    owner_id        UUID NOT NULL,
    owner_type      VARCHAR(10) NOT NULL DEFAULT 'guest' CHECK (owner_type IN ('user', 'guest')),
    owner_color     CHAR(1) NOT NULL DEFAULT 'w' CHECK (owner_color IN ('w', 'b')),

    opponent_id     UUID,
    opponent_type   VARCHAR(10) CHECK (opponent_type IN ('user', 'guest', 'computer')),

    difficulty      INTEGER,
    join_code       VARCHAR(8) UNIQUE,

    fen             VARCHAR(100) NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    current_turn    CHAR(1) NOT NULL DEFAULT 'w',
    move_count      INTEGER DEFAULT 0,
    result          VARCHAR(15) CHECK (result IN ('white_wins', 'black_wins', 'draw', 'abandoned')),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'
);

-- Moves table (game history/audit)
CREATE TABLE moves (
    id              BIGSERIAL PRIMARY KEY,
    game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number     INTEGER NOT NULL,
    player_color    CHAR(1) NOT NULL,
    player_id       UUID,
    move_san        VARCHAR(10) NOT NULL,  -- e.g., "Nf3", "e4"
    move_uci        VARCHAR(10) NOT NULL,  -- e.g., "g1f3", "e2e4"
    fen_before      VARCHAR(100) NOT NULL,
    fen_after       VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (game_id, move_number)
);

-- Indexes
CREATE INDEX idx_games_owner_id ON games(owner_id);
CREATE INDEX idx_games_join_code ON games(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_moves_game_id ON moves(game_id, move_number);
```

---

## 2. Redis Usage

| Data | Storage | TTL | Rationale |
|------|---------|-----|-----------|
| Sessions | Redis | 24h | Ephemeral, fast access via `connect-redis` |
| Active game cache | Redis | 1h | Avoid DB hits for every move check |
| Join code lookup | Redis | 1h | Fast O(1) lookup for joining games |
| User credentials | PostgreSQL | - | Must be durable |
| Game history | PostgreSQL | - | Permanent audit trail |

### Redis Key Patterns
```
sess:{sessionId}         # Session data (via connect-redis)
game:active:{gameId}     # Cached game snapshot JSON
joincode:{code}          # Maps to gameId
```

---

## 3. Folder Structure

```
Chess_App/
├── db/
│   ├── pool.mjs              # PostgreSQL connection pool
│   ├── redis.mjs             # Redis client singleton
│   ├── index.mjs             # Exports both clients
│   └── migrations/
│       ├── 001_create_users.sql
│       ├── 002_create_guests.sql
│       ├── 003_create_games.sql
│       ├── 004_create_moves.sql
│       └── migrate.mjs       # Migration runner
│
├── src/
│   ├── repositories/
│   │   ├── index.mjs         # Repository factory
│   │   ├── GameRepository.mjs
│   │   ├── UserRepository.mjs
│   │   └── MoveRepository.mjs
│   │
│   ├── services/
│   │   └── GameService.mjs   # Replaces direct GameStore usage
│   │
│   ├── game/
│   │   ├── game_manager.mjs  # Unchanged
│   │   └── store.mjs         # Deprecated (kept for reference)
│   │
│   └── routes/
│       └── game.mjs          # Updated to use GameService
│
├── config/
│   └── database.mjs          # Environment-aware config
│
└── .env.example
```

---

## 4. Key Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + Redis services for local dev |
| `db/pool.mjs` | PostgreSQL connection pool |
| `db/redis.mjs` | Redis client with connect-redis |
| `db/index.mjs` | Export both clients |
| `db/migrations/*.sql` | Schema migration files (4 files) |
| `db/migrations/migrate.mjs` | Migration runner script |
| `src/repositories/index.mjs` | Repository factory/exports |
| `src/repositories/GameRepository.mjs` | Game CRUD operations |
| `src/repositories/MoveRepository.mjs` | Move history operations |
| `src/repositories/UserRepository.mjs` | User CRUD operations |
| `src/services/GameService.mjs` | Game business logic |
| `src/services/AuthService.mjs` | Auth business logic (bcrypt) |
| `config/database.mjs` | Environment configuration |
| `.env.example` | Environment variable template |

### Modified Files
| File | Changes |
|------|---------|
| `src/app.mjs` | Add Redis session store |
| `src/routes/game.mjs` | Use GameService instead of gameStore |
| `src/routes/login.mjs` | Implement actual login with AuthService |
| `src/routes/register.mjs` | Implement actual registration with AuthService |
| `package.json` | Add scripts: `migrate`, `db:up`, `db:down` |

---

## 5. Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: chess_dev
      POSTGRES_USER: chess_user
      POSTGRES_PASSWORD: chess_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chess_user -d chess_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

**Usage:**
```bash
docker-compose up -d           # Start postgres + redis
docker-compose down            # Stop services
docker-compose down -v         # Stop + remove data volumes
```

---

## 6. Dependencies to Add

```bash
npm install redis connect-redis bcrypt
```

(`pg` is already installed)

---

## 7. Environment Variables

```bash
# .env.example
PORT=3000
NODE_ENV=development
SESSION_SECRET=change-this-in-production

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess_dev
PG_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 8. Authentication Implementation

### New Files
| File | Purpose |
|------|---------|
| `src/services/AuthService.mjs` | Password hashing, login/register logic |

### AuthService Design
```javascript
// src/services/AuthService.mjs
import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/index.mjs';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(username, email, password) {
    // Check if username/email exists
    const existing = await userRepository.findByUsername(username);
    if (existing) throw new Error('Username already taken');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return userRepository.create({ username, email, passwordHash });
  }

  async login(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async upgradeGuestToUser(guestId, userId) {
    // Link guest's games to new user account
    // Update guests table with upgraded_to reference
  }
}
```

### Route Updates
```javascript
// src/routes/login.mjs - Updated
import { authService } from '../services/AuthService.mjs';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authService.login(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Upgrade session from guest to authenticated user
  req.session.subject = { id: user.id, type: 'user', username: user.username };
  res.json({ success: true, user: { id: user.id, username: user.username } });
});

// src/routes/register.mjs - Updated
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await authService.register(username, email, password);
    req.session.subject = { id: user.id, type: 'user', username: user.username };
    res.status(201).json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

### Session Structure
```javascript
// Guest session
req.session.subject = { id: UUID, type: 'guest' }

// Authenticated session
req.session.subject = { id: UUID, type: 'user', username: 'player1' }
```

---

## 9. Implementation Order

1. **Docker Compose** (postgres + redis services)
2. **Database connections** (`db/pool.mjs`, `db/redis.mjs`)
3. **Migrations** (create schema files + runner)
4. **Repositories** (UserRepository, GameRepository, MoveRepository)
5. **Session store** (update `app.mjs` with connect-redis)
6. **AuthService** (password hashing, login/register logic)
7. **Auth routes** (update `login.mjs`, `register.mjs`)
8. **GameService** (business logic layer)
9. **Game routes** (switch from gameStore to gameService)

---

## 10. Verification Plan

### Database & Docker
```bash
# Start services
docker-compose up -d
npm run migrate
npm run dev
```

### Auth Tests
```bash
# Register
curl -X POST localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","email":"p1@test.com","password":"secret123"}'

# Login
curl -X POST localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"secret123"}' \
  -c cookies.txt

# Verify user in DB
psql $DATABASE_URL -c "SELECT id, username, created_at FROM users;"
```

### Game Tests
```bash
# Create game (with session cookie)
curl -X POST localhost:3000/game/computer \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "color=white" \
  -b cookies.txt

# Verify in DB
psql $DATABASE_URL -c "SELECT id, mode, owner_id, status FROM games;"
```

### Session Tests
```bash
# Check Redis for sessions
docker-compose exec redis redis-cli KEYS "sess:*"

# Restart server - session should persist
npm run dev  # (restart)
# Previous cookie should still work
```

---

## Notes

- **Code stays the same** across all deployments (local, Docker, AWS RDS) - only env vars change
- **GameManager unchanged** - it still wraps chess.js; GameService instantiates it from DB records
- **Existing bugs** (turn validation in game.mjs:33) should be fixed separately as part of route updates
