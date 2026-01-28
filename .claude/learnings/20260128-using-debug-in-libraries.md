# Using DEBUG to Inspect Library Internals

**Date**: 2026-01-28
**Context**: Debugging "Failed to create guest" error in session middleware

## The Problem

Session data existed in Redis but wasn't being read correctly. The app tried to insert a duplicate guest.

## The Fix

```bash
DEBUG=express-session npm run dev
```

This revealed session load/save timing and showed the session was being read — the bug was in our validation logic, not the session store.

## Quick Reference

```bash
# Single library
DEBUG=express-session npm run dev

# Multiple libraries
DEBUG=express-session,connect-redis npm run dev

# Everything (noisy but thorough)
DEBUG=* npm run dev

# Wildcard for a namespace
DEBUG=socket.io:* npm run dev
```

## Tips

- Most Node libraries use the `debug` package — check their README for namespace names
- Add `DEBUG` to your `.env.example` as a comment so you remember it exists
- Combine with `| grep` if output is too noisy: `DEBUG=* npm run dev 2>&1 | grep session`
- Works for: express-session, socket.io, mongoose, knex, many others
