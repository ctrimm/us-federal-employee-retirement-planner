/**
 * Main Retirement Projection Engine
 * Generates year-by-year projections combining pension, TSP, FEHB, and other income
 */

import type {
  UserProfile,
  ProjectionYear,
  EligibilityInfo,
  PensionBreakdown,
} from '../types';
import { DEFAULT_LIFE_EXPECTANCY } from '../types';
import { calculateAnnualPension, calculatePensionWithCOLA, calculateSpouseAnnualPension } from './pensionCalculator';
import { calculateTSPBalanceAfterYear, calculateTSPDistribution, calculateEmployerMatch } from './tspCalculator';
import { calculateAnnualFEHBCost } from './fehbCalculator';
import {
  calculateTotalService,
  calculateMRA,
  canRetireNow,
  calculateEarliestRetirementAge,
  isFEHBEligible,
  calculateServiceBySystem,
} from './systemDetection';

/**
 * Determine eligibility information for a user profile
 */
export function determineEligibility(profile: UserProfile): EligibilityInfo {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;
  const sickLeaveCredit = (profile.employment.sickLeaveHours || 0) / 2087;
  const totalYears = calculateTotalService(profile.employment.servicePeriods) + sickLeaveCredit;
  const mra = calculateMRA(profile.personal.birthYear);

  const { fersYears, csrsYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );

  const canRetire = canRetireNow(currentAge, totalYears, profile.personal.birthYear);

  const earliestInfo = calculateEarliestRetirementAge(
    profile.personal.birthYear,
    profile.employment.servicePeriods
  );

  // Calculate earliest retirement date
  const earliestRetirementDate = new Date(
    profile.personal.birthYear + earliestInfo.age,
    0,
    1
  );

  // Full benefits age (typically 62 with 5+ years for FERS)
  const fullBenefitsAge = 62;
  const fullBenefitsDate = new Date(
    profile.personal.birthYear + fullBenefitsAge,
    0,
    1
  );

  // Determine primary system
  let detectedSystem: 'FERS' | 'CSRS' | 'auto' = 'auto';
  if (fersYears > 0 && csrsYears === 0) detectedSystem = 'FERS';
  else if (csrsYears > 0 && fersYears === 0) detectedSystem = 'CSRS';
  else if (fersYears > csrsYears) detectedSystem = 'FERS';
  else if (csrsYears > 0) detectedSystem = 'CSRS';

  return {
    canRetireImmediately: canRetire,
    earliestRetirementAge: earliestInfo.age,
    earliestRetirementDate,
    fullBenefitsAge,
    fullBenefitsDate,
    fehbEligible: isFEHBEligible(currentAge, totalYears),
    totalYearsOfService: totalYears,
    detectedSystem,
  };
}

/**
 * Calculate Social Security benefit for a given age.
 * Uses the user's actual SS estimate if provided; otherwise falls back to a rough approximation.
 * Full retirement age is assumed to be 67. Early claiming (62) is not modeled.
 */
function estimateSocialSecurity(
  high3: number,
  age: number,
  ssEstimate?: number
): number {
  if (age < 67) return 0;

  // Use user-provided SS estimate (from SSA.gov) if available
  if (ssEstimate && ssEstimate > 0) {
    return ssEstimate;
  }

  // Fallback: rough approximation (~30% of High-3 for FERS employees after WEP offset)
  return high3 * 0.30;
}

/**
 * Calculate FERS Supplement (approximate)
 * Paid by OPM to eligible FERS retirees between retirement and age 62.
 * Approximates the Social Security benefit earned during federal service.
 *
 * Eligibility: Immediate annuity with 30+ years at MRA, or 20+ years at age 60.
 * NOT available for MRA+10 (deferred/reduced) retirements.
 *
 * Formula (simplified): estimated_SS_at_62 × (FERS_years / 40)
 */
