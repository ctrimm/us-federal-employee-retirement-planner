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
  hadHealthInsurance?: boolean;
  isActive: boolean; // Currently employed here
  notes?: string;
}

export interface SpouseInfo {
  name?: string;
  age: number;
  gender: Gender;
  // Additional planning fields
  currentIncome?: number; // Annual income
  retirementAge?: number; // When spouse plans to retire
  retirementIncome?: number; // Expected retirement income (pension, SS, etc.)
  // Federal employment tracking
  isFederalEmployee?: boolean; // Did/does spouse work for federal government?
  servicePeriods?: ServicePeriod[]; // Federal service history
  high3Salary?: number; // High-3 average salary
  sickLeaveHours?: number; // Unused sick leave hours
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
  returnAssumption: number; // Default 6.5%
  currentAllocation?: TSPAllocation;
  employerMatch?: number; // Typically 5% for FERS
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
  otherIncome: number; // Part-time work, spouse income, etc.
  spouseIncome: number; // Separate tracking for spouse income
  fehbCost: number;
  totalIncome: number;
  expenses: number; // Total annual expenses
  collegeCosts: number; // Annual college costs for children (subset of expenses)
  netIncome: number; // After FEHB, expenses, estimated taxes
  tspBalance: number; // Remaining
  otherInvestmentsBalance: number; // Combined other accounts
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
export const FERS_ACCRUAL_RATE = 0.01; // 1% per year
export const FERS_SUPPLEMENT_AGE = 62;

export const CSRS_ACCRUAL_RATES = {
  first5Years: 0.015, // 1.5%
  next5Years: 0.0175, // 1.75%
  beyond10Years: 0.02, // 2%
};

export const SURVIVOR_ANNUITY_REDUCTION = {
  standard: 0.10, // 10% reduction
  courtOrdered: 0.10, // Varies but ~10% typical
};

export const MRA_BY_BIRTH_YEAR: Record<string, number> = {
  '<1948': 55,
  '1948': 55,
  '1949': 55,
  '1950': 55,
  '1951': 55,
  '1952': 55,
  '1953-1964': 56,
  '1965': 56,
  '1966': 56,
  '1967': 56,
  '1968': 56,
  '1969': 56,
  '1970+': 57,
};
