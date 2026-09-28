# FUUAST Attendance Portal — Frontend

Next.js 15 frontend for the University Attendance Management System. It uses
Tailwind CSS for styling, Axios for API requests, and Zustand for auth state.
The browser talks same-origin only, to a Next.js proxy
(`src/app/api/backend/[...path]/route.js`) that forwards server-side to
independently deployed backend APIs — real backend hosts/ports never appear in
the browser's Network tab:

- `STAFF_API_URL` handles teacher and administration workflows.
- `STUDENT_API_URL` handles student login and attendance views.
- `LEAVE_API_URL` is still supported by the proxy (`x-backend: leave`,
  exported as `leaveApi`) for staff attendance / leave management, but the
  HR & Leave sidebar group is currently hidden.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the backend deployment
model (two Node apps — student-api and staff-api — sharing one MySQL database).

## Portal deployment model

This repo is deployed as **separate single-portal hosts**:

- Staff: `https://fuuast-staff-portal.vercel.app/`
- Student: `https://fuuast-student-portal.vercel.app/`

That behavior is controlled by `src/lib/AppController.js`:

- `APP_PORTAL` — default portal rendered on `/` (`'staff'` in this checkout;
  set to `'student'` for the student deployment).
- `SINGLE_PORTAL_LOCK = true` — only the default portal is enabled per host.
  The other portal's routes bounce back to `/` or its own dashboard.
- `PORTAL_URLS` / `detectPortal()` / `getDefaultPortal()` — hostname-based
  portal detection (`localhost` falls back to `APP_PORTAL`).
- `resolvePortalAccess(pathname, user)` — single source of truth for redirects.

Enforcement is global: `src/app/layout.js` wraps everything in
`src/components/AppPortalGuard.js`, which calls `resolvePortalAccess()` and
`router.replace()`s when a path, session, or portal lock does not match.

API constants are centralized in `src/lib/ApiConfig.js`
(`PROXY_BASE_URL = '/api/backend'`, `PORTAL_BACKEND`, `getApiBaseUrl()`,
`getBackendHeader()`). `src/lib/api.js` imports from there instead of
hardcoding the proxy path / `x-backend` values.

## Current app structure

```text
src/app/page.js         Root login — renders PortalLogin for getDefaultPortal()
src/app/login/page.js   Legacy entry, redirects to /
src/app/student/        Student portal routes (login, attendance, lookup, subjects, ...)
src/app/staff/          Teacher and administration routes (login, mark-attendance, ...)
src/app/api/backend/[...path]/route.js  Same-origin proxy to STAFF/LEAVE/STUDENT_API_URL
src/components/PortalLogin.js     Staff + student sign-in (captcha, lookup-first for students)
src/components/StudentLookupForm.js  Passwordless seat-number + captcha attendance check
src/components/AppPortalGuard.js  Global single-portal route guard
src/components/PortalSidebar.js   Portal nav (Batches/Subjects + HR & Leave currently hidden)
src/lib/api.js          studentApi / staffApi / leaveApi Axios clients + token refresh
src/lib/ApiConfig.js    Proxy base URL + portal->backend mapping
src/lib/AppController.js Single-portal lock, portal detection, redirect helpers
src/lib/staffAccess.js  Role-based staff resource access
src/store/authStore.js  Persisted Zustand auth session
```

## Requirements

- Node.js 18 or later and npm
- Running student and staff backend APIs (leave API optional while HR UI is hidden)
- A browser with JavaScript enabled

## Environment configuration

Server-only variables consumed by the API proxy (never exposed to the
browser). Create `.env.local` in this directory and restart the Next.js dev
server after changing it:

```dotenv
STAFF_API_URL=http://localhost:4002/api
LEAVE_API_URL=http://localhost:4003/api
STUDENT_API_URL=http://localhost:4001/api
```

