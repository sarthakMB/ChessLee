# The Orphan Process Bug

**Date**: 2025-01-26
**Time to debug**: ~3-4 hours
**Difficulty**: Even Claude Opus couldn't solve it in one shot

---

## TL;DR

An orphan Node process (from a previous terminal session) was holding port 3000 and serving old code with Redis. New nodemon processes started, printed "listening", then immediately exited because the port was taken. The orphan kept serving stale code. Fix: `kill <PID>` the orphan.

**Key command**: `ps aux | grep node` — check process start times. If they don't match when you started nodemon, you have an orphan.

---

## The Symptom

```
Error: The client is closed
    at Class.sendCommand (node_modules/@redis/client/.../index.js:639)
    at RedisStore.get (node_modules/connect-redis/dist/connect-redis.js:28)
    at session (node_modules/express-session/index.js:493)
    ...
```

Redis "client is closed" error appearing on every request.

## The Confusion

I rolled back the code using git to a state where `app.mjs` had **zero Redis imports**. Verified the file - no Redis anywhere. Yet the error persisted.

How can code that doesn't exist still throw errors?

---

## The Debugging Journey

### Wrong Turn #1: Timing Issue Theory

Initial theory: RedisStore was being created before Redis client connected.

**Why it seemed right**: The stack trace showed RedisStore trying to use a closed client.

**Why it was wrong**: The file didn't even import Redis anymore!

### Wrong Turn #2: Nodemon Not Detecting Git Changes

Theory: Nodemon's file watcher missed the git rollback.

**Partial truth**: This can happen, but restarting nodemon should fix it.

**The mystery**: Restarting nodemon didn't help. The error persisted.

---

## ⭐ The Golden Move: `ps aux`

```bash
ps aux | grep -E "node.*app.mjs" | grep -v grep
```

Output:
```
sarthak... 61296  0.0  0.1  ...  S   10:32PM  0:01  node src/app.mjs
sarthak... 91316  0.0  0.1  ...  S+   1:42AM  0:00  node .../nodemon ... src/app.mjs
```

**Wait.** The app process (61296) started at **10:32 PM**.
Nodemon (91316) started at **1:42 AM**.

How can a child process be older than its parent?

---

## Confirming the Orphan

```bash
ps -o pid,ppid,start,command -p 61296
```

Output:
```
  PID  PPID STARTED COMMAND
61296     1 10:32PM node src/app.mjs
```

**PPID = 1** (launchd on macOS)

Process 61296 was an **orphan**. Its original parent (an earlier nodemon) died, and macOS re-parented it to PID 1.

---

## The Full Picture

```
10:32 PM    Earlier nodemon session spawned process 61296 (with Redis code)
            That terminal was closed / nodemon was killed
            Process 61296 became orphaned (PPID → 1)
            Process 61296 kept running, holding port 3000

1:42 AM     Started new nodemon session
            New nodemon spawned new app process
            New process tried to bind port 3000
            Port already taken by orphan!
            New process printed "listening" then immediately exited
            Orphan (61296) continued serving OLD code with Redis
```

## The Misleading Clue

Nodemon output:
```
[nodemon] starting `node src/app.mjs`
Chess app listening on port 3000
[nodemon] clean exit - waiting for changes before restart
```

**"clean exit"** meant the new process started and immediately died.
The orphan was serving requests, not the new code.

---

## The Fix

```bash
kill 61296
npm run dev
```

That's it. Kill the orphan, restart nodemon, everything works.

---

## Lessons Learned

1. **"clean exit" after "listening on port X" is a red flag** - server should stay running, not exit

2. **Check process start times** - if they don't make sense chronologically, something is wrong

3. **PPID = 1 means orphan** - the process's parent died and it got re-parented to init/launchd

4. **`lsof -i :PORT`** - shows what's actually listening, not what you think is listening

5. **Code changes "working" doesn't mean your process is running** - you might be testing against a ghost

6. **Stack traces point to node_modules** - the bug isn't in node_modules, it's in YOUR code (or in this case, your process management)

---

## Commands That Saved The Day

```bash
# What's running?
ps aux | grep node

# What's the parent of a process?
ps -o pid,ppid,start,command -p <PID>

# What's actually on this port?
lsof -i :3000

# Kill the orphan
kill <PID>
```

---

## How to Prevent This

1. Always Ctrl+C nodemon properly before closing terminal
2. Before debugging "impossible" errors, check `ps aux` and `lsof`
3. If port seems busy but shouldn't be, there's probably an orphan

---

*Sometimes the bug isn't in your code. It's in your processes.*
