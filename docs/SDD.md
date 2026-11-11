# Provider Payment Planner — Software Design Description

## 1. Purpose and scope

Implement the supplied INTERA read-only payment planner with React and TypeScript. Preserve the starter architecture, public interfaces, platform primitives and sandbox. Match the SVG composition closely while using actual calculated values. All four sizes, parameters, errors and invalid data must work locally without customer servers. No backend, database, payment execution, authentication, global store or unrelated features are in scope.

This is the authoritative implementation specification. Developer documentation is English Markdown. Work proceeds by complete, verifiable tasks, without any line-count limit. Read this document before changes; update evidence after verification, never claim an unexecuted check passed.

## 2. Requirements and unresolved external inputs

The checked-in fixture actually contains 32 records, while README and the original total-count assertion say 30. Preserve all records; correct only that assertion to the actual source length. The N=14/N=20 checkpoints are unaffected.

The contractual requirements supplement README.md. Preserve original tests and source contracts. The SVG is a visual reference, not a calculation oracle: N=14 contains no invalid selected invoices despite its illustrative annotation.

The contractual DataSource YAML is absent from the repository. Use the supplied TypeScript contract and mock records provisionally. Before claiming YAML compliance, compare the supplied YAML fields, types, nullability and envelope, or record that it remains unavailable. Never invent a customer-provided YAML.

| Contract | Existing size | Grid | Approximate reference width |
| -------- | ------------- | ---- | --------------------------- |
| XL       | full          | 4×2  | 880px                       |
| L        | half          | 3×2  | 600px                       |
| M        | third         | 2×2  | 400px                       |
| S        | quarter       | 1×2  | 240px                       |

README proportions differ for L/M. Exercise both reference widths and contractual 4/3/2/1 columns. Row height and gaps are unspecified: use content-driven height, disclose this assumption and test constrained layouts. Exact two-row pixel compliance remains unverified.

## 3. Structure and dependency rules

| Location           | Ownership                                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| src/platform/      | Platform components, theme, shared formatting/readers and platform contracts |
| src/types/         | External DataSource contracts                                                |
| src/data/          | Static source fixtures                                                       |
| src/widget/        | Widget params, pure calculations, UI, scoped CSS and colocated tests         |
| src/sandbox/       | Demo controls and simulated data envelopes                                   |
| src/main.tsx       | Bootstrap and global style imports                                           |
| docs/              | SDD, developer instructions and decisions                                    |
| tests/e2e/         | Browser acceptance scenarios                                                 |
| Root configuration | Package, build, lint, formatting and test setup                              |
| .github/workflows/ | CI                                                                           |

### Adding a widget

Keep the flat src/widget structure. Use a consistent kebab-case prefix:

- `<widget-name>-params.ts`: config types and parsing.
- `<widget-name>-compute.ts`: pure calculations and result/runtime types.
- `<widget-name>.tsx`: public component and orchestration.
- `<widget-name>.module.css`: locally scoped widget styling using platform tokens. Component styles use CSS Modules; theme tokens and document defaults stay global in theme.css.
- `<widget-name>-<part>.tsx`: substantial internal UI responsibility, only when needed.
- `<widget-name>-<purpose>.ts`: focused internal helper or hook.
- `<widget-name>-<purpose>.test.ts`: logic tests.
- `<widget-name>.test.tsx`: interaction tests.

Preserve existing names. Register new widgets in the existing sandbox rather than adding applications or data-fetching layers. Component props belong to their component; do not create catch-all types modules. Platform code never imports widgets or sandbox. Compute never imports React, DOM, fixtures or sandbox. Only tests and sandbox import mock data; production widgets receive props. Widgets never import another widget's internals. Keep domain helpers local; promote only genuinely platform-owned responsibilities. Do not add generic utils/helpers/common dumping grounds or features/shared alternative trees. Document structural exceptions before implementation.

## 4. Configuration and interfaces

Preserve parsePaymentPlannerParams, computePaymentPlan, IPaymentPlannerWidgetProps and platform/source interfaces. Use existing readers where appropriate. All malformed fields fall back safely.

