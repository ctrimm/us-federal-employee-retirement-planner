# FEREX Development TODO

## Correctness review & engine fixes — 2026-10-03 (completed, branch `atlas/ferex-correctness-fixes`)

### Review completed (2026-10-03)
Cloned `ctrimm/us-federal-employee-retirement-planner`, read all five logic modules end to end,
verified `npm run build` passes clean, and ran the engine against hand-computed cases via an
esbuild-bundled verification script. Tax math verified correct: 2024 brackets, SS
provisional-income worksheet, diet COLA, CSRS 2.5%/10% survivor formula, RMD Uniform Lifetime
Table, FERS employer match. Postponed-annuity COLA treatment verified against OPM guidance
(no COLAs accrue during postponement — engine matches).

### Bugs confirmed (reproduced numerically before fixing)
1. **Pension ignores future service.** `calculateAnnualPension` counts active service periods
   through *today*, not projected to the planned separation age. A 45-year-old retiring at 57
   gets $20,480/yr on 22.76 yrs instead of ~$40,800 on ~34 yrs. Affects every projection for
   anyone not retiring immediately. Fix: project active periods to the separation date.
2. **FEHB premiums not inflated from base year.** 2026 base costs inflated by years *since
   retirement* instead of calendar years since 2026. Retiring at 57 in 2038 shows $4,200/yr;
   correct is ~$7,540 at 5% healthcare inflation.
3. **Medicare Part B not inflated from base year.** 2024 base ($174.70/mo) compounded by
   `age - 65` instead of `year - 2024`. At 65 in 2046 shows $2,096/yr; correct is ~$6,130.
4. **Sick leave counts toward eligibility (OPM: annuity computation only).** `canRetireNow`,
   MRA+30 immediate-annuity test, VERA/special eligibility, and FEHB carry-in all use
   service years inflated by sick-leave credit. 29.5 yrs + 1,500 sick hrs at MRA reports
   immediate unreduced eligibility. (README already documents the correct rule — code
   contradicted it.) Fix: separate "service for annuity" from "service for eligibility".
5. **FERS supplement paid on deferred annuities.** The 30-year branch lacks the MRA gate, so
   separating at 55 with 30 years (deferred to 62, no supplement owed) still pays ~$15.7k/yr.

### Nits fixed on this branch
- `types/index.ts` MRA comment said 1965+ → 57; function correctly gives 56 for 1965–1969.
- `calculateEarliestRetirementAge` / special-provision earliest age used `Math.min` where
  `Math.max` was needed — could return ages in the past.
- College costs added in nominal dollars with no inflation adjustment (now inflated at the
  expense inflation rate from the current year).
- Debt payoff charged the full scheduled payment even when the remaining balance was smaller.
- `requiredMinimumDistribution` hard-floored at 73; now takes the SECURE 2.0 start age as an
  optional parameter (engine already gated correctly).
- FERS Supplement earnings-test limit was frozen at the 2024 $22,320; now indexed by the
  inflation assumption like other dollar constants.

### Test plan (TDD — tests written first, run red, then fixed)
- `src/ferex/logic/__tests__/pension.test.ts` — golden paths (FERS 1%/1.1%, CSRS tiers,
  special provisions, survivor, COLA schedules, MRA+10) + regression tests for bugs 4 & 5.
- `src/ferex/logic/__tests__/tax.test.ts` — golden bracket/SS-worksheet/LTCG cases.
- `src/ferex/logic/__tests__/tsp.test.ts` — employer match, RMD ages/table, start-age param.
- `src/ferex/logic/__tests__/projection.test.ts` — golden full-career projection + regression
  tests for bugs 1, 2, 3, 5 (FEHB/Medicare inflation, deferred supplement, postponed COLA
  gap, supplement earnings test).
- Run: `npm test` (vitest). `npm run build` must stay green.

