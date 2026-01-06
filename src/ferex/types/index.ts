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

export interface SpouseInfo {
  name?: string;
  age: number;
  gender: Gender;
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
  gender: Gender;
  lifeExpectancy?: number; // Override default
  spouseInfo?: SpouseInfo;
}

export interface EmploymentInfo {
  servicePeriods: ServicePeriod[];
  currentOrLastSalary: number;
  high3Override?: number; // If user wants to specify
  lastHighThreeYears?: HighThreeYears;
}

export interface RetirementInfo {
  survivorAnnuityType: SurvivorAnnuityType;
  intendedRetirementAge?: number;
  projectionEndAge?: number;
}

export interface TSPInfo {
  currentBalance: number;
  annualContribution: number;
  returnAssumption: number; // Default 6.5%
  currentAllocation?: TSPAllocation;
  employerMatch?: number; // Typically 5% for FERS
}

export interface AssumptionsInfo {
  inflationRate: number; // Default 3.5%
  colaRate: number; // Default 2.5%
  healthcareInflation: number; // Default 5.0%
  fehbCoverageLevel: FEHBCoverageLevel;
  tspDrawdownRate?: number; // Default 4%
}

export interface UserProfile {
  personal: PersonalInfo;
  employment: EmploymentInfo;
  retirement: RetirementInfo;
  tsp: TSPInfo;
  assumptions: AssumptionsInfo;
}

export interface ProjectionYear {
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

export const LIFE_EXPECTANCY = {
  male: 82,
  female: 85,
};

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
