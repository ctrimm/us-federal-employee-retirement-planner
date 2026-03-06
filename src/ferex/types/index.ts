/**
 * FEREX Core Type Definitions
 * Based on PRD v1.0
 */

export type RetirementSystem = 'FERS' | 'CSRS' | 'auto';
export type Gender = 'male' | 'female';
export type SurvivorAnnuityType = 'none' | 'standard' | 'courtOrdered';
export type FEHBCoverageLevel = 'self' | 'self+one' | 'self+family';

export interface ServicePeriod {
  id: string;
  startDate: Date;
  endDate?: Date; // Omit if current
  system: RetirementSystem;
  isActive: boolean; // Current employment
}

export interface NonFederalEmploymentPeriod {
  id: string;
  startDate: Date;
  endDate?: Date; // Omit if current
  employerName?: string;
  annualSalary?: number;
  had401k?: boolean;
  annual401kContribution?: number;
  employerMatch401kPercent?: number; // E.g., 4 for 4% employer match
  currentBalance401k?: number; // Current value of this 401k (if not yet rolled over)
  return401kAssumption?: number; // Annual growth rate % (defaults to TSP return rate if unset)
  rolloverToTSP?: boolean; // If true, merge this 401k into TSP at the start of projections
  hadHealthInsurance?: boolean;
  isActive: boolean; // Currently employed here
  notes?: string;
}

export interface SpouseInfo {
  name?: string;
  birthDate?: Date; // Date of birth for spouse
  age: number; // Current age (can be calculated from birthDate)
  gender: Gender;
  // Additional planning fields
  currentIncome?: number; // Annual income
  retirementAge?: number; // When spouse plans to retire / claim pension
  leaveServiceAge?: number; // When spouse leaves their job (if different from retirement)
  retirementIncome?: number; // Manual fallback: additional retirement income not auto-calculated
  // Federal employment tracking
  isFederalEmployee?: boolean; // Did/does spouse work for federal government?
  retirementSystem?: RetirementSystem; // FERS or CSRS (auto-detected from servicePeriods if not set)
  servicePeriods?: ServicePeriod[]; // Federal service history
  high3Salary?: number; // High-3 average salary for spouse pension calculation
  sickLeaveHours?: number; // Unused sick leave hours
  // Spouse TSP
  tspCurrentBalance?: number; // Current TSP balance for spouse
  tspAnnualContribution?: number; // Annual employee TSP contribution while working
  tspReturnAssumption?: number; // Expected annual return % (default 6.5%)
  // Spouse Social Security
  socialSecurityEstimate?: number; // Annual SS estimate from SSA.gov (at their full retirement age)
}

export interface HighThreeYears {
  year1: number;
  year2: number;
  year3: number;
}

export interface TSPAllocation {
  cFund: number; // %
  sFund: number;
  iFund: number;
  fFund: number;
  gFund: number;
  lFunds: {
    l2070?: number;
    l2065?: number;
    l2060?: number;
    l2055?: number;
    l2050?: number;
    l2045?: number;
    l2040?: number;
    lIncome?: number;
  };
}

export interface PersonalInfo {
  birthYear: number;
  lifeExpectancy?: number; // Default 85 if not specified
  spouseInfo?: SpouseInfo;
}

export interface EmploymentInfo {
  servicePeriods: ServicePeriod[]; // Federal service periods
  nonFederalPeriods?: NonFederalEmploymentPeriod[]; // Private sector employment
  currentOrLastSalary: number;
  high3Override?: number; // If user wants to specify
  lastHighThreeYears?: HighThreeYears;
  sickLeaveHours?: number; // Unused sick leave hours (converts to service time)
  socialSecurityEstimate?: number; // Annual SS estimate from SSA.gov (used for FERS Supplement and SS projection)
  wepMonthlyReduction?: number; // WEP reduction in $/month from SSA notice (only used when no ssEstimate provided)
}

export interface RetirementInfo {
  survivorAnnuityType: SurvivorAnnuityType;
  leaveServiceAge?: number; // Age when leaving federal service
  intendedRetirementAge?: number; // Age when claiming pension (can be after leaving service)
  projectionEndAge?: number;
  // Barista FIRE settings
  enableBaristaFire?: boolean;
  partTimeIncomeAnnual?: number; // Annual part-time income
  partTimeStartAge?: number; // Age to start part-time work
  partTimeEndAge?: number; // Age to end part-time work
  sideHustleIncome?: number; // Annual side hustle/passive income (Uber, Etsy, etc.)
  targetRetirementIncome?: number; // Desired annual income in retirement
}

export interface TSPInfo {
  currentBalance: number;
  annualContribution: number;
  contributionPercent?: number; // Percentage of salary (e.g., 5 for 5%)
  returnAssumption: number; // Default 6.5%
  currentAllocation?: TSPAllocation;
  employerMatch?: number; // Typically 5% for FERS
  // Roth TSP tracking
  rothBalance?: number; // Roth portion of currentBalance (rest is Traditional)
  rothAnnualContribution?: number; // Annual Roth contributions (≤ annualContribution)
  rothConversionAnnual?: number; // Annual Traditional→Roth conversion in early retirement (taxable event)
}