| Parameter             | Default                  | Rule                                                                             |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| description           | Provider Payment Planner | Trim description, then title                                                     |
| subtitle              | empty                    | Trim string                                                                      |
| size                  | full                     | full/half/third/quarter; explicit size prop wins                                 |
| selectedCount         | 10                       | Finite numeric value; round, clamp to zero                                       |
| currencyIds           | []                       | Unique finite numbers, preserve first occurrence; empty means all                |
| providerId            | all                      | Finite number or all                                                             |
| billingCycleId        | all                      | Finite number or all                                                             |
| amountFormat          | grouped                  | grouped/plain                                                                    |
| rowLimit              | 10                       | 10/25/50/100; nullish rowLimit uses maxRows; invalid explicit value uses default |
| showCustomerBills     | true                     | Strict boolean                                                                   |
| showProviderBreakdown | true                     | Strict boolean                                                                   |
| showSummary           | true                     | Strict boolean                                                                   |

Configuration numbers do not accept numeric strings; source amounts/ranks do through toFiniteNumber. Identifier validation follows the README table, without an extra positive-only constraint.

## 5. Calculation invariants

1. Filter by provider, cycle and currencies BEFORE selection.
2. Normalize rank and amounts, retaining original indices.
3. Sort finite rank ascending (invalid last), invoice ID ascending, then original index.
4. Runtime selectedCountOverride uses finite numeric values, rounded/clamped; otherwise config count. Clamp effective count to filtered queue length.
5. Select first N. Invalid provider amounts (null, zero, negative, nonnumeric/nonfinite) remain in position and are represented as null, never zero.
6. Exclude invalid selected amounts from sums and provider counts; increment invalidSelectedCount.
7. Aggregate separately by currency ID and provider/currency pair. Never convert or sum different currencies.
8. selectedProviderCount counts unique providers of valid selected invoices. Currency providerCount is likewise scoped.
9. Shares divide provider totals by that currency's total. Round only for display.
10. Currency totals sort by ID; provider breakdown sorts by amount descending, currency ID, provider ID.
11. queueItems includes the complete filtered/sorted queue; visibleQueueItems applies rowLimit without changing aggregates.
12. Customer bill exists only with a trimmed nonblank number and finite amount; zero/negative customer amounts are valid. Do not invent customer currency.
13. Never mutate source rows, arrays or config. Use ordinary numeric arithmetic consistent with the supplied number contract; test fractional amounts with tolerances.

Fixture checkpoints: N=14 → RUB 1248500, USD 103500, EUR 12600, GBP 11000, invalid 0. N=20 → RUB 1622500, USD 125500, EUR 22200, GBP 11000, invalid 2.

## 6. UI and interaction state

One container owns interaction state and calculates the plan. Reuse sections across sizes; no duplicated domain logic. Store only user intent, filter overrides, open invoice identity, active breakdown currency and disclosure state. Derive totals and queues.

Equivalent params objects, data refresh, theme and size changes preserve interactions. A changed external parameter resets only its matching override. Retain requested N across queue shrink/growth. Allow a temporary empty number draft; commit on blur/Enter, normalize nonnegative integers, revert invalid draft. Slider uses effective count; show requested count when clamped.

Details use provider/invoice identity rather than position. If the invoice disappears, show unavailable content; never substitute another invoice. If active currency disappears, use the first remaining currency; no currencies means empty distribution. Instances are independent.

User-entered controls (selection count, provider/cycle/currency filters and the breakdown currency) persist best-effort under one shared `localStorage` key (`payment-planner-controls`). A saved control stores the external-parameter signature it was entered against and restores only while that parameter is unchanged, so changed dashboard configuration still wins after a reload. The interaction setters write the full snapshot synchronously; no React state is stored or synchronized through effects. All widget instances share the key (the public contract carries no instance identity): mounted instances stay independent and the last writer defines the next session's starting values. Unavailable, blocked or corrupt storage degrades to a fresh default plan and never throws.

