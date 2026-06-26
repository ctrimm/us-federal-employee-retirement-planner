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
- **FERS special provisions (high-risk careers):** **1.7%** per year for the first 20 years of covered service + 1.0% after, for law enforcement, firefighters, air traffic controllers, CBPOs, etc.
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

OPM uses the **age-62** benefit estimate; since an SSA estimate is usually quoted at full retirement age (67), the engine scales it to ~70% to approximate the age-62 figure. The supplement is reduced by the Social Security **earnings test** ($1 per $2 of wages over the annual limit) — except for special-provision retirees, who are exempt until their MRA.

### FERS Special Provisions (high-risk / high-stress careers)
Law enforcement officers, firefighters, air traffic controllers, CBPOs, nuclear-materials couriers, and similar enhanced-position employees retire under richer FERS rules. Set the **Special Provision Category** in the control panel (or flag individual service periods):

- **Accrual:** `1.7% × High-3 × first 20 covered years + 1.0% × years beyond 20` (e.g. 25 years = 39% of High-3 vs 25% under regular FERS)
- **Eligibility:** age **50 with 20** covered years, **or any age with 25** covered years — no MRA+10 reduction
- **COLA:** paid **immediately** (regular FERS gets no COLA before 62)
- **FERS Supplement:** payable at the special retirement and **earnings-test exempt until MRA**
- **Mandatory retirement:** age **56** for ATCs, age **57** for LEO/firefighters (surfaced as guidance)

