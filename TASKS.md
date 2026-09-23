# Frontend — Task Checklist

> **Mobile responsive is a requirement on every screen, not a final polish step** — check each screen at 375px width as you build it, not just in the final pass (task 8).

Work top to bottom. The landing page (task 1) is already built — everything
after it is scaffolding to fill in. Reference `docs/feature-spec.md` for
what each screen needs to do and `docs/api-route-map.md` for the exact
endpoints to call once the backend exists. **Read `docs/ARCHITECTURE.md`
before task 2** — the backend is two separate apps (student-api, staff-api),
not one, and that changes how the API client gets built.

## 0. Setup

- [x] `npm install`
- [x] Copy `.env.example` → `.env.local`, set `NEXT_PUBLIC_API_STUDENT_URL` and `NEXT_PUBLIC_API_STAFF_URL`
- [x] `npm run dev`, confirm the landing page loads at `/`

## 1. Landing page — done, verify only

- [x] Hero, roles section, features section, footer built in `src/app/page.js`
- [x] Check it at 375px width (mobile) and at desktop width — confirm nothing overflows or overlaps
- [x] Swap the "Student login" / "Staff login" links to real routes once task 2 exists

## 2. Auth screens

- [x] Build two small API client instances — one pointed at `NEXT_PUBLIC_API_STUDENT_URL`, one at `NEXT_PUBLIC_API_STAFF_URL` (see `docs/ARCHITECTURE.md`) — before writing any fetch calls, so nothing hardcodes a base URL per call
- [x] `src/app/login/page.js` — a `portal` selector (student/teacher/staff) that drives BOTH which identifier label shows ("Student ID" vs "Login ID" vs "Email") AND which API client the login request goes through — `portal=student` always uses the student client, `portal=teacher`/`portal=admin` always use the staff client
- [x] Wire the form to `POST /auth/login` on the correct client, store the access token (in memory / React context, not localStorage — see note below)
- [x] Handle the "must reset password" flow — redirect to a change-password screen on first login
- [x] Build a simple `AuthContext` / hook that other pages use to read the current actor, role, AND which API client to use for the rest of the session
- [x] Route guard component: redirect to `/login` if not authenticated, redirect to "not authorized" if role doesn't match the page

## 3. Student dashboard

- [x] Subject-wise attendance list (calls `GET /attendance/student/:studentId`)
- [x] **Never recompute the attendance percentage client-side** — always display the value the API returns. The formula (present+late excludes leave/excused from the denominator too — see `docs/feature-spec.md` §7.1) lives in exactly one place on the backend; a client-side reimplementation is how the two quietly drift apart over time.
- [x] Filters: subject, date range
- [x] Color-coded status badges (reuse the `status` colors from `tailwind.config.js`)
- [x] Mobile card layout + desktop table layout (test both)

## 4. Teacher dashboard

- [x] Class/subject picker → today's session
- [x] Roster with per-student status buttons (5 states) — click-to-mark UI
- [x] "Upload sheet instead" option calling `POST /attendance/sessions/:id/import`, with a **"Download template"** link right next to the upload button (pulls the pre-filled roster via `GET /attendance/sessions/:id/import/template`) and an **"Export current attendance"** link for that session
- [x] Edit view for an existing session (respecting the edit-window rule — show a clear message once outside it)
- [x] Delete confirmation for a record/session (irreversible — say so in the UI copy)
- [x] **Merge groups** — "Combine sections" screen: pick subject/semester, add sections (A, B, C…), choose recurrence (daily / specific dates / weekly days)
- [x] On the today's-session screen, call `GET /attendance/sessions/today` first — if a merge applies, show the combined view (task below) instead of a single-section roster automatically, no extra click needed
- [x] **Combined roster view** — one scrollable list grouped by section with a sticky section-name header per group, and a summary strip at the top showing each section's count + the total (e.g. "A: 32 · B: 30 · C: 28 — Total: 90") so the teacher can sanity-check the headcount before marking
- [x] Mark-all-present-then-adjust shortcut for the combined roster (common real-world flow — most students are present, flip the exceptions)
- [x] Submit calls `PUT /attendance/sessions/merged/:mergeGroupId/records` in one request, not one call per section
- [x] Same **"Download template"** / **"Export"** / **"Upload sheet instead"** trio on the combined roster, using the merged-group template/export/import endpoints — someone marking 90 students may genuinely prefer filling a sheet over tapping through the UI
- [x] **Mobile check for the combined roster specifically**: at 375px width, the section summary strip and sticky group headers must stay usable with 90+ rows in the list — test with a large fake dataset, not just 5 rows

## 5. Admin dashboard

- [x] Department overview (own department only)
- [x] Batches/semesters/classes/subjects CRUD screens
- [x] Teacher management: add individually, bulk Excel import (with "Download template" link), export current teacher list, assign to class-subject
- [x] **Temporary password display**: when a teacher is created (or password reset), show the `temporaryPassword` from the API response in a one-time dialog with a "copy" button and clear text that it won't be shown again — this is the only way the teacher ever learns it (no email/SMS, see `docs/feature-spec.md` §4.1). For bulk Excel import, show/export the full `temporaryPasswords` list so an Admin can hand out a whole class's credentials at once.
- [x] **Teacher permissions screen**: per-teacher list of toggle switches (one per `GET /permissions` catalog entry), calling `PUT`/`DELETE /teachers/:id/permissions/:permissionKey` on flip — show which toggles are at the system default vs. explicitly overridden
- [x] Student management: add individually, bulk Excel import (with "Download template" link), export current student list, manage enrollments (electives)
- [x] Same one-time temporary-password dialog as the teacher screen — student import in particular should make it easy to view/export the whole class's `temporaryPasswords` (or note where a deterministic last-4-digits password applies instead)
- [x] Threshold settings screen (department + class-subject level)
- [x] Edit-window settings screen — same UI pattern/component as thresholds, backed by `GET/PUT /settings?key=edit_window_hours` instead of `/thresholds` (share the scope-picker component between the two screens rather than building it twice)
- [x] Reports screen with the full filter set + export button
- [x] **Activity log screen** (own department, scoped automatically by the backend): filterable table — actor, action, entity, date range — plus a separate "Login attempts" tab for spotting repeated failures

## 6. Super Admin / Keen Admin dashboards

- [x] Department creation + admin assignment — same one-time temporary-password dialog when a new Admin/Keen Admin account is created
- [x] Cross-department reports view (same filter component as task 5, just unscoped)
- [x] User management screen — confirm Keen Admin accounts never render in Super Admin's view (backend already filters this; just don't accidentally unhide it client-side)
- [x] Audit log viewer — same component as Admin's activity log screen, unscoped (system-wide), plus the login-attempts tab

## 7. Shared components (pull out as you notice repetition, don't build upfront)

- [x] Data table (sortable, paginated) used by admin/reports screens
- [x] Filter bar (department/batch/semester/class/subject/teacher/date range)
- [x] Excel upload widget (drag-drop + validation error display + a "Download template" link built in, so every screen that uses this component gets the template link for free instead of re-adding it each time)
- [x] Toast/notification system for action confirmations

## 8. Responsiveness & polish pass

- [x] Every screen from tasks 2–6 checked at 375px, 768px, and desktop widths
- [x] Loading, empty, and error states present on every data view
- [x] Keyboard focus visible on all interactive elements
- [x] Reduced-motion respected (no motion-only cues)

## 9. Deployment (Vercel)

- [x] `npm run build` succeeds cleanly locally first (no network calls at build time — see the font-loading note in `tailwind.config.js`)
- [x] Prepared configuration and environment settings for deployment.