| Size    | Content                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| full    | Stats, filters, slider + numeric input, all totals, currency-selectable breakdown, progressive table and details |
| half    | Selected/total, slider, all totals, provider count and full-queue action                                         |
| third   | Selected/total, all totals, compact currency-selectable breakdown and details action                             |
| quarter | Selected/total, first two currency totals, explicit remaining count and disclosure                               |

Use one accessible dialog for full queue and invoice details, with internal back navigation rather than nested modals. Queue tables expose filtered rows progressively in batches of 15, observing the fifth row from the rendered end. The public compute result retains its rowLimit slice for existing callers. No arbitrary invoice selection. Display-only table sorting is independent of the ranked planning order. Use stable provider colors, text equivalents for distribution and precise currency labels.

showSummary hides summary statistics/currency totals but retains selection-control indicators. Invalid-selected warnings remain visible. showProviderBreakdown and showCustomerBills apply in expanded views too. Preserve the provided header/freshness primitives and theme tokens. Match SVG composition closely; correct illustrative text where actual calculations differ.

## 7. Data lifecycle and accessibility

- loading && !loaded: skeleton.
- error !== null && !loaded: error, unless initial loading is active.
- !loaded with no loading/error: neutral waiting.
- loading && loaded: retain mounted content and show update status.
- loaded with error: retain data, nonblocking warning, optional technical details.
- stale: platform FreshnessMark.
- Distinguish empty source, no filter matches, zero selection and selection with no valid amounts.

Use semantic labels, visible focus, keyboard access and non-color warnings. Native modal dialog supports focus containment, Escape and restoration; verify in a real browser. Avoid fake retry buttons without a retry contract. Respect reduced motion. Prevent page overflow; table scrolling is allowed in a labeled region.

## 8. Code quality

- Extend existing architecture; no speculative layers, abstractions or dependencies.
- Keep parsing, compute, presentation and simulation separate.
- Use precise names, straightforward control flow, focused functions and explicit unknown narrowing.
- No any, suppression directives or assertions to bypass validation.
- Comments are exceptional: explain non-obvious constraints/trade-offs, not obvious code. New/modified comments and JSDoc must be English. Preserve useful contract documentation.
- Do not store derived values or synchronize them through effects. Effects are for external systems such as dialog DOM behavior.
- Never alter fixtures or weaken tests to obtain passing results.
- Remove temporary code and unused imports; verify actual behavior honestly.

## 9. Tooling and execution

Keep React/TypeScript/Vite/Vitest/CSS. No TanStack Query: collection ownership is external. Add Testing Library/user-event/jsdom, Playwright, ESLint TypeScript/React Hooks, Prettier, lockfile and CI. Node 24 LTS is the documented target. Runtime is fully local with no credentials, customer network requests or remote assets.

One task per execution unit; no line-count limit. Read SDD, inspect changes, implement, test, record evidence, then move to the next task. Split only along meaningful responsibilities. Automated generated files are not application source.

## 10. Traceability and verification evidence

| Requirement                                      | Verification                                   |
| ------------------------------------------------ | ---------------------------------------------- |
| All params/defaults/aliases                      | Parameter unit tests                           |
| Filter → sort → select                           | Original and adversarial compute tests         |
| Invalid amounts retain position, excluded totals | Null/zero/negative/text/nonfinite cases        |
| Multi-currency/provider shares                   | Fixture checkpoints and fractional invariants  |
| Customer bill rules                              | Blank/nonfinite/zero/negative cases, UI flags  |
| Immutability and rowLimit independence           | Frozen-input and limit tests                   |
| Four sizes and themes                            | Browser matrix and reviewed screenshots        |
| Selection/filter interactions                    | Component and browser workflows                |
| Refresh preserves open details/selection         | Replacement-array transition tests             |
| Compact currencies remain accessible             | Quarter disclosure tests                       |
| Error/empty/stale/loading                        | State matrix and transition tests              |
| Persisted user controls                          | Storage tests, reload component/browser checks |
| Accessible modal                                 | Browser keyboard/focus checks                  |
| Local operation                                  | Browser network observation                    |
| English docs and clear architecture              | Documentation/source audit                     |
| YAML compliance                                  | Unverified: external YAML unavailable          |
| Exact grid height                                | Unverified: contractual row height unspecified |

