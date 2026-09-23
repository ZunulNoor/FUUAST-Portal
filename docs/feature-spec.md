# University Attendance Management System — Feature Specification (v1)

## 1. Tech Stack & Deployment

| Layer           | Choice                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Next.js (App Router), mobile-first responsive UI                                                                                                                                                   |
| Backend API     | Express.js (REST), deployed as a cPanel "Setup Node.js App"                                                                                                                                        |
| Database        | MySQL (via cPanel MySQL, accessed through a connection pool — e.g. `mysql2`)                                                                                                                       |
| Auth            | JWT (access + refresh token), bcrypt-hashed passwords                                                                                                                                              |
| File processing | Excel import/export via `exceljs` or `xlsx`                                                                                                                                                        |
| Hosting         | Single cPanel account: Node app for Express API, Next.js built as its own Node app (or static export served under a subpath) — two Node apps registered in cPanel, sharing the same MySQL instance |

Since cPanel supports Node.js apps, we'll run **two Node processes** behind cPanel's Passenger (Next.js app + Express API), both proxied under your domain (e.g. `/api/*` → Express, everything else → Next.js), or on a subdomain for the API (e.g. `api.yourdomain.com`). We'll finalize the exact routing when we get to deployment.

---

## 1b. Glossary (read this before anything else — terms are used precisely, not loosely)

| Term                                   | Meaning                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Class** / **Section**                | Used interchangeably throughout this spec and the schema — both refer to one row in the `classes` table (e.g. "BSCS-5A"). There is no separate "Section" entity; a class _is_ a section. |
| **Batch**                              | An intake year group (e.g. "2024-2028"), spanning all semesters a cohort will take.                                                                                                      |
| **Semester**                           | One numbered term (1–8 typically) within a batch.                                                                                                                                        |
| **Subject**                            | A course (e.g. "Data Structures"), independent of any specific class — the same subject can be taught to multiple classes.                                                               |
| **Offering** (`class_subject_teacher`) | The actual pairing of one class + one subject + one teacher + one semester — this is what attendance sessions attach to, not the subject or class alone.                                 |
| **Merge group**                        | A saved rule combining 2+ of one teacher's own offerings (same subject/semester) into one roster at marking time. Does not change where data is stored — see §6.                         |
| **Coordinator**                        | A per-department flag on a teacher (`teacher_departments.is_coordinator`) granting department-wide **read** access to reports, not write access to other teachers' sessions.             |
| **Effective permission**               | For a teacher: their `teacher_permission_overrides` row if one exists for that permission key, otherwise the system-wide `permissions.default_enabled` value. See §2b.                   |
| **Edit window**                        | The time period after a session is created during which a teacher may still update/delete it without Admin-level access. Configurable — see §6.1.                                        |
| **Scope**                              | Which rows an actor is allowed to see/touch: `global` (Super/Keen Admin), `department` (Admin, own department only), `own` (Teacher, own offerings only; Student, own records only).     |

---

## 2. Roles & Permission Matrix

| Capability                                           | Super Admin |       Keen Admin        |          Admin          |              Teacher               |    Student    |
| ---------------------------------------------------- | :---------: | :---------------------: | :---------------------: | :--------------------------------: | :-----------: |
| Create/edit/delete departments                       |     ✅      |           ✅            |           ❌            |                 ❌                 |      ❌       |
| Create department admins                             |     ✅      |           ✅            |           ❌            |                 ❌                 |      ❌       |
| View **all** departments' data                       |     ✅      |           ✅            |   ❌ (own dept only)    |                 ❌                 |      ❌       |
| See Keen Admin accounts                              | ❌ (hidden) |           ✅            |           ❌            |                 ❌                 |      ❌       |
| Create classes / batches / semesters                 |     ✅      |           ✅            |      ✅ (own dept)      |                 ❌                 |      ❌       |
| Assign teachers to classes/subjects, set credentials |     ✅      |           ✅            |      ✅ (own dept)      |                 ❌                 |      ❌       |
| Add students (bulk Excel / individual)               |     ✅      |           ✅            |      ✅ (own dept)      |                 ❌                 |      ❌       |
| Sync/re-upload Excel without duplicating             |     ✅      |           ✅            |      ✅ (own dept)      |                 ❌                 |      ❌       |
| Mark attendance                                      |     ❌      |      ✅ (override)      |           ❌            |          ✅ (own classes)          |      ❌       |
| Update attendance record (status/remarks)            |     ❌      | ✅ (any dept, any time) | ✅ (own dept, any time) | ✅ (own classes, edit-window only) |      ❌       |
| Delete attendance record/session                     |     ❌      | ✅ (any dept, any time) | ✅ (own dept, any time) | ✅ (own classes, edit-window only) |      ❌       |
| View subject-wise attendance                         |     ✅      |           ✅            |      ✅ (own dept)      |          ✅ (own classes)          | ✅ (own only) |
| Reports/analytics & filters                          | ✅ (global) |       ✅ (global)       |        ✅ (dept)        |             ✅ (class)             |   ✅ (self)   |

