# FEREX Development TODO

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

## Known Issues / Limitations

1. **Simplified Calculations**: Some edge cases not yet handled:
   - FERS Supplement calculations
   - Special retirement categories (LEO, ATC, etc.)
   - Disability retirement
   - Deferred retirement

2. **UI Polish**: MVP focuses on functionality over design:
   - No charts/visualizations yet (table-based)
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