Baseline and final executed results will be recorded here as work progresses. Remote CI results must not be claimed without an actual completed run.

### Baseline evidence

Original run: typecheck and build passed; 2 original tests passed and 3 compute-placeholder tests failed. Installed existing dependencies without audit findings. Host Node is 25.6.1; documented/CI target is Node 24 LTS.

### Domain and interaction evidence

59 Vitest tests pass, including fixture totals, malformed inputs, queue ordering, currency separation, immutable inputs, controls, refresh/replacement arrays, disappeared invoices, external overrides, flags, compact disclosure, independent instances and lifecycle states. Typecheck passed after UI assembly. Actual fixture has 32 rows; the original stale count assertion now uses rows.length, with all other original assertions preserved. Native dialog focus behavior still requires browser verification.

### Browser and visual evidence

All 12 Chromium scenarios passed: planning, native modal focus/Escape/restoration, refresh with open details, visibility flags, 8 size/theme combinations, 375px viewport overflow checks, contractual grid, independent instances and initial/empty/stale states. No external runtime requests were observed in the primary workflow. Screenshots for all four sizes in light/dark were inspected; provider-color collisions were corrected using a stable seven-token palette. Content-driven height remains the explicit grid assumption. This is a visual review, not a claim of pixel-identical output.

Two pre-existing platform files received formatting-only changes so repository-wide formatting checks pass. Runtime platform behavior is unchanged. ESLint was upgraded to a supported release. A targeted minimatch ^11.0.1 override resolves the dev-tool glob-amplification advisory GHSA-g3hv-75wg-m249; npm install reports zero vulnerabilities after the override. Remote CI has not been run.

### Final acceptance — 2026-11-10

Verified on **Node 24.22.2**, the declared LTS target:

- `npm run format:check`: passed.
- `npm run lint`: passed, including React Hooks rules.
- `npm run typecheck`: passed.
- `npm test`: **62 tests passed across 5 files**.
- `npm run build`: passed; production bundle generated.
- `npm run test:e2e`: **12 Chromium tests passed**.
- Primary browser workflow observed no external requests and no page errors.
- Dependency installation/audit after the targeted override: **0 vulnerabilities**.
- `git diff --check`: passed. Source fixture and external schema were not changed.

All locally implementable roadmap tasks A1–G3 are complete. The checked-in CI workflow runs the same gates on Node 24, but remote CI has not been executed in this session. YAML equivalence and exact contractual grid row height remain explicitly unverified external inputs, not implemented substitutes. No deployment or repository push was performed.

### User control persistence (H1) — 2026-11-10

Added best-effort `localStorage` persistence for user-entered controls (selection count, provider/cycle/currency filters, breakdown currency) behind the signature-guard rule agreed for this task: a saved control restores only while the external parameter it was entered against is unchanged. Verified locally:

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **72 tests passed across 6 files** (10 new: 6 storage unit tests, 4 component persistence tests).
- `npm run build`: passed.
- `npm run test:e2e`: **13 Chromium tests passed**, including a new reload scenario that restores the saved count, provider filter and breakdown currency after `page.reload()`.
- `git diff --check`: passed.

The vitest jsdom environment exposes `localStorage` without the Storage methods, so the component test file installs an explicit in-memory implementation; production code uses the real browser storage and degrades silently when it is unavailable.

### Filter reset and sandbox preferences — 2026-11-10

Resetting filters writes one snapshot with all three filters cleared. The selected count and breakdown currency retain their current values. The sandbox persists the theme and active size view separately from the planner controls. With no valid saved theme, the sandbox uses the browser color preference at startup. With no valid saved size, it uses full.

Verified on Node 25.6.1. `npm run check` passed, including formatting, lint, typecheck, 72 Vitest tests and the production build. All 14 Chromium scenarios passed with local server access, including a reload after one reset with all three filters set, dark theme and the half view. `git diff --check` passed.

