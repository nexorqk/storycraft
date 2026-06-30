# Plan: Admin Panel

## Objective

Build a fully functional admin panel with navigation, dashboard, and management pages for users, books, and templates (templates already exist). Admin users authenticated via `RolesGuard` with `ADMIN` role can access all admin features.

## Requirements Snapshot

- **R1:** Admin users (with ADMIN role) can manage templates (already done)
- **R2:** Admin dashboard — overview with key stats (users, books, templates counts)
- **R3:** Admin users page — list all users, view details, toggle admin role
- **R4:** Admin books page — list all books with status, view details, retry failed
- **R5:** Admin navigation — sidebar link + sub-navigation between admin sections
- **R6:** All admin endpoints protected by `@Roles('ADMIN')` via `RolesGuard`

## Scope

- New API endpoints: admin dash stats, admin users (list/get/role toggle), admin books (list/get/retry)
- New web pages: `/admin` (dashboard), `/admin/users`, `/admin/books`
- Admin sidebar link (visible to all, `RolesGuard` protects API)
- Sub-navigation inside admin pages
- Add `Admin` to the `navItems` in `AppShell`

## Assumptions and Constraints

- The existing `RolesGuard`, `@Roles('ADMIN')`, `UserRole`/`Role` models are fully working
- Admin role is already seeded by `pnpm db:seed`
- Follow the exact patterns of the existing admin templates code
- No new database migrations needed — existing schema supports all new features
- Frontend admin pages use `AppShell` + `AuthPanel` like the templates page

## Risks and Areas Requiring Care

- `RolesGuard` already throws `ForbiddenException` for non-admin users — safe
- The admin templates page uses `active="Admin"` in AppShell — need a more specific active state for sub-pages
- The `AdminTemplatesService` handles both templates and pages — keep it that way
- Need to add `UsersModule` to imports if admin users controller depends on it (or just use Prisma directly like admin templates does)

## Sub-Tasks

### Sub-Task 1: Admin Dashboard API endpoint

- **Status:** Completed
- **Objective:** Create `GET /admin/dashboard` that returns summary stats
- **Related Requirements:** R2
- **Dependencies and Preconditions:** Existing AdminModule + PrismaService
- **In Scope for This Sub-Task:**
  - `AdminDashboardController` with `GET /admin/dashboard` returning `{ users: number, books: number, templates: number, activeTemplates: number, pendingJobs: number, failedJobs: number, completedBooks: number, failedBooks: number }`
  - All queries use Prisma `count()` directly in the controller or a new service
  - Controller is at `admin/dashboard/admin-dashboard.controller.ts`
  - Registered in `AdminModule`
- **Out of Scope for This Sub-Task:** Any frontend work
- **Instructions:**
  1. Create `apps/api/src/admin/dashboard/admin-dashboard.controller.ts`
  2. Add a `@Get()` route on controller with path `admin/dashboard` (or register it at the module level)
  3. Use PrismaService for counts
  4. Guard with `@UseGuards(RolesGuard)` and `@Roles('ADMIN')`
  5. Register in `AdminModule`
- **Acceptance Criteria:** `GET /admin/dashboard` with valid ADMIN session returns all stats
- **Implementation Suggestions:** Follow the exact pattern of `AdminTemplatesController` — same guards, same module registration
- **Testing Suggestions:** Test manually via browser or curl with an admin session
- **Done When:** Controller exists, registered, returns correct JSON shape

### Sub-Task 2: Admin Users API endpoints

- **Status:** Completed
- **Objective:** Create `GET /admin/users`, `GET /admin/users/:userId`, and `PATCH /admin/users/:userId/role` endpoints
- **Related Requirements:** R3
- **Dependencies and Preconditions:** Existing AdminModule + PrismaService + Role/UserRole models
- **In Scope for This Sub-Task:**
  - `AdminUsersController` at route `admin/users`
  - `GET /admin/users` → list all users with basic info + role names
  - `GET /admin/users/:userId` → single user with roles + book count
  - `PATCH /admin/users/:userId/role` → body: `{ role: 'ADMIN' | 'USER', action: 'add' | 'remove' }` — adds or removes the role for that user
  - Types `AdminUserSummary`, `AdminUserDetail` matching API response shape
- **Out of Scope for This Sub-Task:** Frontend pages
- **Instructions:**
  1. Create `apps/api/src/admin/users/admin-users.controller.ts`
  2. Create queries using Prisma — include `UserRole` with `Role` relation
  3. For role toggle: upsert UserRole record on add, delete on remove
  4. Guard with `@UseGuards(RolesGuard)` and `@Roles('ADMIN')`
  5. Register in `AdminModule`
- **Acceptance Criteria:** Admin can list users, view user detail, add/remove admin role
- **Implementation Suggestions:** Don't let user remove their own ADMIN role (prevent lockout). Use `findFirst` + `delete` for role removal.
- **Cautionary Points (Risks & Edge Cases):** Prevent self-demotion; handle case where role record doesn't exist on remove (should 404 or just succeed silently)
- **Testing Suggestions:** Manual curl testing
- **Done When:** All three endpoints work correctly

### Sub-Task 3: Admin Books API endpoints

