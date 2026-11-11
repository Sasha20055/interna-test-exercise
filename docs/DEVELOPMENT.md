# Development guide

## Local setup

Use Node 24 LTS (see `.nvmrc`) and npm. The runtime uses bundled fixtures; no customer servers, credentials, API keys, remote fonts or third-party services are required.

```sh
nvm use
npm ci
npm run dev
```

Open the Vite URL printed in the terminal. The sandbox starts with 14 selected invoices. Its controls change configuration, data state, theme and widget size. “Все 4” displays independent widget instances using contractual 4/3/2/1-column spans. On small screens the demo stacks cards for usability.

To inspect the production build:

```sh
npm run build
npm run preview
```

## Verification commands

| Command                | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `npm test`             | Pure calculation/parameter tests and jsdom interaction tests |
| `npm run test:watch`   | Watch Vitest tests                                           |
| `npm run typecheck`    | TypeScript source checks                                     |
| `npm run lint`         | ESLint and React Hooks checks                                |
| `npm run format:check` | Formatting verification                                      |
| `npm run format`       | Apply formatting deliberately                                |
| `npm run build`        | TypeScript build and production Vite bundle                  |
| `npm run check`        | Formatting, lint, typecheck, Vitest and build                |
| `npm run test:e2e`     | Chromium browser acceptance suite                            |

Install the browser once before E2E testing:

```sh
npx playwright install chromium
npm run test:e2e
```

On Linux CI, use `npx playwright install --with-deps chromium`. Playwright starts a local Vite server on port 4173 and checks real modal focus, local-only operation, planning interactions, both themes, four sizes, small viewports and background refresh. Reports are written to `playwright-report/`; screenshots and failure traces are in `test-results/`. These generated directories are ignored by Git.

## GitHub Pages deployment

The workflow `.github/workflows/deploy-pages.yml` publishes the sandbox after each push to `main`. It also supports manual runs from the Actions tab. It uses Node 24, installs the lockfile with `npm ci`, runs `npm run check`, then uploads `dist` and deploys it through the official GitHub Pages actions. Deployment runs only after these checks succeed. For faster deployment, browser installation and Chromium tests run only in the separate quality workflow on pushes and pull requests; Pages deployment does not wait for that workflow.

After uploading the project to a GitHub repository:

1. Open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
2. Push to `main`, or run **Actions → Deploy GitHub Pages → Run workflow** on `main` if the code was already pushed before enabling Pages.
3. Open the site URL shown by the `github-pages` deployment environment after the workflow succeeds.

No personal access token or repository secret is required; deployment uses the built-in `GITHUB_TOKEN` and OIDC permissions. Repository or organization policies must allow GitHub Actions and Pages. If the default branch is renamed, update the workflow's `push.branches` entry and the Pages environment's deployment branch policy.

Vite uses `base: './'` so the production asset URLs resolve beneath both a repository path such as `/INTERA-Task-2/` and a root/custom-domain deployment without hardcoding a repository name. The sandbox has no client-side routes requiring server rewrites.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite public base path configuration](https://vite.dev/config/shared-options.html#base).

## Architecture

Read [SDD.md](SDD.md) for the authoritative contracts, placement rules, acceptance matrix and roadmap.

The host passes `params`, a collection `data` envelope and an optional explicit `size` to `PaymentPlannerWidget`. The parameter parser supplies validated defaults. Local overrides produce an effective configuration. `computePaymentPlan` filters, sorts, selects and aggregates immutable inputs. Presentation components consume its result; they never recalculate invoice ordering or currency shares.

The widget owns interaction intent only. Individual external parameter changes reset the matching override. Equivalent objects, refreshed rows and layout changes preserve the user's current selection and open invoice. The dialog uses native modal behavior and returns focus to its trigger. Component tests stub the unavailable jsdom dialog and popover methods; real focus containment is covered in Playwright.

User-entered controls (selection count, provider/cycle/currency filters and the breakdown currency) persist best-effort in `localStorage` under the shared `payment-planner-controls` key. A saved control stores the external-parameter signature it was entered against and restores only while that parameter is unchanged, so a changed dashboard configuration still wins after a reload. Instances share the key — the last writer defines the next session's starting values — while mounted instances stay independent. Blocked, missing or corrupt storage silently degrades to defaults.

The provider invoice identity is `(provider_id, provider_bill_id)`. Source ranks can repeat across providers. Invalid amounts retain their selected position but contribute nothing to currency/provider aggregates. Customer amounts follow their own source rule and do not inherit supplier currency.

## Adding a widget

1. Add `<name>-params.ts`, `<name>-compute.ts`, `<name>.tsx` and `<name>.css` in the existing flat `src/widget/` directory.
2. Keep configuration types with params, calculation types with compute, and component props with their component.
3. Add focused `<name>-<part>.tsx` components or `<name>-<purpose>.ts` helpers only when they have a clear responsibility.
4. Colocate logic/component tests. Add browser workflows to `tests/e2e/` where needed.
5. Use platform primitives and tokens, and a unique CSS class prefix. Do not place domain-specific logic in `platform/`.
6. Receive source data through props. Only sandbox and tests import fixtures.
7. Connect the public widget to the existing sandbox and document its requirements in the SDD.

Do not introduce a parallel architecture, catch-all utilities, global state, separate demo app, or dependencies on another widget's internals.

## Dependency decisions

Runtime dependencies remain React and React DOM. TanStack Query is not used because the collection lifecycle belongs to INTERA, outside this widget. The small table and distribution bar use semantic HTML and CSS rather than table/chart frameworks. Test and quality tools are development dependencies only. A targeted npm override pins the transitive minimatch family to `^11.0.1` to address GHSA-g3hv-75wg-m249 in lint tooling. The patched version supports Node 24; lint and test configuration are revalidated after this override. Remove the override when upstream tools require a patched release themselves.

Comments are reserved for non-obvious domain constraints and trade-offs. Prefer descriptive names and small responsibilities. All new comments, JSDoc and developer documentation must be English.

## Demonstration checklist

- Start with N=14: RUB 1,248,500; USD 103,500; EUR 12,600; GBP 11,000.
- Set N=20: two invalid selected invoices are excluded from sums, not removed from the selection.
- Apply a provider filter and observe effective selection clamp while requested N is retained.
- Scroll either queue table: it starts with 15 rows and reveals the next 15 when one of the last five rendered rows enters the viewport. The rowLimit compute slice remains available to API callers.
- Switch to quarter and disclose the remaining currencies.
- Inspect dark mode and all sizes.
- Switch ready → refreshing → ready: user selection persists.
- Change filters or the count, reload the page: the saved controls come back; changing a configured parameter in the params panel discards only the matching saved control.
- Use refresh-error to retain data with a warning; initial error has a separate unavailable state.
- Disable customer bills, summary or breakdown and inspect the relevant views.

## Source discrepancies and limits

- The checked-in fixture contains **32** records, although the assignment says 30. Records were not removed. The original stale length assertion now uses the source length; all other original assertions are preserved.
- The contractual DataSource YAML was not supplied in the repository. Schema compliance is verified against the provided TypeScript interface, not an unavailable YAML.
- Contractual two-row height and grid gaps are unspecified. The sandbox demonstrates column spans with content-driven height; exact pixel height compliance cannot be claimed.
- The SVG includes illustrative warning text inconsistent with N=14. The UI uses computed facts.
- Currency calculations use the source's numeric contract without conversion. Ordinary floating-point arithmetic is tested with tolerances for fractional values; display uses two decimals.
- Remote CI execution is separate from local verification. A checked-in workflow is not evidence of a successful remote run.