### Sandbox data mode persistence — 2026-11-10

The sandbox stores the selected data mode under `payment-planner-data-mode`. Missing or invalid values fall back to `ready`. The mode buttons and storage validation use the same list of supported values.

Verified with `npm run check` (72 Vitest tests, formatting, lint, typecheck and production build) and all 14 Chromium scenarios. The reload scenario confirms that the stale mode remains selected and the widget displays its stale indicator. `git diff --check` passed.

### Sandbox titles by size — 2026-11-10

The sandbox supplies the reference title for each widget size in both single and four-size previews. A nonblank title entered in the description field overrides the preview defaults. The widget's public title contract stays the same.

Verified with `npm run check` and all 15 Chromium scenarios, including default titles in the four-size preview and a custom title in the single preview. `git diff --check` passed.

### Browser color preference — 2026-11-10

The sandbox checks `prefers-color-scheme: dark` on startup and gives a valid theme in localStorage priority. Verified with `npm run check` and all 16 Chromium scenarios. The theme scenario covers both browser color preferences and a saved light theme overriding a dark browser preference after reload. `git diff --check` passed.

### Sandbox parameter reference — 2026-11-10

The sandbox sidebar presents the ten parameters from the SVG reference in a two-column table with a themed header. The existing demo form is available under a collapsed settings disclosure. Verified with `npm run check` and all 16 Chromium scenarios, including the reference row count and editing after opening the disclosure. `git diff --check` passed.

### README implementation audit — 2026-11-10

Reviewed the README against the parser, compute layer, widget compositions and lifecycle tests. On Node 25.6.1, `npm run check` passed (72 Vitest tests), all 16 Chromium scenarios passed, and `git diff --check` passed. The fixture contains 32 rows, six providers and four currencies. The queue table displays the related customer bill number and customer name, while its amount is shown in invoice details. Freshness is rendered for loaded data only. The external DataSource YAML and exact grid row height remain unavailable.

### Component CSS Modules — 2026-11-11

Widget, sandbox, card and freshness component styles use .module.css imports and locally scoped class mappings, including conditional size and status classes. Theme tokens and document defaults stay global in theme.css. Vite client declarations provide CSS Module import types. Browser checks use accessibility attributes and preview size markers instead of global class selectors.

Verified with npm run check (72 Vitest tests, formatting, lint, typecheck and production build) and all 16 Chromium scenarios, covering both themes, four sizes, the grid and modal interactions. A final typecheck after simplifying class expressions passed. git diff --check passed.

### UI refinement scope — 2026-11-11

Shared searchable selects and a modal shell belong to src/platform because the sandbox settings and planner dialogs both use them. Widget-specific content remains in the flat widget tree. The sandbox uses the same fluid full-width slot in single and four-size previews. Parameters move to a modal drawer opened from the toolbar.

### UI refinement verification — 2026-11-11

Completed the requested UI batch. The single full preview and the full grid slot now have the same fluid width. Settings open from a top-right icon in an animated modal drawer without reserving layout width. The header uses the active theme. Shared platform ModalDialog and SearchSelect components provide backdrop dismissal, keyboard focus handling, filtered options and reusable styling through CSS Modules. Native popovers place option lists above scroll containers. Escape closes an open option list before its surrounding dialog. Reduced-motion preferences disable animations.

The modal shell clips its outer bounds and scrolls only its body. Full-queue tables use that body for vertical scrolling, while card tables retain their height limit and horizontal scrolling. Thin themed scrollbars remain inside rounded boundaries. An explicit browser check reaches the last queue row, verifies a bottom gap below 40px and keeps the dialog heading visible.

Verified on Node 25.6.1 with npm run check (72 Vitest tests, formatting, lint, typecheck and production build) and all 18 Chromium scenarios. Two additional browser scenarios exercise the requested behavior in light and dark themes and a 375px viewport. Reviewed screenshots of the settings drawer, open search list and queue bottom. The two refinement scenarios were rerun successfully for final visual captures with animations disabled. git diff --check passed.

### Progressive queues, keyboard layout search and stable scrolling — 2026-11-11

