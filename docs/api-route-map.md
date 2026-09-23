# API Route Map — v1 (split across student-api and staff-api, see docs/ARCHITECTURE.md)

Base URL: `/api` on **each** app separately — `student-api` and `staff-api` are two different deployments with two different base URLs (e.g. `https://student-api.yourdomain.com/api` and `https://staff-api.yourdomain.com/api`), not one combined API. Every section below is labeled with which app owns it. All routes except `/auth/*` require a valid JWT; role checks enforced via middleware (`requireRole([...])`) on top of the token, never trusted from the frontend alone.

## Conventions (apply to every endpoint below, on both apps, not repeated per-route)

- **Auth header**: `Authorization: Bearer <accessToken>` on every request except `/auth/login` and `/auth/refresh`.
- **Success shape**: a single resource is returned as that resource's JSON object directly (no wrapper). A list is returned as `{ "data": [...], "page": 1, "limit": 20, "total": 143 }`. Non-paginated lists (e.g. a small catalog like `GET /permissions`) return a plain array.
- **Error shape**: `{ "error": { "message": "human-readable string", "code": "MACHINE_READABLE_CODE", "fields": { "fieldName": "what's wrong" } } }` — `code` and `fields` are optional, `message` always present. HTTP status code carries the category (400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict e.g. duplicate session, 500 server error).
- **Pagination params**: `?page=` (default 1) and `?limit=` (default 20, max 100) on every list endpoint. Reject (400) a `limit` above the max rather than silently clamping it — silent clamping hides a caller's bug.
- **Dates**: plain dates as `YYYY-MM-DD` (e.g. `session_date`, `?from=`/`?to=` filters). Datetimes as ISO 8601. Single institution timezone assumed system-wide (see feature-spec.md §9) — no per-request timezone parameter.
- **One-time secrets**: any endpoint that creates an account with a system-generated password (`POST /teachers`, `POST /students`, `POST /users`, and their `/import` bulk equivalents, plus the `/reset-password` endpoints) includes the plaintext password in that single response under a `temporaryPassword` field (or `temporaryPasswords: { [rowIdentifier]: string }` for bulk imports) — it is never retrievable again afterward, only the hash persists. See feature-spec.md §4.1 for why this exists.

## Auth — split: `portal=student` login lives in **student-api**; `portal=admin`/`portal=teacher` login live in **staff-api**. Neither app implements the other's portal.

```
POST   /auth/login                 { identifier, password, portal }   -- portal: admin | teacher | student
POST   /auth/refresh                { refreshToken }
POST   /auth/logout
POST   /auth/change-password        (authenticated)
```

## Departments (Super Admin, Keen Admin) — staff-api

```
GET    /departments
POST   /departments
GET    /departments/:id
PUT    /departments/:id
DELETE /departments/:id             (soft: status=inactive)
POST   /departments/:id/admins      -- create an Admin for this department
GET    /departments/:id/admins
```

## Admins & Keen Admin management — staff-api

```
GET    /users?role=admin            (Super Admin sees all; Keen Admin sees all incl. hidden logic handled server-side)
GET    /users?role=keen_admin       (Super Admin: 403/filtered out — enforced server-side, not just UI)
POST   /users                       -- create admin / keen_admin (role-gated: only super_admin can create keen_admin)
PUT    /users/:id
DELETE /users/:id
```

## Batches / Semesters / Classes (Admin — own dept; Super/Keen Admin — any dept) — staff-api

```
GET    /batches?department_id=
POST   /batches
GET    /semesters?batch_id=
POST   /semesters
GET    /classes?department_id=&batch_id=&semester_id=
POST   /classes
PUT    /classes/:id
```

## Subjects — staff-api

```
GET    /subjects?department_id=
POST   /subjects
PUT    /subjects/:id
```

## Teachers — staff-api

```
GET    /teachers?department_id=
POST   /teachers                              -- creates login_id + temp password
POST   /teachers/import                       -- Excel bulk import (dedup on login_id/email)
PUT    /teachers/:id
POST   /teachers/:id/departments              -- link teacher to another department { department_id, is_coordinator }
POST   /teachers/:id/reset-password
```

## Class-Subject-Teacher assignment (the "who teaches what where") — staff-api