- **Status:** Completed
- **Objective:** Create `GET /admin/books`, `GET /admin/books/:bookId` endpoints
- **Related Requirements:** R4
- **Dependencies and Preconditions:** Existing AdminModule, Book model
- **In Scope for This Sub-Task:**
  - `AdminBooksController` at route `admin/books`
  - `GET /admin/books` → list all books with user name, template title, status, dates
  - `GET /admin/books/:bookId` → full book detail with pages, illustrations, user info
  - `POST /admin/books/:bookId/retry` → reset book + job to retry generation
  - Response types: `AdminBookSummary`, `AdminBookDetail`
- **Out of Scope for This Sub-Task:** Frontend pages
- **Instructions:**
  1. Create `apps/api/src/admin/books/admin-books.controller.ts`
  2. Queries include User (select name, email), Template (select title), pages, illustrations
  3. For retry: find QUEUED or FAILED job, reset to QUEUED; reset book status to PENDING
  4. Guard with `@UseGuards(RolesGuard)` and `@Roles('ADMIN')`
  5. Register in `AdminModule`
- **Acceptance Criteria:** Admin can list books, view book detail, retry failed books
- **Implementation Suggestions:** Include `_count` for pages. Sort books by `createdAt desc`.
- **Testing Suggestions:** Manual testing
- **Done When:** All endpoints work

### Sub-Task 4: Admin Dashboard Frontend Page (`/admin`)

- **Status:** Completed
- **Objective:** Create the admin dashboard page with stat cards
- **Related Requirements:** R2, R5
- **Dependencies and Preconditions:** Dashboard API endpoint (Sub-Task 1), existing AppShell/AuthPanel components
- **In Scope for This Sub-Task:**
  - `apps/web/app/admin/page.tsx` — dashboard with stat cards
  - Calls `GET /admin/dashboard` on mount
  - Renders cards: Total Users, Total Books, Templates, Active Templates, Pending Jobs, Failed Jobs, Completed Books, Failed Books
  - Uses `AppShell` with `active="Admin"` and `AuthPanel`
  - Basic admin sub-navigation (Dashboard | Templates | Users | Books) at the top of the content area
- **Out of Scope for This Sub-Task:** Other admin pages
- **Instructions:**
  1. Create the page file
  2. Fetch dashboard data, render cards using existing CSS classes
  3. Add a horizontal sub-nav under the page header
  4. Follow the style patterns from the templates page
- **Acceptance Criteria:** Dashboard loads and shows correct stats
- **Done When:** `/admin` shows dashboard with stat cards

### Sub-Task 5: Admin Users Frontend Page (`/admin/users`)

- **Status:** Completed
- **Objective:** Create the admin users management page
- **Related Requirements:** R3, R5
- **Dependencies and Preconditions:** Admin users API (Sub-Task 2), admin dashboard page (Sub-Task 4) for layout pattern
- **In Scope for This Sub-Task:**
  - `apps/web/app/admin/users/page.tsx` — table of users with role badge, toggle admin button
  - List view: table with Name, Email, Roles, Created, Actions
  - Detail view: full user info, books count, role management
  - `apps/web/lib/admin-users-api.ts` — API client functions
- **Out of Scope for This Sub-Task:** None
- **Instructions:**
  1. Create API client file
  2. Create list page with table
  3. Create detail page with role toggle
  4. Use existing admin-table CSS classes
- **Acceptance Criteria:** Admin can see all users, view details, toggle admin role
- **Done When:** Page loads, shows users, role toggle works

### Sub-Task 6: Admin Books Frontend Page (`/admin/books`)

- **Status:** Completed
- **Objective:** Create the admin books management page
- **Related Requirements:** R4, R5
- **Dependencies and Preconditions:** Admin books API (Sub-Task 3), admin layout pattern
- **In Scope for This Sub-Task:**
  - `apps/web/app/admin/books/page.tsx` — list all books with status, user, template
  - Detail view: full book info, pages, illustrations
  - Retry button for failed books
  - `apps/web/lib/admin-books-api.ts` — API client
- **Out of Scope for This Sub-Task:** None
- **Instructions:**
  1. Create API client file
  2. Create list page with table
  3. Create detail view with retry button
  4. Use existing CSS classes
- **Acceptance Criteria:** Admin can see all books, view details, retry failed books
- **Done When:** Page works end-to-end

### Sub-Task 7: Update Navigation (AppShell)

- **Status:** Completed
- **Objective:** Add "Admin" link to the sidebar navigation
- **Related Requirements:** R5
- **Dependencies and Preconditions:** All admin pages exist
- **In Scope for This Sub-Task:**
  - Add `{ label: 'Admin', href: '/admin' }` to `navItems` in `apps/web/app/components/app-shell.tsx`
  - Update `active` prop logic so sub-pages (`/admin/users`, `/admin/books`, `/admin/templates`) also highlight "Admin"
  - The admin templates page currently passes `active="Admin"` hardcoded — update to use path-based active detection
- **Out of Scope for This Sub-Task:** Conditional rendering based on user role
- **Instructions:**
  1. Modify `AppShell` to accept optional `pathname` or use `useSelectedLayoutSegment` or use `usePathname`
  2. Actually, simplest: just add the nav item and keep using `active` prop. The admin pages already pass `active="Admin"`.
  3. Add the Admin link to `navItems`
- **Acceptance Criteria:** Admin link appears in sidebar and highlights on all admin pages
- **Done When:** Sidebar has Admin link, active state works on all admin sub-pages

## Final Integration & Verification

- ✅ `pnpm typecheck` — no TypeScript errors
- ✅ `pnpm test` — all 127 + 34 tests pass
- ✅ `pnpm build` — both apps build successfully
- Manual verification of all admin pages with an admin user session