**Keen Admin note:** functionally equal to Super Admin, but excluded from any user-listing/management screen that Super Admin sees. This is an application-layer visibility rule (a `is_hidden` flag filtered out of Super-Admin-facing queries) — not real secrecy at the database level. Flagging this now so it's a documented, intentional design choice.

---

## 2b. Granular Teacher Permissions (Admin-controlled toggles)

Role gives a teacher their _default_ set of capabilities — but a department's real-world needs vary (some admins are comfortable letting a senior teacher add students directly; most won't want that by default). So beyond the fixed role matrix above, each teacher has a small set of **individually toggleable permissions** that their Admin controls:

| Permission                  | Default | What it gates                                          |
| --------------------------- | :-----: | ------------------------------------------------------ |
| Mark attendance             |   On    | Create sessions, mark student status                   |
| Edit attendance records     |   On    | Correct a status after marking, within the edit window |
| Delete attendance records   | **Off** | Remove a wrongly-created record or session             |
| Import attendance via Excel |   On    | Bulk mark/edit a session from a spreadsheet            |
| Add students                | **Off** | Add an individual student to a class                   |
| Edit student details        | **Off** | Edit an existing student's profile                     |
| Import students via Excel   | **Off** | Bulk add/update students                               |
| Manage merged sections      |   On    | Create/edit their own class-merge groups (§6)          |

- **Admin** flips these per-teacher from a settings screen with a toggle switch next to each permission — no code change or redeploy needed to grant/revoke a capability.
- **Scope is never expanded, only narrowed within it** — turning on "Add students" for a teacher still only lets them add students into their own department; it can never let them touch another teacher's class or another department, regardless of the toggle.
- **Keen Admin is never subject to this list** — full access is enforced as a hardcoded bypass, not a row in the permission table, so there's nothing to accidentally toggle off and nothing Super Admin could restrict either.
- **Every toggle is logged** — who changed which permission for which teacher, and when (see §11).

---

## 3. Core Entities (conceptual, schema comes next)

- **Department** — name, code, created_by
- **User** — polymorphic base for Super Admin / Keen Admin / Admin / Teacher / Student, each with role, department (nullable for Super/Keen Admin), status (active/disabled)
- **AcademicYear / Batch** — e.g. "2024-2028", intake year
- **Semester** — number, batch reference, active/inactive
- **Class/Section** — department + batch + semester + section (e.g. "BSCS-5A")
- **Subject** — code, name, department, credit hours, semester mapping
- **ClassSubjectTeacher** — links a class + subject + teacher (one teacher can teach many class-subjects; a class-subject can rotate teachers per semester). A teacher commonly holds **more than one section** of the same subject in a semester (e.g. sections A, B, C) — each is its own `ClassSubjectTeacher` row.
- **ClassMergeGroup** — a saved rule letting a teacher combine two or more of their own sections (e.g. A+B+C) into a single roster at attendance-marking time. Recurrence can be **daily**, a list of **specific custom dates**, or a **recurring weekday pattern** (e.g. every Monday & Wednesday). The merge is a marking-time convenience only — attendance data still lands under each student's real section, so per-section reports are unaffected. See §6.
- **Student** — student ID (roll no.), enrollment number (optional), name, CNIC/contact optional, class/batch/semester assignment, guardian info (optional), status
- **AttendanceSession** — subject + class + teacher + date + time slot
- **AttendanceRecord** — session + student + status (present / absent / leave / late / excused — all 5, see §10.1) + marked_by + marked_at
- **ExcelImportLog** — file name, uploaded_by, row count, duplicates skipped, errors, timestamp (for the "no repeat/sync" requirement — see §5)
- **Permission** — a catalog row (e.g. `students.create`, `attendance.delete`) with a system-wide default on/off — not a boolean column per teacher, so new toggles don't require a schema change (see §2b)
- **TeacherPermissionOverride** — one row per (teacher, permission) _only when it differs from the default_ — Admin's toggle action creates/updates/removes this row
- **LoginAttempt** — every login attempt (successful or not), with portal, identifier tried, IP, and user agent — separate from AuditLog because a failed login has no resolved actor yet
- **AuditLog** — who changed what, when, from where (IP + user agent) — now wraps every mutating action across the whole system, not just attendance (see §11)

