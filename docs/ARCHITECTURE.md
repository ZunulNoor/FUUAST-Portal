# Architecture — Why Two Apps, One Database

## The problem this solves

With 1000+ students and a handful of staff, the traffic shape is lopsided: a burst of students checking their attendance at the same time (e.g. right after a class, or before an exam) can spike request volume far above normal — and in a single monolithic server, that spike competes for the _same_ process, event loop, and DB connection pool that Admin/Keen Admin/Super Admin/Teacher requests also depend on. If the student traffic saturates that shared process, everyone's requests slow down or fail together, including a Teacher trying to mark attendance mid-class.

## The fix: process-level isolation, one database

Two independently deployed Node/Express apps, each its own OS process with its own event loop and its own DB connection pool, both talking to the **same** MySQL database:

```
                         ┌─────────────────────────┐
  Next.js frontend  ───▶ │   student-api  (cPanel)  │──┐
  (Vercel)               │   lean, read-heavy        │  │
                         └─────────────────────────┘  │
                                                         ├──▶  MySQL  (one database)
                         ┌─────────────────────────┐  │
                    ───▶ │   staff-api    (cPanel)  │──┘
                         │   teacher/admin, write-heavy│
                         └─────────────────────────┘
```

This is the same pattern already in production for other projects on this cPanel account (see the Node.js App Manager screenshot referenced in project chat — `api`, `barcode-printer`, `hisaab`, `laboratory`, `queue-management` are all separate apps under one account). We're applying the same idea here, split along the actual traffic imbalance: students vs. staff.

**Why not separate databases too (true microservices)?** Because the data is genuinely relational — a student's attendance depends on their enrollment, which depends on the class, which depends on the department that Super/Keen Admin also manages. Splitting the database would mean either duplicating that data across two databases (a consistency nightmare) or making cross-database calls at query time (defeats the purpose). One shared database, two processes, is the right amount of separation for this system's actual failure mode.

## What lives where

|               | `student-api`                                                                   | `staff-api`                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handles       | Student login, `GET /attendance/student/:id`, read-only thresholds              | Everything else: teacher marking, merged sessions, all Admin/Keen Admin/Super Admin operations, permissions, imports/exports, reports, activity logs |
| Traffic shape | High concurrency, read-heavy, small payloads                                    | Low concurrency, occasional writes                                                                                                                   |
| Deployed as   | Its own cPanel "Node.js App" (own subdomain, e.g. `student-api.yourdomain.com`) | Its own cPanel "Node.js App" (own subdomain, e.g. `staff-api.yourdomain.com`)                                                                        |
| Code          | `apps/student-api/`                                                             | `apps/staff-api/`                                                                                                                                    |

Both import shared code (DB pool, JWT/permission middleware, the attendance-percentage formula, Excel template utilities) from `shared/`, wired in as a local package dependency — see "How the shared code actually works" below. **Never duplicate a copy of shared code into either app** — that's exactly the kind of drift that causes two apps to quietly disagree about how attendance percentage is calculated or who's allowed to do what.

## Connection pool budget (the detail that's easy to get wrong)

Your cPanel MySQL plan has a real, finite connection limit (check with your host — shared hosting plans are often surprisingly low, e.g. 20–30). With two separate pools now, **their limits add together** against that one shared cap:

- `student-api`: `DB_POOL_SIZE=15` (larger — absorbs the student traffic spike)
- `staff-api`: `DB_POOL_SIZE=8` (smaller — far fewer concurrent staff users)
- Total: 23 connections, leaving headroom under a typical ~25–30 cap

**Before deploying, confirm your actual MySQL max-connections limit with your host and size both pools so they never sum above it.** If you don't know the limit, start conservative (e.g. 10 + 5) and raise it only after checking.

## Auth: no cross-app trust needed

Since the frontend calls each app directly based on which portal the person is using, `student-api` never needs to verify a token `staff-api` issued, or vice versa. Each app can use its own `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` — using different secrets per app is slightly safer (a leaked `staff-api` secret can't be used to forge a student token) and costs nothing extra to set up.

## How the shared code actually works

`shared/` is a real local npm package (`@attendance/shared`, see `shared/package.json`), not just a folder of files copied around. Each app declares it as a dependency:

```json
"@attendance/shared": "file:../../shared"
```

When cPanel's Node App Manager runs a plain `npm install` inside an app's own root directory (e.g. `apps/student-api`), npm follows that `file:` reference, links `shared/` in, and pulls in its own dependencies too. This works with plain `npm install` — no monorepo tooling (npm workspaces, Lerna, etc.) required, which matters because you can't be certain cPanel's Node App Manager understands workspace configs. **Important:** the whole repository (not just one app's subfolder) needs to exist on the server's filesystem for the relative `file:../../shared` path to resolve — when you set up each cPanel Node app, point its "Application Root Directory" at `apps/student-api` (or `apps/staff-api`), but make sure the _entire_ repo was uploaded/cloned there, not just that one subfolder.

## Caching — the other half of the fix

Splitting into two processes stops a student traffic spike from taking down staff operations. It does **not**, by itself, make `student-api` infinitely scalable — if 500 students hit `GET /attendance/student/:id` in the same few seconds, that's still 500 DB queries unless something short-circuits it. Since attendance data doesn't change second-to-second, add a short-TTL cache (45–60s is plenty) in front of that one endpoint — see `TASKS.md` Phase 9. This is the highest-leverage performance change available and costs far less than any further architectural split.

## Deployment (cPanel — matches your existing Node.js App Manager setup)

1. Upload/clone the **whole repository** to your cPanel account (not per-app zips) — e.g. `/home/yourusername/attendance-backend/`.
2. In cPanel → Setup Node.js App, create **two** apps:
   - App root: `attendance-backend/apps/student-api`, subdomain: `student-api.yourdomain.com` (or a path rule)
   - App root: `attendance-backend/apps/staff-api`, subdomain: `staff-api.yourdomain.com`
3. Set each app's environment variables from its own `.env.example` in the cPanel Node app's environment variable UI — including the `DB_POOL_SIZE` values from the budget above.
4. Run `npm install` for each app from cPanel's interface (this is what resolves the `@attendance/shared` `file:` dependency).
5. Point your Vercel-deployed Next.js frontend's env vars at both:
   ```
   NEXT_PUBLIC_API_STUDENT_URL=https://student.attendance.petzone.pk/api
   NEXT_PUBLIC_API_STAFF_URL=https://staff.petzone.pk/api
   ```
6. Set `CORS_ORIGIN` on **both** cPanel apps to your Vercel frontend's real domain — not `*` in production.