Sources: [OPM CSRS/FERS Handbook Ch. 54](https://www.opm.gov/retirement-center/publications-forms/csrsfers-handbook/c054.pdf) · [OPM – Computation](https://www.opm.gov/retirement-center/fers-information/computation/) · [OPM – Types of Retirement](https://www.opm.gov/retirement-center/fers-information/types-of-retirement/)

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

## Feature Status

**✅ Working today**

- **Pension:** FERS (1% / 1.1% enhanced), CSRS (tiered), mixed service, **FERS special provisions (1.7%/1.0%)**, High-3, sick-leave credit, military deposit buyback
- **Eligibility:** MRA tables, immediate / MRA+10 / **postponed** / VERA / **special-provision** retirements, FEHB 5-year + immediate-annuity carry-in
- **Reductions & survivor:** MRA+10 (5%/yr), FERS 10%/50% and **CSRS 2.5%-10% / 55%** survivor
- **COLA:** CSRS full CPI, FERS diet COLA (none before 62), **immediate COLA for special provisions**
- **FERS Supplement:** eligibility, age-62 scaling, earnings test (with special-provision exemption to MRA)
- **Income:** pension, Social Security (provisional-income taxation, WEP), TSP (Traditional/Roth, Rule of 55, Roth conversions), **whole-portfolio drawdown** of non-federal 401k + IRA/401k/brokerage/Roth taxed by type, **RMDs (73/75)**, part-time/Barista & side-hustle, spouse modeling, lump-sum annual leave, VSIP
- **Taxes:** progressive 2024 brackets **inflation-indexed**, standard + age-65 deduction, **long-term capital gains (0/15/20%)**, dividend/interest drag, optional state tax, **Medicare Part B + IRMAA**
- **Withdrawal strategies:** fixed-percent, guardrails (±10% in an 80–120% band), and **tax-optimal ordering** (fund the spending gap from taxable → tax-deferred → Roth, RMDs first, with a fixed-point tax gross-up)
- **Roth conversion optimization:** auto-convert household pre-tax balances to Roth each year to fill a target bracket (10/12/22/24%) within the low-income window before RMDs — plus an **Auto** mode that searches every bracket target across the whole projection and picks the one maximizing **after-tax terminal wealth** (multi-year global optimization)
- **Special provisions:** primary **and spouse** (LEO/firefighter/ATC) — 1.7%/1.0% accrual + immediate COLA
- **Full household picture:** spouse's own TSP **and non-TSP accounts** (IRA / 401k / brokerage / Roth) — for a current or former fed — are modeled, taxed by type, given spouse-age RMDs, counted in net worth, and **folded into the household drawdown** (including the tax-optimal order)
- **Other:** FIRE tiers + CoastFIRE, debts/assets/college/life-events, **separation-month proration**, charts (income, expenses, **taxes**, TSP, net worth) with toggleable series

**🔜 Planned / not yet modeled**

- Bridge health coverage (COBRA/ACA) cost during a postponed-annuity FEHB gap; FEHB suspend → Medicare Advantage / TRICARE
- IRMAA refinements (2-year MAGI lookback, Part D surcharge)
- Per-account cost-basis input in the account editor (engine supports it; UI uses a default)
- Exact enforcement of mandatory retirement ages (currently surfaced as guidance)

---

## Calculation Assumptions & Limitations

| Assumption | Default | Notes |
|------------|---------|-------|
| COLA rate | 2.5% | Applied to pension annually |
| Inflation | 3.5% | Applied to living expenses |
| Healthcare inflation | 5.0% | Applied to FEHB premiums |
| TSP return | 6.5% | Applied to TSP balance |
| TSP drawdown | 4.0% | % of balance withdrawn per year |
| Withdrawal strategy | Fixed percent | Or guardrails (80–120% band), or tax-optimal ordering |
| LeanFIRE multiplier | 75% | Minimum spending tier |
| ChubbyFIRE multiplier | 125% | Comfortable spending tier |
| FatFIRE multiplier | 150% | Luxury spending tier |
| Federal tax | 2024 brackets, indexed | Progressive (single/MFJ); brackets + standard deduction inflation-indexed forward |
| Capital gains | 0/15/20% | LTCG on taxable-account gains, stacked on ordinary income |
| State tax | 0% | Optional flat rate on ordinary income + taxable SS + gains (excludes Roth) |
| Social Security | 30% of High-3 | Conservative WEP-adjusted estimate (FERS only) |
| Medicare Part B | $174.70/mo (2024) | Starts at age 65 once not working; grows with healthcare inflation |
| Medicare IRMAA | By MAGI tier | High-income Part B surcharge, inflation-indexed, per enrolled person |
| RMDs | Age 73 / 75 | Forced taxable Traditional TSP/IRA/401k distributions (Uniform Lifetime Table) |
| Account drawdown | Withdrawal rate | TSP + non-fed 401k + other accounts drawn and taxed by type; real estate not auto-drawn |
| Dividend yield | 2% | Annual taxable dividend/interest drag on taxable accounts (adjustable) |
| Separation month | December | Prorates the first annuity year (FERS starts first of next month) |
| Life expectancy | 85 | Adjustable in profile |

**What's modeled (income & taxes):**
- **All taxable income is taxed:** pension, FERS supplement, Traditional TSP distributions, Roth conversions, lump-sum leave, VSIP, part-time/Barista wages, side-hustle/self-employment, and spouse income. Roth TSP distributions and the non-taxable portion of Social Security are correctly excluded.
- **The whole portfolio produces retirement income.** In addition to the TSP, the non-federal 401k and each "other investment" account are drawn down at the withdrawal rate once retired, taxed by account type:
  - *Traditional IRA / 401k (and non-federal 401k):* withdrawals are **ordinary income**, and **RMDs** apply.
  - *Roth IRA:* withdrawals are **tax-free**, no RMD.
  - *Brokerage / savings (taxable):* only the **gain portion** of each withdrawal is taxed, at **long-term capital gains** rates (0% / 15% / 20%, stacked on ordinary income, inflation-indexed).
  - *Real estate / other:* treated as **illiquid** — they grow for net worth but are not auto-drawn as income.
- Federal tax uses **2024 progressive brackets** (single/MFJ) with the standard deduction + age-65 addition ($1,950 single / $1,550 each married). Brackets, the standard deduction, and the LTCG breakpoints are **inflation-indexed** to each projection year (the SS provisional-income thresholds are not — they are fixed in statute).
- Social Security taxation phases in per the IRS worksheet (lesser-of computation), capped at 85% of benefits.
- **Required Minimum Distributions** begin at age 73 (born ≤1959) or 75 (born 1960+) using the IRS Uniform Lifetime Table, forcing taxable income from Traditional TSP/IRA/401k balances even at low drawdown rates. Roth has no RMD.
- **Medicare Part B IRMAA** high-income surcharges are applied by MAGI tier (inflation-indexed) for each Medicare-enrolled person.
- **Taxable accounts** carry a cost basis (entered, or an estimated embedded gain by default) and throw off an annual **dividend/interest tax drag** (default 2% yield, taxed at LTCG rates and reinvested into basis); withdrawals realize the remaining gain.
- **CSRS survivor** annuity uses the CSRS 2.5%/10% cost formula and a 55% survivor benefit (FERS uses 10% / 50%).
- **Separation month** prorates the first year's annuity (FERS annuity starts the first of the next month); a December separation is a full first year.
- State tax is an optional flat rate on ordinary income + taxable SS + capital gains (excludes the non-taxable SS portion and Roth distributions); it does not model state-specific pension exemptions.

**Known simplifications:**
- The **tax-optimal** strategy is a single-year greedy ordering across the whole household (both spouses' taxable → tax-deferred → Roth, RMDs first) solved with a fixed-point tax gross-up. Multi-year tax planning is handled separately by the Roth-conversion optimizer (which does search across years); a fully unified multi-year withdrawal+conversion global optimum is not attempted.
- The Roth-conversion **Auto** optimizer maximizes after-tax terminal wealth using an assumed 22% future tax rate on remaining pre-tax balances; the bracket-fill headroom uses a conservative 85%-taxable estimate for any Social Security in the conversion year.
- IRMAA uses the current year's MAGI (the real program uses a 2-year lookback) and models the Part B surcharge (not Part D).
- Social Security benefit estimate is an approximation — actual benefit requires an SSA earnings record. CSRS service earns no SS.
- Taxable-account dividends are treated as qualified (LTCG rates); savings-account interest is not separately taxed as ordinary income.
- FEHB premiums are community-rated (no age surcharge); FEHB↔Medicare coordination isn't modeled as a premium reduction.
- Mixed CSRS/FERS survivor reductions use the FERS flat 10% (pure-CSRS uses the exact CSRS formula).

---

## Federal Retirement Tips & Strategies

Lesser-known moves that experienced feds use to maximize their benefits. Items marked ✅ are reflected in FEREX's math; ⚠️ are surfaced as guidance but not fully modeled; 💡 are planning callouts to consider. Most of these are configurable under **⚙️ Advanced Federal Strategies** in the control panel.

### Timing your retirement date
- **✅ Retire at the end of a pay period / leave year.** Annual leave is paid out as a lump sum at your final salary rate (up to the 240-hour carryover cap, often more for SES/overseas). Enter your unused **annual leave hours** and FEREX adds the taxable lump sum in your separation year. ([FedWeek – Lump-Sum Annual Leave](https://www.fedweek.com/retirement-financial-planning/whats-in-a-lump-sum-payment-of-unused-annual-leave/))
- **⚠️ Mind the annuity-start gap.** Under FERS your annuity doesn't begin until the **first day of the month after** you separate. Retiring January 3 means no annuity until February 1 — weigh the leave payout against the lost annuity month (the sub-year month gap itself isn't modeled). ([EP Wealth](https://www.epwealth.com/blog/fers-annual-leave-lump-sum-bridge-retirement-income-gaps))
- **💡 Lump-sum leave is taxable income** in the year received. A January/February retirement can shift that payout into a lower-income tax year than a December retirement. ([Fed Pilot](https://fedpilot.com/blog/2026/04/16/annual-leave-payout-at-retirement-what-federal-employees-need-to-know/))

### Sick leave vs. annual leave
- **✅ Unused sick leave converts to service credit** (2,087 hours ≈ 1 year, added to your annuity computation) — modeled in FEREX. ([FedWeek – Sick Leave Credit](https://www.fedweek.com/experts-view/calculating-service-credit-for-sick-leave-at-retirement/))
- **💡 Burn sick leave, bank annual leave** in your final year: annual leave becomes cash, while sick leave only nudges the annuity up slightly — it can take decades for the pension bump to equal the leave's cash value. Note sick leave counts toward your **annuity** but **not** toward retirement **eligibility**. ([Haws Federal Advisors](https://hawsfederaladvisors.com/how-does-my-unused-federal-sick-leave-and-annual-leave-affect-my-retirement/))

### MRA+10: postpone instead of taking it reduced
- **✅ Postponed vs. immediate MRA+10.** Taking an MRA+10 annuity immediately costs **5% per year under 62**. Toggle **Postpone annuity** and set your claim-pension age later than your leave-service age: FEREX reduces/eliminates the penalty based on the claim age and **suspends FEHB during the gap**, reinstating it when the annuity begins. The lifetime value of postponing is often $150k–$250k. ([Fed Pilot – MRA+10](https://fedpilot.com/blog/2026/05/13/mra-plus-10-fers-retirement-reduction-postpone/), [Gilbert Employment Law](https://www.gelawyer.com/blog/2025/05/fers-postponed-retirement/))
- **💡 Postponed ≠ deferred.** *Postponed* (MRA + 10+ yrs) lets you reinstate FEHB/FEGLI; *deferred* (left before MRA) permanently forfeits FEHB. ([myFEBA](https://www.myfeba.org/blog/postponed-vs-deferred-federal-retirement-understanding-the-key-differences/))

### Health insurance & Medicare
- **✅ FEHB into retirement requires 5 years of enrollment + an immediate annuity** — now enforced in eligibility. ([OPM](https://www.opm.gov/healthcare-insurance/healthcare/eligibility/))
- **✅ Delay Medicare Part B penalty-free while covered by active FEHB** (a working fed has a Special Enrollment Period). FEREX starts Part B at the later of 65 and your separation age. ([SSA](https://www.ssa.gov/faqs/en/questions/KA-02983.html))
- **💡 At 65, FEHB + Medicare Part B coordinate** (FEHB becomes secondary; many plans waive deductibles/copays for Part B enrollees). Whether Part B is worth it depends on your plan. ([Federal News Network – Retirement](https://federalnewsnetwork.com/category/retirement/))
- **💡 You can suspend (not cancel) FEHB** to use TRICARE, a Medicare Advantage plan, or CHAMPVA, and reinstate FEHB later. TRICARE coverage also counts toward the 5-year FEHB rule. ([OPM Annuitant FAQ](https://www.opm.gov/healthcare-insurance/healthcare/reference-materials/reference/annuitants/))

### TSP & taxes
- **✅ Rule of 55 / age-55 separation.** Separating in or after the year you turn 55 allows penalty-free TSP withdrawals (age 50 for special categories) — modeled. ([federalretirement.net – TSP](https://federalretirement.net/thrift-savings-plan-tsp/))
- **✅ Roth conversion ladder in low-income years.** The gap between retirement and when pension/SS/RMDs ramp up is prime time to convert Traditional→Roth at low brackets. FEREX models optional annual Roth conversions and taxes them in-year. ([federalretirement.net – TSP](https://federalretirement.net/thrift-savings-plan-tsp/))
- **✅ FERS Supplement earnings test.** If you have part-time/side-hustle wages above the annual SS limit ($22,320 in 2024), FEREX reduces the supplement $1 for every $2 over the limit — a reason to time Barista-FIRE income. ([OPM CSRS/FERS Handbook Ch. 51](https://www.opm.gov/retirement-center/publications-forms/csrsfers-handbook/c051.pdf))

### Service credit & early-out programs
- **✅ Military service deposit.** Enter your active-duty years and check **deposit paid** — those years are added to your FERS service for both the annuity and eligibility (the deposit itself, ~3% of military base pay + interest, is a high-return buyback). ([NIH – Retirement FAQs](https://hr.nih.gov/benefits/retirement/retirement-faqs))
- **✅ VERA / VSIP early-outs.** Toggle **VERA** (age 50 + 20 yrs, or any age + 25 yrs) for an immediate unreduced annuity with the supplement starting at MRA, and enter a **VSIP** buyout as a one-time taxable payment in your separation year. ([federalretirement.net – Early Outs](https://federalretirement.net/early_retirements.htm))

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
