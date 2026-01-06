# FEREX Future Features & Enhancements

This document tracks planned features and enhancements for future releases of FEREX (Federal Employee Retirement Explorer).

## ✅ Completed in Current Release (v1.1)

### Interactive Visualizations
- [x] Interactive income projection chart (Recharts stacked area)
- [x] TSP balance projection chart with depletion indicator
- [x] Net worth over time chart
- [x] Part-time work income shown separately in all charts

### Control & Customization
- [x] Side panel control system for adjusting variables
- [x] FEHB coverage level selector (Self, Self+One, Self+Family)
- [x] Retirement age slider (55-70)
- [x] TSP drawdown rate control (2-10%)
- [x] TSP return assumption slider (3-10%)
- [x] Inflation rate control (1-6%)
- [x] COLA rate adjustment (0-5%)
- [x] Healthcare inflation slider (2-8%)

### Scenario Management
- [x] Scenario comparison view (side-by-side comparison)
- [x] Add/remove scenarios dynamically
- [x] Comparison highlights (best pension, lifetime income)
- [x] localStorage persistence for comparison queue
- [x] Real-time recalculation based on user inputs

### Barista FIRE (NEW!)
- [x] Opt-in Barista FIRE modeling
- [x] Target retirement income setting
- [x] Part-time income configuration ($10K-$50K annually)
- [x] Part-time work start/end age controls
- [x] Duration calculator (years of part-time work)
- [x] Visual representation in charts and tables
- [x] Green highlighting for part-time income in tables

## High Priority Features

### Advanced Visualizations

- [ ] **Pension Breakdown Sankey Diagram**
  - Visual flow from salary → service years → accrual rate → final pension
  - Interactive hover states showing calculations
  - Color-coded by FERS/CSRS components

- [ ] **Interactive Timeline Visualization**
  - Visual service history timeline with drag-and-drop
  - Add/remove service periods graphically
  - Show system transitions (FERS/CSRS)
  - Highlight service breaks with impact calculations

- [ ] **FEHB Cost Projection Chart**
  - Dedicated chart for healthcare costs over time
  - Show Medicare transition at age 65
  - Compare different coverage levels side-by-side

- [ ] **Cash Flow Waterfall Chart**
  - Show income sources and expenses
  - Visualize net income after FEHB and taxes
  - Highlight positive/negative cash flow years

### Enhanced Onboarding

- [ ] **Comprehensive 7-Step Onboarding**
  - Service history with multiple periods
  - Detailed High-3 calculation with actual salaries
  - Survivor benefit calculator with impact analysis
  - TSP allocation breakdown by fund
  - Spouse/family information
  - Customizable financial assumptions
  - FEHB plan selection

- [ ] **Onboarding Progress Saving**
  - Save partial completion
  - Resume from any step
  - Skip/come back to optional sections

- [ ] **Smart Defaults & Recommendations**
  - Suggest TSP allocation based on age
  - Recommend retirement age based on service
  - FEHB coverage suggestions based on family info

### Data Export & Sharing

- [ ] **PDF Export**
  - Comprehensive retirement report
  - Include all charts and tables
  - Professional formatting
  - Custom branding options

- [ ] **Excel/CSV Export**
  - Year-by-year data table
  - All calculation inputs
  - Summary statistics
  - Formulas for user modification

- [ ] **Shareable URL with Encoded Parameters**
  - Compress scenario data into URL hash
  - Share with financial advisors/family
  - Read-only or editable modes
  - Expiration/privacy options

- [ ] **Email Report**
  - Send PDF report to email
  - Schedule periodic updates
  - Alert on assumption changes

## Medium Priority Features

### Enhanced Calculations

- [ ] **FERS Supplement Calculator**
  - Calculate FERS Special Retirement Supplement
  - Show when supplement ends (age 62)
  - Factor into income projections

- [ ] **Social Security WEP/GPO Adjustments**
  - Windfall Elimination Provision calculator
  - Government Pension Offset calculator
  - More accurate Social Security estimates

- [ ] **Special Retirement Categories**
  - Law Enforcement Officer (LEO) calculations
  - Air Traffic Controller (ATC) rules
  - Firefighter special provisions
  - Custom accrual rates

- [ ] **Deferred Retirement Calculator**
  - Estimate deferred retirement benefits
  - Show when eligible to start drawing
  - Compare immediate vs. deferred options

- [x] **Part-Time Work Income Modeling** ✅ COMPLETED (Barista FIRE)
  - ✅ Add post-retirement employment income
  - ✅ Show impact on overall income
  - ✅ Configure start/end ages for part-time work
  - ✅ Set target retirement income
  - [ ] Tax implications of combined income (future enhancement)

### User Experience

- [ ] **Dark Mode**
  - Toggle between light and dark themes
  - Persist preference in localStorage
  - High-contrast mode for accessibility