function calculateFERSSupplement(
  high3: number,
  age: number,
  claimPensionAge: number,
  fersYears: number,
  totalYears: number,
  detectedSystem: string,
  ssEstimate?: number
): number {
  // Only for FERS employees
  if (detectedSystem === 'CSRS') return 0;

  // Only paid between retirement and age 62
  if (age < claimPensionAge || age >= 62) return 0;

  // Only for immediate full annuity (30+ years at MRA, or 20+ years at age 60)
  // MRA+10 retirements do NOT qualify
  const qualifiesForSupplement = totalYears >= 30 || (totalYears >= 20 && claimPensionAge <= 60);
  if (!qualifiesForSupplement) return 0;

  // Use user's actual SS estimate if provided; otherwise fall back to approximation.
  // The supplement is designed to approximate the SS benefit earned during federal service.
  // OPM uses the estimated SS at 62; if the user has a full-retirement-age estimate we use it directly
  // as a close proxy (slightly conservative since 62 benefit would be ~70% of FRA benefit).
  const estimatedSSAt62 = ssEstimate && ssEstimate > 0 ? ssEstimate : high3 * 0.30;

  // Supplement = estimated SS × (FERS years / 40 qualifying years)
  const supplementFraction = Math.min(fersYears / 40, 1);
  return estimatedSSAt62 * supplementFraction;
}

/**
 * Generate year-by-year retirement projections
 */