---

## 4. Authentication (confirmed)

| Role                     | Login identifier                                       | Password                                                                                                                                     |
| ------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Super Admin / Keen Admin | Email or username                                      | Set at account creation, changeable                                                                                                          |
| Admin                    | Email or username (created by Super/Keen Admin)        | System-generated temporary password (see §4.1), changeable                                                                                   |
| Teacher                  | Login ID issued by Admin (e.g. employee code or email) | System-generated temporary password if not set explicitly, OR one set directly by Admin at creation (see §4.1)                               |
| Student                  | **Student ID** (roll number)                           | **Last 4 digits of enrollment number** if `enrollment_no` was provided at import; otherwise a system-generated temporary password (see §4.1) |

### 4.1 How a new account actually gets its password (closing the "no notifications" gap)

Decision §10.5 rules out email/SMS for v1 — so there has to be another way for a newly created person to learn their password. Here's the complete mechanism, with no step left implicit:

1. On creation (single add or Excel import), the backend either uses the deterministic password (student: last-4-digits, if `enrollment_no` is known) or generates a random temporary one.
2. **The plaintext temporary password is returned in the API response of the creation call, exactly once** — `POST /students`, `POST /teachers`, `POST /users`, and their `/import` bulk equivalents all include it in the response body (e.g. `{ student: {...}, temporaryPassword: "..." }`) for the creator (Admin/Super Admin) to read off-screen and relay to the person directly (in person, printed roster, internal chat — whatever the institution already uses). It is **never** logged, stored in plaintext anywhere, or retrievable again after that one response — only the bcrypt hash persists.
3. Every account created this way has `must_reset_password = 1`, enforced at login: the very next successful login is redirected straight to a change-password screen before anything else is accessible.
4. If the temporary password is lost before first login, Admin/Super Admin can call `POST /teachers/:id/reset-password` or the student equivalent to generate a new one, following the same one-time-response pattern.
5. Bulk Excel imports return the full inserted/updated list **with each new row's temporary password included**, so an Admin can print/export one sheet covering an entire class instead of resetting one at a time.

---

## 5. Excel Import & Sync Logic (no duplicate records)

- **Bulk import**: Admin uploads `.xlsx`/`.csv` with a defined template (Student ID, Name, Enrollment No. [optional], Class/Section, Batch, Semester, Contact [optional]).
- **De-duplication rule**: match on **Student ID** (and Department, since IDs are unique per department) as the natural key.
  - New Student ID → insert.
  - Existing Student ID → **update** changed fields only (name correction, class re-assignment, etc.), never insert a duplicate row.
  - Import log records: rows inserted / rows updated / rows skipped (identical) / rows with errors (with reasons, downloadable as an error report).
- **Individual add**: same validation path as Excel import (shared backend function), so both routes stay consistent and can't drift apart.
- **Class/teacher Excel import**: same pattern — teacher assignment sheets keyed on Teacher ID/email, subject code, and class code.
- **Re-sync anytime**: Admin can re-upload an updated master sheet at any point in the semester (e.g., after late admissions) without wiping or duplicating existing records.

### Sample templates & data export

Every bulk-import screen (students, teachers, teacher-class assignments, attendance marking, merged-roster attendance marking) offers a **"Download template"** button before the upload — a ready-made `.xlsx` with the correct headers, a couple of filled example rows, and, for any status/enum column, a real dropdown so there's nothing to mistype. Attendance templates go a step further and come **pre-filled** with the actual roster (Student ID + Name) for that session or merged group, so the person filling it in only ever has to touch the Status column.