Both queue views consume the full filtered queue and render 15 rows initially. An IntersectionObserver rooted in the table viewport watches the fifth row from the rendered end and reveals the next 15. The final batch is naturally truncated. Filter changes start a fresh 15-row view; selection changes and refreshed rows retain progress. Repeated notifications for the same threshold cannot append a batch twice. The public compute API keeps visibleQueueItems and rowLimit for existing callers; the UI now uses progressive rendering instead of that slice. No remote request is implied because the host already supplies the entire collection.

Search compares the literal query and both RU/EN keyboard conversions, with direct matches taking priority over converted ones. Exact matches precede prefixes and substring matches, and ties preserve source order. Search supports case, shifted layout punctuation, mixed scripts, reordered words, Unicode normalization and ё/е. This is keyboard-layout correction, not phonetic transliteration.

Table viewports have stable responsive heights and contain wheel/touch overscroll, including short queues. Modal opening locks document scrolling with stable scrollbar gutters and restores it on close. The queue modal stays at a fixed top offset and viewport-bounded height; summary panels reserve space for changing currency counts. Empty full queues retain their table viewport. Table hints explain local scrolling and progressive loading.

Verified on Node 25.6.1 with npm run check (77 tests across seven Vitest files, formatting, lint, typecheck and build) and all 19 Chromium scenarios. Five new unit tests cover search ranking and layout correction. The progressive-queue browser scenario covers 15 → 30 → 32 rows, the five-row threshold, filter reset, wrong-layout search in both directions, main/modal scroll containment, short queues and stable table/modal bounds. That scenario was also rerun successfully after the final observer update. Reviewed light-theme screenshots of the card and queue modal. git diff --check passed.

### Modal closing animation — 2026-11-11

Closing requests now fade the still-open modal and its backdrop while preserving the current title, body and geometry. The controlled close callback runs after the shell animations finish. Native close, scroll unlocking and focus restoration run in the layout-effect cleanup before paint. Closed dialogs have no exit transition that could expose an empty or resized shell. Repeated close requests are ignored; reduced-motion users close immediately.

Verified with npm run check (77 Vitest tests, formatting, lint, typecheck and build) and all 20 Chromium scenarios. A new frame-by-frame regression checks queue, invoice and settings dialogs throughout closing: content and dimensions stay unchanged, the window never jumps upwards, focus returns, and reduced-motion dismissal completes. git diff --check passed.

### Stable plan notices — 2026-11-11

Invalid-amount warnings, refresh progress and refresh errors share a persistent status area near the selection controls, below the compact count in smaller cards. The area displays a neutral explanation when no warning applies. Its responsive bounded height stays constant as messages change; overflow and technical details scroll inside it. The same PlanNotice component is used in card, queue and invoice views, including when summary blocks are disabled. Removed the conditional banners above the card content.

Verified with npm run check (77 Vitest tests, formatting, lint, typecheck and build) and all 21 Chromium scenarios. The new regression compares exact table and summary bounds before and after an invalid selection, a refresh error, expanded technical details and removal of a warning in the queue modal. Reviewed the full light card screenshot. git diff --check passed.

### Table-only scroll containment — 2026-11-11

Overscroll containment applies only to queue table viewports. Summary panels, notices and select lists pass scrolling to their surrounding page or modal body at their boundaries. An open modal still locks document scrolling until it closes.

Verified with npm run check (77 Vitest tests, formatting, lint, typecheck and build) and two targeted Chromium scenarios. The new regression confirms page scrolling over provider summaries and notices and modal-body scrolling over a notice. The progressive-queue regression confirms containment at both table boundaries, including short queues and modal tables. git diff --check passed. The full browser suite was not rerun for this adjustment.

### Reference card composition refinement — 2026-11-11

Aligned the card composition with reference-layout.svg and the supplied screenshots. The half card uses a compact percentage slider, a currency summary with bill counts, provider/oldest-selected-invoice metadata and a bottom action. The third card uses an unboxed count, plain currency amounts and a compact provider share bar; provider text equivalents remain available to assistive technology. The quarter card shows a single-number selection badge, currency count, the first two currencies, an explicit named remainder and an all-currencies action. Compact sandbox headers omit the previous default integration subtitle. Explicit widget subtitles remain supported.