### Still to do (not on this branch)
- Social Security claiming-age choice (currently hardcoded 67), spousal SS, GPO.
- State-tax treatment of Social Security (most states exempt; currently taxed as middle-ground).
- Per-plan FEHB premiums (currently 2026 averages); PSHB transition.
- Partial survivor annuity elections; savings-interest-as-ordinary-income; disability retirement.

## GitHub Pages deployment — 2026-10-04 (branch `atlas/ferex-correctness-fixes`, committed)

Cory asked for the Pages URL; none existed (Pages not enabled, no deployments).
Set up deployment on the branch:
- `astro.config.js`: `site: 'https://ctrimm.github.io'`, `base: '/us-federal-employee-retirement-planner'`
- `.github/workflows/deploy.yml`: build + deploy to Pages on push to `main` (official actions/deploy-pages flow)
- Fixed absolute hrefs (favicons, 404 home link, `/ferex` links) to respect the base path via `import.meta.env.BASE_URL`
- Verified: production build emits correctly prefixed asset/page URLs + sitemap; tsc clean; 51/51 tests green.
- Could NOT enable Pages via API (PUT /repos/.../pages → 404; credential lacks admin). Cory must do one click: repo Settings > Pages > Build and deployment > GitHub Actions, then push/merge the branch to `main`.
- Live URL once enabled: https://ctrimm.github.io/us-federal-employee-retirement-planner/

## Second completeness pass — 2026-10-03 (branch `atlas/ferex-correctness-fixes`, continued)

Cory asked for another review "to be as correct as possible", plus a
"not professional advice, just a tool" disclaimer and screenshots.

### New bug found and fixed
6. **Separating before MRA with 30+ years modeled as immediate.** The 30-year branch of
   the immediate-annuity test didn't require MRA, so e.g. 38 years at 55 paid the full
   annuity from 55. Per OPM that's a *deferred* annuity: nothing until 62, no supplement
   ever, FEHB permanently forfeited. Fix: engine now computes `immediateAnnuityAtSeparation`
   (immediate at separation age, incl. MRA+10 taken immediately, VERA, or special-provision)
   and an `annuityStartAge` (claim age if immediate, else max(claim age, 62)). Pension,
   supplement, FEHB, proration, and CoastFIRE timing all key off it. `calculateAnnualPension`
   also requires MRA for the 30-year unreduced branch. 3 new tests; suite now 51.

### UI consistency fix
- Dashboard "Total Service" card showed service through *today* while the pension beside it
  used service projected to separation (20y9m vs 33y12m on the sample). Now shows projected
  "Total Service at Retirement".