Each of these also has a matching **export** in the identical column format — export the current student list, teacher list, or a session's current attendance, edit it offline, and re-upload through the same import path. Export is never a separate one-way format; it's designed to round-trip cleanly back through the same de-duplication logic in §5.

---

## 6. Attendance Marking

- **Teacher flow**: pick class → subject → date/session → mark each student present/absent/leave/late/excused → submit.
- **Bulk via Excel**: teacher can also upload a sheet (Student ID + status) for a session instead of clicking through the UI — same validation/de-dup logic as §5.
- **Attendance session rules**: prevent duplicate sessions for the same class+subject+date+slot (warn and offer "edit existing session" instead).
- **Concurrency**: last write wins on a given record — there's no locking between two people editing the same record simultaneously. This is acceptable because every write (not just the final state) is captured in the activity log (§11), so any conflicting edit is always traceable after the fact, even if not prevented in the moment.

### 6.1 Edit window — where it's configured, not just "configurable"

The edit window (how long a teacher can self-edit/delete their own marking before it requires Admin access) is a real, editable setting, resolved the same way as attendance thresholds (§10.2): **class-subject override → department default → global default**, most specific wins. It lives in the `system_settings` table (see `docs/schema.sql`) under the key `edit_window_hours`, seeded globally at `24` (same calendar day, approximately). Admin can change it per department or per class-subject from the same settings screen as thresholds. `GET/PUT /settings` in `docs/api-route-map.md` is the same shape as `GET/PUT /thresholds`, deliberately, so the resolution logic can be shared code, not two parallel implementations that could drift apart.

### Merged-section marking (multiple sections combined for one day's class)

A teacher who holds more than one section of the same subject (e.g. A, B, C) can set up a **merge group** so they don't have to mark three separate rosters when the sections meet together as one combined class:

- **Recurrence options**: merge **daily** (every time this subject is taught), on a **fixed weekday pattern** (e.g. every Monday & Wednesday), or on **specific custom dates** only (a one-off combined session, e.g. "just on the 10th").
- **Setup**: teacher (or Admin/Keen Admin) picks the subject + semester, adds the sections to combine, and sets the recurrence. Reusable — set up once, applies automatically going forward.
- **Marking**: when the teacher opens attendance for that subject on a day the merge applies, they see one combined roster instead of three, with a clear **student-count breakdown per section and a total** (e.g. "Section A: 32 · Section B: 30 · Section C: 28 — Total: 90") so they always know exactly how many students to expect before marking.
- **Data integrity**: under the hood, marking a merged roster still writes each student's attendance to their real section — nothing is restructured or duplicated, so subject-wise, class-wise, and defaulter reports keep working exactly as before, whether or not that day was merged.
- **Turning it off**: a merge group can be deactivated or deleted at any time without affecting past attendance history already recorded under it.

---

## 7. Student View

- Subject-wise attendance percentage, with color-coded status (e.g., red if below required threshold — resolved per §10.2, so it may differ by class-subject).
- Filters: by subject, by date range, by semester.
- Session-level detail: date, status, marked by.
- **Not in v1**: an attendance trend chart (line graph over time per subject) is a reasonable future addition, but it's explicitly **out of scope for v1** — the percentage figure and the session-level list already give students what they need to act on, and a chart adds a rendering surface (empty/loading states, mobile layout) without a specific request driving it. Revisit after v1 ships if there's real demand for it.

### 7.1 Attendance percentage — the exact formula (this is defined once, used everywhere)

`percentage = (present_count + late_count) / (present_count + late_count + absent_count) × 100`