```
GET    /class-subject-teacher?class_id=&semester_id=
POST   /class-subject-teacher                 -- assign teacher to class+subject+semester
PUT    /class-subject-teacher/:id
```

## Students — staff-api

```
GET    /students?department_id=&class_id=&batch_id=&semester_id=&search=
POST   /students                              -- individual add
POST   /students/import                       -- Excel bulk import (dedup on student_id+department_id)
PUT    /students/:id
POST   /students/:id/enrollments              -- enroll into an (additional) class, e.g. elective { class_id, semester_id, is_primary }
DELETE /students/:id/enrollments/:enrollmentId
POST   /students/:id/reset-password
```

## Attendance thresholds — split: `PUT` (write) is **staff-api** only; `GET` (read) is available on **both** apps via the shared `resolveScopedValue` util, so student-api can show a student what percentage they need to hit

```
GET    /thresholds?scope=global|department|class_subject&...
PUT    /thresholds                            -- upsert at the given scope
```

## System settings (currently: edit window — same resolution pattern as thresholds) — staff-api only (this is a staff-configured setting; student-api has no reason to read it)

```
GET    /settings?key=edit_window_hours&scope=global|department|class_subject&...
PUT    /settings                              -- { key, scope, departmentId?, classSubjectTeacherId?, value }
```

Resolution (implemented as the same shared function used for thresholds — see feature-spec.md §6.1): `class_subject` row → `department` row → `global` row, most specific wins. `edit_window_hours` is the only key in v1; the table is generic on purpose so a new setting is a new `setting_key`, not a new table.

## Class merge groups (Teacher — own sections; Admin/Keen Admin can manage for their scope) — staff-api

```
GET    /merge-groups?teacher_id=&subject_id=&semester_id=
POST   /merge-groups                          -- { teacherId, subjectId, semesterId, name, recurrenceType }
PUT    /merge-groups/:id                       -- rename, toggle is_active
DELETE /merge-groups/:id
POST   /merge-groups/:id/sections              -- { classSubjectTeacherId } — add a section to the merge
DELETE /merge-groups/:id/sections/:cstId       -- remove a section
POST   /merge-groups/:id/dates                 -- { date } — for recurrenceType = 'specific_dates'
DELETE /merge-groups/:id/dates/:date
POST   /merge-groups/:id/weekdays              -- { weekday } — for recurrenceType = 'weekly_days'
DELETE /merge-groups/:id/weekdays/:weekday
```

Validation on every write: every `class_subject_teacher_id` added to a merge group must share that group's `teacher_id`, `subject_id`, and `semester_id` — reject otherwise (this is the one rule a raw foreign key can't express, so it has to be checked in the service layer).

## Permissions (Admin toggles per teacher; Keen Admin always full access, never toggleable) — staff-api

```
GET    /permissions                             -- the full catalog { key, label, description, defaultEnabled }
GET    /teachers/:id/permissions                -- effective permissions for one teacher:
                                                 -- [{ key, label, enabled, isOverridden, defaultEnabled }]
PUT    /teachers/:id/permissions/:permissionKey  -- { enabled } — Admin toggles it on/off for this teacher
DELETE /teachers/:id/permissions/:permissionKey  -- revert to the system default (removes the override row)
```

Every `PUT`/`DELETE` here writes to `audit_logs` (`action: "permission.toggle"`) — a permission change is exactly the kind of event that must be traceable to who changed it and when.

**How this combines with roles** — role gives the _ceiling_, permissions narrow or widen a teacher within it:

- **Keen Admin**: full access, everywhere, always. Not represented as rows in `permissions`/`teacher_permission_overrides` at all — it's a hardcoded bypass in `requirePermission()`, so there's no row anyone could accidentally toggle off.
- **Admin / Super Admin**: full access within their existing scope (own department / everywhere), as already defined in the role matrix — this permission system doesn't add restrictions on them, only on teachers.
- **Teacher**: gated by `permissions.default_enabled`, unless their own `teacher_permission_overrides` row says otherwise. A teacher can never exceed what their `class_subject_teacher`/department scope already allows — permissions narrow _within_ that scope, they don't expand it (a permission toggle can't let a teacher touch another teacher's class).

