# Implementation Plan: Surgical Design & UX Polish

Improve the professional feel of PesoTrace by fixing broken design tokens, adding subtle motion, and standardizing typography/copy. The goal is to move away from a "generic AI" feel towards a bespoke, high-end SaaS aesthetic.

## Objective
*   Fix broken CSS variables (e.g., `--gold`).
*   Implement missing animations (`fadeInUp`, `scaleIn`) for a smoother feel.
*   Clean up inline styles and standardize capitalization.
*   Enhance "high-signal" areas like empty states and primary actions.

## Key Files & Context
*   `client/src/styles.css`: Central hub for all design refinements.
*   `client/src/pages/Landing/LandingPage.jsx`: Remove inline styles and fix copy.
*   `client/src/pages/Dashboard/views/MainDashboard.jsx`: Improve empty states and typography.
*   `client/src/components/Common/ConfirmationModal.jsx`: Refine modal animations.

## Proposed Changes

### 1. Style System & Motion (`client/src/styles.css`)
*   **Fix Tokens:** 
    *   Define `--gold: #f59e0b;` (or a more sophisticated amber like `#d97706`).
    *   Add `--accent-glow: rgba(79, 70, 229, 0.15);` for better focus states.
*   **Add Animations:**
    *   `fadeInUp`: Subtle 10px translate with opacity.
    *   `scaleIn`: Sharp scale from 0.98 to 1.
*   **Typography:**
    *   Adjust `Inter` letter-spacing to `-0.01em` for body and `-0.02em` for headings.
    *   Fix `line-height` consistency across `p` and `span`.

### 2. Landing Page Refinement (`client/src/pages/Landing/LandingPage.jsx`)
*   **CSS Migration:** Move `style={{ color: ... }}` props to CSS classes (e.g., `.hero-title`, `.hero-lede`).
*   **Copy Standard:** Change "Modern Finance Tracking" to "Professional Finance Tracking" or similar high-value phrasing.
*   **Visual Polish:** Ensure the `PT` logo mark uses consistent padding and weight.

### 3. Dashboard UX Polish
*   **Empty States:** Update `MainDashboard.jsx` and `TransactionsView.jsx` empty states with better icons and actionable copy (e.g., "Add your first expense to see insights").
*   **Metric Cards:** Ensure amounts in `MainDashboard.jsx` use the `mono` class consistently.
*   **Consistency:** Fix "Monthly trend" vs "Monthly Trend" and similar case inconsistencies.

### 4. Component Refinement
*   **Modals:** Update `ConfirmationModal.jsx` to use the new `scaleIn` animation.
*   **Buttons:** Add a very subtle scale effect on `:active` state (`transform: scale(0.98)`).

## Implementation Steps

### Phase 1: Foundation (CSS)
1.  **Update `styles.css`:** Add missing tokens and define keyframe animations.
2.  **Refine Typography:** Apply global letter-spacing and line-height adjustments.

### Phase 2: Landing & Auth
1.  **Refactor `LandingPage.jsx`:** Clean up inline styles and standardize copy.
2.  **Refine `AuthScreen.jsx`:** Ensure alignment and spacing are pixel-perfect.

### Phase 3: Dashboard & Views
1.  **Polish `MainDashboard.jsx`:** Apply animations to Bento cards and fix empty states.
2.  **Polish `TransactionsView.jsx`:** Improve table row spacing and "mini-badge" styling.

## Verification & Testing
*   **Visual Check:** Ensure no text is invisible (check `--gold` usage).
*   **Motion Audit:** Verify animations are smooth and not distracting (keep duration < 300ms).
*   **Responsive Check:** Ensure the Bento grid and sidebar behave correctly on smaller screens.
