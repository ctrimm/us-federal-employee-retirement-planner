# FEREX — Federal Employee Retirement Explorer

A retirement planning calculator built specifically for US federal employees. FEREX helps FERS and CSRS employees understand their pension, TSP, and FEHB benefits through interactive projections and year-by-year visualizations.

**Live app route:** `/ferex`

---

## Quick Start

```bash
pnpm install
pnpm run dev
```

Visit `http://localhost:4321/ferex` to use the app.

```bash
pnpm run build    # Production build to /dist
pnpm run preview  # Preview production build locally
```

---

## What FEREX Calculates

### FIRE Milestones & CoastFIRE
FEREX identifies four key financial independence milestones by calculating portfolio targets for four spending tiers: LeanFIRE (75% spending), ChubbyFIRE (125%), FatFIRE (150%), and your standard FIRE target (100% living expenses). It also computes CoastFIRE—the balance needed today to grow to your FIRE target by retirement without new contributions. All targets are pension-adjusted: guaranteed income from pension, FERS supplement, and Social Security reduces the required portfolio.

### Pension (FERS & CSRS)
- **FERS:** `Annual Pension = High-3 × 1% × Years of Service`
- **CSRS (tiered):**
  - First 5 years: 1.5% per year
  - Years 6–10: 1.75% per year
  - Years 11+: 2.0% per year
- **FERS enhanced accrual:** 1.1% per year (instead of 1%) when retiring at **age 62+ with 20+ years**
- **High-3:** Average salary of the 3 highest consecutive years
- Survivor annuity reduction (10% for standard election; survivor receives 50% of the unreduced annuity)
- **COLA** applied by system: CSRS receives the full CPI COLA; FERS receives the reduced "diet" COLA **and no COLA until age 62** (special-provision retirees excepted)
- **MRA+10** early retirement: 5% per year reduction for each year under 62
- Mixed FERS/CSRS service handled separately then combined

### Retirement Eligibility (FERS)
| Condition | Earliest Age |
|-----------|-------------|
| 30+ years of service | MRA (55–57 by birth year) |
| 20+ years of service | Age 60 |
| 10+ years of service | MRA (MRA+10, may be reduced) |
| 5+ years of service  | Age 62 |

**MRA by birth year** (transitional months simplified to whole years):
- Before 1953: 55
- 1953–1969: 56
- 1970+: 57

### FERS Supplement
FERS employees who retire on an immediate full annuity (**MRA with 30+ years, or age 60+ with 20+ years**) receive the FERS Supplement from retirement until age 62. MRA+10, deferred, and disability retirements do **not** qualify. It approximates the Social Security benefit earned during federal service:

```
FERS Supplement ≈ Estimated SS Benefit at age 62 × (FERS Years / 40)
```

OPM uses the **age-62** benefit estimate; since an SSA estimate is usually quoted at full retirement age (67), the engine scales it to ~70% to approximate the age-62 figure. The supplement is also subject to the Social Security **earnings test** (reduced if you have wages above the annual limit) — not modeled here.

### TSP (Thrift Savings Plan)
- Employee contributions (dollar amount or % of salary), Traditional and Roth tracked separately
- **FERS** employer match: 1% automatic + up to 4% matching = max 5%. **CSRS employees receive no agency match.**
- Compounded annual growth during working years
- Penalty-free withdrawal: age 59.5, or age 55+ at separation from service
- 4% drawdown rate applied post-retirement (adjustable; guardrails strategy optional)

### FEHB (Federal Employee Health Benefits)
- To **carry coverage into retirement** you must have been enrolled in FEHB for the **5 years immediately preceding retirement** (approximated here by 5+ years of service) **AND retire on an immediate annuity**. If you don't qualify, the projection charges no FEHB premium (you would need separate coverage, e.g. ACA — not modeled).
- 2026 estimated annual premiums (employee share): Self $4,200 · Self+One $9,600 · Family $11,800
- Healthcare inflation applied annually (default 5%)
- FEHB is **community-rated** — premiums do **not** increase with the enrollee's age (no age surcharge)

### Social Security Estimate
A simplified estimate for FERS employees:
```
Annual SS ≈ High-3 × 30%  (starting at age 67)
```
This is conservative and accounts for WEP/GPO impact. Actual SS benefit depends on full earnings history. **CSRS employees** did not pay Social Security on federal earnings, so no SS is assumed unless you enter an explicit estimate.

### FIRE Milestones (Financial Independence, Retire Early)
The calculator identifies four key financial independence milestones based on portfolio targets:

**LeanFIRE (75% spending):** Minimum lifestyle with reduced discretionary expenses.
```
Target = (Living Expenses × 0.75 + Non-living Expenses - Guaranteed Income) / Withdrawal Rate
```

**ChubbyFIRE (125% spending):** Comfortable lifestyle with current living standards.
```
Target = (Living Expenses × 1.25 + Non-living Expenses - Guaranteed Income) / Withdrawal Rate
```

