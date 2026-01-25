# Architectural Patterns

This document captures the design patterns and conventions used in this codebase.

## Current Patterns

### 1. Middleware Chain Pattern
Express middleware is layered with clear responsibilities. Order matters.

**Implementation:** `src/app.mjs:25-41`
```
Request → JSON Parser → URL Parser → Static Files → Session → Logger → Routes
```

- Each middleware has a single responsibility
- Session middleware creates `req.session` for downstream use
- Custom middleware (`ensureSubject`) guarantees session state: `src/app.mjs:43-60`

### 2. Store Pattern (In-Memory)
Centralized game state management via singleton store.

**Implementation:** `src/game/store.mjs:3-25`

- `GameStore` class wraps a `Map<gameId, GameManager>`
- Exported singleton: `export const gameStore = new GameStore()`
- CRUD operations: `createGame()`, `getGame()`, `deleteGame()`

**Limitation:** In-memory only. Games lost on restart. Will be replaced with PostgreSQL.

### 3. Manager/Wrapper Pattern
`GameManager` wraps the chess.js library, adding game metadata and business logic.

**Implementation:** `src/game/game_manager.mjs:3-76`

- Separates chess rules (chess.js) from game state (id, mode, players)
- `getSnapshot()` returns serializable game state: line 24-38
- Exposes simplified API: `turn()`, `makeMove()`, `isGameOver()`

### 4. Session-Based Authorization
Game access controlled via session state, not URL parameters alone.

**Implementation:** `src/routes/game.mjs:18-39`

- `sessionGameAuthCheck` middleware validates:
  - Session exists
  - Session game ID matches request
  - Game exists in store
- Session stores game context: `req.session.game = manager.id`

### 5. HTMX Response Pattern
Server returns HTML fragments or redirect headers for HTMX requests.

**Implementation:** `src/routes/game.mjs:41-47`, `src/routes/game.mjs:103-109`

- Check `req.get('HX-Request')` to detect HTMX
- Return `HX-Redirect` header for navigation
- Return HTML snippets for partial updates

## Conventions

### Route Organization
- One router per resource/feature area
- Routers mounted in `src/app.mjs:62-65`
- Pattern: `src/routes/{resource}.mjs`

### Error Responses
- JSON errors for API endpoints: `res.status(code).json({ error: message })`
- Rendered errors for page requests: `res.render('error', { message })`
- Helper function: `renderError()` at `src/routes/game.mjs:15-16`

### Session Structure
```javascript
req.session = {
  subject: { id: string, type: 'guest' | 'user' },  // Identity
  game: string  // Current game ID (if in game)
}
```

## Patterns To Adopt

### Repository Pattern (for PostgreSQL)
When adding database:
```
Route Handler → Service → Repository → Database
```
- Repositories handle data access only
- Services contain business logic
- Keeps routes thin

### Service Layer
Extract business logic from routes into services:
- `GameService` - game creation, joining, move validation
- `AuthService` - login, registration, token management

### Error Classes
Create custom error hierarchy:
```javascript
class AppError extends Error { constructor(message, statusCode) {...} }
class NotFoundError extends AppError { constructor(resource) {...} }
class UnauthorizedError extends AppError { ... }
```

### Event-Driven Updates (WebSockets)
Target architecture for real-time:
```
Client ←WebSocket→ Server ←Pub/Sub→ Redis (optional scaling)
```
- Socket.IO or ws library
- Room-based broadcasting per game
- Fall back to polling if WS unavailable
