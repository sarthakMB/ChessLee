# Error Handling Pattern: Result vs Exceptions

**Date:** 2026-01-27

---

## TLDR

**Problem:** Inconsistent error handling across codebase (mix of try-catch and Result pattern).

**Solution:** Hybrid approach - Use **Result pattern** for expected business failures, **Exceptions** for unexpected system failures.

**Key insight:** Let database enforce constraints atomically, catch violations at repository layer. This eliminates race conditions in check-then-insert patterns.

**Implementation:** All repositories now catch constraint violations (UNIQUE, NOT NULL) and return `{ success: true/false, error, data }`. Services check `.success` and handle business errors. Routes try-catch for system errors.

---

## The Problem

Codebase had mixed error handling:
- Some places threw exceptions
- Some places returned `{ success: true/false }`
- Race conditions in check-then-insert pattern:

```js
// ❌ Race condition!
const existing = await userRepo.findUser('username', username);
if (existing) return { success: false, error: 'USERNAME_TAKEN' };
// Another request could insert here!
await userRepo.insertUser({ username });
```

---

## Decision: Hybrid Approach

```
Routes       → try-catch for unexpected errors
             → check .success for business errors

Services     → Return Result objects for expected failures
             → Let unexpected errors bubble up

Repositories → Catch expected DB errors (constraints) → return Results
             → Return null for "not found"
             → Throw unexpected errors (connection, timeout)
```

**When to use each:**

| Pattern | Use For | Example |
|---------|---------|---------|
| **Result** | Expected business failures | Invalid credentials, username taken, validation errors |
| **Exception** | Unexpected system failures | DB connection lost, timeout, disk full |

---

## Key Insight: Constraint Violations Are Expected Errors

### The Solution

```js
// Repository catches and translates DB errors
async insertUser(userData) {
  try {
    const result = await this.pool.query('INSERT INTO users...', values);
    return { success: true, data: result.rows[0] };
  } catch (err) {
    if (err.code === '23505') { // UNIQUE violation
      if (err.constraint === 'users_username_key') {
        return { success: false, error: 'USERNAME_TAKEN' };
      }
      if (err.constraint === 'users_email_key') {
        return { success: false, error: 'EMAIL_TAKEN' };
      }
    }
    if (err.code === '23502') { // NOT NULL violation
      return { success: false, error: 'MISSING_REQUIRED_FIELD', field: err.column };
    }
    throw err; // Unexpected - bubble up
  }
}
```

```js
// Service becomes simpler - no pre-checks!
async register(username, password, email) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await this.userRepo.insertUser({
    username,
    password_hash,
    email,
    is_deleted: false,
    is_test: process.env.NODE_ENV !== 'production'
  });

  if (!result.success) {
    return result; // USERNAME_TAKEN or EMAIL_TAKEN
  }

  return { success: true, user: omitPasswordHash(result.data) };
}
```

**Benefits:**
- No race conditions (DB constraint is atomic)
- Simpler service logic
- Single source of truth (database enforces)

---

## PostgreSQL Error Codes (from `pg` library)

| Code | Meaning | Handling |
|------|---------|----------|
| `23505` | UNIQUE violation | Return specific error (USERNAME_TAKEN, JOIN_CODE_TAKEN, etc.) |
| `23502` | NOT NULL violation | Return MISSING_REQUIRED_FIELD + field name |
| `08xxx` | Connection errors | Let bubble up |

Errors have: `err.code`, `err.constraint`, `err.column`, `err.message`

---

## Two Types of "Required"

### 1. Database NOT NULL - Let DB handle, catch at repository
```js
if (err.code === '23502') {
  return { success: false, error: 'MISSING_REQUIRED_FIELD', field: err.column };
}
```

### 2. Business Validation - Check at service layer
```js
if (username.length < 3) {
  return { success: false, error: 'USERNAME_TOO_SHORT' };
}
```

---

## Implementation Summary

**All repositories now handle:**

| Repository | UNIQUE Constraints | NOT NULL |
|------------|-------------------|----------|
| User | USERNAME_TAKEN, EMAIL_TAKEN | ✓ |
| Guest | SESSION_ID_TAKEN | ✓ |
| Game | JOIN_CODE_TAKEN | ✓ |
| Move | DUPLICATE_MOVE (game_id + move_number) | ✓ |

**Error format:**
```js
{ success: true, data: {...} }
{ success: false, error: 'USERNAME_TAKEN' }
{ success: false, error: 'MISSING_REQUIRED_FIELD', field: 'username' }
```

---

## Key Learnings

1. **Hybrid approach works best** - Results for expected errors, Exceptions for unexpected
2. **Let database enforce constraints** - Eliminates race conditions
3. **Repository translates DB errors** - Services don't know constraint names
4. **Fail at the right layer:**
   - Database constraints → Repository
   - Business rules → Service
   - HTTP errors → Route
5. **`pg` provides rich error info** - Use `err.code`, `err.constraint`, `err.column`

---

## Design Principle

> **Repositories catch expected data-layer failures (constraints) and return Results.**
> **Let unexpected system failures bubble up as exceptions.**