**FatFIRE (150% spending):** Luxurious retirement with significant discretionary spending.
```
Target = (Living Expenses × 1.50 + Non-living Expenses - Guaranteed Income) / Withdrawal Rate
```

**CoastFIRE:** Portfolio large enough to grow to the FIRE target by retirement age without additional contributions. Calculated by discounting the retirement FIRE target back to the current year at the assumed TSP return rate.
```
CoastFIRE Target = FIRE Target at Retirement / (1 + Return Rate) ^ Years Until Retirement
```

Guaranteed income includes pension, FERS supplement, and Social Security. Non-living expenses (healthcare, college costs) are not reduced for FIRE tiers. The expense base used for FIRE targets **includes projected income taxes** and **excludes finite, non-perpetual costs** (debt payments and one-time life events) so they aren't annualized into a 25× target. Household liquid assets (your TSP, spouse TSP, other investments, and any non-rolled-over 401k) all count toward reaching FI. All FIRE targets are pension-adjusted—the larger your guaranteed income, the smaller the portfolio required.

---

## Calculation Assumptions & Limitations

| Assumption | Default | Notes |
|------------|---------|-------|
| COLA rate | 2.5% | Applied to pension annually |
| Inflation | 3.5% | Applied to living expenses |
| Healthcare inflation | 5.0% | Applied to FEHB premiums |
| TSP return | 6.5% | Applied to TSP balance |
| TSP drawdown | 4.0% | % of balance withdrawn per year |
| Withdrawal strategy | Fixed percent | Can switch to guardrails (80-120% band) |
| LeanFIRE multiplier | 75% | Minimum spending tier |
| ChubbyFIRE multiplier | 125% | Comfortable spending tier |
| FatFIRE multiplier | 150% | Luxury spending tier |
| Federal tax | 2024 brackets | Progressive (single/MFJ), standard deduction + age-65 addition |
| State tax | 0% | Optional flat rate on pension/TSP income (excludes SS & Roth) |
| Social Security | 30% of High-3 | Conservative WEP-adjusted estimate (FERS only) |
| Medicare Part B | $174.70/mo (2024) | Starts at age 65 once not working; grows with healthcare inflation |
| Life expectancy | 85 | Adjustable in profile |

**Known simplifications:**
- Federal tax uses **2024 progressive brackets** (single/MFJ), the standard deduction with the age-65 addition ($1,950 single / $1,550 each married), and the IRS provisional-income test for Social Security taxation. Brackets are **not** indexed to future years, slightly overstating tax in later years. **IRMAA** (high-income Medicare surcharges) is not modeled.
- State tax is an optional flat rate applied to ordinary income + taxable SS (excludes the non-taxable SS portion and all Roth distributions). It does not model state-specific pension exemptions.
- Social Security taxation phases in per the IRS worksheet (lesser-of computation), capped at 85% of benefits.
- Social Security benefit estimate is an approximation — actual benefit requires an SSA earnings record. CSRS service earns no SS.
- FEHB premiums are community-rated (no age surcharge); FEHB↔Medicare coordination isn't modeled as a premium reduction.
- CSRS survivor annuity uses the same 10% reduction / 50% survivor benefit as the FERS standard election (CSRS actually allows up to 55%).

---

## Federal Retirement Tips & Strategies

Lesser-known moves that experienced feds use to maximize their benefits. Items marked ✅ are reflected in FEREX's math; ⚠️ are surfaced as guidance but not fully modeled; 💡 are planning callouts to consider.