Removed the previous 304px summary boxes in favor of per-size content budgets. Half, third and quarter previews retain their nominal width caps in the four-size grid. The grid still follows the contractual 4/3/2/1 spans. Compact status messages occupy one small fixed row and reveal details in a nonmodal popover, preserving stable card heights. Full-card totals/distribution now appear immediately below the statistics. The fixture and all computed amounts remain intact, including its actual 32-row count.

Presentation orders known currencies RUB/USD/EUR/GBP and shows currency symbols. Compact integer totals omit redundant decimals; fractional totals and plain formatting retain their precision. Oldest selected invoice metadata is calculated by a pure helper in the compute module, without changing the existing result interface.

Verified with npm run check (79 Vitest tests across seven files, formatting, lint, typecheck and build) and all 23 Chromium scenarios. Two new unit regressions cover currency precision/labels and the oldest selected valid date. The new compact-card browser scenario checks percentages, metadata, currency disclosure and warning popovers without resizing. Reviewed light/dark size screenshots and dedicated closed half/third/quarter captures against the reference. git diff --check passed.

### Explicit modal height — 2026-11-11

ModalDialog accepts an optional viewportHeight flag, false by default. PlannerDialog forwards it and the planner enables it only for the full queue. Queue height no longer depends on finding a table in the modal body. The settings drawer retains its full viewport height, while invoice details use content-driven height with the existing viewport limit. Drawer sizing takes precedence if both flags are supplied.

Verified on Node 25.6.1 with npm run check (79 Vitest tests across seven files, formatting, lint, typecheck and production build). Three targeted Chromium scenarios passed: explicit drawer/queue/invoice heights at 1440px and 375px widths, back navigation, Escape, focus restoration and the existing closing-animation regression. git diff --check passed. The complete browser suite will be run after the separately requested CSS and typechecking cleanup.

### CSS organization and stricter typechecking — 2026-11-11

Grouped widget styles by UI responsibility, with size variants and container queries next to their related blocks. Consolidated repeated selectors and removed unused provider-count, dialog-header and scroll-hint styles. Existing class names and effective presentation are preserved. The sandbox validates amount formats and row limits against AMOUNT_FORMATS and WIDGET_ROW_LIMITS rather than asserting types, uses the shared row-limit list for options, and checks the fixture through a readonly typed assignment. TypeScript now rejects unused locals/parameters and includes E2E tests and root TypeScript configuration files in the standard typecheck.

Verified on Node 25.6.1:

- npm run check passed: formatting, lint, expanded typecheck, 79 Vitest tests across seven files and production build.
- The full npm run test:e2e suite passed: 25 Chromium scenarios, including both new explicit-height regressions, the four sizes, both themes, mobile layouts, modal closing, focus and scrolling.
- All 24 before/after widget screenshots were byte-identical: full/half/third/quarter in light/dark themes at 1440px, 700px and 375px widths. Screenshots were captured after the modal fix and before CSS cleanup, then compared after the final CSS cleanup with animations disabled.
- A static check confirmed no repeated top-level widget selectors and confirmed that the standard TypeScript configuration includes the E2E file and all three root TypeScript configs.
- git diff --check passed. No calculation, source fixture or persistence behavior was changed by these tasks. Node 24 was not available in the inspected local runtime locations, so these results do not claim a fresh Node 24 run.

### Sortable queue headers and bounded table overflow — 2026-11-11

Each queue column has a keyboard-accessible header button and aria-sort state. Clicking toggles ascending/descending presentation order across the full filtered collection before progressive slicing. Changing sort starts again at 15 rows and resets the table scroll position. Numeric amounts are compared as displayed nominal values, dates chronologically and labels with natural text comparison. Missing/invalid values stay last in both directions; ties retain ranked queue position. Selected flags, calculations and the public planning order remain intact.