### Disclaimer
- New `Disclaimer` component ("planning tool for educational purposes only — not
  professional financial, tax, or legal advice") on the landing page and dashboard footer;
  same text added to the README.

### Verification
- `npx tsc --noEmit` clean; `npm test` 51/51 green; `npm run build` green.
- All three sample scenarios run end-to-end; screenshots taken of landing + dashboard.
- Note: headless-shell Chrome (v153) in this sandbox intermittently crashes the renderer
  on the Tailwind v4 CSS (flaky race, unrelated to the app); screenshots needed retries.

---

## Current Sprint: MVP Development ✅ COMPLETE

### Phase 1: Foundation (✅ Complete)
- [x] Review PRD and tech stack
- [x] Create project structure plan
- [x] Set up TypeScript types and interfaces
- [x] Build retirement calculation engine
- [x] Create core data models

### Phase 2: Onboarding Flow (✅ Complete)
- [x] Express onboarding (3-step)
  - [x] Personal info step
  - [x] Service history timeline input
  - [x] Income & TSP step
- [x] Comprehensive onboarding (7-step)
  - [x] Service history (multiple periods with break detection)
  - [x] High-3 calculation (actual 3-year salaries)
  - [x] Survivor benefits (calculator with impact analysis)
  - [x] TSP details (fund allocation breakdown)
  - [x] Spouse/family info (with FEHB recommendations)
  - [x] Financial assumptions (customizable rates)
  - [x] FEHB coverage (plan comparison)

### Phase 3: Dashboard & Visualizations (✅ Complete)
- [x] Service History Display
- [x] Retirement Eligibility Summary Card
- [x] Pension Breakdown Card (text-based)
- [x] Projected Retirement Income Table
- [x] Interactive Charts (Recharts)
  - [x] Income Projection Stacked Area Chart
  - [x] TSP Balance Line Chart
  - [x] Net Worth Projection Chart
- [x] Control Panel for adjusting variables
- [ ] Pension Breakdown Sankey Diagram - FUTURE ENHANCEMENT
- [ ] FEHB Healthcare Cost Projection Card - FUTURE ENHANCEMENT

### Phase 4: Scenarios & Features (✅ Complete)
- [x] Sample scenario library
  - [x] The Boomerang Fed
  - [x] Early Retirement Dream
  - [x] Long Career + Healthcare Focus
- [x] Scenario loading from samples
- [x] localStorage persistence
- [x] Scenario comparison view (side-by-side)
- [x] Barista FIRE (part-time work) modeling
- [ ] Shareable URL with hashed parameters - FUTURE ENHANCEMENT

### Phase 5: Polish & Deploy (✅ Complete)
- [x] Mobile responsiveness (Tailwind responsive classes)
- [x] Configure for S3 deployment
- [x] Integration with Astro site
- [x] Build and testing
- [ ] Dark mode support - FUTURE ENHANCEMENT
- [ ] Export to PDF - FUTURE ENHANCEMENT

## Current Status: V1.2 COMPLETE ✅

### What's Been Built

1. **Complete Type System**
   - Full TypeScript interfaces for FERS/CSRS/TSP calculations
   - Service periods, user profiles, projections, eligibility

2. **Calculation Engine**
   - FERS pension calculation (1% accrual)
   - CSRS pension calculation (tiered 1.5%/1.75%/2%)
   - Mixed FERS/CSRS service handling
   - TSP growth and drawdown projections
   - FEHB cost estimation
   - Social Security estimates
   - Survivor benefit calculations

3. **Express Onboarding (3 steps)**
   - Personal information (birth year, gender)
   - Service history (start date, current/former)
   - Income & TSP balance

4. **Dashboard**
   - Key metrics: Earliest retirement age, monthly pension, years of service
   - Eligibility summary with visual indicators
   - Pension calculation breakdown
   - Year-by-year income projection table
   - Responsive design

5. **Sample Scenarios**
   - The Boomerang Fed (service break scenario)
   - Early Retirement Dream (long career, early retirement)
   - Long Career + Healthcare Focus (traditional retirement)

6. **Data Persistence**
   - localStorage for saving user scenarios
   - Auto-save on scenario changes
   - Resume previous session

7. **Astro Integration**
   - Available at `/ferex` route
   - Client-side React app with Astro shell
   - Uses existing shadcn UI components

8. **S3 Ready**
   - Static build in `/dist` folder
   - No server-side dependencies
   - All calculations client-side

9. **Interactive Charts (Recharts)**
   - Income projection stacked area chart
   - TSP balance decline chart with depletion indicator
   - Net worth projection chart
   - Fully responsive and interactive

10. **Control Panel**
    - Side panel with all variable controls
    - Retirement age, TSP drawdown, inflation, COLA sliders
    - FEHB coverage selector (Self, Self+One, Self+Family)
    - Barista FIRE settings (opt-in)
    - Real-time preview and apply/reset functionality

11. **Scenario Comparison**
    - Side-by-side comparison of unlimited scenarios
    - Highlights best options (pension, lifetime income)
    - Add/remove scenarios dynamically
    - Persistent comparison queue in localStorage

12. **Barista FIRE Feature**
    - Model part-time work in early retirement
    - Set target retirement income
    - Configure part-time income amount and duration
    - See impact on retirement age and overall income
    - Visualized separately in charts and tables

13. **Comprehensive Onboarding (7-step)**
    - Multiple service periods with break detection
    - Actual High-3 salary inputs (3 consecutive years)
    - Survivor benefit calculator with impact analysis
    - TSP fund allocation breakdown (C, S, I, F, G funds)
    - Spouse/family information with FEHB recommendations
    - Customizable financial assumptions (inflation, COLA, healthcare)
    - FEHB coverage selection with cost comparison
    - Mode toggle between Express (3-step) and Comprehensive (7-step)

### File Structure

```
src/ferex/
├── types/
│   └── index.ts (TypeScript type definitions)
├── logic/
│   ├── systemDetection.ts (FERS/CSRS detection, eligibility)
│   ├── pensionCalculator.ts (Pension calculations)
│   ├── tspCalculator.ts (TSP projections)
│   ├── fehbCalculator.ts (Healthcare costs)
│   └── projectionEngine.ts (Main projection generator)
├── utils/
│   └── formatters.ts (Currency, date, number formatting)
├── data/
│   └── sampleScenarios.ts (Pre-built scenarios)
├── hooks/
│   ├── useScenario.ts (Scenario management hook)
│   └── useLocalStorage.ts (Persistence hook)
└── components/
    ├── FerexApp.tsx (Main app component)
    ├── onboarding/
    │   └── ExpressOnboarding.tsx (3-step onboarding)
    └── dashboard/
        └── Dashboard.tsx (Results display)
```

### Access the App

**Development:**
```bash
npm install
npm run dev
```
Then visit: http://localhost:4321/ferex

**Production Build:**
```bash
npm run build
```
Deploy the `/dist` folder to S3 or any static host.

### Deployment

See `.agent/DEPLOYMENT.md` for full deployment instructions including:
- S3 bucket setup
- CloudFront configuration
- Deploy script
- Cache optimization

## Technical Notes

- Using existing Astro + React + Tailwind + ShadCN stack
- TypeScript throughout for type safety
- Client-side calculations (no backend required)
- localStorage for persistence
- Build target: Static S3 deployment

## Future Enhancements

### High Priority
- [ ] Export to PDF
- [ ] Sankey diagram for pension calculation flow

### Medium Priority
- [ ] Dark mode support
- [ ] URL-based scenario sharing
- [ ] More sample scenarios
- [ ] Sensitivity analysis sliders

### Low Priority
- [ ] Social Security WEP/GPO adjustments
- [ ] Multiple retirement date comparisons
- [ ] Mobile app (PWA)
- [ ] User accounts and cloud sync
- [ ] Tax planning integration

## Testing Checklist

- [x] Build succeeds without errors
- [x] Type checking passes
- [ ] Manual testing
  - [ ] Express onboarding flow
  - [ ] Sample scenarios load correctly
  - [ ] Calculations are accurate
  - [ ] localStorage persists data
  - [ ] Mobile responsive
  - [ ] Cross-browser compatibility

## Known Issues / Limitations (refreshed 2026-10-03)

1. **Simplified Calculations**: Some edge cases not yet handled:
   - Social Security claiming-age choice (currently hardcoded to 67), spousal SS benefits, GPO
   - Disability retirement
   - State-specific pension/SS tax exemptions (flat-rate state tax is a simplification)
   - Per-plan FEHB premiums (2026 averages used)
   - Partial survivor annuity elections (full 50%/10% FERS pair assumed)
   - Savings-account interest taxed at LTCG rates (documented simplification)
2. **UI Polish**: MVP focuses on functionality over design:
   - Basic styling
   - No animations

3. **Data Validation**: Minimal input validation:
   - Should add more error checking
   - Better date validation
   - Service period conflict detection

## Maintenance

- Update federal pay scales annually
- Update FEHB cost estimates (currently 2026 estimates)
- Update MRA tables if retirement rules change
- Monitor user feedback for calculation accuracy
