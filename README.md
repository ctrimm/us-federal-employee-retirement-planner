# FEREX — Federal Employee Retirement Explorer

A retirement planning calculator built specifically for US federal employees. FEREX helps FERS and CSRS employees understand their pension, TSP, and FEHB benefits through interactive projections and year-by-year visualizations.

**Live app route:** `/ferex`

---

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:4321/ferex` to use the app.

```bash
npm run build    # Production build to /dist
npm run preview  # Preview production build locally
```

---

## What FEREX Calculates

### Pension (FERS & CSRS)
- **FERS:** `Annual Pension = High-3 × 1% × Years of Service`
- **CSRS (tiered):**
  - First 5 years: 1.5% per year
  - Years 6–10: 1.75% per year
  - Years 11+: 2.0% per year
- **High-3:** Average salary of the 3 highest consecutive years
- Survivor annuity reduction (10% for standard election)
- COLA adjustments applied annually from retirement date
- Mixed FERS/CSRS service handled separately then combined

### Retirement Eligibility (FERS)
| Condition | Earliest Age |
|-----------|-------------|
| 30+ years of service | MRA (55–57 by birth year) |
| 20+ years of service | Age 60 |
| 10+ years of service | MRA (MRA+10, may be reduced) |
| 5+ years of service  | Age 62 |

**MRA by birth year:**
- Before 1953: 55
- 1953–1964: 56
- 1965+: 57

### FERS Supplement
FERS employees who retire on an immediate full annuity (30+ years at MRA, or 20+ years at age 60) receive the FERS Supplement from retirement until age 62. It approximates the Social Security benefit earned during federal service:

```
FERS Supplement ≈ Estimated SS Benefit × (FERS Years / 40)
```

### TSP (Thrift Savings Plan)
- Employee contributions (dollar amount or % of salary)
- FERS employer match: 1% automatic + up to 4% matching = max 5%
- Compounded annual growth during working years
- Penalty-free withdrawal: age 59.5, or age 55+ at separation from service
- 4% drawdown rate applied post-retirement (adjustable)

### FEHB (Federal Employee Health Benefits)
- Requires 5+ years of service to carry into retirement
- 2026 estimated annual premiums: Self $4,200 · Self+One $9,600 · Family $11,800
- Healthcare inflation applied annually (default 5%)
- Age adjustment applied after age 65

### Social Security Estimate
A simplified estimate for FERS employees:
```
Annual SS ≈ High-3 × 30%  (starting at age 67)
```
This is conservative and accounts for WEP/GPO impact. Actual SS benefit depends on full earnings history.

---

## Calculation Assumptions & Limitations

| Assumption | Default | Notes |
|------------|---------|-------|
| COLA rate | 2.5% | Applied to pension annually |
| Inflation | 3.5% | Applied to living expenses |
| Healthcare inflation | 5.0% | Applied to FEHB premiums |
| TSP return | 6.5% | Applied to TSP balance |
| TSP drawdown | 4.0% | % of balance withdrawn per year |
| Tax rate | 15% | Flat effective rate — simplified |
| Social Security | 30% of High-3 | Conservative WEP-adjusted estimate |
| Life expectancy | 85 | Adjustable in profile |

**Known simplifications:**
- Tax calculation uses a flat 15% effective rate (does not model brackets, IRMAA, state taxes, or Roth/traditional distinctions)
- Social Security estimate is an approximation — actual benefit requires SSA earnings record
- FEHB age-cost adjustment is a linear estimate (1% per year after 65) rather than actual plan curves
- CSRS survivor annuity uses the same 10% reduction as FERS standard election

---

## Project Structure

```
src/ferex/
├── logic/                   # Core calculation engines
│   ├── systemDetection.ts   # FERS/CSRS detection, MRA, eligibility
│   ├── pensionCalculator.ts # Pension formulas (FERS, CSRS, mixed, COLA)
│   ├── projectionEngine.ts  # Year-by-year projection generator
│   ├── tspCalculator.ts     # TSP growth, drawdown, employer match
│   └── fehbCalculator.ts    # FEHB cost projections
├── components/
│   ├── FerexApp.tsx         # Root component, view orchestration
│   ├── onboarding/
│   │   ├── ExpressOnboarding.tsx      # 3-step quick flow
│   │   └── ComprehensiveOnboarding.tsx # 7-step detailed flow
│   ├── dashboard/
│   │   ├── Dashboard.tsx              # Main results display
│   │   ├── UnifiedControlPanel.tsx    # Settings sidebar (5 tabs)
│   │   └── ProjectionTable.tsx        # Year-by-year table
│   └── charts/
│       ├── IncomeProjectionChart.tsx  # Stacked area income chart
│       ├── TSPBalanceChart.tsx        # TSP balance over time
│       ├── NetWorthChart.tsx          # Total net worth
│       └── ExpensesChart.tsx          # Expense breakdown
├── hooks/
│   ├── useScenario.ts       # Scenario state, calculation trigger
│   └── useLocalStorage.ts   # Persistence hook
├── types/index.ts           # All TypeScript types and constants
├── utils/formatters.ts      # Currency, number, date formatters
└── data/sampleScenarios.ts  # Pre-built sample scenarios
```

---

## Tech Stack

- **[Astro 5](https://astro.build/)** — Static site builder
- **[React 19](https://reactjs.org/)** — UI components
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Styling
- **[shadcn/ui](https://ui.shadcn.com/)** — Component library (Radix UI)
- **[Recharts](https://recharts.org/)** — Chart visualizations

All calculations run client-side. No backend required. Data persists in `localStorage`.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for S3/CloudFront and other platform guides. The app builds to a fully static `/dist` directory.
