# SIGTERM Handlers Must Call process.exit()

**Date**: 2025-01-26

---

## How I Found This

1. After debugging the orphan process bug, tried to kill it with `kill 61296`
2. Process didn't die. Ran `ps -p 61296` - still running.
3. Conclusion: something was catching SIGTERM
4. Searched codebase: `grep -r "SIGTERM" .` → found handlers in `db/pool.mjs` and `db/redis.mjs`
5. Neither handler called `process.exit()`

---

## The Bug

```javascript
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Pool closed');
  // Process keeps running!
});
```

## The Fix

```javascript
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Pool closed');
  process.exit(0);  // ← Actually exit
});
```

## Why

Catching SIGTERM **prevents the default behavior** (termination). If your handler doesn't explicitly exit, the process lives forever.

The HTTP server keeps the event loop alive, so Node won't exit on its own.
