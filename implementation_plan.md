# Implementation Plan: Redesigned Retail Command Center Dashboard

We will rebuild and redesign the Retail Command Center dashboard with premium UI/UX, glassmorphic card elements, dynamic shadow glows, and detailed layout controls. We will also implement the placeholder "Inventory" and "Settings" views to complete the application workspace.

## User Review Required

> [!IMPORTANT]
> The redesign will introduce a modern responsive dashboard grid layout. If you have specific preferences for color accents (e.g. default deep blue/slate vs dark indigo/emerald), please let us know. Otherwise, we will use a premium deep slate/blue theme with status glows.

## Open Questions

- Would you like a global Dark Mode toggle, or should the app stick to a polished light-slate theme with micro-glows?

---

## Proposed Changes

### 1. Sidebar & Layout Redesign
#### [MODIFY] [Sidebar.tsx](file:///d:/Kerja/belajar%20golang/go-retail-aggregator/frontend/src/components/layout/Sidebar.tsx)
- Restyle with a dark premium aesthetic, utilizing rounded tabs and active gradient backdrops.
- Add an interactive badge for status connectivity (showing active API health).
- Style the user profile box at the bottom to look like a glass card with interactive tooltips.

#### [MODIFY] [Navbar.tsx](file:///d:/Kerja/belajar%20golang/go-retail-aggregator/frontend/src/components/layout/Navbar.tsx)
- Style the mobile navbar to use `backdrop-blur-md` and sticky floating coordinates.

### 2. Dashboard Page Upgrades
#### [MODIFY] [page.tsx](file:///d:/Kerja/belajar%20golang/go-retail-aggregator/frontend/src/app/page.tsx)
- **Control Bar**: Wrap search, sort, and category filtering into a unified filter bar.
- **Quick Statistics Cards**: Insert four key indicator cards at the top:
  - **Total Aggregated Stock**: Animated ticker.
  - **Connection Success Rate**: Progress bar showing active/total sources.
  - **Average Network Latency**: Average ms computed dynamically across active suppliers.
  - **Active Suppliers count**: Showing active vs disabled.
- **Visual Network Health**: Upgrade the network latency health chart with clean grid lines, dynamic tooltips, and hover highlights.
- **Filtering Logic**: Enable client-side search, status filtering, and sorting (by name, stock, or latency).

### 3. New Application Views
#### [NEW] [page.tsx](file:///d:/Kerja/belajar%20golang/go-retail-aggregator/frontend/src/app/inventory/page.tsx)
- Create a premium inventory aggregation table displaying:
  - Item SKU & Product Name.
  - Supplier origin (with matching status indicator).
  - Individual stock levels.
  - Quick action buttons to manually trigger a sync fetch for that specific supplier.

#### [NEW] [page.tsx](file:///d:/Kerja/belajar%20golang/go-retail-aggregator/frontend/src/app/settings/page.tsx)
- Create an administrative configuration panel displaying:
  - Default Timeout threshold sliders.
  - Refresh Interval toggles.
  - Logging levels select.
  - Aggregator simulator switch (mocking server failure scenarios).

---

## Verification Plan

### Automated Tests
- Build verification: Run `npm run build` in the `frontend` folder to guarantee typescript compatibility and layout configuration correctness.

### Manual Verification
- Start Next.js development server locally.
- Test client-side search input, sorting selections, and status filters.
- Toggling settings and checking if they persist.
- Switch between Dashboard, Suppliers, Inventory, and Settings pages.
