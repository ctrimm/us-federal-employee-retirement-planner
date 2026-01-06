Preamble from author - There should be clearly defined milestones / life events that the user's can put onto their "timeline" for retirement as well - the key takeaway is to be able to play with inputs / outputs and see if they will have "enough"

# FEREX: Federal Employee Retirement Explorer
## Product Requirements Document

**Version**: 1.0  
**Date**: January 2026  
**Status**: Ready for Development  
**Tech Stack**: React + TypeScript, ShadCN UI (latest), Custom Typography, Recharts/Nivo for visualizations

---

## 1. EXECUTIVE SUMMARY

FEREX is a sophisticated yet intuitive retirement planning tool designed specifically for U.S. federal employees. It demystifies the complex interaction of FERS/CSRS retirement systems, TSP accumulation, survivor benefits, and FEHB healthcare eligibility across fragmented service histories.

Unlike generic retirement calculators, FEREX understands federal-specific rules including service breaks, system transitions, and the nuanced calculations that determine when an employee can retire with full benefits. The application combines ProjectionLab-style scenario modeling with clean, rearrangeable dashboard visualizations and real-time "what-if" analysis.

**Key Value Proposition**: Federal employees spend hours with spreadsheets or consulting advisors for clarity. FEREX delivers that clarity in minutes—through an exceptionally crisp onboarding flow, intelligent system detection, and dynamic projection visualizations.

---

## 2. PROBLEM STATEMENT

### Current Pain Points
- **System Complexity**: Federal retirement rules differ by hire date, service breaks, and system type (FERS/CSRS/TSP). Most employees don't understand which system governs their benefits.
- **Service Break Uncertainty**: Employees who left and returned face complex recalculations. Many don't realize the implications of time away.
- **Survivor Benefit Confusion**: Spouses and families don't know what protection is in place or what options exist.
- **Healthcare Planning Gaps**: FEHB eligibility rules (age + service requirements) are not integrated with retirement calculations.
- **Scattered Planning**: Projection Lab is good for general scenarios; Monarch Money handles budgeting. No tool bridges federal-specific rules with interactive scenario modeling.

### Target Users
- Federal employees (10-30+ years service) planning retirement in next 1-10 years
- Mid-career feds exploring "what if I leave and come back?"
- Near-retirees wanting clarity on survivors benefits and healthcare
- Federal HR/benefits counselors wanting to explain scenarios to staff
- Younger feds (5-10 years service) exploring long-term planning

---

## 3. CORE PRODUCT FEATURES

### 3.1 Intelligent Retirement System Detection

**Automatic Classification Engine**:
The app determines applicable retirement system(s) based on service history input:

- **FERS (Federal Employees Retirement System)** – Hired 1984 or later
  - Basic benefit: High-3 × 1% × years of service (up to 30 years)
  - Supplement: Until age 62 (bridge benefit)
  - COLA: Automatic Cost-of-Living Adjustments
  
- **CSRS (Civil Service Retirement System)** – Hired before 1984
  - Basic benefit: High-3 × (1.5% for first 5 years, 1.75% for 6-10, 2% for 11+)
  - No supplement needed (higher base calculation)
  - COLA: Full automatic adjustments (unlike FERS which may be reduced)
  
- **TSP (Thrift Savings Plan)** – All employees; tracking as supplement to pension
  
- **Hybrid Scenarios**: Service across multiple systems
  - Example: Hired 1980 (CSRS), left 1990, returned 2000 (FERS)
  - App calculates prorated CSRS benefit (for time 1980-1990) + FERS benefit (2000-retirement)

**Input Form Logic**:
- Service entry allows multiple "service blocks" (start date, end date, system if known)
- App auto-detects system; user can override if they have specific knowledge
- Validates service continuity and highlights breaks
- Shows timeline visualization of service history

---

### 3.2 Flexible Onboarding Flow

**Two Onboarding Paths** (user selects):

#### Path A: Express Onboarding (~3 minutes)
Minimal viable inputs for quick projection:
1. **Current Age & Gender** (for lifespan averages)
2. **Service History** (simple timeline input: start date, end date, any breaks)
3. **Current or Most Recent Salary** (auto-calculates High-3 projection)
4. **TSP Balance** (current amount, optional annual contribution)

**Result**: Quick retirement date estimates, basic pension projection, simple scenario comparison

#### Path B: Comprehensive Onboarding (~8-12 minutes)
Detailed inputs for precision planning:
1. **Service History** (as above, but with detailed validation)
2. **High-3 Calculation** (optional: enter actual last 3 years of salary for accuracy)
3. **Survivor Benefit Elections** (NONE, Reduced Annuity with Survivor Benefit, Court-Ordered)
4. **TSP Details** (current balance, contribution history, allocation %, employer match)
5. **Spouse/Family Info** (age, gender, if applicable—for survivor benefit calculations)
6. **FEHB Assumptions** (premiums, coverage level—populated with current rates but editable)
7. **Inflation/COLA Preferences** (customize vs. using defaults)

**Time Estimates**: Each section shows estimated input time (30 sec, 1 min, etc.)

**Smart Defaults**: 
- If not provided, use federal employee averages (3.5% inflation, 2.5% COLA)
- Gender-based lifespans: Male 82, Female 85 (sourced from Social Security actuarial data, with toggle for custom)

**Validation & Education**:
- Tooltips on complex fields
- "Why are we asking this?" explainers
- Auto-calculations (e.g., High-3 from history) offered when possible
- Real-time feedback: "Based on your service, you qualify for FERS at age [X] with [Y] years"

---

### 3.3 Projection Engine

**Core Calculation Methodology**:

#### Pension Calculation (Annually from Retirement Year to Life Expectancy)

```
Annual Pension = High-3 × Service Years × Accrual Rate × COLA Factor

Where:
- High-3 = Average of highest 3 consecutive years of pay
- Service Years = Actual service (prorated if breaks exist)
- Accrual Rate = System-specific % per year
  - FERS: 1% per year (max 30 years = 30%)
  - CSRS: 1.5/1.75/2% depending on tenure
- COLA Factor = Year-over-year adjustment (user-configurable, default 2.5%)
```

#### TSP Projection

