# Attendance Frontend

Next.js 14 frontend for the University Attendance Management System. It uses
Tailwind CSS for styling, Axios for API requests, and Zustand for auth state.
The browser talks same-origin only, to a Next.js proxy
(`src/app/api/backend/[...path]/route.js`) that forwards server-side to three
independently deployed backend APIs — real backend hosts/ports never appear in
the browser's Network tab:

- `STAFF_API_URL` handles teacher and administration workflows.
- `LEAVE_API_URL` handles staff attendance and leave management.
- `STUDENT_API_URL` handles student login and attendance views.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reason behind the
two-API deployment.

## Current app structure

```text
src/app/page.js       Portal landing page
src/app/login/        Shared login entry point
src/app/student/      Student portal routes
src/app/staff/        Teacher and administration routes
src/components/       Shared UI components
src/lib/api.js        Student/staff Axios clients and token refresh
src/lib/staffAccess.js Role-based staff resource access
src/store/authStore.js Persisted Zustand auth session
```

## Requirements

- Node.js 18 or later and npm
- Running student and staff backend APIs
- A browser with JavaScript enabled

## Environment configuration

Copy `.env.example` to `.env.local` in this directory (values below are the
local defaults):

```dotenv
STAFF_API_URL=http://localhost:4002/api
LEAVE_API_URL=http://localhost:4003/api
STUDENT_API_URL=http://localhost:4001/api
```

These are server-only variables consumed by the API proxy (never exposed to
the browser). Restart the Next.js dev server after changing `.env.local`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The backend APIs must be running at the URLs in
`.env.local`, and their `CORS_ORIGIN` values must allow `http://localhost:3000`.

Available package scripts:

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Serve the production build
npm run lint      # Run the configured Next.js lint command
```

## API and authentication behavior

The shared API module exports `studentApi`, `staffApi`, and `getApiClient()`.
Student screens must use the student client; teacher and administration
screens must use the staff client. Sending a request to the wrong API commonly
appears as a 404 or CORS failure.

Both clients attach the current bearer token and attempt one refresh request
after a `401` response. A failed refresh clears the session and redirects to
the relevant login page.

The current Zustand store persists the user, access token, and refresh token in
browser storage under `attendance-auth-storage`. Review this storage strategy
before production deployment if the security policy requires HttpOnly cookies.

## Documentation

- [docs/feature-spec.md](docs/feature-spec.md): roles and feature behavior
- [docs/api-route-map.md](docs/api-route-map.md): backend endpoint ownership
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): frontend/backend deployment model
- [docs/design-tokens.md](docs/design-tokens.md): Tailwind colors, type, and layout conventions
- [TASKS.md](TASKS.md): implementation checklist

Read the conventions at the top of `docs/api-route-map.md` before adding a
fetch call or wiring a new screen.

## Deployment on Vercel

1. Import this frontend directory into Vercel.
2. Set `STAFF_API_URL`, `LEAVE_API_URL` and `STUDENT_API_URL` for the
   relevant Vercel environments.
3. Deploy and verify the landing page, both login flows, and an authenticated
   request from each portal.
4. Set `CORS_ORIGIN` on the backend APIs to the exact deployed frontend
   origin. Do not use `*` when credentials are enabled.

Example production variables:

```env
STAFF_API_URL=https://staff.petzone.pk/api
LEAVE_API_URL=https://leave.petzone.pk/api
STUDENT_API_URL=https://student.attendance.petzone.pk/api
```

The project intentionally uses a system font stack in Tailwind and does not
require a build-time Google Fonts request.