- **Present** and **Late** both count as _attended_ — a late student still showed up.
- **Absent** counts against the student (in the denominator, not the numerator).
- **Leave** and **Excused** are **excluded from both** numerator and denominator entirely — an approved leave/excusal neither helps nor hurts the percentage. This matches standard academic policy (an excused absence isn't held against a student) and is the reason those two statuses exist as distinct from "Absent" in the first place.
- This is computed **on the fly** from `attendance_records` (§10.5) via one shared function/query — never cached or stored as a column, so it's never out of sync with the underlying records, including after a correction or deletion.
- If an implementation needs a different policy (e.g. Late counts as half-attended), that's a one-function change — but until told otherwise, build to this formula exactly, don't invent a different one silently.

## 8. Admin / Super Admin / Keen Admin Reporting

- Filters across: department, batch, semester, class/section, subject, teacher, date range, student.
- Views: class-wise defaulter list (below threshold), subject-wise summary, teacher activity (sessions marked), department comparison (Super/Keen Admin only).
- Export filtered report to Excel/PDF.
- Search: global search bar (by student ID/name, teacher name, class code) with role-scoped results.

---

## 9. Non-Functional Requirements

- **Mobile responsive**: all dashboards (student, teacher, admin) usable on phone — this shapes component design (avoid dense multi-column tables on mobile; use card layouts / horizontal scroll tables with sticky first column).
- **No database anomalies**: normalized schema (3NF baseline), foreign keys with proper cascade/restrict rules, unique constraints on natural keys (Student ID + Department, Teacher login ID, etc.) — detailed in the schema doc next.
- **Security**: bcrypt password hashing, JWT with short-lived access token + refresh token, role-based route guards on both frontend and API (never trust frontend role checks alone), rate-limiting on login endpoints, audit log for sensitive actions.
- **Performance**: pagination on all list endpoints, indexed foreign keys and commonly filtered columns (date, class_id, subject_id, student_id).
- **Modern UI**: clean dashboard design, loading/empty/error states everywhere, toast notifications for actions. **Light mode only for v1** — dark mode is a real future nicety but adds a second token set and testing surface across every screen for no functional gain right now; not building it speculatively. Revisit post-v1 if requested.
- **Timezone & date format**: single-institution deployment assumed — the server and MySQL connection run in one fixed timezone (set explicitly, e.g. `Asia/Karachi`, in both the DB connection config and `process.env.TZ`), not per-user. `session_date` is a plain `DATE` (no time component, no timezone conversion risk). Datetimes elsewhere use standard MySQL `DATETIME`. API request/response dates use `YYYY-MM-DD`; datetimes use ISO 8601.
- **Account lifecycle**: a `disabled` teacher/admin or a `disabled`/`alumni` student cannot log in (`authenticate` middleware checks `status = 'active'` after verifying the token, on every request, not just at login — so revoking access takes effect immediately, not just for new sessions).

---

## 10. Confirmed Decisions

10.1. **Attendance statuses**: Present / Absent / Leave / Late / Excused (5 states).
10.2. **Threshold**: configurable at global, department, _and_ class-subject level — most specific level wins (class-subject override > department default > global default). The same resolution pattern is reused for the edit-window setting (§6.1).
10.3. **Multi-class students**: a student can be enrolled in more than one class per semester (electives) — schema uses a student-enrollment join table, not a single class_id on the student, to avoid this exact anomaly.
10.4. **Teacher scope**: a teacher sees their own assigned classes by default; if flagged as **coordinator** for a department, they also get department-wide read access to reports (not write access to other teachers' sessions).
10.5. **Notifications**: none for v1 — no email/SMS. Can be added later without schema changes (attendance % is always computed on the fly, not stored, so no migration needed to add alerts later). See §4.1 for how a new account's password is delivered without a notification system.
10.6. **Multi-department teachers**: supported — a teacher is a standalone entity (own login), linked to one or more departments via a join table, with the coordinator flag set per department, not globally.

---

## 11. Activity Log & Login Attempts

The audit trail is comprehensive by design, not opt-in per feature:

- **Every mutating action, by anyone** — creating/editing/deleting a department, class, subject, teacher, student, threshold, merge group, permission toggle, or attendance record — is written to `audit_logs` with the actor, the action, a before/after snapshot, and the request's IP address and user agent.
- **Login attempts are tracked separately**, including failed ones (a failed attempt has no resolved user yet, so it can't live in `audit_logs`, which requires a known actor) — this surfaces repeated failed logins against one identifier, useful for spotting a locked-out person or something more concerning.
- **Who can see what**: Admin sees activity scoped to their own department; Keen Admin and Super Admin see everything, system-wide.
- **Nothing is inferred or summarized away** — the activity log is a plain, filterable, chronological record (by actor, action, entity, department, date range), not a curated "highlights" view, so an Admin or Super Admin can always reconstruct exactly what happened.

---

_Schema and API route map below._