export type OtherAccountType =
  | 'traditional_ira'
  | 'roth_ira'
  | '401k'
  | 'brokerage'
  | 'savings'
  | 'real_estate'
  | 'other';

export interface OtherAccount {
  id: string;
  name: string;
  type: OtherAccountType;
  currentBalance: number;
  annualContribution?: number;
  returnAssumption?: number;
  taxDeferred?: boolean; // For IRAs, 401ks
  notes?: string;
}

export interface OtherInvestmentsInfo {
  accounts: OtherAccount[];
  totalBalance?: number; // Calculated from accounts
}

export interface AssumptionsInfo {
  inflationRate: number; // Default 3.5%
  colaRate: number; // Default 2.5%
  healthcareInflation: number; // Default 5.0%
  fehbCoverageLevel: FEHBCoverageLevel;
  tspDrawdownRate?: number; // Default 4%
  annualLivingExpenses?: number; // Expected annual expenses in retirement
  applyExpensesFromCurrentAge?: boolean; // Start expenses at current age instead of retirement
  expenseInflationRate?: number; // Rate to inflate expenses (defaults to inflationRate)
  stateTaxRate?: number; // Optional flat state income tax rate (e.g. 5 for 5%)
  // Withdrawal strategy
  withdrawalStrategy?: 'fixed_percent' | 'guardrails'; // Default fixed_percent
  guardrailsLowerPct?: number; // Portfolio % of initial that triggers spending cut (default 80)
  guardrailsUpperPct?: number; // Portfolio % of initial that triggers spending increase (default 120)
  guardrailsSpendingCutPct?: number; // % to reduce withdrawal when below lower threshold (default 10)
  guardrailsSpendingBumpPct?: number; // % to increase withdrawal when above upper threshold (default 10)
  // FIRE tier multipliers
  leanFireMultiplier?: number; // Living expense multiplier for LeanFIRE target (default 0.75)
  chubbyFireMultiplier?: number; // Living expense multiplier for ChubbyFIRE target (default 1.25)
  fatFireMultiplier?: number; // Living expense multiplier for FatFIRE target (default 1.50)
}

// Life Events & Milestones
export type LifeEventType =
  | 'child_birth'
  | 'child_college'
  | 'home_purchase'
  | 'car_purchase'
  | 'major_expense'
  | 'income_change'
  | 'other';

export type MilestoneType =
  | 'retirement'
  | 'spouse_retirement'
  | 'financial_independence'
  | 'debt_free'
  | 'net_worth_target'
  | 'age_target'
  | 'leave_without_pay'
  | 'custom';

export type MilestoneCriteria =
  | 'reach_age'
  | 'reach_milestone'
  | 'net_worth_above'
  | 'liquid_net_worth_above'
  | 'total_debt_below';

export interface Child {
  id: string;
  name: string;
  birthYear: number;
  collegeStartAge?: number; // Default 18
  collegeYears?: number; // Default 4
  annualCollegeCost?: number; // Per year cost
  notes?: string;
}

export interface LifeEvent {
  id: string;
  name: string;
  type: LifeEventType;
  year: number; // Year event occurs
  amount?: number; // One-time cost/income
  recurring?: boolean; // If true, repeats annually
  duration?: number; // Years if recurring
  notes?: string;
}

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  criteria: MilestoneCriteria;
  targetValue?: number; // For net worth, age, etc.
  linkedMilestone?: string; // ID of another milestone (for dependent goals)
  notes?: string;
}

export interface Debt {
  id: string;
  name: string;
  type: 'mortgage' | 'student_loan' | 'car_loan' | 'credit_card' | 'other';
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  extraPayment?: number;
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'home' | 'car' | 'other';
  currentValue: number;
  appreciationRate?: number; // Annual appreciation %
  notes?: string;
}

export interface PlanningInfo {
  children?: Child[];
  lifeEvents?: LifeEvent[];
  milestones?: Milestone[];
  debts?: Debt[];
  assets?: Asset[];
}

export interface UserProfile {
  personal: PersonalInfo;
  employment: EmploymentInfo;
  retirement: RetirementInfo;
  tsp: TSPInfo;
  otherInvestments?: OtherInvestmentsInfo;
  assumptions: AssumptionsInfo;
  planning?: PlanningInfo; // Life events, children, milestones, debts, assets
}