There is currently no committed `.env.example`; use the keys above.
To build the other portal, change `APP_PORTAL` in `src/lib/AppController.js`
(`'staff'` | `'student'`) before deploying.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. On localhost `getDefaultPortal()` returns
`APP_PORTAL`, so `/` shows that portal's login. The backend APIs must be
running at the URLs in `.env.local`, and their `CORS_ORIGIN` values must allow
`http://localhost:3000`.

Available package scripts:

```bash
npm run dev            # Start the development server
npm run build          # Create a production build
npm run start          # Serve the production build
npm run lint           # Run the configured Next.js lint command
npm run format         # Prettier-write the repo
npm run format:check   # Prettier check
```

## Routing and authentication behavior

- `/` renders `PortalLogin` directly for the default portal — there is no
  longer a marketing landing page or portal chooser.
- `/login` redirects to `/`. `/staff/login` and `/student/login` still render
  their respective `PortalLogin`.
- `AppPortalGuard` blocks cross-portal paths: unauthenticated users are sent
  to `/`, authenticated users to their own dashboard (`/staff` or `/student`).
- The shared API module exports `studentApi`, `staffApi`, `leaveApi`, and
  `getApiClient()`. Student screens must use the student client; teacher and
  administration screens must use the staff client. Sending a request to the
  wrong API commonly appears as a 404 or CORS failure.
- Both clients attach the current bearer token and attempt one refresh request
  after a `401` response. A failed refresh clears the session and redirects to
  the relevant login page.
- Staff login requires a captcha (`GET /auth/captcha`, SVG + question,
  refresh button). If the backend returns 404 the client falls back to
  password-only login so legacy backends keep working. `429` responses surface
  as "Too many attempts. Please wait a moment."
- Student login defaults to passwordless lookup (`StudentLookupForm`:
  seat number + captcha, `mode="login"`); password sign-in is secondary via
  "Back to quick check" toggle. `src/app/student/lookup/` exposes the same
  public lookup.
- The proxy (`src/app/api/backend/[...path]/route.js`, Next.js 15
  `await params`) forwards `authorization` / `content-type`, preserves
  `x-forwarded-for` so backend per-IP rate limits see the real visitor, passes
  through `retry-after` / `content-disposition` for 429 countdowns and file
  downloads, and returns 502 when the upstream is unreachable.
- The current Zustand store persists the user, access token, and refresh token in
  browser storage under `attendance-auth-storage`. Review this storage strategy
  before production deployment if the security policy requires HttpOnly cookies.
- `PortalSidebar` currently hides the admin `Batches` / `Subjects` links and
  the whole `HR & Leave` group (commented out in
  `src/components/PortalSidebar.js`). Re-enable them there when those modules
  ship.

## Documentation

- [docs/feature-spec.md](docs/feature-spec.md): roles and feature behavior
- [docs/api-route-map.md](docs/api-route-map.md): backend endpoint ownership
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): frontend/backend deployment model
- [docs/design-tokens.md](docs/design-tokens.md): Tailwind colors, type, and layout conventions

Read the conventions at the top of `docs/api-route-map.md` before adding a
fetch call or wiring a new screen.

## Deployment on Vercel

Two Vercel projects are deployed from this repo (one per portal):

1. Import this frontend directory into Vercel twice (staff project + student project).
2. Set `APP_PORTAL` to `'staff'` in the staff project and `'student'` in the
   student project (`src/lib/AppController.js`), with `SINGLE_PORTAL_LOCK = true`.
3. Set `STAFF_API_URL`, `LEAVE_API_URL` and `STUDENT_API_URL` for the
   relevant Vercel environments (server-only, no `NEXT_PUBLIC_` prefix).
4. Deploy and verify `/` shows the correct portal login, cross-portal paths
   bounce to `/`, and an authenticated request from each portal succeeds.
5. Set `CORS_ORIGIN` on the backend APIs to the exact deployed frontend
   origin(s). Do not use `*` when credentials are enabled.

The project intentionally uses a system font stack in Tailwind and does not
require a build-time Google Fonts request.