```
Annual TSP Growth = Current Balance × (1 + Annual Return %)
Plus: Annual Contribution × (1 + Annual Return %)

Annual Return = Asset allocation weighted average
Default: 6.5% (conservative, long-term federal data)
User adjustable for pessimistic/optimistic scenarios
```

#### FEHB (Federal Employee Health Benefits) Calculation

```
Annual FEHB Cost = Base Premium × Age/Service Multiplier
- Increases with participant age
- Coverage starts at retirement if: Age + Service ≥ 75 (or specific conditions)
- Costs escalated by healthcare inflation (separate from general inflation)
```

#### Survivor Benefit Deduction (if elected)

```
If Survivor Annuity Elected:
  Pension Reduction = ~10% of pension amount (varies by age at election, survivor age)
  Survivor receives = 50-75% of pension (depending on election type)
```

#### Net Retirement Income Projection

```
Year N Income = 
  [Pension(Year N) × (1 - Survivor Reduction %)] 
  + [TSP Annual Distribution or Drawdown]
  - [FEHB Premiums]
  + [Other Sources: Social Security at age 67+, Part-Time Work]
  
Adjusted for:
  - Inflation on cost-of-living expenses
  - Tax implications (rough estimates, not detailed tax planning)
  - User-configured life expectancy
```

**User Controls**:
- **Inflation Rate**: Default 3.5%, adjustable in 0.1% increments
- **COLA Rate**: Default 2.5% (for pension adjustments), separate slider
- **TSP Return Assumption**: Default 6.5%, range 3-10%
- **Retirement Age**: Drag slider or input specific age
- **Life Expectancy**: Toggle gender-based default or custom age (85-100)
- **Survivor Benefit Elections**: Toggle on/off, select type
- **Healthcare Scenario**: Basic, Standard, or Self+Family FEHB coverage

**Dynamic Re-Calculation**:
- All changes trigger immediate recalculation (debounced for performance)
- Projection updates in real-time as user adjusts sliders

---

### 3.4 Dashboard & Visualization Suite

**Rearrangeable Card Layout** (user can drag, resize, hide/show):

#### Card 1: Service History Timeline (Fixed at Top)
- Visual timeline showing service periods, breaks, and system transitions
- Color-coded by system (FERS = blue, CSRS = green, Break = gray)
- Hover details show system rules applicable to each period
- Quick edit button to adjust service history

#### Card 2: Retirement Eligibility Summary (High-Level)
- **Earliest Retirement Date**: "You can retire at age 55 with 25 years of service (January 2028)"
- **Full Benefits Retirement**: "Full unreduced benefits at age 62 (December 2035)"
- **Survivor Benefit Status**: "Survivor Annuity: Not elected. Annual cost to family: $0. Family protection: Reduced."
- **FEHB Eligibility**: "Eligible for FEHB upon retirement if you retire at age 55+ with 10+ years service"
- Status indicators (badges) for each milestone

#### Card 3: Pension Breakdown Sankey Diagram
**Visual**: Horizontal sankey showing salary → pension calculation flow
- Left node: "High-3 Salary: $125,000"
- Middle flows: 
  - "25 years service" → multiply
  - "1% accrual (FERS)" → multiply
  - "Survivor annuity (-10%)" → subtract
- Right node: "Monthly Pension: $2,604"
- Hover on any flow to see exact calculation and assumptions
- This is THE flagship visual—makes the calculation transparent

#### Card 4: Projected Retirement Income (Waterfall Chart)
- Stacked area chart or waterfall showing income components over time
- Y-axis: Dollar amount (annual)
- X-axis: Age (60-95 or custom life expectancy)
- Stacks/segments:
  - Pension (grows with COLA)
  - TSP distributions
  - Social Security (if age 67+)
  - Part-time work income (if user enters assumption)
  - Deductions: FEHB premiums, taxes (estimated)
- Color-coded, clickable for drill-down
- Hover = show exact year values

#### Card 5: Net Worth Projection (Line Chart)
- Shows accumulated/drawdown of assets over retirement
- Y-axis: Net worth (thousands/millions)
- X-axis: Age/Year
- Assumes TSP is drawn down at user-defined rate
- Shows whether person runs out of money before life expectancy (red warning if so)
- Milestone markers (e.g., "Social Security starts age 67")

#### Card 6: Survivor Benefit Comparison (Optional Toggle)
- If survivor annuity is elected, show:
  - Your reduced annual pension (during retirement years)
  - Survivor annual amount (post-death, if applicable)
  - Breakeven analysis: "At age X, survivor has received equivalent value"
- Table or small chart format
- "What-if" toggle: Show comparison if you DIDN'T elect survivor benefit

#### Card 7: Sensitivity Analysis / Scenario Toggles (Mini-Cards)
- Small adjustable cards for quick "what-if":
  - Retirement age slider (with 3-5 common ages)
  - Inflation slider (pessimistic, default, optimistic)
  - COLA toggle
  - TSP return rate slider
  - Life expectancy selector (male avg, female avg, custom)
- Changes update all charts immediately (debounced)
- Each card shows impact in real-time

#### Card 8: FEHB Healthcare Cost Projection (Separate Card or Tab)
- Line chart showing annual FEHB premiums from retirement to age 95
- Color-coded by coverage level (Self-only, Self+Family)
- Notes healthcare inflation separately from general inflation
- Shows eligibility window clearly

#### Card 9: Detailed Data Table (Collapsible)
- Year-by-year breakdown exported as table
- Columns: Age, Year, Pension, TSP Distribution, FEHB Cost, Net Income, Cumulative Savings, etc.
- Sortable, filterable, downloadable as CSV

**Customization Features**:
- **Drag-to-Rearrange**: Grid layout, cards snap to position
- **Resize**: Cards expand to large, half-size, or collapsed
- **Hide/Show**: Toggle visibility of less-relevant cards
- **Chart Type Toggle**: Some cards allow switching between chart types (e.g., line vs. bar for income)
- **Color Scheme**: Light/dark mode toggle
- **Export**: Generate PDF report of current dashboard + input assumptions

---

### 3.5 Sample Scenario Library

**Pre-Built Scenarios** (users can load, modify, and save):