- [ ] **Multiple Scenarios Management**
  - Create unlimited custom scenarios
  - Name and organize scenarios
  - Duplicate scenarios for variations
  - Scenario history and versioning

- [ ] **What-If Scenario Builder**
  - Quick scenario variations
  - Side-by-side comparison during editing
  - Highlight differences between scenarios

- [ ] **Guided Tour**
  - First-time user walkthrough
  - Feature highlights
  - Tooltip hints
  - Video tutorials

### Data Accuracy & Updates

- [ ] **Annual Data Updates**
  - Update FEHB premium estimates
  - Refresh federal pay scales
  - Update COLA assumptions
  - MRA table updates if rules change

- [ ] **Historical Data Integration**
  - Import actual TSP statements
  - Connect to OPM retirement estimates
  - Pull real salary history

- [ ] **Validation & Error Checking**
  - Detect invalid service periods
  - Warn about common mistakes
  - Suggest corrections
  - Show data quality indicators

## Low Priority / Future Considerations

### Advanced Features

- [ ] **Tax Planning Integration**
  - Detailed federal and state tax estimates
  - Roth conversion analysis
  - RMD (Required Minimum Distribution) planning
  - Tax bracket optimization

- [ ] **Investment Strategy Tools**
  - TSP fund allocation recommendations
  - Rebalancing suggestions
  - Risk tolerance assessment
  - Monte Carlo simulations

- [ ] **Estate Planning**
  - Beneficiary planning
  - Survivor income projections
  - Life insurance needs analysis
  - Legacy goals tracking

- [ ] **Healthcare Planning**
  - Detailed FEHB plan comparison
  - Medicare Part B/D cost analysis
  - Long-term care insurance planning
  - HSA/FSA optimization

### Platform & Integration

- [ ] **Mobile App (PWA)**
  - Progressive Web App
  - Offline mode
  - Push notifications for milestones
  - Mobile-optimized charts

- [ ] **User Accounts & Cloud Sync**
  - Create accounts
  - Sync across devices
  - Collaborate with spouse/advisor
  - Backup and restore

- [ ] **Financial Advisor Mode**
  - Multi-client management
  - White-label branding
  - Compliance reporting
  - Client collaboration tools

- [ ] **API Integration**
  - Connect to TSP API (if available)
  - OPM data integration
  - Financial planning software exports
  - Bank account aggregation

### Community & Support

- [ ] **Community Forum**
  - User discussions
  - Share scenarios anonymously
  - Expert advice
  - FAQs and knowledge base

- [ ] **Educational Content**
  - Federal retirement guides
  - Video tutorials
  - Webinars
  - Blog posts

- [ ] **AI Assistant**
  - Natural language queries
  - "When can I retire?"
  - "What if I work 5 more years?"
  - Automated insights

## Technical Debt & Improvements

### Code Quality

- [ ] **Comprehensive Testing**
  - Unit tests for calculations
  - Integration tests for workflows
  - E2E tests with Playwright
  - Visual regression testing

- [ ] **Performance Optimization**
  - Lazy loading for charts
  - Memoization of calculations
  - Code splitting by route
  - Bundle size reduction

- [ ] **Accessibility (A11Y)**
  - WCAG 2.1 AA compliance
  - Screen reader optimization
  - Keyboard navigation
  - Color contrast improvements

- [ ] **Internationalization (i18n)**
  - Multi-language support
  - Currency localization
  - Date format localization
  - RTL language support

### Infrastructure

- [ ] **Analytics Integration**
  - Privacy-respecting analytics
  - User behavior tracking
  - Feature usage statistics
  - Error monitoring (Sentry)

- [ ] **SEO Optimization**
  - Server-side rendering option
  - Meta tags optimization
  - Structured data
  - Sitemap generation

- [ ] **Documentation**
  - API documentation
  - Component storybook
  - Contribution guidelines
  - Deployment guides

## Feature Requests from Users

_This section will be populated based on user feedback_

- [ ] TBD

## Implementation Notes

### Prioritization Criteria

Features are prioritized based on:
1. **User Impact**: How many users will benefit?
2. **Calculation Accuracy**: Does it improve retirement projections?
3. **Implementation Effort**: How complex is the feature?
4. **Dependencies**: What must be built first?

### Release Planning

- **v1.0** (Current): MVP with core features
- **v1.1** (Next): Enhanced visualizations + PDF export
- **v1.2**: Comprehensive onboarding + special retirement categories
- **v2.0**: User accounts + mobile app + advanced features

### Contributing

To suggest a new feature:
1. Open an issue on GitHub
2. Describe the use case
3. Explain the value
4. Provide examples if possible

---

**Last Updated**: January 2026
**Maintained By**: FEREX Development Team