## Activity log & login attempts (Admin — own department; Keen/Super Admin — everything) — staff-api for reading these logs. Both apps WRITE to `login_attempts` for their own portal's login attempts.

```
GET    /activity-logs?actor_type=&actor_id=&action=&entity_type=&department_id=&from=&to=
                                                 -- reads audit_logs; Admin auto-scoped to their department
                                                 -- (via the actor's department, or the entity's, depending on type)
GET    /login-attempts?identifier=&portal=&success=&from=&to=
                                                 -- reads login_attempts — surfaces repeated failed logins, useful
                                                 -- for spotting a locked-out user or a credential-stuffing attempt
```

`audit_logs` is no longer reserved for "sensitive" actions only — `auditLog` middleware wraps every mutating route across the whole API (departments, classes, subjects, teachers, students, thresholds, merge groups, permissions, attendance), each row now also capturing `ip_address` and `user_agent`. The intent: every create/update/delete, by anyone, is answerable later — who, what, when, from where.

## Import templates & data export — staff-api

Every bulk-import surface gets a matching **template download** (so the person filling it in knows the exact expected columns before they start) and, where useful, a **data export** in the _same_ column format (so existing data can be pulled, edited offline, and re-imported through the same de-dup path — never a separate one-way "export" schema).

```
GET    /students/import/template               -- .xlsx: header row + 2 filled example rows + a short "Instructions" tab
GET    /students/export?department_id=&class_id=&batch_id=&semester_id=
                                                -- current students, same columns as the template

GET    /teachers/import/template
GET    /teachers/export?department_id=

GET    /class-subject-teacher/import/template
POST   /class-subject-teacher/import           -- bulk assign teachers to class+subject+semester (added for symmetry with single POST)

GET    /attendance/sessions/:id/import/template
                                                -- roster for that specific session PRE-FILLED with Student ID + Name,
                                                -- Status column left blank with an Excel dropdown (present/absent/
                                                -- leave/late/excused) so there's nothing to mistype
GET    /attendance/sessions/:id/export         -- that session's current records, same format, for backup/offline review

GET    /attendance/sessions/merged/:mergeGroupId/import/template
                                                -- COMBINED roster across every section in the merge group, grouped
                                                -- by section, same dropdown-validated Status column
POST   /attendance/sessions/merged/:mergeGroupId/import
                                                -- bulk-mark the merged roster from that filled-in sheet
GET    /attendance/sessions/merged/:mergeGroupId/export

GET    /import-logs/:id/errors/export          -- downloadable error report for a failed/partial import (see feature-spec §5)
```

**Template design rules** (implement once as a shared utility, reuse everywhere — see `src/utils/excelTemplates.js` in the backend task list):

- Header row locked/bold, one short "Instructions" tab explaining each column and any format requirements (e.g. date format).
- Any enum column (attendance `status`, student `status`, etc.) gets a real Excel data-validation dropdown, not just instructions in a comment — this is what actually prevents bad values reaching the import parser.
- Export uses the **exact same column order and headers** as the matching template, so "export → edit → re-import" is always a clean round trip through the same `upsertX()` validation path — never a special-cased "export-only" format.

## Attendance (Teacher primary; Admin/Keen/Super for corrections)