Queue viewports now establish a positioned layout/paint containment boundary. Absolutely positioned screen-reader text remains within the table scroll area instead of extending document overflow as rows are revealed or scrolled.

Verified with npm run check (81 Vitest tests across eight files, formatting, lint, typecheck and build) and all 26 Chromium scenarios. New unit tests cover numeric sorting, invalid amounts, date/text sorting, stable selection and input immutability. The browser regression verifies header toggles in both queue views, initial page size after sorting, unchanged selection and identical document/card heights after revealing all 32 rows. git diff --check passed.

### Filter reset also restores ranked table order — 2026-11-11

Reset filters increments an explicit queue-reset version, shared by the card and modal table keys. Both table views restore ascending queue position, the first 15 rows and scroll position even when filters already have their default values. Selected count and the existing atomic storage snapshot behavior are preserved.

Verified with npm run check (81 Vitest tests, formatting, lint, typecheck and build) and three targeted Chromium scenarios covering sorting, persistence and reset of both table views with unchanged default filters. git diff --check passed. The full browser suite was not rerun for this adjustment.

### Fresh README audit — 2026-11-11

Reviewed README requirements against parameter parsing, pure computation, all four widget compositions, customer details, data lifecycle handling and the corresponding unit/component/browser tests. No critical README business-rule failures were found. The source fixture and external source types remain unchanged; the original total-count assertion uses the actual fixture length of 32 rather than the README's stated 30.

The UI intentionally follows the later progressive-table requirement: 15 initial rows and subsequent batches of 15. rowLimit/maxRows still parse correctly and control computePaymentPlan.visibleQueueItems, but do not limit the rendered table. This differs from the configuration interface's original maximum-displayed-rows documentation. The sandbox follows SDD's 4/3/2/1-column spans rather than README's literal half/third fractions. These are documented scope decisions, not evidence of literal equivalence to every original presentation contract. External YAML equivalence and exact grid row height remain unverified.

Fresh verification on Node 25.6.1: npm run check passed (formatting, lint, typecheck, 81 Vitest tests across eight files and production build). The complete npm run test:e2e suite passed all 27 Chromium scenarios, including the latest filter-reset regression. The initial sandboxed browser attempt could not bind 127.0.0.1:4173 (EPERM); the permitted local-server rerun completed successfully. git diff --check passed before this evidence entry. No fresh Node 24 or remote CI run was performed. This audit changes documentation only.

### GitHub Pages workflow — 2026-11-11

Added a separate deploy-pages.yml workflow for pushes to main and manual dispatch. Its Node 24 build runs npm ci, the full local quality command and Chromium acceptance tests before uploading dist. A dependent deployment job uses the github-pages environment and scoped Pages/OIDC write permissions. Builds have read-only contents/Pages access; deployments are serialized without cancelling a running publish. Existing push/PR quality checks remain in place. Vite uses relative production asset URLs so repository renames, project subpaths and root deployments do not require a hardcoded base path. README and the development guide describe the one-time GitHub Actions publishing-source setting and manual reruns.

Verified locally on Node 25.6.1: npm run check passed (formatting, lint, typecheck, 81 Vitest tests and build); all 27 Chromium scenarios passed. A production-output check confirmed that both emitted JS/CSS assets exist and their relative URLs resolve beneath /, /INTERA-Task-2/ and /renamed-repository/. The workflow YAML parsed successfully and its build-to-deploy dependency was checked. git diff --check passed. These are local results; no repository push, GitHub Actions run or live Pages deployment was performed.

### Faster Pages deployment — 2026-11-11

Removed Chromium installation and browser tests from the Pages build at the user's request. npm run check still gates publication. The separate ci.yml continues to install Chromium and run the browser suite; deployment does not depend on its completion. Updated the deployment guide accordingly.

Verified formatting for the workflow and deployment guide, parsed both workflow YAML files, checked that the deploy build retains npm run check without Playwright steps and that the quality workflow retains npm run test:e2e. git diff --check passed. Application code is unchanged; application tests and remote workflows were not rerun for this configuration-only adjustment.