export function generateProjections(profile: UserProfile): ProjectionYear[] {
  const projections: ProjectionYear[] = [];

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;

  // Determine when leaving service vs claiming pension
  const leaveServiceAge = profile.retirement.leaveServiceAge || profile.retirement.intendedRetirementAge || determineEligibility(profile).earliestRetirementAge;
  const claimPensionAge = profile.retirement.intendedRetirementAge || leaveServiceAge;

  // Determine end age
  const lifeExpectancy = profile.personal.lifeExpectancy || DEFAULT_LIFE_EXPECTANCY;
  const endAge = profile.retirement.projectionEndAge || lifeExpectancy;

  // Start from current age to show full picture
  const startAge = currentAge;

  // Calculate base pension (will only apply from claimPensionAge)
  const pensionInfo = calculateAnnualPension(profile);
  const basePension = pensionInfo.annualPension;

  // Pre-compute FERS supplement eligibility data
  const eligibilityForSupplement = determineEligibility(profile);
  const { fersYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );
  const supplementDetectedSystem = eligibilityForSupplement.detectedSystem;

  // ── Non-federal 401k pre-computation ──────────────────────────────────────
  // For each non-federal period that has a 401k balance:
  //   - If rolloverToTSP === true  → add currentBalance401k to initial TSP balance
  //   - Otherwise                  → track in a separate nonFederal401kBalance pool
  const nonFederalPeriods = profile.employment.nonFederalPeriods || [];
  let nonFederal401kRolloverToTSP = 0;
  let nonFederal401kBalance = 0;

  for (const period of nonFederalPeriods) {
    const balance = period.currentBalance401k || 0;
    if (balance <= 0) continue;
    if (period.rolloverToTSP) {
      nonFederal401kRolloverToTSP += balance;
    } else {
      nonFederal401kBalance += balance;
    }
  }

  // Identify the single currently-active non-federal period (if any) for ongoing contributions
  let activeNonFederalPeriod = null;
  for (let i = 0; i < nonFederalPeriods.length; i++) {
    if (nonFederalPeriods[i].isActive && nonFederalPeriods[i].had401k) {
      activeNonFederalPeriod = nonFederalPeriods[i];
      break;
    }
  }

  // Initialize TSP balance (including any rolled-over non-federal 401k money)
  let tspBalance = profile.tsp.currentBalance + nonFederal401kRolloverToTSP;

  // Initialize other investments tracking
  let otherInvestmentsBalance = profile.otherInvestments?.totalBalance || 0;

  // Initialize debts (deep copy to avoid mutating original)
  const debts = (profile.planning?.debts || []).map(d => ({ ...d }));

  // Initialize assets (deep copy)
  const assets = (profile.planning?.assets || []).map(a => ({ ...a }));

  // ── Spouse pre-computation ─────────────────────────────────────────────────
  const spouse = profile.personal.spouseInfo || null;
  const spouseCurrentAge = spouse ? spouse.age : 0;
  const spouseRetirementAge = spouse?.retirementAge || 65;
  const spouseLeaveServiceAge = spouse?.leaveServiceAge || spouseRetirementAge;
  const spouseCurrentIncome = spouse?.currentIncome || 0;

  // Pre-calculate spouse's federal pension (if applicable) — base amount before COLA
  const spouseBasePension = spouse ? calculateSpouseAnnualPension(spouse) : 0;

  // Track spouse TSP balance throughout projection
  let spouseTspBalance = spouse?.tspCurrentBalance || 0;

  // Annual living expenses (base amount in today's dollars)
  const baseLivingExpenses = profile.assumptions.annualLivingExpenses || 60000;
  const applyExpensesFromCurrentAge = profile.assumptions.applyExpensesFromCurrentAge || false;
  const expenseInflationRate = profile.assumptions.expenseInflationRate || profile.assumptions.inflationRate;

  // Determine TSP drawdown rate
  const drawdownRate = profile.assumptions.tspDrawdownRate || 4;

  // Generate year-by-year projections
  let cumulativeSavings = 0;

  for (let age = startAge; age <= endAge; age++) {
    const year = profile.personal.birthYear + age;
    const stillWorking = age < leaveServiceAge;
    const hasPension = age >= claimPensionAge;
    const yearsFromPension = age - claimPensionAge;

    // TSP contributions while still working (employee + employer match for FERS)
    if (stillWorking) {
      const salary = profile.employment.currentOrLastSalary;
      const employeeContributionPercent = profile.tsp.contributionPercent || 0;
      const employerMatch = calculateEmployerMatch(salary, employeeContributionPercent);
      tspBalance += profile.tsp.annualContribution + employerMatch;
      tspBalance *= (1 + profile.tsp.returnAssumption / 100);
    }

    // Calculate pension with COLA (only if claiming)
    const pension = hasPension ? calculatePensionWithCOLA(
      basePension,
      Math.max(0, yearsFromPension),
      profile.assumptions.colaRate
    ) : 0;

    // Calculate TSP distribution with age 55+ separation rule
    // TSP can be accessed penalty-free if:
    // 1. Age 59.5 or older (general IRS rule), OR
    // 2. Separated from federal service at age 55+ (special TSP rule)
    const canAccessTSP = !stillWorking && (age >= 59.5 || (leaveServiceAge >= 55 && age >= leaveServiceAge));
    const tspDistribution = canAccessTSP ? calculateTSPDistribution(tspBalance, drawdownRate) : 0;

    // Calculate TSP balance for next year (growth happens regardless)
    if (!stillWorking) {
      tspBalance = calculateTSPBalanceAfterYear(
        tspBalance,
        tspDistribution,
        profile.tsp.returnAssumption
      );
    }

    // Estimate Social Security (uses user's actual estimate if provided)
    const userSSEstimate = profile.employment.socialSecurityEstimate;
    const socialSecurity = estimateSocialSecurity(pensionInfo.high3, age, userSSEstimate);

    // Calculate FERS Supplement (paid between retirement and age 62 for eligible immediate annuitants)
    const fersSupplement = calculateFERSSupplement(
      pensionInfo.high3,
      age,
      claimPensionAge,
      fersYears,
      eligibilityForSupplement.totalYearsOfService,
      supplementDetectedSystem,
      userSSEstimate
    );

    // Calculate FEHB cost (only after leaving service)
    const fehbCost = stillWorking ? 0 : calculateAnnualFEHBCost(
      profile.assumptions.fehbCoverageLevel,
      age,
      Math.max(0, age - leaveServiceAge),
      profile.assumptions.healthcareInflation
    );

    // ── Non-federal 401k growth + contributions ───────────────────────────────
    // Grow the non-TSP 401k pool each year
    const nonFed401kReturnRate = activeNonFederalPeriod?.return401kAssumption ?? profile.tsp.returnAssumption;
    // Add contributions from an active non-federal period (while the user is in that job)
    // We treat the non-federal period as active up until leaveServiceAge (when they return to federal)
    if (activeNonFederalPeriod && age < leaveServiceAge) {
      const annualContrib = activeNonFederalPeriod.annual401kContribution || 0;
      const salary = activeNonFederalPeriod.annualSalary || 0;
      const matchPct = activeNonFederalPeriod.employerMatch401kPercent || 0;
      const employerMatchAmt = salary * (matchPct / 100);
      nonFederal401kBalance += annualContrib + employerMatchAmt;
    }
    nonFederal401kBalance *= (1 + nonFed401kReturnRate / 100);

    // ── Full spouse income modeling ───────────────────────────────────────────
    let spouseIncome = 0;
    let spousePension = 0;
    let spouseTspDistribution = 0;
    let spouseSocialSecurity = 0;

    if (spouse) {
      const currentSpouseAge = spouseCurrentAge + (age - currentAge);
      const spouseStillWorking = currentSpouseAge < spouseLeaveServiceAge;
      const spouseHasClaimed = currentSpouseAge >= spouseRetirementAge;

      if (spouseStillWorking) {
        // Spouse is still working — accumulate TSP contributions
        const spouseTspContrib = spouse.tspAnnualContribution || 0;
        spouseTspBalance += spouseTspContrib;
        spouseTspBalance *= (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);

        spouseIncome = spouseCurrentIncome;
      } else {
        // Spouse has left employment — grow or draw down TSP
        const canAccessSpouseTSP = currentSpouseAge >= 59.5 ||
          (spouseLeaveServiceAge >= 55 && currentSpouseAge >= spouseLeaveServiceAge);

        if (canAccessSpouseTSP) {
          spouseTspDistribution = spouseTspBalance * (drawdownRate / 100);
          spouseTspBalance = (spouseTspBalance - spouseTspDistribution) *
            (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);
        } else {
          spouseTspBalance *= (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);
        }

        // Spouse federal pension (with COLA from the year they claimed)
        if (spouseHasClaimed && spouseBasePension > 0) {
          const yearsFromSpouseClaim = currentSpouseAge - spouseRetirementAge;
          spousePension = calculatePensionWithCOLA(
            spouseBasePension,
            Math.max(0, yearsFromSpouseClaim),
            profile.assumptions.colaRate
          );
        }

        // Spouse Social Security (at age 67)
        if (currentSpouseAge >= 67) {
          if (spouse.socialSecurityEstimate && spouse.socialSecurityEstimate > 0) {
            spouseSocialSecurity = spouse.socialSecurityEstimate;
          } else if (spouse.currentIncome) {
            // Rough fallback: ~35% of working income as SS estimate
            spouseSocialSecurity = spouse.currentIncome * 0.35;
          }
        }

        // Total spouse retirement income: auto-calculated pension + TSP + SS,
        // plus any manually specified additional retirement income
        const manualExtra = spouse.retirementIncome || 0;
        spouseIncome = spousePension + spouseTspDistribution + spouseSocialSecurity + manualExtra;
      }
    }

    // Other income - Barista FIRE part-time work + side hustle
    let otherIncome = 0;

    // Add Barista FIRE income (age-limited)
    if (profile.retirement.enableBaristaFire &&
        profile.retirement.partTimeIncomeAnnual &&
        profile.retirement.partTimeStartAge &&
        profile.retirement.partTimeEndAge) {
      const partTimeStart = profile.retirement.partTimeStartAge;
      const partTimeEnd = profile.retirement.partTimeEndAge;

      if (age >= partTimeStart && age <= partTimeEnd) {
        otherIncome += profile.retirement.partTimeIncomeAnnual;
      }
    }

    // Add side hustle income (active throughout life - Uber, Etsy, etc.)
    if (profile.retirement.sideHustleIncome) {
      otherIncome += profile.retirement.sideHustleIncome;
    }

    // Calculate other investments growth using weighted-average return rate + annual contributions
    const otherAccounts = profile.otherInvestments?.accounts || [];
    const otherAnnualContributions = otherAccounts.reduce((sum, account) => sum + (account.annualContribution || 0), 0);
    let weightedReturnRate: number;
    if (otherAccounts.length === 0 || otherInvestmentsBalance === 0) {
      weightedReturnRate = 0.065; // Default 6.5%
    } else {
      const totalAccountBalances = otherAccounts.reduce((sum, a) => sum + a.currentBalance, 0) || otherInvestmentsBalance;
      weightedReturnRate = otherAccounts.reduce((rate, account) => {
        const weight = totalAccountBalances > 0 ? account.currentBalance / totalAccountBalances : 1 / otherAccounts.length;
        return rate + weight * ((account.returnAssumption || 6.5) / 100);
      }, 0);
    }
    otherInvestmentsBalance = (otherInvestmentsBalance + otherAnnualContributions) * (1 + weightedReturnRate);

    // Calculate inflated living expenses for this year
    const yearsFromStart = age - startAge;
    const inflatedLivingExpenses = baseLivingExpenses * Math.pow(1 + expenseInflationRate / 100, yearsFromStart);

    // Apply living expenses based on settings
    // If applyExpensesFromCurrentAge is enabled, expenses start immediately
    // Otherwise, expenses only apply after leaving service
    const shouldApplyExpenses = applyExpensesFromCurrentAge || !stillWorking;
    let totalExpenses = shouldApplyExpenses ? (inflatedLivingExpenses + fehbCost) : 0;

    // Calculate college costs for children (tracked separately for visibility)
    let collegeCosts = 0;
    (profile.planning?.children || []).forEach(child => {
      const childAge = year - child.birthYear;
      const collegeStart = child.collegeStartAge || 18;
      const collegeEnd = collegeStart + (child.collegeYears || 4);

      if (childAge >= collegeStart && childAge < collegeEnd) {
        collegeCosts += child.annualCollegeCost || 0;
      }
    });
    totalExpenses += collegeCosts;

    // Add life events costs
    (profile.planning?.lifeEvents || []).forEach(event => {
      if (event.year === year) {
        if (!event.recurring) {
          totalExpenses += event.amount || 0;
        }
      }
      // Handle recurring events
      if (event.recurring && event.duration) {
        if (year >= event.year && year < event.year + event.duration) {
          totalExpenses += event.amount || 0;
        }
      }
    });

    // Calculate debt payments and update balances
    let totalDebtPayments = 0;
    debts.forEach(debt => {
      if (debt.currentBalance > 0) {
        const interestCharge = debt.currentBalance * (debt.interestRate / 100);
        const payment = debt.minimumPayment + (debt.extraPayment || 0);
        totalDebtPayments += payment;
        debt.currentBalance = Math.max(0, debt.currentBalance + interestCharge - payment);
      }
    });
    totalExpenses += totalDebtPayments;

    // Update asset values with appreciation
    let totalAssetValue = 0;
    assets.forEach(asset => {
      asset.currentValue *= (1 + (asset.appreciationRate || 0) / 100);
      totalAssetValue += asset.currentValue;
    });

    // Calculate total debt
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);

    // Total income (pension + TSP + Social Security + FERS Supplement + other sources)
    const totalIncome = pension + tspDistribution + socialSecurity + fersSupplement + spouseIncome + otherIncome;

    // Net income (after expenses and taxes)
    // Rough tax estimate: 15% effective rate
    const estimatedTaxes = totalIncome * 0.15;
    const netIncome = totalIncome - totalExpenses - estimatedTaxes;

    // Calculate net worth (includes spouse TSP and non-federal 401k in household wealth)
    const netWorth = tspBalance + otherInvestmentsBalance + spouseTspBalance + nonFederal401kBalance + totalAssetValue - totalDebt;
    const liquidNetWorth = tspBalance + otherInvestmentsBalance + spouseTspBalance + nonFederal401kBalance - totalDebt;

    // Cumulative savings
    cumulativeSavings += netIncome;

    projections.push({
      age,
      year,
      pension,
      tspDistribution,
      socialSecurity,
      fersSupplement,
      otherIncome,
      spouseIncome,
      spousePension,
      spouseTspDistribution,
      spouseSocialSecurity,
      spouseTspBalance: Math.max(0, spouseTspBalance),
      nonFederal401kBalance: Math.max(0, nonFederal401kBalance),
      fehbCost,
      totalIncome,
      expenses: totalExpenses,
      collegeCosts,
      netIncome,
      tspBalance: Math.max(0, tspBalance),
      otherInvestmentsBalance: Math.max(0, otherInvestmentsBalance),
      totalDebt,
      totalAssets: totalAssetValue,
      netWorth,
      liquidNetWorth,
      cumulativeSavings,
    });
  }

  return projections;
}

/**
 * Get pension breakdown for display
 */
export function getPensionBreakdown(profile: UserProfile): PensionBreakdown {
  return calculateAnnualPension(profile);
}

/**
 * Calculate summary statistics for a scenario
 */
export function calculateSummaryStats(projections: ProjectionYear[]) {
  if (projections.length === 0) {
    return {
      totalLifetimeIncome: 0,
      averageAnnualIncome: 0,
      tspDepletionAge: null,
      finalTSPBalance: 0,
    };
  }

  const totalLifetimeIncome = projections.reduce(
    (sum, p) => sum + p.totalIncome,
    0
  );

  const averageAnnualIncome = totalLifetimeIncome / projections.length;

  // Find when TSP runs out
  let tspDepletionAge = null;
  for (const projection of projections) {
    if (projection.tspBalance === 0 && tspDepletionAge === null) {
      tspDepletionAge = projection.age;
      break;
    }
  }

  const finalTSPBalance = projections[projections.length - 1]?.tspBalance || 0;

  return {
    totalLifetimeIncome,
    averageAnnualIncome,
    tspDepletionAge,
    finalTSPBalance,
  };
}
