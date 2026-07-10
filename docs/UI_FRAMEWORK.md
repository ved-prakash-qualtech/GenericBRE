# UI Framework — Reference Document (v3.2, July 2026)

Authoritative UI/UX standard for this project. Source: `UI_Framework V3.2.docx`, imported 2026-07-10. Consult before designing or implementing any feature, screen, module, workflow, component, or page.

## Purpose

Defines the standard UI features, interaction patterns, personalization capabilities, security model, data capabilities, and technology standards to be implemented consistently across all web application prototypes — existing and new. The broader objective across everything in this framework is **maximum configurability and DIY**: anything that can vary should be configurable from the UI, not hard-coded.

## Tag Key

`Frontend` = UI/CSS layer · `Backend` = API/server logic · `Responsive` = must work on mobile & desktop

---

## SECTION A · Guiding UI Principles

These apply to every screen of every prototype.

1. **Maximum Configurability & DIY** — Any value, label, list, theme, rule, or workflow that could vary between clients or over time must be configurable from the UI — never hard-coded. Adding a new client, role, category, or notification rule requires configuration only, no code changes or redeployment. Users self-serve: personalization, notification preferences, dashboard layout, report schedules are all set up by the user, not the dev team.
2. **No Page-Level Scroll** — No horizontal scroll on any viewport, ever. Fixed header and sidebar, content region sized to remaining space. Scrolling confined to internal panels/tables/lists, not the whole page. Prefer pagination, tabs, accordions, drill-downs over long scrolling pages.
3. **Minimum Clicks** — Any key info or frequent action reachable in 2–3 clicks or fewer. Dashboards are clickable: every KPI/chart segment/count drills down to underlying records. Smart defaults (pre-selected filters, remembered preferences, last-visited context). Multi-select filters, bulk actions, one-click resets.
4. **Filters & Export on Every Page** — Every listing/data page carries its own page-level filters in addition to global header filters. Every data table offers one-click CSV download of the current filtered view.
5. **Consistency** — Same patterns (navigation, filters, notifications, exports, personalization) behave identically across all prototypes so users never re-learn the interface.

---

## SECTION B · Platform & UI Features

**01 — Client-Specific Theming (Client Website Theme as Default)** `Frontend` `Backend`
Every prototype launches with the client's own visual identity as its default theme — derived from the client's public website — not a generic theme. Extract brand palette (primary/secondary/accent colours, typography, logo) before development. Stored per-tenant in a theme config object, injected via CSS variables at session start, no full reload. New client themes added via configuration only. Users can personalise on top via Appearance Studio (07); client theme remains default/fallback on reset. Provide a neutral default theme only for accounts with no client branding.

**02 — Collapsible Left Navigation Menu** `Frontend` `Responsive`
Collapsed: 56px, icons only, tooltips on hover. Expanded: 220px, icons + labels. Hover-to-expand (desktop), tap-to-expand (touch). Mobile (≤768px): full-width overlay with close button. Active route highlighted with primary accent. Persist collapse/expand state in localStorage.

**03 — Multi-Select Dropdowns** `Frontend` `Responsive`
All filter/selection dropdowns support multiple values. Checkboxes in options; selected count on trigger. Apply multiple values in one step. Available on status/category/location/cost-centre selectors. Clear-all in one click; individual tag deselect. Keyboard-accessible (arrows, Space, Escape). Mobile: bottom sheet instead of dropdown.

**04 — Global & Page-Level Filters** `Frontend` `Responsive`
Persistent filter bar in header scopes data by client/cost-centre/location; every page adds its own contextual filters. Admin/Super Admin: client switcher in header. All roles: cost-centre and location dropdowns in header. Global filters persist across sections (global state/URL params). Active filters shown as filled chip/badge. Reset all (global + page-level) in one click. Mobile (≤768px): collapsed into single "Filters" button opening a bottom sheet.

---

## SECTION C · Personalization Console

Users organise their own dashboard, style their own workspace, and manage client branding — all self-service (DIY).

**05 — Dashboard Layout Customization (Widget Management)** `Frontend` `Responsive`
Edit Layout mode toggle activates drag handles; normal interaction disabled while editing. Reorder via drag; panels slide/snap. Resize following responsive grid. Hide via 'X' control in Edit Mode. Manage Widgets drawer: on/off toggles + drag-to-reorder list. Automatic memory (localStorage/user profile) survives refresh/restart. Reset Layout restores default in one click.

**06 — Personalized Dashboard with Graphs & Click-Through** `Frontend` `Backend` `Responsive`
Graph widgets (bar/line/donut/trend) powered by live module data. KPI cards relevant to role/scope. Everything clickable: KPI/chart bar/legend navigates to the module with matching filters pre-applied. Widget catalogue chosen via Manage Widgets drawer (05). Respects global filters, refreshes instantly on change. Responsive: reflow to single column on mobile.