#### Scenario 1: The Boomerang Fed
**Narrative**: "Joined DoD in 2000, left for private sector in 2008 (8 years service), returned to OPM in 2015 (11 years service). Now exploring retirement options."

**Profile**:
- Birth year: 1980 (age 45 in 2026)
- Service 1: 2000-2008 (FERS, 8 years)
- Service Break: 2008-2015 (7 years, doesn't count)
- Service 2: 2015-present (FERS, 11 years) — *Total vested FERS: 19 years*
- Current salary: $95,000
- TSP balance: $120,000
- Gender: Male (life expectancy 82)

**Key Questions Answered**:
- "Can I retire at 55?" **No, you'd have 24 years total at age 55. You'd qualify for immediate annuity at age 57 with 26 years.**
- "What if I wait until 60?" **At 60, you'd have 29 years. Pension: ~$2,610/month (based on High-3 of $95K)**
- "How much does my service break cost me?" **~$8,500 in lifetime pension value (~0.6% reduction). Minimal impact because you returned early.**

**Marketing Angle**: "Thinking about leaving your federal job? See exactly what a service break costs—and what it's worth to come back."

---

#### Scenario 2: The Early Retirement Dream
**Narrative**: "Hired at the State Department in 1994. Steady career, now at salary cap. Exploring whether you can retire at 50."

**Profile**:
- Birth year: 1974 (age 51 in 2026) *[Note: Updated to realistic age]*
- Actually, let me revise: Birth year 1979 (age 46-47 in 2026) *[Better match for early retirement goal]*
- Continuous service: 1994-present (32 years CSRS—hired before 1984 threshold, so CSRS applies to early service, may have FERS component if rules changed)
- *Actually, CSRS ends in 1987. So: CSRS 1994-1987 window... let me reconsider.*
- **Revised**: Hired in 1988 (right after CSRS phase-out), so FERS since hire.
- Continuous service: 1988-present (37-38 years)
- Current salary: $155,000 (senior level)
- TSP balance: $650,000
- Spouse age: 44
- Gender: Female (life expectancy 85)

**Key Questions Answered**:
- "Can I retire at age 55?" **Yes, with 37 years of service. Pension: ~$4,555/month (High-3 of $155K × 1% × 37 years). NO reduction for early withdrawal.**
- "What about my spouse?" **Survivor annuity available. Choosing 50% survivor option reduces your pension by ~10%, to ~$4,100/month, but spouse gets ~$2,050/month if you predecease.**
- "With TSP, am I secure?" **At age 85 (your life expectancy), assuming 5% annual drawdown from TSP, you'd have zero TSP left around age 80. Pension covers living expenses. Total annual income: ~$60K+ (with TSP). Financially secure.**

**Marketing Angle**: "Early retirement is possible. See if you're one of the lucky ones—and plan survivor protection for your family."

---

#### Scenario 3: The Long Career, Healthcare Focus
**Narrative**: "30+ years of federal service, nearing traditional retirement age (62+). Main concern: healthcare transition to Medicare and FEHB interaction."

**Profile**:
- Birth year: 1963 (age 62 in 2026)
- Continuous service: 1992-present (34 years FERS)
- Current salary: $140,000
- TSP balance: $520,000
- No spouse (single)
- Gender: Male (life expectancy 82)

**Key Questions Answered**:
- "When can I retire?" **Now. At age 62 with 34 years, you qualify for immediate, unreduced FERS annuity. Pension: ~$3,570/month (High-3 $140K × 1% × 34 years).**
- "Should I keep working?" **Financially, you don't have to. TSP + pension covers needs. However, delaying 3 years increases pension by ~3% annually (COLA) + accumulates more TSP.**
- "Healthcare costs in retirement?" **FEHB costs ~$200-300/month for self-only at age 62. Shifts to Medicare at 65. Total healthcare budget: ~$4,500-6,000/year in early retirement, declining after Medicare.**
- "Will I run out of money?" **No. Pension ($42.8K/year) + TSP drawdown (assume 3% = $15.6K/year) = $58.4K/year. At $50K/year expenses, you're secure through age 82+.**

**Marketing Angle**: "Retire on your terms. See exactly when you're financially secure and how healthcare costs fit into your plan."

---

### 3.6 Real-Time "What-If" Scenario Modeling

**Scenario Comparison View**:
- User can create multiple scenarios (save to localStorage) and compare side-by-side
- Default scenarios (above) plus unlimited custom scenarios
- Comparison table shows key metrics:
  - Retirement age
  - Monthly pension
  - TSP at retirement
  - Life-expectancy-adjusted net worth
  - Total lifetime income (discounted to present value)
  - Survivor benefit status

**Scenario Actions**:
- **Duplicate**: Clone a scenario to make variations
- **Compare**: Show 2-3 scenarios side-by-side with highlighted differences
- **Save**: Persist to localStorage with scenario name and timestamp
- **Export**: Generate snapshot/PDF of scenario for sharing
- **Delete**: Remove custom scenarios (pre-built ones can't be deleted)

---

### 3.7 Data Persistence & Sharing

**Storage Options**:

1. **localStorage** (Default):
   - Saves all user input (service history, salary, TSP, etc.) to browser
   - Survives page refreshes within same browser
   - No account required
   - Limitation: Only works on same device/browser

2. **Shareable URL with Hashed Parameters** (Optional):
   - User clicks "Share Scenario" button
   - App encodes all input parameters as compressed, hashed URL
   - Example: `https://ferex.app/?s=aB7cD9e...` (hashed input)
   - Recipient opens link, scenario loads in read-only mode
   - Can click "Use as Template" to create editable copy
   - Hash is reversible but not easily human-readable (protects against casual link manipulation)

**Sync Strategy**:
- Auto-save to localStorage every 2 seconds (debounced)
- Visual indicator: "Saved" status badge (green checkmark) appears briefly
- If user leaves page, draft is preserved on return

---

## 4. TECHNICAL SPECIFICATIONS

### 4.1 Tech Stack

**Frontend**:
- **Framework**: React 18+ with TypeScript
- **UI Components**: ShadCN UI (latest version)
  - Dropdown menus, Date pickers, Input fields, Sliders, Tabs, Cards, Modals, Tooltips
  - Radix UI primitives under the hood
  
- **Styling**:
  - Tailwind CSS (included with ShadCN)
  - Custom typography: **IBM Plex Sans** or **Geist** for body; **IBM Plex Mono** for data tables
    - IBM Plex: Professional, government-appropriate, excellent readability
    - Geist: Modern, clean, tech-forward
    - Recommendation: IBM Plex Sans for authority + clarity, or Geist for contemporary feel
  - Dark mode support (native Tailwind)
  - Color scheme: Professional blues/grays with accent colors for key metrics

**Charts & Visualization**:
- **Recharts** (primary): Line, area, sankey, waterfall, bar charts
  - Pros: React-native, responsive, ShadCN-compatible theming
  - Use for: Income projection, net worth, age timeline
  
- **Nivo** (secondary for complex): Sankey diagram for pension calculation flow
  - Pros: Highly customizable, stunning visuals, great for flow diagrams
  - Use for: Salary → Pension sankey (flagship visual)
  
- **Custom SVG**: Timeline visualization for service history

**State Management**:
- **React Context API** (for global state: current scenario, user inputs)
- Alternative: **Zustand** (if complex state needed later)

**Data Storage**:
- **localStorage**: Browser persistence
- **URL State**: Custom encoder/decoder for hashed URL params (zlib compression + base64 encoding)

**Build & Deployment**:
- **Vite** (fast build tool)
- **TypeScript**: Full type safety
- **Testing**: Vitest + React Testing Library (optional for MVP)

---

### 4.2 Data Models

#### User Input Schema (TypeScript Interfaces)

```typescript
interface ServicePeriod {
  id: string;
  startDate: Date;
  endDate?: Date; // Omit if current
  system: 'FERS' | 'CSRS' | 'auto'; // auto = detect from date
  isActive: boolean; // Current employment
}

interface UserProfile {
  personal: {
    birthYear: number;
    gender: 'male' | 'female';
    lifeExpectancy?: number; // Override default
    spouseInfo?: {
      name?: string;
      age: number;
      gender: 'male' | 'female';
    };
  };
  
  employment: {
    servicePeriods: ServicePeriod[];
    currentOrLastSalary: number;
    high3Override?: number; // If user wants to specify
    lastHighThreeYears?: {
      year1: number;
      year2: number;
      year3: number;
    };
  };
  
  retirement: {
    survivorAnnuityType: 'none' | 'standard' | 'courtOrdered'; // Different reduction %
    intendedRetirementAge?: number;
    projectionEndAge?: number;
  };
  
  tsp: {
    currentBalance: number;
    annualContribution: number;
    returnAssumption: number; // Default 6.5%
    currentAllocation?: {
      cFund: number; // %
      sFund: number;
      iFund: number;
      lFunds: {
        l2070: number;
        l2065: number;
        l2060: number;
        l2055: number;
        // ... other lifecycle funds
      };
    };
  };
  
  assumptions: {
    inflationRate: number; // Default 3.5%
    colaRate: number; // Default 2.5%
    healthcareInflation: number; // Default 5.0%
    fehbCoverageLevel: 'self' | 'self+one' | 'self+family';
  };
}

interface ProjectionYear {
  age: number;
  year: number;
  pension: number; // Annual
  tspDistribution: number;
  socialSecurity: number; // If applicable
  otherIncome: number; // Part-time work, etc.
  fehbCost: number;
  totalIncome: number;
  netIncome: number; // After FEHB, estimated taxes
  tspBalance: number; // Remaining
  cumulativeSavings: number;
}

interface Scenario {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  profile: UserProfile;
  projections: ProjectionYear[]; // Calculated on demand
  metadata: {
    isPreBuilt: boolean;
    tags?: string[];
  };
}
```

---

### 4.3 Retirement System Rules Engine

**Logic Pseudocode**:

```
FUNCTION determineEligibility(profile):
  FOR EACH servicePeriod:
    IF servicePeriod.startDate < 1984-01-01:
      system = CSRS
    ELSE:
      system = FERS
    
    IF servicePeriod.isActive:
      totalVestedService += (today - servicePeriod.startDate) years
    ELSE:
      totalVestedService += (endDate - startDate) years
      // Non-consecutive service generally doesn't add up for CSRS,
      // but does for FERS (with some caveats)
  
  // Eligibility checks:
  IF totalVestedService >= 20 AND age >= 20:
    canRetireImmediately = TRUE // MRA (Minimum Retirement Age) rules
  ELSE IF totalVestedService >= 30 AND age >= 55:
    canRetireImmediately = TRUE
  ELSE IF totalVestedService >= 25 AND age >= 55: // MRA varies by hiring year
    canRetireImmediately = TRUE
  
  // FEHB eligibility (rough; more detail in future PRD):
  IF totalVestedService >= 10 AND age >= 55:
    fehbEligible = TRUE
  ELSE IF totalVestedService >= 5 AND age >= 65:
    fehbEligible = TRUE
  
  RETURN eligibility status
```

**System-Specific Calculation**:

```
FUNCTION calculateAnnualPension(profile, retirementYear):
  high3 = determineHigh3(profile)
  totalVestedYears = calculateTotalService(profile)
  
  FOR EACH servicePeriod:
    IF servicePeriod.system == FERS:
      accrualRate = 0.01 // 1% per year, max 30 years
    ELSE IF servicePeriod.system == CSRS:
      IF yearsInThisPeriod <= 5:
        accrualRate = 0.015 // 1.5%
      ELSE IF yearsInThisPeriod <= 10:
        accrualRate = 0.0175 // 1.75%
      ELSE:
        accrualRate = 0.02 // 2%
    
    yearlyBenefit += (high3 × yearsInThisPeriod × accrualRate)
  
  // Apply survivor annuity reduction if elected
  IF survivorAnnuityElected:
    reduction = calculateSurvivorReduction(retirementAge, spouseAge)
    yearlyBenefit -= (yearlyBenefit × reduction)
  
  // Apply COLA for projection year
  colaMultiplier = (1 + colaRate) ^ (projectionYear - retirementYear)
  yearlyBenefit *= colaMultiplier
  
  RETURN yearlyBenefit
```

---

### 4.4 Component Architecture

```
/src
  /components
    /layout
      Navbar.tsx
      Sidebar.tsx
      DashboardGrid.tsx (Rearrangeable grid system)
    
    /cards
      ServiceHistoryCard.tsx
      EligibilitySummaryCard.tsx
      PensionBreakdownCard.tsx
      IncomeProjectionCard.tsx
      NetWorthCard.tsx
      SurvivorBenefitCard.tsx
      SensitivityCard.tsx
      FEHBCostCard.tsx
      DataTableCard.tsx
    
    /charts
      SankeyDiagram.tsx (Pension flow)
      IncomeWaterfallChart.tsx
      NetWorthLineChart.tsx
      ServiceTimelineChart.tsx
      FEHBProjectionChart.tsx
    
    /forms
      OnboardingFlow.tsx
      ExpressOnboarding.tsx (3 steps)
      ComprehensiveOnboarding.tsx (7+ steps)
      ScenarioCreation.tsx
      ScenarioComparison.tsx
    
    /modals
      ScenarioManager.tsx
      SharingModal.tsx (URL + localStorage options)
      ExportModal.tsx (PDF, CSV)
      DetailsModal.tsx (Drill-down for specific calculations)
  
  /logic
    retirementEngine.ts (Calculation logic)
    systemDetection.ts (FERS/CSRS/TSP rules)
    projectionCalculator.ts (Year-by-year projections)
    survivorBenefitCalculator.ts
    fehbCalculator.ts
    urlEncoding.ts (Hashed URL parameter management)
  
  /data
    constants.ts (Default assumptions, federal pay tables)
    sampleScenarios.ts (Pre-built scenarios)
    federalPayScales.ts (Optional: historical fed salary data)
  
  /hooks
    useProjection.ts (Main calculation hook)
    useScenarioStorage.ts (localStorage management)
    useChartLayout.ts (Dashboard rearrangement state)
  
  /utils
    dateHelpers.ts
    currencyFormatter.ts
    chartThemes.ts (Consistent chart styling)
  
  App.tsx
  main.tsx
```

---

### 4.5 Key Workflows

#### Workflow 1: New User Landing → Quick Retirement Check
1. User lands on app → "Quick Check" vs. "Detailed Planning" button
2. Selects "Quick Check" → Express Onboarding begins
3. Steps:
   - Birth year & gender (auto-selects life expectancy)
   - Service history (drag timeline or input dates)
   - Current/last salary
   - TSP balance (optional)
4. App calculates and displays:
   - "You can retire at age [X] with [Y] years of service"
   - Projected monthly pension
   - TSP/income summary
5. User can refine assumptions or dive into detailed view

#### Workflow 2: Detailed Planning with Multiple Scenarios
1. User selects "Detailed Planning" → Comprehensive Onboarding
2. Steps: Service history, High-3, survivor benefits, TSP details, spouse info, assumptions
3. After completion → Main dashboard loads with all cards
4. User adjusts sliders (retirement age, inflation, COLA) → Charts update real-time
5. User creates alternative scenario: Duplicates current → Adjusts key variables
6. Compares scenarios side-by-side
7. Exports PDF with all assumptions and projections

#### Workflow 3: Sharing a Scenario
1. User builds scenario, satisfied with results
2. Clicks "Share" button
3. Modal offers:
   - Option A: "Copy Link" → Generates hashed URL, copies to clipboard
   - Option B: "Export PDF" → Generates formatted report
   - Option C: "Save to Browser" → Persists in localStorage
4. Recipient opens link → Scenario loads read-only
5. Can "Duplicate & Edit" to create their own variant

#### Workflow 4: Loading Pre-Built Sample Scenarios
1. User clicks "Sample Scenarios" button (in onboarding or main nav)
2. Library shows 3 scenarios:
   - "The Boomerang Fed"
   - "Early Retirement Dream"
   - "Long Career + Healthcare Focus"
3. User selects one → Data loads into dashboard
4. Explanation modal shows "What makes this scenario interesting?"
5. User can modify assumptions and explore variants

---

## 5. USER INTERFACE DESIGN

### 5.1 Design System

**Typography**:
- **Primary Font**: IBM Plex Sans (or Geist)
- **Mono Font**: IBM Plex Mono (for tables, code-like data)
- **Font Sizes**:
  - Page Title: 32px, bold
  - Card Headers: 18px, semi-bold
  - Body Text: 14px
  - Captions/Tooltips: 12px
  - Data Values: 14-16px (larger for emphasis)

**Color Palette**:
- **Primary**: Professional blue (#0066CC or #2563EB)
- **Secondary**: Gov gray (#4B5563)
- **Accent**: Teal/green for positive metrics (#10B981)
- **Warning**: Amber for cautions (#F59E0B)
- **Danger**: Red for critical issues (#EF4444)
- **Neutral**: Light gray for backgrounds (#F3F4F6)

**Spacing & Layout**:
- 8px grid system
- Card padding: 16px
- Card gaps: 16px
- Margin/padding increments: 4px, 8px, 12px, 16px, 24px, 32px

---

### 5.2 Core Screens

#### Screen 1: Landing Page
- Headline: "Decode Your Federal Retirement"
- Subheading: "Understand your FERS, CSRS, TSP, and survivor benefits in minutes."
- Two CTA buttons:
  - "Quick Check (3 min)" → Express onboarding
  - "Detailed Planning (10 min)" → Comprehensive onboarding
- Social proof (optional): "Used by [X] federal employees" or "Trusted by [Partners]"
- Explainer section: "Why FEREX? Federal retirement is complex. We make it clear."

#### Screen 2: Express Onboarding (3 steps)
Step 1: Personal Info
- "When were you born?"
  - Year input (dropdown or number field, default to reasonable range 1950-2010)
- "What's your gender?"
  - Radio: Male / Female (drives life expectancy)
  - Checkbox: "Customize life expectancy?" (shows input field for age)

Step 2: Service History
- Timeline input: "When did you work for the federal government?"
  - Add service blocks button
  - Each block: Start date, End date, System (auto-detect or dropdown)
  - Visual timeline shows blocks, gaps, total service years
  - Validation: Red warning if gaps > 7 years (indicates potential pension impact)

Step 3: Income & TSP
- "What was your most recent salary?" → Number input, currency format
  - Helper text: "This is used to calculate your High-3 average."
- "What's your TSP balance?" → Number input, optional
  - Helper text: "Only used to estimate retirement income alongside your pension."

Button: "Calculate My Retirement" → Loads dashboard with results

#### Screen 3: Comprehensive Onboarding (7+ steps with estimated time)
Each step in a modal/slide format with "Next" and "Back" buttons.

Step 1: Service History (same as express)
Step 2: High-3 Calculation
- "Enter your salary for the last 3 years (if known):"
  - Year 1, Year 2, Year 3 → inputs
  - OR: Single "Most Recent" salary + calculator shows projection
  - Result display: "Your High-3 average: $[X]"

Step 3: Survivor Benefits
- "Do you want to elect a survivor annuity?"
  - Radio options:
    - None
    - Standard Survivor Annuity (50% of pension to survivor)
    - Court-Ordered / Required
  - Explanation: What each means, estimated annual reduction

Step 4: TSP Details
- TSP balance: Number input
- Annual contribution: Number input (optional)
- Return assumption: Slider (default 6.5%, range 3-10%)
- Allocation (optional): Breakdown of C, S, I, L funds (or simplified slider: Conservative to Aggressive)

Step 5: Spouse/Family Info (Optional)
- "Are you married/partnered?"
  - Yes / No
  - If yes:
    - Spouse age: Number input
    - Spouse gender: Radio
    - Used for survivor benefit calculations

Step 6: Financial Assumptions
- Inflation rate: Slider (default 3.5%)
- COLA rate: Slider (default 2.5%)
- Healthcare inflation: Slider (default 5.0%)
- TSP annual return: Slider (already asked, but can re-confirm)
- Life expectancy: Selector (Male avg / Female avg / Custom input)

Step 7: FEHB Coverage (Preview)
- "What level of Federal Employee Health Benefits?"
  - Self-only / Self+One / Self+Family
  - Current estimated annual cost displayed
  - Explainer: "Costs will increase with age and inflation."

Button: "Start My Retirement Plan" → Loads dashboard

#### Screen 4: Main Dashboard
- Header bar:
  - App logo/name on left
  - Breadcrumb/page title: "Scenario: [Scenario Name]"
  - Right side: Buttons for Edit, Save, Compare, Export, Share
  
- Sidebar (collapsible, or top nav):
  - Current scenario name
  - Quick stats: "Retire at [Age] | Pension: $[X]/mo | TSP Balance: $[Y]"
  - Navigation: Scenarios, Help, Settings
  
- Main content area:
  - Rearrangeable grid of cards (1-4 columns, responsive)
  - Each card has:
    - Header with title and icon
    - Drag handle (≡) in top-left
    - Expand/collapse icon, settings icon (for some)
    - Content area with chart or data
    - Footer with "Learn More" or data source link
  
- Bottom: Footer with "Powered by FEREX" and links to Help, Privacy, GitHub (if open source)

#### Screen 5: Scenario Comparison
- Table format, 2-3 columns (scenarios side-by-side)
- Rows: Key metrics (Retirement Age, Monthly Pension, TSP at Retirement, etc.)
- Differences highlighted in color (Scenario A is higher: green, etc.)
- Toggle: "Show all metrics" vs. "Key metrics only"
- Action buttons: "Edit Scenario A", "Duplicate", "Delete"

---

### 5.3 Mobile Responsiveness
- Breakpoints: 320px, 768px, 1024px, 1440px
- On mobile: Stack cards vertically, full-width
- Sidebar collapses to hamburger menu
- Sliders become easier-to-use (larger touch targets)
- Charts adapt: Maybe simpler visuals or separate tabbed view for mobile

---

## 6. SAMPLE SCENARIOS (DETAILED)

### Scenario 1: The Boomerang Fed

**Headline**: "Left your federal job? See what a service break costs—and what it's worth to come back."

**Profile Summary**:
- Name (if desired): "Morgan" (generic, relatable)
- Birth year: 1980 (age 45-46)
- Gender: Male (default life expectancy: 82)

**Service History**:
| Period | Start | End | System | Years | Notes |
|--------|-------|-----|--------|-------|-------|
| 1 | 2000 | 2008 | FERS | 8 | DoD Civilian |
| Break | 2008 | 2015 | — | 7 | Private sector, tech |
| 2 | 2015 | 2026 | FERS | 11 | OPM/VA |
| **Total Vested Service** | | | | **19** | Break doesn't count toward pension |

**Current Status**:
- Salary: $95,000
- TSP balance: $120,000 (accumulated in periods 1 & 2)
- No survivor annuity elected

**Projection Results**:
- **Earliest Retirement**: Age 57 with 26 years (2028)
  - Monthly pension: ~$2,470 (High-3 $95K × 1% × 26 years)
- **At Age 62**: 
  - Years of service: 31
  - Monthly pension: ~$2,945
- **At Age 65 (Full Social Security Age)**:
  - Years of service: 34
  - Monthly pension: ~$3,230
  - Social Security (estimated): ~$1,800/month
  - TSP drawdown (4% rule): ~$4,800/year
  - **Total annual income**: ~$72,000

**What-If Comparisons**:
- **If you'd never left** (continuous 26 years service by 2026):
  - You'd already qualify for immediate annuity at age 55 (25+ years)
  - Pension would be 3-4% higher
  - **Lifetime cost of 7-year break**: ~$45,000-$60,000 in reduced lifetime pension
  
- **If you return for 5 more years (retire at 60 with 24 years)**:
  - Monthly pension: ~$2,280
  - May not qualify for immediate annuity at 55 (need 25+ years or MRA)
  - **Staying 5 more years is worth**: ~$30,000 additional lifetime pension

**Key Insight**: The 7-year break is expensive (~$500-600/year in lost pension), but coming back early enough mitigates most of the damage. If you'd returned 1-2 years earlier, impact would be minimal.

**Interactive Elements**:
- Slider: "Adjust return date" → See how waiting affects total service and eligibility
- Toggle: "Show comparison: If you never left vs. actual path"
- Scenario variant: "What if I came back in 2013 instead of 2015?"

---

### Scenario 2: Early Retirement Dream

**Headline**: "Retire at 55 with 30+ years of service. We show you whether you can afford it."

**Profile Summary**:
- Name: "Alex"
- Birth year: 1971 (age 54-55 in 2026)
- Gender: Female (life expectancy: 85)
- Marital status: Married; spouse age 52

**Service History**:
| Period | Start | End | System | Years |
|--------|-------|-----|--------|-------|
| Continuous | 1988 | 2026 | FERS | 38 |

**Current Status**:
- Salary: $155,000 (senior GS-15 or equivalent)
- TSP balance: $650,000
- Spouse: Age 52, working (income to be considered separately)
- Survivor annuity: **Considering** (not yet elected)

**Retirement Scenarios**:

**Option A: Retire at 55 (Immediately)**
- Years of service: 38 (exceeds 30-year max, so capped at 30% accrual)
  - Actually, FERS allows more than 30 years. Let me recalculate:
  - Pension = High-3 × 1% × Years = $155K × 1% × 38 = $58,900/year ($4,908/month)
- TSP balance: $650,000 (assume 5.5% growth from now to retirement)
  - **At retirement**: ~$710,000
- Survivor annuity: Not elected
  - Pension remains $4,908/month
  - At spouse's death or your death, survivor gets nothing

**Option B: Retire at 58 (Work 3 more years)**
- Years of service: 41
- Pension = $155K × 1% × 41 = $63,550/year ($5,296/month)
- TSP balance at retirement: ~$840,000
- Additional benefit: Spouse ages 55, closer to Social Security eligibility
- **Incremental gain**: $388/month or $4,656/year (4.2% increase in income)

**Option C: Retire at 55 WITH Survivor Annuity**
- Pension reduction: ~10-12% (varies by age at election)
- Reduced pension: ~$4,325/month
- Survivor protection: Spouse would receive ~$2,160/month if you predecease
- **Annual cost**: ~$700-800/year in reduced income
- **Family security value**: Spouse coverage for life

**Income Projection (Option A: Retire at 55)**
| Age | Year | Pension | TSP Draw | Social Security | Total | TSP Balance |
|-----|------|--------|----------|-----------------|-------|-------------|
| 55 | 2026 | $58.9K | $35.0K* | — | $93.9K | $675K |
| 60 | 2031 | $61.5K | $35.0K | — | $96.5K | $620K |
| 65 | 2036 | $64.3K | $35.0K | $32.0K** | $131.3K | $550K |
| 70 | 2041 | $67.2K | $35.0K | $42.0K** | $144.2K | $450K |
| 75 | 2046 | $70.2K | $35.0K | $45.0K | $150.2K | $320K |
| 80 | 2051 | $73.3K | $25.0K | $45.0K | $143.3K | $150K |
| 85 | 2056 | $76.6K | $10.0K | $45.0K | $131.6K | $10K |

*Assumes 5% annual TSP drawdown  
**Social Security estimates (rough)

**Outcome**: 
- At life expectancy (85), you have minimal TSP left but pension + Social Security cover living expenses
- **Financially secure** to retire at 55
- Spouse could also retire at 55 and still have income for couple's needs

**Interactive Elements**:
- Comparison table: Retire at 55 vs. 58 vs. 62
- Slider: "Adjust retirement age" → See pension and income impact
- Toggle: "Include survivor annuity" → See cost-benefit
- Slider: "Adjust TSP drawdown rate" → See when you'd run out of money
- Chart: "Cumulative lifetime income" (discounted value) to show difference between retiring early vs. late

---

### Scenario 3: Long Career + Healthcare Focus

**Headline**: "30+ years of service. Retire with confidence knowing healthcare is covered."

**Profile Summary**:
- Name: "Jordan"
- Birth year: 1963 (age 62 in 2026)
- Gender: Male (life expectancy: 82)
- Marital status: Single, no dependents

**Service History**:
| Period | Start | End | System | Years |
|--------|-------|-----|--------|-------|
| Continuous | 1992 | 2026 | FERS | 34 |

**Current Status**:
- Salary: $140,000
- TSP balance: $520,000
- No survivor annuity (single, no dependents)

**Retirement Decision**:
- **Age 62 (Now)**: Can retire immediately with unreduced annuity
  - Years of service: 34 (FERS caps effective accrual at 30%)
  - Pension = $140K × 1% × 30 = $42,000/year ($3,500/month, capped)
    - Actually, FERS allows >30 years. Penalty applies only if retiring before MRA w/o 30 years.
    - Recalculate: $140K × 1% × 34 = $47,600/year ($3,967/month)
  - Earliest eligibility: Age 57 with 30 years; age 62 with 20+ years
  - **At 62 with 34 years: IMMEDIATE ANNUITY, no reduction**

**Healthcare in Retirement**:
- **FEHB Eligibility**: Yes (age 62 + 34 years service exceeds all thresholds)
  - Current annual cost (self-only): ~$4,000-$4,500/year
  - Assumed increase: 5% annually (healthcare inflation)
  - Stays until Medicare at 65
  - At 65: Switch to Medicare, keep FEHB as supplement

**Retirement Income Projection**:
| Age | Year | Pension | TSP Draw | Medicare Costs | FEHB | Net Income |
|-----|------|--------|----------|---|---|---|
| 62 | 2026 | $47.6K | $20.8K* | — | $(4.2K) | $64.2K |
| 65 | 2029 | $49.8K | $20.8K | $(2.0K) | $(4.5K) | $64.1K |
| 70 | 2034 | $52.4K | $20.8K | $(2.5K) | $(5.0K) | $65.7K |
| 75 | 2039 | $55.1K | $20.8K | $(3.0K) | $(5.5K) | $67.4K |
| 80 | 2044 | $57.8K | $20.8K | $(3.5K) | $(6.0K) | $69.1K |
| 82 | 2046 | $58.9K | $20.0K | $(3.7K) | $(6.2K) | $69.0K |

*Assumes 4% annual TSP drawdown

**Key Insights**:
1. **You can retire now.** Pension alone ($47.6K/year) covers most living expenses if you're not extravagant.
2. **TSP is a cushion.** At $520K, drawing 4% = $20.8K/year. Combined with pension, you have $68K+/year.
3. **Healthcare costs are manageable.** FEHB ($4-5K/year) is less than half the average American's health costs in retirement.
4. **You won't run out of money.** Even with healthcare inflation, pension + drawdown sustains you to life expectancy (82).

**Optional: What If You Work 3 More Years (Until 65)?**
- Pension increases: 3 × 2% (COLA) = ~6% → $50.5K/year
- TSP grows: To ~$650K, drawing $26K/year
- **Total annual income**: $76.5K
- **Trade-off**: 3 more years of work vs. $12K/year additional income
- **Breakeven**: Slightly positive if you live to 85, but the difference is marginal

**Interactive Elements**:
- Slider: "Retire now vs. work longer" → Compare age 62, 65, 67
- Chart: "Healthcare costs over time" → Shows FEHB phase-out at Medicare
- Toggle: "Include Social Security at age 67" → See additional income
- Sensitivity: "What if healthcare inflation is 6% instead of 5%?" → Recalculate all projections
- Explainer card: "Why Medicare doesn't eliminate FEHB costs" (supplement premiums, etc.)

---

## 7. MARKETING & POSITIONING

**Tagline**: "Decode Your Federal Retirement"

**Key Messages**:
1. **Clarity**: "Federal retirement is complex. FEREX makes it simple."
2. **Confidence**: "See your exact retirement date and income—no guessing."
3. **Choice**: "Compare scenarios and understand the cost of every decision."
4. **Control**: "Adjust assumptions and watch your retirement plan shift in real-time."

**Target Channels**:
- Federal employee networks (NFED, NARFE, etc.)
- Agency HR/Benefits departments
- Reddit communities (r/federal_employees, r/USAJOBS)
- LinkedIn (federal employee groups)
- Government modernization forums

**SEO Keywords**:
- Federal employee retirement calculator
- FERS vs. CSRS calculator
- Federal retirement planning tool
- TSP retirement projection
- Federal employee pension calculator

---

## 8. FUTURE ENHANCEMENTS (Out of Scope)

1. **Federal Employee Health Benefits (FEHB) Deep Dive**: Separate PRD covering plan comparisons, coverage details, continuation rules, etc.
2. **Tax Planning Integration**: Estimated tax liability, tax-advantaged withdrawal strategies, Roth conversions
3. **Social Security Optimization**: Claim timing, Spousal/survivor Social Security benefits, impacts on federal pension
4. **Account Integration**: Connect to real TSP account, federal payroll systems (likely sensitive—may not pursue)
5. **Behavioral Coaching**: Nudges, notifications, milestone celebrations ("You're on track!")
6. **AI Assistant**: Ask questions in natural language ("When can I retire? What if I work 5 more years?")
7. **Mobile App**: Native iOS/Android app with offline support
8. **Paid Premium Tier**: Detailed tax planning, 1:1 advisor consultations, advanced scenario modeling
9. **Family Planning**: Childcare costs, education savings integration
10. **User Accounts**: Save multiple profiles, cross-device sync, collaboration for couples

---

## 9. SUCCESS METRICS

**User Engagement**:
- Time on site: Average 12+ minutes (first visit)
- Scenario completion rate: >70% of users finish onboarding
- Return visits: >30% of users return within 30 days
- Scenario exports: >20% of users export/share a scenario

**Product Quality**:
- Calculation accuracy: Validated against OPM benefit estimators
- Page load time: <2 seconds (first contentful paint)
- Mobile usability: >80% of sessions on mobile complete scenario
- Error rate: <0.1% of projections have calculation errors

**Business Impact**:
- User growth: 500+ users in month 1, 5K+ in month 6
- Adoption: Among target federal employee communities
- Feedback NPS: >50 (promoters recommend to peers)
- Referrals: >25% of traffic from word-of-mouth

---

## 10. LAUNCH TIMELINE

**Phase 1: MVP (8 weeks)**
- Core onboarding (express + comprehensive)
- Retirement system detection
- Basic projection engine (FERS/CSRS/TSP)
- Dashboard with 5-6 key cards and charts
- localStorage persistence

**Phase 2: Polish & Extend (4 weeks)**
- Additional visualizations (Sankey, sensitivity analysis)
- Pre-built sample scenarios with marketing context
- URL-based sharing (hashed parameters)
- Mobile optimization
- Help/education modals

**Phase 3: Launch (1 week)**
- QA and testing
- Deployment to production
- Marketing campaign rollout
- Community engagement (Reddit, forums, etc.)

---

## 11. APPENDIX: RETIREMENT SYSTEM REFERENCE

### FERS (Federal Employees Retirement System)

**Eligibility**:
- Age 62 with 5+ years service
- Age 57-60 with 30+ years service
- MRA (age 50-57 depending on hire year) + 20 years service

**Benefit Calculation**:
- 1% × High-3 × Years of service (capped at 30% for normal accrual, but years >30 can apply)

**COLA**: Annual adjustment (current rate ~2-3%)

**Supplement (Bridge Benefit)**: 
- Special provision for those retiring before age 62
- Reduces at age 62 when Social Security begins

**Survivor Benefits**:
- Standard annuity: Reduces pension ~10%; survivor gets 50% of pension
- Court-ordered: Special arrangements

---

### CSRS (Civil Service Retirement System)

**Eligibility**:
- Age 55 with 30 years service
- Age 60 with 20 years service
- Age 62 with 5 years service

**Benefit Calculation**:
- 1.5% × High-3 × First 5 years
- +1.75% × High-3 × Next 5 years
- +2% × High-3 × Years beyond 10

**COLA**: Full automatic adjustments (differs from FERS)

**Survivor Benefits**: Similar to FERS but slightly different reduction calculations

---

### TSP (Thrift Savings Plan)

- Employee-directed 401(k)-style retirement savings
- Government match (typically 5% for FERS employees)
- Annual contribution limits (2025: $24,500)
- Investment options: C, S, I, F funds, or L-funds (lifecycle)
- Can be rolled over to IRA or other 401(k) plans

---

## Conclusion

FEREX bridges a critical gap in federal employee financial planning. By combining federal-specific retirement rules with intuitive scenario modeling and gorgeous visualizations, it empowers employees to make confident, informed retirement decisions.

The application's focus on clarity, interactivity, and accessibility positions it as the go-to tool for federal employees exploring their retirement options—whether they're years away or ready to take the leap.

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Cory  
**Status**: Ready for Development