export interface ProjectionYear {
  age: number;
  year: number;
  pension: number; // Annual
  tspDistribution: number;
  socialSecurity: number; // If applicable
  fersSupplement: number; // FERS Supplement (paid from retirement to age 62 for eligible FERS retirees)
  otherIncome: number; // Part-time work, side hustle, etc.
  spouseIncome: number; // Total spouse income (working income OR sum of pension+TSP+SS in retirement)
  // Spouse income breakdown (auto-calculated when full spouse profile is provided)
  spousePension?: number; // Spouse's federal pension (if applicable)
  spouseTspDistribution?: number; // Spouse's TSP withdrawal
  spouseSocialSecurity?: number; // Spouse's Social Security
  spouseTspBalance?: number; // Spouse's remaining TSP balance
  // Non-federal 401k tracking
  nonFederal401kBalance?: number; // Accumulated 401k balance from non-federal employment periods
  fehbCost: number;
  medicarePremium?: number; // Medicare Part B premium for primary and/or spouse at 65+
  totalIncome: number;
  // Tax breakdown
  federalTax?: number;
  stateTax?: number;
  totalTax?: number;
  effectiveTaxRate?: number;
  expenses: number; // Total annual expenses
  collegeCosts: number; // Annual college costs for children (subset of expenses)
  netIncome: number; // After FEHB, expenses, estimated taxes
  tspBalance: number; // Total TSP (Traditional + Roth)
  tspRothBalance?: number; // Roth TSP portion (tax-free distributions)
  tspTradDistribution?: number; // Traditional TSP withdrawn this year (taxable)
  tspRothDistribution?: number; // Roth TSP withdrawn this year (tax-free)
  effectiveWithdrawalRate?: number; // Actual withdrawal rate used (guardrails may vary it)
  otherInvestmentsBalance: number; // Combined other accounts
  // FIRE metrics
  adjustedFireNumber?: number; // Pension-adjusted portfolio target (expenses minus guaranteed income / drawdown rate)
  leanFireNumber?: number; // FIRE target at lean spending (0.75× base living expenses)
  chubbyFireNumber?: number; // FIRE target at chubby spending (1.25× base living expenses)
  fatFireNumber?: number; // FIRE target at fat spending (1.50× base living expenses)
  coastFIRENumber?: number; // Balance needed today to coast to retirement without new contributions
  isFinanciallyIndependent?: boolean; // True only for the first year FI condition is met
  isCoastFIREAchieved?: boolean; // True only for the first year CoastFIRE condition is met
  totalDebt: number; // Remaining debt balance
  totalAssets: number; // Asset values
  netWorth: number; // Assets + investments - debts
  liquidNetWorth: number; // TSP + other investments - debts
  cumulativeSavings: number;
}

export interface EligibilityInfo {
  canRetireImmediately: boolean;
  earliestRetirementAge: number;
  earliestRetirementDate: Date;
  fullBenefitsAge: number;
  fullBenefitsDate: Date;
  fehbEligible: boolean;
  totalYearsOfService: number;
  detectedSystem: RetirementSystem;
}

export interface ScenarioMetadata {
  isPreBuilt: boolean;
  tags?: string[];
  description?: string;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  profile: UserProfile;
  projections?: ProjectionYear[]; // Calculated on demand
  eligibility?: EligibilityInfo;
  metadata: ScenarioMetadata;
}

export interface PensionBreakdown {
  high3: number;
  yearsOfService: number;
  accrualRate: number;
  survivorReduction: number;
  annualPension: number;
  monthlyPension: number;
  mra10ReductionPercent?: number; // MRA+10 early-retirement reduction applied (e.g. 0.25 = 25%)
}

// Default values for new profiles
export const DEFAULT_ASSUMPTIONS: AssumptionsInfo = {
  inflationRate: 3.5,
  colaRate: 2.5,
  healthcareInflation: 5.0,
  fehbCoverageLevel: 'self',
  tspDrawdownRate: 4.0,
};

export const DEFAULT_TSP: Partial<TSPInfo> = {
  returnAssumption: 6.5,
  employerMatch: 5.0,
  annualContribution: 0,
};

export const DEFAULT_LIFE_EXPECTANCY = 85; // Average life expectancy

// FERS and CSRS constants
export const FERS_ACCRUAL_RATE = 0.01; // 1% per year (standard)
export const FERS_ENHANCED_ACCRUAL_RATE = 0.011; // 1.1% per year (age 62+ with 20+ years)
export const FERS_SUPPLEMENT_AGE = 62;
export const MRA_10_ANNUAL_REDUCTION = 0.05; // 5% per year under 62 for MRA+10 retirees
export const MEDICARE_PART_B_MONTHLY_2024 = 174.70; // Standard Part B premium; grows with healthcareInflation
export const LEAN_FIRE_MULTIPLIER = 0.75;   // LeanFIRE: 75% of base living expenses
export const CHUBBY_FIRE_MULTIPLIER = 1.25; // ChubbyFIRE: 125% of base living expenses
export const FAT_FIRE_MULTIPLIER = 1.50;    // FatFIRE: 150% of base living expenses

export const CSRS_ACCRUAL_RATES = {
  first5Years: 0.015, // 1.5%
  next5Years: 0.0175, // 1.75%
  beyond10Years: 0.02, // 2%
};

export const SURVIVOR_ANNUITY_REDUCTION = {
  standard: 0.10, // 10% reduction
  courtOrdered: 0.10, // Varies but ~10% typical
};

// MRA is calculated dynamically by calculateMRA() in systemDetection.ts
// Birth years before 1953 → MRA 55, 1953–1964 → MRA 56, 1965+ → MRA 57