**App split for this section — read this before implementing anything below:** `GET /attendance/student/:studentId` is the one route that lives in **student-api** (it's the hot, high-concurrency endpoint this whole two-app architecture exists to isolate — see `docs/ARCHITECTURE.md`). **Every other route below is staff-api** — session creation, marking, editing, deleting, merged sessions, and reports all belong to staff-api. Both apps import the same `shared/utils/attendancePercentage.js` so the formula is never implemented twice.

```
GET    /attendance/sessions?class_subject_teacher_id=&date=
GET    /attendance/sessions/today?teacher_id=&date=&subject_id=
                                               -- resolves whether a merge group applies for that
                                               -- teacher+subject+date, and returns either a single
                                               -- section's roster or the combined merged roster with
                                               -- a per-section student-count breakdown, e.g.
                                               -- { merged: true, mergeGroupId, sections: [
                                               --     { classId: 12, name: 'BSCS-5A', studentCount: 32 },
                                               --     { classId: 13, name: 'BSCS-5B', studentCount: 30 },
                                               --     { classId: 14, name: 'BSCS-5C', studentCount: 28 }
                                               --   ], totalStudentCount: 90 }
POST   /attendance/sessions                   -- create today's session for a single (non-merged) class-subject
POST   /attendance/sessions/merged             -- { mergeGroupId, date } — creates one attendance_sessions
                                               -- row per section in the group (tagged with merge_group_id),
                                               -- all in one call, so the teacher never repeats the process per section
GET    /attendance/sessions/:id
PUT    /attendance/sessions/:id/records        -- bulk upsert { studentId, status, remarks }[] for one section's session
PUT    /attendance/sessions/merged/:mergeGroupId/records?date=
                                               -- bulk upsert across the WHOLE combined roster in one call;
                                               -- the backend splits each student's record into the correct
                                               -- underlying section session — the teacher marks once, it lands
                                               -- in the right place per student automatically
POST   /attendance/sessions/:id/import         -- Excel-based marking for that session
DELETE /attendance/sessions/:id                -- delete a whole session (and its records via FK cascade)
PATCH  /attendance/records/:id                 -- edit a single record { status?, remarks? }
DELETE /attendance/records/:id                 -- delete a single record (e.g. student added by mistake)
GET    /attendance/student/:studentId?subject_id=&from=&to=   -- student's own subject-wise view
GET    /attendance/reports?department_id=&class_id=&subject_id=&teacher_id=&from=&to=   -- filtered summary/defaulter list
GET    /attendance/reports/export              -- same filters, returns Excel/PDF
```

### Who can update/delete attendance, and when

| Actor           | Update (`PATCH .../records/:id`, bulk `PUT .../records`)                                                                                                                                          | Delete (`DELETE .../records/:id`, `DELETE .../sessions/:id`) |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Teacher**     | Own `class_subject_teacher` only, within the edit window resolved via `GET /settings?key=edit_window_hours` (§ System settings above — class-subject override → department → global, default 24h) | Same scope + same window                                     |
| **Admin**       | Any session/record within their own department, any time                                                                                                                                          | Same, any time                                               |
| **Keen Admin**  | Any session/record, any department, any time                                                                                                                                                      | Same, any time                                               |
| **Super Admin** | Read-only on attendance by design (per feature spec §2) — does not mark/edit/delete                                                                                                               | —                                                            |

Every `PATCH`/`DELETE` on `attendance/records` or `attendance/sessions` goes through the `auditLog` middleware, writing a full row snapshot to `audit_logs.before_json` (and `after_json` for edits) — this is what makes hard-delete safe: nothing is silently lost, and Admin/Keen Admin can look up what a record used to say even after it's gone. A teacher's update/delete request outside their edit window should be rejected with a clear "past the edit window — ask your department admin to make this correction" message rather than a generic 403.

## Import logs & audit (Admin+) — staff-api

```
GET    /import-logs?department_id=&type=
GET    /audit-logs?entity_type=&entity_id=&from=&to=
```

---

## Middleware stack (applied in this order) — shared code, used by both apps (only the routes that mount it differ)

1. `authenticate` — verifies JWT, attaches `req.actor = { type, id, role, departmentId }`
2. `requireRole([...])` — route-level allow-list
3. `requirePermission(key)` — for teacher-callable routes only (`students.create`, `attendance.delete`, etc.): `super_admin`/`admin` pass through untouched, `keen_admin` always passes (hardcoded bypass, no DB lookup), `teacher` resolves `teacher_permission_overrides` → falls back to `permissions.default_enabled`
4. `scopeToDepartment` — for Admin/Teacher routes, auto-injects `department_id` / `teacher_id` filter so an Admin can never query another department's data by manipulating query params
5. `auditLog(action)` — now wraps every mutating route (POST/PUT/PATCH/DELETE) across the API, not just attendance — writes actor, action, entity, before/after snapshot, IP, and user agent to `audit_logs`

## Excel import — shared validation service (staff-api; the template/export utilities themselves live in shared/ per docs/ARCHITECTURE.md)

Both `/students` (single) and `/students/import` (bulk) call the same internal `validateAndUpsertStudent()` function, and likewise for teachers — this is what guarantees the single-add and bulk-import paths can never produce inconsistent data or duplicate rows, per the de-dup rule in the feature spec.
