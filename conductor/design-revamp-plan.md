# Implementation Plan: Design Revamp (Modern SaaS / Bento)

Revamp the PesoTrace application design from a generic AI-generated aesthetic to a professional, "Modern SaaS / Bento" look. This includes a sidebar-driven layout, a refined color palette, and a dynamic Bento-style dashboard grid.

## Objective
*   Eliminate the "AI generic" feel (repetitive panels, heavy glassmorphism, dated colors).
*   Implement a professional fintech aesthetic: clean, data-rich, and high-contrast.
*   Transition to a sidebar-led navigation system.

## Key Files & Context
*   `client/src/styles.css`: Global styles and design tokens.
*   `client/src/App.jsx`: Main entry point and layout shell.
*   `client/src/pages/Dashboard/Dashboard.jsx`: Dashboard layout and navigation.
*   `client/src/pages/Dashboard/views/MainDashboard.jsx`: The primary dashboard view.
*   `client/src/components/Sidebar.jsx`: New component for sidebar navigation.

## Proposed Changes

### 1. Style & Design Tokens (`client/src/styles.css`)
*   **Color Palette Update:**
    *   Primary: Indigo (`#4f46e5`) instead of Teal.
    *   Background: Clean White/Gray (`#fcfcfd`) instead of Cream.
    *   Surfaces: Pure white with sharp, subtle borders (`#e5e7eb`).
*   **Typography:**
    *   Tighten font sizes; reduce `h1` impact for a more sophisticated feel.
    *   Introduce monospaced font family for currency values.
*   **Refinement:**
    *   Reduce `backdrop-filter` and `blur` usage.
    *   Replace mesh gradients with subtle solid backgrounds or soft vignettes.

### 2. Layout Overhaul
*   **Sidebar Navigation:** Create a fixed sidebar for desktop and a bottom bar for mobile.
*   **App Shell:** Refactor `App.jsx` and `Dashboard.jsx` to accommodate the new sidebar-centric layout.

### 3. Bento Dashboard (`client/src/pages/Dashboard/views/MainDashboard.jsx`)
*   **Grid System:** Transition from a 2-column layout to a CSS Grid-based Bento layout.
*   **Metric Cards:** Refactor to be more compact, focusing on clear typography and high-signal data visualization.
*   **Recent Activity:** Redesign as a clean list without heavy panel borders.

### 4. Component Refinement
*   **Buttons:** Update to a flatter, more modern style (subtle borders, sharp colors).
*   **Inputs:** Clean up focus states and padding.

## Implementation Steps

### Phase 1: Foundation (CSS & Layout)
1.  **Modify `styles.css`:** Update `:root` variables for the new palette and typography.
2.  **Create `Sidebar.jsx`:** Implement a new navigation component in `client/src/components/Layout/Sidebar.jsx`.
3.  **Update `Dashboard.jsx`:** Refactor the main layout to include the Sidebar and a main content area.

### Phase 2: Dashboard Revamp
1.  **Modify `MainDashboard.jsx`:** 
    *   Implement the Bento grid structure.
    *   Redesign the "Summary Hero" into a "Summary Card" that fits the grid.
    *   Refactor `MetricCard` rendering for the new style.
2.  **Update `TransactionsView.jsx`:** Adjust the table styling for a "borderless" look with better row highlights.

### Phase 3: Polish & Global Components
1.  **Refine `ConfirmationModal.jsx`:** Update styles to match the new minimalist theme.
2.  **Update `AuthScreen.jsx`:** Ensure the login/register screens align with the new branding.

## Verification & Testing
*   **Visual Audit:** Compare the new UI against the "Modern SaaS" inspiration (Mercury/Linear).
*   **Responsive Check:** Ensure the Bento grid collapses gracefully on mobile.
*   **Navigation Test:** Verify that all sidebar links work and reflect the active state correctly.
*   **Theme Toggle:** Verify that the "Dark Mode" still works and looks professional with the new tokens.

## Migration & Rollback
*   The change is purely visual (CSS/JSX). No database migrations are required.
*   Rollback can be achieved by reverting to the previous git commit.
