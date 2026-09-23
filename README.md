# Attendance Frontend

Next.js 14 frontend for the University Attendance Management System. It uses
Tailwind CSS for styling, Axios for API requests, and Zustand for auth state.
The frontend talks directly to two independently deployed backend APIs:

- `NEXT_PUBLIC_API_STUDENT_URL` handles student login and attendance views.
- `NEXT_PUBLIC_API_STAFF_URL` handles teacher and administration workflows.

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

There is no committed `.env.example` file. Create `.env.local` in this
directory:

```dotenv
NEXT_PUBLIC_API_STUDENT_URL=http://localhost:4001/api
NEXT_PUBLIC_API_STAFF_URL=http://localhost:4002/api
```

The API module has production URL fallbacks, but setting both values locally
is recommended so development never accidentally points at production.
Restart the Next.js dev server after changing `.env.local`; public Next.js
variables are read during the build/dev process.

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
2. Set `NEXT_PUBLIC_API_STUDENT_URL` and `NEXT_PUBLIC_API_STAFF_URL` for the
   relevant Vercel environments.
3. Deploy and verify the landing page, both login flows, and an authenticated
   request from each portal.
4. Set `CORS_ORIGIN` on both backend APIs to the exact deployed frontend
   origin. Do not use `*` when credentials are enabled.

Example production variables:

```env
NEXT_PUBLIC_API_STUDENT_URL=https://student.attendance.petzone.pk/api
NEXT_PUBLIC_API_STAFF_URL=https://staff.petzone.pk/api
```

The project intentionally uses a system font stack in Tailwind and does not
require a build-time Google Fonts request.