### Timing your retirement date
- **💡 Retire at the end of a pay period / leave year.** Annual leave is paid out as a lump sum at your final salary rate (up to the 240-hour carryover cap, often more for SES/overseas). Retiring in early January cashes out a full year's accrued leave at once. ([FedWeek – Lump-Sum Annual Leave](https://www.fedweek.com/retirement-financial-planning/whats-in-a-lump-sum-payment-of-unused-annual-leave/))
- **⚠️ Mind the annuity-start gap.** Under FERS your annuity doesn't begin until the **first day of the month after** you separate. Retiring January 3 means no annuity until February 1 — weigh the leave payout against the lost annuity month. ([EP Wealth](https://www.epwealth.com/blog/fers-annual-leave-lump-sum-bridge-retirement-income-gaps))
- **💡 Lump-sum leave is taxable income** in the year received. A January/February retirement can shift that payout into a lower-income tax year than a December retirement. ([Fed Pilot](https://fedpilot.com/blog/2026/04/16/annual-leave-payout-at-retirement-what-federal-employees-need-to-know/))

### Sick leave vs. annual leave
- **✅ Unused sick leave converts to service credit** (2,087 hours ≈ 1 year, added to your annuity computation) — modeled in FEREX. ([FedWeek – Sick Leave Credit](https://www.fedweek.com/experts-view/calculating-service-credit-for-sick-leave-at-retirement/))
- **💡 Burn sick leave, bank annual leave** in your final year: annual leave becomes cash, while sick leave only nudges the annuity up slightly — it can take decades for the pension bump to equal the leave's cash value. Note sick leave counts toward your **annuity** but **not** toward retirement **eligibility**. ([Haws Federal Advisors](https://hawsfederaladvisors.com/how-does-my-unused-federal-sick-leave-and-annual-leave-affect-my-retirement/))

### MRA+10: postpone instead of taking it reduced
- **⚠️ Postponed vs. immediate MRA+10.** Taking an MRA+10 annuity immediately costs **5% per year under 62** (modeled ✅). Instead you can **postpone** the start date to reduce or eliminate that penalty — and, crucially, **reinstate FEHB** when the annuity begins (as long as you met the 5-year rule). The lifetime value of postponing is often $150k–$250k. FEREX models the leave-service vs. claim-pension ages separately, so you can compare. ([Fed Pilot – MRA+10](https://fedpilot.com/blog/2026/05/13/mra-plus-10-fers-retirement-reduction-postpone/), [Gilbert Employment Law](https://www.gelawyer.com/blog/2025/05/fers-postponed-retirement/))
- **💡 Postponed ≠ deferred.** *Postponed* (MRA + 10+ yrs) lets you reinstate FEHB/FEGLI; *deferred* (left before MRA) permanently forfeits FEHB. ([myFEBA](https://www.myfeba.org/blog/postponed-vs-deferred-federal-retirement-understanding-the-key-differences/))

### Health insurance & Medicare
- **✅ FEHB into retirement requires 5 years of enrollment + an immediate annuity** — now enforced in eligibility. ([OPM](https://www.opm.gov/healthcare-insurance/healthcare/eligibility/))
- **✅ Delay Medicare Part B penalty-free while covered by active FEHB** (a working fed has a Special Enrollment Period). FEREX starts Part B at the later of 65 and your separation age. ([SSA](https://www.ssa.gov/faqs/en/questions/KA-02983.html))
- **💡 At 65, FEHB + Medicare Part B coordinate** (FEHB becomes secondary; many plans waive deductibles/copays for Part B enrollees). Whether Part B is worth it depends on your plan. ([Federal News Network – Retirement](https://federalnewsnetwork.com/category/retirement/))
- **💡 You can suspend (not cancel) FEHB** to use TRICARE, a Medicare Advantage plan, or CHAMPVA, and reinstate FEHB later. TRICARE coverage also counts toward the 5-year FEHB rule. ([OPM Annuitant FAQ](https://www.opm.gov/healthcare-insurance/healthcare/reference-materials/reference/annuitants/))

### TSP & taxes
- **✅ Rule of 55 / age-55 separation.** Separating in or after the year you turn 55 allows penalty-free TSP withdrawals (age 50 for special categories) — modeled. ([federalretirement.net – TSP](https://federalretirement.net/thrift-savings-plan-tsp/))
- **✅ Roth conversion ladder in low-income years.** The gap between retirement and when pension/SS/RMDs ramp up is prime time to convert Traditional→Roth at low brackets. FEREX models optional annual Roth conversions and taxes them in-year. ([federalretirement.net – TSP](https://federalretirement.net/thrift-savings-plan-tsp/))
- **💡 FERS Supplement earnings test.** If you work after retiring, wages above the annual SS limit reduce the supplement $1 for every $2 — a reason to time part-time/Barista-FIRE income. ([OPM CSRS/FERS Handbook Ch. 51](https://www.opm.gov/retirement-center/publications-forms/csrsfers-handbook/c051.pdf))

### Service credit & early-out programs
- **💡 Military service deposit.** Paying a deposit (~3% of military base pay + interest) can add active-duty years to your FERS service — often a high-return buyback. ([NIH – Retirement FAQs](https://hr.nih.gov/benefits/retirement/retirement-faqs))
- **💡 VERA / VSIP early-outs.** Voluntary Early Retirement (age 50 + 20 yrs, or any age + 25 yrs) and separation incentives can open an earlier exit during reorganizations. ([federalretirement.net – Early Outs](https://federalretirement.net/early_retirements.htm))

> These are educational planning ideas, not individualized advice. Confirm specifics with OPM and your agency benefits officer before acting.

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
│   │   ├── Dashboard.tsx              # Main results display + FIRE hero/CoastFIRE/spectrum cards
│   │   ├── UnifiedControlPanel.tsx    # Settings sidebar with FIRE Settings section
│   │   └── ProjectionTable.tsx        # Year-by-year table
│   └── charts/
│       ├── IncomeProjectionChart.tsx  # Stacked area income chart
│       ├── TSPBalanceChart.tsx        # TSP balance over time
│       ├── NetWorthChart.tsx          # Total net worth + CoastFIRE threshold line
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