**07 — Appearance Studio (Themes, Colour Mode, Wallpaper, Logo & Live Preview)** `Frontend` `Backend` `Responsive`
Single home for all theme/colour-mode selection, via a live-preview sandbox — nothing applies until confirmed. Pre-made themes: Enterprise Blue, Modern Purple, Emerald Green, Midnight Navy — alongside client's default website theme. Light/Dark mode switcher, respects `prefers-color-scheme` on first load, user override thereafter (WCAG AA contrast). Custom wallpaper upload with Opacity/Blur/Brightness sliders for readability. Client logo change (authorised users), per-tenant, live preview. Smart glass panels: translucent panels over wallpaper. Cancel discards sandbox; Apply saves permanently and applies app-wide. Reset restores client's default website theme (01).

---

## SECTION D · Access & Security

**08 — Login (Password & OTP Based)** `Backend` `Frontend`
Two-step: email entry (validates format/registration) → 6-digit OTP to that email (10-min expiry, resend after 60s). No passwords stored/entered. Auto-detect role from email domain on OTP verification. Rate-limit: max 5 OTP requests / 15-min window. Session token in httpOnly cookie; refresh token for extended sessions. Redirect to last-visited page after login.

**09 — Role-Based Access Control (RBAC)** `Backend` `Frontend`
Roles: Super Admin (full, all clients/modules/admin), Account Manager (assigned client(s) only), Fleet Manager/Finance Manager/Client Users (own org data only). Sensitive actions restricted to authorised roles. Route guards redirect unauthorised users to 403 — no silent failures. Role definitions centrally stored; new role = configuration only. All permission checks duplicated server-side; client-side guards are UX-only.

**10 — Audit Logs** `Backend` `Frontend`
Immutable audit trail: logins/logouts, failed OTP, data create/edit/delete, config changes, permission changes, exports, report deliveries, personalization/branding changes. Each entry: user, tenant/client, timestamp, action, entity, before/after values. Audit Log viewer for admins: filterable (user/module/action/date), paginated, CSV export. Append-only; retention policy configurable per tenant. RBAC-scoped (Super Admin sees all tenants; client admins see own org only).

---

## SECTION E · Notifications & Support

**11 — Notification Centre** `Frontend` `Backend` `Responsive`
All alerts/reminders/status updates, reverse-chronological. Colour-coded: Error (red), Warning (amber), Success (green), Info (blue). Unread differentiated (bold + left accent). Bell badge in header (capped 99+). Mark individual/all read in one click. Filter by type/date, paginated (20/page). Notifications >90 days archived/removable.

**12 — NotifyX (Notification Configuration)** `Frontend` `Backend`
Event-driven engine + self-service preference console; all triggers/templates/channels/preferences configurable, nothing hard-coded. Modules publish events (lease renewal, invoice raised, ticket updated, document uploaded) → NotifyX maps to rules. Rules configurable per tenant (which events, whom, which channel, message templates with placeholders) — editable without code. Channels: in-app + email minimum, extensible to SMS/WhatsApp. User preference console: independent on/off toggles per notification type, digest frequency (Daily/Weekly/Monthly). Preferences save instantly, take effect next trigger; admins set org defaults, users override within bounds. New rules auto-appear in preference console. Queued delivery with retry; every attempt logged (feeds Audit Log). Feeds Notification Centre (11) and header bell badge.

**13 — Help Desk Panel** `Frontend` `Responsive`
Slide-out panel from header (?) icon: support phone, email, hours. Does not navigate away/open new tab. Mobile: bottom sheet. Optional pre-filled mailto link.

**14 — ChatBot** `Frontend` `Backend` `Responsive`
Floating icon (bottom-right) on every page, opens chat panel in place. Answers from maintained knowledge base (Lease/Finance/Service/Asset/Vehicle/General). Guided navigation: deep-links to right page/module with filters pre-applied. Context-aware: knows role and current page; never reveals data outside RBAC scope. Escalation to Help Desk when unresolved. Thumbs up/down feedback. Chat history retained in-session, logged for quality review. Mobile: full-height bottom sheet.

---

## SECTION F · Data & Export

CSV download is a standard control on every data page.

**15 — CSV Export (Every Page)** `Frontend` `Backend`
Mirrors current view exactly (active filters + column ordering). Standard control on all listing pages (Vehicle Fleet, IT Assets, Lease Management, Invoices, Service Requests, Documents, Audit Logs, and any new module by default). Clear headers, spreadsheet-ready. Filename includes module + timestamp (e.g. `vehicles_2026-07-07.csv`). Respects RBAC. Exports >10,000 rows trigger background job + email notification. Each export recorded in Audit Log.

