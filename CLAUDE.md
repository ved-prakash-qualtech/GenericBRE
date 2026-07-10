# GenericBRE

## UI/UX Standard — Permanent Design Authority

**[docs/UI_FRAMEWORK.md](docs/UI_FRAMEWORK.md) governs every screen, feature, module, and workflow in this project.** Read it before designing or implementing anything UI-related. Do not wait to be told to apply it — it applies by default, always, without being re-stated per request. If a request conflicts with it, follow the framework unless the user explicitly says otherwise for that instance.

### Non-negotiables (see docs/UI_FRAMEWORK.md for full detail)

- **No hardcoding** — anything that can vary (labels, lists, themes, rules, workflows) is configurable from the UI/DB, never baked into code. New client/role/category/rule = configuration only, no redeploy.
- **No page-level scroll** — fixed header + collapsible sidebar, viewport-fit shell (100vh), internal scrolling only inside panels/tables/lists. No horizontal scroll ever.
- **2–3 clicks max** to any key info or frequent action. Dashboards are clickable end-to-end (KPI → filtered records).
- **Every listing page**: page-level filters (in addition to global header filters), search, sort, pagination, one-click CSV export mirroring the current filtered view.
- **Multi-select dropdowns** everywhere a filter/selector appears.
- **Responsive from day one**: Mobile ≤768px, Tablet 769–1024px, Desktop ≥1025px (breakpoint behavior in the framework doc). CSS Grid/Flexbox only, no fixed-width layouts. Touch targets ≥44×44px, body text ≥14px.
- **Multi-tenant**: single codebase, tenant-scoped rows/APIs, per-tenant theme/logo/modules/roles/rules resolved from session — no per-client forks.
- **Client-specific theming** as default (from the client's website), personalizable on top via Appearance Studio; RBAC with server-side enforcement; audit logging on by default; NotifyX-style configurable notifications; Notification Centre; ChatBot + Help Desk.
- **Standard stack**: Next.js (React) frontend, Java Spring Boot backend, PostgreSQL (tenant-scoped, JSONB for config). Deviations need explicit sign-off.

### Working style for every feature request

Don't ship a basic CRUD screen. Think like a senior product designer / enterprise UX architect, and prefer configuration over code. When scoping non-trivial features, cover: User Flow, Information Architecture, UI Layout, Component Breakdown, Responsive Behaviour, Validation Rules, Edge Cases, API Requirements, Database Impact, Configurability, Security Considerations, Acceptance Criteria — scaled to the size of the request (a small tweak doesn't need all twelve headings spelled out, a new module does). Flag it plainly if a request conflicts with the framework, then follow the framework unless told otherwise for that instance.