**16 — PDF Invoice Download** `Frontend`
Client-side generated (e.g. jsPDF/pdfmake), no server round-trip. Includes invoice number, billing details, line items, payment status. GST (18%) broken out separately, grand total. Filename: `INV-{number}_{date}.pdf`. Print-ready: A4, 1" margins, current client logo in header.

**17 — Scheduled Report Delivery** `Backend` `Frontend`
Frequency: Daily/Weekly/Monthly. Each schedule captures a module view + saved filters at creation. Pause/resume without losing config. Email includes attached CSV + inline summary table. Recipients don't need a portal account. Audit log records each delivery (timestamp, recipient, status).

---

## SECTION G · Responsive & Layout Guidelines

All features must be built responsively from day one, viewport-fit, no page-level scroll.

**Breakpoints**

| Name | Width | Key Layout Changes |
|---|---|---|
| Mobile | ≤ 768px | Single-column; nav → full-screen overlay; dropdowns → bottom sheets; header filters collapse to single "Filters" button |
| Tablet | 769–1024px | Two-column grid where applicable; sidebar collapses to icon-only by default; tables scroll within own panel |
| Desktop | ≥ 1025px | Full layout; sidebar expanded by default; multi-column grids; all filters visible in header |

**Layout & Scroll Rules**
- No horizontal scroll on any viewport — `overflow-x: hidden` on root; wide tables scroll inside their own container only.
- No page-level vertical scroll — app shell (header + sidebar + content) fits viewport (100vh); scrolling happens inside panels/tables/lists.
- Use pagination, tabs, and drill-downs instead of long pages.
- CSS Grid and Flexbox exclusively — no fixed-width pixel layouts.
- Touch targets ≥ 44×44px on mobile.
- Minimum 14px body text on all screen sizes.
- Images/media: always `max-width: 100%`.
- Dashboard widgets reflow to single column on mobile; drag-and-drop reordering may become list-based reordering (Manage Widgets drawer) on touch devices.
- Test every screen on Chrome DevTools mobile emulation before marking a feature complete.

---

## SECTION H · Technology & Architecture Standards

**Standard Stack**

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (React) | SSR/SPA hybrid; CSS variables for theming; responsive from day one |
| Backend | Java Spring Boot | REST APIs; RBAC middleware; NotifyX notification engine; scheduled jobs |
| Database | PostgreSQL | Tenant-scoped schema; JSONB for config/preferences where useful |

**Architecture Rules**
- Multi-tenant by design: single codebase/deployment serves multiple clients; every table/row tenant-scoped, every API call tenant-resolved from session — no per-client forks.
- Per-tenant configuration: theme (client website theme as default), logo, modules, roles, notification rules, defaults all resolved from tenant config at session start.
- Responsive is mandatory: every feature ships working on mobile, tablet, desktop.
- Configuration over code: any behaviour that could vary lives in the database/config, editable from the UI.
- Security: session tokens in httpOnly cookies; all permission checks server-side; audit logging on by default.
- New prototypes start from this stack and structure — deviations need explicit sign-off.

---

## SECTION I · Implementation Checklist

Track build progress per feature; also usable as a gap-audit checklist for existing prototypes.

| # | Feature | Type | Responsive | Status |
|---|---|---|---|---|
| 01 | Client-Specific Theming (Client Website Theme) | Frontend + Backend | Yes | |
| 02 | Collapsible Left Navigation | Frontend | Yes | |
| 03 | Multi-Select Dropdowns | Frontend | Yes | |
| 04 | Global & Page-Level Filters | Frontend | Yes | |
| 05 | Dashboard Layout Customization | Frontend | Yes | |
| 06 | Personalized Dashboard w/ Graphs | Frontend + Backend | Yes | |
| 07 | Appearance Studio (Themes, Mode, Logo) | Frontend + Backend | Yes | |
| 08 | Login — OTP Based | Frontend + Backend | Yes | |
| 09 | Role-Based Access Control | Frontend + Backend | N/A | |
| 10 | Audit Logs | Frontend + Backend | N/A | |
| 11 | Notification Centre | Frontend + Backend | Yes | |
| 12 | NotifyX — Notification Configuration | Frontend + Backend | Yes | |
| 13 | Help Desk Panel | Frontend | Yes | |
| 14 | ChatBot | Frontend + Backend | Yes | |
| 15 | CSV Export (Every Page) | Frontend + Backend | N/A | |
| 16 | PDF Invoice Download | Frontend | N/A | |
| 17 | Scheduled Report Delivery | Backend | N/A | |
