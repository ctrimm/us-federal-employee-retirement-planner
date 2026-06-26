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
import { calculateAnnualPension, calculatePensionWithColaSchedule, calculateSpouseAnnualPension } from './pensionCalculator';
import { calculateEmployerMatch, requiredMinimumDistribution, rmdStartAge } from './tspCalculator';
import { calculateAnnualFEHBCost } from './fehbCalculator';
import {
  calculateTotalService,
  calculateMRA,
  canRetireNow,
  calculateEarliestRetirementAge,
  isFEHBEligible,
  calculateServiceBySystem,
  creditableServicePeriods,
} from './systemDetection';
import { calculateRetirementTax, TAX_BRACKET_BASE_YEAR } from './taxCalculator';
import type { FilingStatus } from './taxCalculator';
import {
  MEDICARE_PART_B_MONTHLY_2024, LEAN_FIRE_MULTIPLIER, CHUBBY_FIRE_MULTIPLIER, FAT_FIRE_MULTIPLIER,
  SS_AGE62_TO_FRA_RATIO, SS_ANNUAL_EARNINGS_LIMIT, STANDARD_WORK_HOURS_PER_YEAR,
} from '../types';

/**
 * Determine eligibility information for a user profile
 */
export function determineEligibility(profile: UserProfile): EligibilityInfo {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;
  // Include bought-back military service in creditable service totals.
  const creditablePeriods = creditableServicePeriods(profile.employment);
  const sickLeaveCredit = (profile.employment.sickLeaveHours || 0) / STANDARD_WORK_HOURS_PER_YEAR;
  const totalYears = calculateTotalService(creditablePeriods) + sickLeaveCredit;

  const { fersYears, csrsYears } = calculateServiceBySystem(
    creditablePeriods,
    profile.employment.sickLeaveHours || 0
  );

  const canRetire = canRetireNow(currentAge, totalYears, profile.personal.birthYear);

  const earliestInfo = calculateEarliestRetirementAge(
    profile.personal.birthYear,
    creditablePeriods
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
    fehbEligible: isFEHBEligible(earliestInfo.age, totalYears, profile.personal.birthYear),
    totalYearsOfService: totalYears,
    detectedSystem,
  };
}

/**
 * Calculate Social Security benefit for a given age.
 * Uses the user's actual SS estimate if provided (WEP already reflected by SSA).
 * Falls back to a rough approximation with optional WEP reduction applied.
 * Full retirement age is assumed to be 67. Early claiming is not modeled.
 */
function estimateSocialSecurity(
  high3: number,
  age: number,
  ssEstimate?: number,
  wepMonthlyReduction?: number,
  detectedSystem?: string
): number {
  if (age < 67) return 0;

  if (ssEstimate && ssEstimate > 0) {
    // User-provided estimate from SSA.gov already includes WEP; use as-is.
    return ssEstimate;
  }

  // CSRS employees did not pay into Social Security on their federal earnings, so a
  // high-3-based fallback would invent a benefit they have not earned (and any SS from
  // other work is heavily cut by WEP). Without an explicit estimate, assume $0 for CSRS.
  if (detectedSystem === 'CSRS') return 0;

  // FERS fallback approximation — apply WEP reduction only here (not on user-provided estimates)
  const rawEstimate = high3 * 0.30;
  const annualWEP = (wepMonthlyReduction || 0) * 12;
  return Math.max(0, rawEstimate - annualWEP);
}

/**
 * Calculate FERS Supplement (approximate)
 * Paid by OPM to eligible FERS retirees between retirement and age 62.
 * Approximates the Social Security benefit earned during federal service.
 *
 * Eligibility: Immediate annuity with 30+ years at MRA, or 20+ years at age 60, or a
 * VERA early-out. NOT available for MRA+10 (postponed/deferred/reduced) retirements.
 * Under VERA the supplement does not begin until the retiree reaches MRA.
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
  ssEstimate?: number,
  veraEligible: boolean = false,
  mra: number = 57
): number {
  // Only for FERS employees
  if (detectedSystem === 'CSRS') return 0;

  // Only for immediate full annuity (MRA with 30+ years, or age 60+ with 20+ years) or VERA.
  // MRA+10 / postponed / deferred retirements do NOT qualify.
  const qualifiesForSupplement =
    totalYears >= 30 || (totalYears >= 20 && claimPensionAge >= 60) || veraEligible;
  if (!qualifiesForSupplement) return 0;

  // Payment window: from retirement (or MRA, whichever is later for a VERA early-out) to age 62.
  const supplementStartAge = veraEligible ? Math.max(claimPensionAge, mra) : claimPensionAge;
  if (age < supplementStartAge || age >= 62) return 0;

  // OPM computes the supplement using the estimated SS benefit *at age 62*. A user's SSA
  // estimate is typically stated at full retirement age (67), where the benefit is larger;
  // the age-62 benefit is roughly 70% of it. We scale the FRA estimate down so the
  // supplement is not over-stated. (The supplement is also subject to the SS earnings
  // test once the retiree has wages above the annual limit — not modeled here.)
  const estimatedSSAt62 = ssEstimate && ssEstimate > 0
    ? ssEstimate * SS_AGE62_TO_FRA_RATIO
    : high3 * 0.30 * SS_AGE62_TO_FRA_RATIO;

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

  // Pre-compute FERS supplement eligibility data (military buyback included in service)
  const eligibilityForSupplement = determineEligibility(profile);
  const { fersYears } = calculateServiceBySystem(
    creditableServicePeriods(profile.employment),
    profile.employment.sickLeaveHours || 0
  );
  const supplementDetectedSystem = eligibilityForSupplement.detectedSystem;
  // Primary retirement system (treat mixed/auto as FERS for COLA/match/SS purposes)
  const primarySystem: 'FERS' | 'CSRS' = supplementDetectedSystem === 'CSRS' ? 'CSRS' : 'FERS';

  // FEHB can only be carried into retirement on an immediate annuity (and after meeting
  // the 5-year coverage rule). If the user retires without qualifying, FEHB premiums are
  // not charged — such retirees must budget separate (e.g. ACA) coverage, which is not modeled.
  const fehbEligibleInRetirement = isFEHBEligible(
    claimPensionAge,
    eligibilityForSupplement.totalYearsOfService,
    profile.personal.birthYear
  );

  // Age at which Traditional TSP RMDs begin (SECURE 2.0: 73 or 75 by birth year).
  const rmdAge = rmdStartAge(profile.personal.birthYear);

  // VERA early-out: eligible at age 50 with 20+ years, or any age with 25+ years.
  const mraForSupplement = calculateMRA(profile.personal.birthYear);
  const veraEligibleForSupplement = profile.retirement.earlyOutVERA === true &&
    ((claimPensionAge >= 50 && eligibilityForSupplement.totalYearsOfService >= 20) ||
      eligibilityForSupplement.totalYearsOfService >= 25);

  // ── One-time separation payouts (paid in the first projection year out of service) ──
  // Lump-sum unused annual leave (paid at the final hourly salary rate) + optional VSIP.
  const annualLeaveHours = profile.retirement.annualLeaveHoursAtRetirement || 0;
  const finalHourlyRate = (profile.employment.currentOrLastSalary || 0) / STANDARD_WORK_HOURS_PER_YEAR;
  const lumpSumLeaveAmount = annualLeaveHours * finalHourlyRate;
  const vsipAmount = profile.retirement.vsipAmount || 0;
  // Only pay these out if separation occurs during (or at the start of) the projection window.
  const separationInProjection = leaveServiceAge >= currentAge;
  let separationPayoutDone = false;

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

  // ── TSP initialization (Traditional + Roth split) ─────────────────────────
  // Non-federal 401k rollovers are treated as Traditional (pre-tax).
  const rothStart = Math.min(profile.tsp.rothBalance || 0, profile.tsp.currentBalance);
  let tspTradBalance = (profile.tsp.currentBalance - rothStart) + nonFederal401kRolloverToTSP;
  let tspRothBalance = rothStart;
  // tspBalance is always the sum of both for backward-compatible output fields
  let tspBalance = tspTradBalance + tspRothBalance;

  // ── Other investments: categorize accounts by tax treatment ───────────────────
  //   deferred  = Traditional IRA / 401k (or taxDeferred): withdrawals are ordinary income, RMD applies
  //   roth      = Roth IRA: withdrawals tax-free, no RMD
  //   taxable   = brokerage / savings: only the gain portion is taxed (long-term capital gains)
  //   illiquid  = real estate / other: grows for net worth but is not drawn down as income
  const otherAccounts = profile.otherInvestments?.accounts || [];
  const otherAccountCategory = (a: { type: string; taxDeferred?: boolean }): 'deferred' | 'roth' | 'taxable' | 'illiquid' => {
    if (a.type === 'roth_ira') return 'roth';
    if (a.type === 'traditional_ira' || a.type === '401k' || a.taxDeferred) return 'deferred';
    if (a.type === 'brokerage' || a.type === 'savings') return 'taxable';
    return 'illiquid';
  };
  // Fixed weighted return per pool (from initial balances; defaults to 6.5%).
  const poolReturn = (cat: 'deferred' | 'roth' | 'taxable' | 'illiquid'): number => {
    const accts = otherAccounts.filter((a) => otherAccountCategory(a) === cat);
    const tot = accts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    if (accts.length === 0 || tot === 0) return 0.065;
    return accts.reduce((r, a) => r + ((a.currentBalance || 0) / tot) * ((a.returnAssumption || 6.5) / 100), 0);
  };
  const deferredReturn = poolReturn('deferred');
  const rothReturn = poolReturn('roth');
  const taxableReturn = poolReturn('taxable');
  const illiquidReturn = poolReturn('illiquid');
  // Annual contributions per pool (added only while still accumulating, i.e. before leaving service).
  const contribByCat = { deferred: 0, roth: 0, taxable: 0, illiquid: 0 };
  for (const a of otherAccounts) contribByCat[otherAccountCategory(a)] += (a.annualContribution || 0);

  // Initialize pool balances (+ cost basis for the taxable pool).
  let otherDeferredBalance = 0, otherRothBalance = 0, otherTaxableBalance = 0, otherTaxableBasis = 0, otherIlliquidBalance = 0;
  for (const a of otherAccounts) {
    const cat = otherAccountCategory(a);
    const bal = a.currentBalance || 0;
    if (cat === 'deferred') otherDeferredBalance += bal;
    else if (cat === 'roth') otherRothBalance += bal;
    else if (cat === 'taxable') { otherTaxableBalance += bal; otherTaxableBasis += bal; }
    else otherIlliquidBalance += bal;
  }
  // Fallback: a bare totalBalance with no account detail is treated as a taxable brokerage account.
  if (otherAccounts.length === 0 && (profile.otherInvestments?.totalBalance || 0) > 0) {
    otherTaxableBalance = profile.otherInvestments!.totalBalance!;
    otherTaxableBasis = otherTaxableBalance;
  }
  // Running aggregate (used by net-worth, FIRE, and guardrails references).
  let otherInvestmentsBalance = otherDeferredBalance + otherRothBalance + otherTaxableBalance + otherIlliquidBalance;

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
  // Detect spouse's retirement system for the correct COLA schedule
  let spouseSystem: 'FERS' | 'CSRS' = 'FERS';
  if (spouse?.servicePeriods) {
    const s = calculateServiceBySystem(spouse.servicePeriods, spouse.sickLeaveHours || 0);
    spouseSystem = s.csrsYears > s.fersYears ? 'CSRS' : 'FERS';
  }

  // Track spouse TSP balance throughout projection
  let spouseTspBalance = spouse?.tspCurrentBalance || 0;

  // Annual living expenses (base amount in today's dollars)
  const baseLivingExpenses = profile.assumptions.annualLivingExpenses || 60000;
  const applyExpensesFromCurrentAge = profile.assumptions.applyExpensesFromCurrentAge || false;
  const expenseInflationRate = profile.assumptions.expenseInflationRate || profile.assumptions.inflationRate;

  // Base TSP drawdown rate (may be adjusted per-year by guardrails strategy)
  const drawdownRate = profile.assumptions.tspDrawdownRate || 4;

  // ── CoastFIRE pre-computation ──────────────────────────────────────────────
  // Estimate the pension-adjusted FIRE number at the planned retirement age so
  // we can discount it back to compute a CoastFIRE target for each projection year.
  const yearsUntilRetirement = Math.max(0, claimPensionAge - currentAge);
  const inflationFactorToRetirement = Math.pow(1 + expenseInflationRate / 100, yearsUntilRetirement);
  // Expenses at retirement: living expenses plus FEHB (if eligible to carry it), both in
  // future dollars — consistent with the per-year FIRE expense base.
  const fehbAtRetirement = isFEHBEligible(claimPensionAge, eligibilityForSupplement.totalYearsOfService, profile.personal.birthYear)
    ? calculateAnnualFEHBCost(profile.assumptions.fehbCoverageLevel, yearsUntilRetirement, profile.assumptions.healthcareInflation)
    : 0;
  const expensesAtRetirement = baseLivingExpenses * inflationFactorToRetirement + fehbAtRetirement;
  const userSSEstimateForCoast = profile.employment.socialSecurityEstimate;
  // basePension is derived from today's salary; inflate it to retirement-year dollars (using
  // wage growth ≈ inflation as a proxy) so it is comparable to the inflated expenses above.
  const pensionAtRetirement = basePension * inflationFactorToRetirement;
  const ssAtRetirement = claimPensionAge >= 67
    ? (userSSEstimateForCoast || (primarySystem === 'CSRS' ? 0 : pensionInfo.high3 * 0.30))
    : 0;
  const guaranteedAtRetirement = pensionAtRetirement + ssAtRetirement;
  const incomeGapAtRetirement = Math.max(0, expensesAtRetirement - guaranteedAtRetirement);
  const fireTargetAtRetirement = incomeGapAtRetirement / (drawdownRate / 100);

  // ── Guardrails & FI state ─────────────────────────────────────────────────
  let retirementPortfolioBase = 0; // Set at the moment of retirement for guardrails reference
  let fiAchieved = false;          // Latched once FI is reached
  let coastAchieved = false;       // Latched once CoastFIRE is reached

  // FIRE tier multipliers
  const leanMultiplier = profile.assumptions.leanFireMultiplier || LEAN_FIRE_MULTIPLIER;
  const chubbyMultiplier = profile.assumptions.chubbyFireMultiplier || CHUBBY_FIRE_MULTIPLIER;
  const fatMultiplier = profile.assumptions.fatFireMultiplier || FAT_FIRE_MULTIPLIER;

  // Generate year-by-year projections
  let cumulativeSavings = 0;

  for (let age = startAge; age <= endAge; age++) {
    const year = profile.personal.birthYear + age;
    const stillWorking = age < leaveServiceAge;
    const hasPension = age >= claimPensionAge;

    // ── TSP: contributions while working, distributions in retirement ─────────
    const returnRate = profile.tsp.returnAssumption;
    const rothContrib = Math.min(profile.tsp.rothAnnualContribution || 0, profile.tsp.annualContribution);
    const tradContrib = profile.tsp.annualContribution - rothContrib;

    if (stillWorking) {
      const salary = profile.employment.currentOrLastSalary;
      const employeeContributionPercent = profile.tsp.contributionPercent || 0;
      // CSRS employees receive no agency automatic (1%) or matching TSP contributions.
      const employerMatch = primarySystem === 'CSRS'
        ? 0
        : calculateEmployerMatch(salary, employeeContributionPercent);
      // Employer match always goes to Traditional; employee Roth contributions to Roth
      tspTradBalance = (tspTradBalance + tradContrib + employerMatch) * (1 + returnRate / 100);
      tspRothBalance = (tspRothBalance + rothContrib) * (1 + returnRate / 100);
    }

    // Calculate pension with the correct COLA schedule (only if claiming).
    // FERS receives the diet COLA and no COLA before age 62; CSRS receives full CPI COLA.
    const pension = hasPension ? calculatePensionWithColaSchedule(
      basePension,
      primarySystem,
      age,
      claimPensionAge,
      profile.assumptions.colaRate
    ) : 0;

    // ── Guardrails: compute effective withdrawal rate ─────────────────────────
    // Record portfolio base at the moment of retirement
    if (!stillWorking && retirementPortfolioBase === 0) {
      retirementPortfolioBase = tspTradBalance + tspRothBalance + otherInvestmentsBalance;
    }
    let effectiveWithdrawalRate = drawdownRate;
    if (profile.assumptions.withdrawalStrategy === 'guardrails' && retirementPortfolioBase > 0) {
      const totalPortfolio = tspTradBalance + tspRothBalance + otherInvestmentsBalance;
      const ratio = totalPortfolio / retirementPortfolioBase;
      const lower = (profile.assumptions.guardrailsLowerPct || 80) / 100;
      const upper = (profile.assumptions.guardrailsUpperPct || 120) / 100;
      const cut = (profile.assumptions.guardrailsSpendingCutPct || 10) / 100;
      const bump = (profile.assumptions.guardrailsSpendingBumpPct || 10) / 100;
      if (ratio < lower) {
        effectiveWithdrawalRate = drawdownRate * (1 - cut);
      } else if (ratio > upper) {
        effectiveWithdrawalRate = drawdownRate * (1 + bump);
      }
    }

    // TSP distribution with age 55+ separation rule (Traditional + Roth proportional)
    const canAccessTSP = !stillWorking && (age >= 59.5 || (leaveServiceAge >= 55 && age >= leaveServiceAge));
    const totalTSPForDist = tspTradBalance + tspRothBalance;
    let tspDistribution = canAccessTSP ? totalTSPForDist * (effectiveWithdrawalRate / 100) : 0;
    const rothFraction = totalTSPForDist > 0 ? tspRothBalance / totalTSPForDist : 0;
    const tspRothDistribution = tspDistribution * rothFraction;
    let tspTradDistribution = tspDistribution - tspRothDistribution;

    // Required Minimum Distributions: once RMD age is reached (and separated from service),
    // the Traditional balance must distribute at least the IRS Uniform Lifetime amount. This
    // forces taxable income even if the chosen drawdown rate is lower. Roth TSP has no RMD.
    if (canAccessTSP && age >= rmdAge) {
      const rmd = requiredMinimumDistribution(tspTradBalance, age);
      if (rmd > tspTradDistribution) {
        tspTradDistribution = Math.min(rmd, tspTradBalance);
        tspDistribution = tspTradDistribution + tspRothDistribution;
      }
    }

    // TSP balance update: Roth conversion (Traditional→Roth, taxable), then distributions + growth
    if (!stillWorking) {
      // Optional annual Roth conversion (e.g. before SS/pension income raises tax bracket)
      const conversionAmount = Math.min(profile.tsp.rothConversionAnnual || 0, tspTradBalance);
      tspTradBalance -= conversionAmount;
      tspRothBalance += conversionAmount;
      // Distributions and growth
      tspTradBalance = Math.max(0, (tspTradBalance - tspTradDistribution) * (1 + returnRate / 100));
      tspRothBalance = Math.max(0, (tspRothBalance - tspRothDistribution) * (1 + returnRate / 100));
    }
    tspBalance = tspTradBalance + tspRothBalance;

    // Estimate Social Security (uses user's actual estimate if provided; WEP applied to fallback only)
    const userSSEstimate = profile.employment.socialSecurityEstimate;
    const socialSecurity = estimateSocialSecurity(
      pensionInfo.high3, age, userSSEstimate, profile.employment.wepMonthlyReduction, primarySystem
    );

    // Calculate FERS Supplement (paid between retirement/MRA and age 62 for eligible annuitants).
    // Reduced later by the Social Security earnings test if the retiree has wages over the limit.
    let fersSupplement = calculateFERSSupplement(
      pensionInfo.high3,
      age,
      claimPensionAge,
      fersYears,
      eligibilityForSupplement.totalYearsOfService,
      supplementDetectedSystem,
      userSSEstimate,
      veraEligibleForSupplement,
      mraForSupplement
    );

    // Calculate FEHB cost. FEHB requires the annuity to be in payment, so for a POSTPONED
    // retirement (claim age > leave age) coverage is suspended during the gap and reinstated
    // when the annuity begins. For an immediate retirement, coverage starts at separation.
    const annuityInPayment = age >= claimPensionAge;
    const fehbSuspendedGap = profile.retirement.postponeRetirement === true && !annuityInPayment;
    const fehbActive = !stillWorking && fehbEligibleInRetirement && !fehbSuspendedGap;
    const fehbCost = fehbActive ? calculateAnnualFEHBCost(
      profile.assumptions.fehbCoverageLevel,
      Math.max(0, age - leaveServiceAge),
      profile.assumptions.healthcareInflation
    ) : 0;

    // Medicare Part B premium — added at 65+ for primary and/or spouse.
    // Standard 2024 premium grows at healthcareInflation rate each year. A worker covered
    // by active FEHB can delay Part B penalty-free, so we start Part B at the later of age 65
    // and the age they leave service (Special Enrollment Period). Part B is a separate
    // out-of-pocket cost on top of FEHB. IRMAA surcharges for high earners are not modeled.
    let medicarePremium = 0;
    const medicareAnnualBase = MEDICARE_PART_B_MONTHLY_2024 * 12;
    if (age >= 65 && !stillWorking) {
      const yearsOnMedicare = age - 65;
      medicarePremium += medicareAnnualBase *
        Math.pow(1 + profile.assumptions.healthcareInflation / 100, yearsOnMedicare);
    }
    if (spouse) {
      const currentSpouseAgeThisYear = spouseCurrentAge + (age - currentAge);
      const spouseStillWorkingForMedicare = currentSpouseAgeThisYear < spouseLeaveServiceAge;
      if (currentSpouseAgeThisYear >= 65 && !spouseStillWorkingForMedicare) {
        const spouseMedicareYears = currentSpouseAgeThisYear - 65;
        medicarePremium += medicareAnnualBase *
          Math.pow(1 + profile.assumptions.healthcareInflation / 100, spouseMedicareYears);
      }
    }

    // ── Non-federal 401k: contributions while working, drawdown in retirement ──────
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
    // Drawdown in retirement: a non-federal 401k is pre-tax, so withdrawals are ordinary
    // income and subject to RMDs once the RMD age is reached.
    let nonFed401kDistribution = 0;
    if (canAccessTSP && nonFederal401kBalance > 0) {
      nonFed401kDistribution = nonFederal401kBalance * (effectiveWithdrawalRate / 100);
      if (age >= rmdAge) {
        const rmd = requiredMinimumDistribution(nonFederal401kBalance, age);
        if (rmd > nonFed401kDistribution) nonFed401kDistribution = Math.min(rmd, nonFederal401kBalance);
      }
    }
    nonFederal401kBalance = Math.max(0, (nonFederal401kBalance - nonFed401kDistribution) * (1 + nonFed401kReturnRate / 100));

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
          spousePension = calculatePensionWithColaSchedule(
            spouseBasePension,
            spouseSystem,
            currentSpouseAge,
            spouseRetirementAge,
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

    // FERS Supplement earnings test: reduce the supplement $1 for every $2 of *earned* income
    // (part-time/side-hustle wages) above the annual Social Security limit.
    let supplementEarningsTestReduction = 0;
    if (fersSupplement > 0 && otherIncome > SS_ANNUAL_EARNINGS_LIMIT) {
      supplementEarningsTestReduction = Math.min(
        fersSupplement,
        (otherIncome - SS_ANNUAL_EARNINGS_LIMIT) / 2
      );
      fersSupplement -= supplementEarningsTestReduction;
    }

    // One-time separation payouts, paid in the first projection year out of federal service.
    // Both are taxable ordinary income in that year.
    let lumpSumLeavePayout = 0;
    let vsipPayout = 0;
    if (separationInProjection && !separationPayoutDone && !stillWorking) {
      lumpSumLeavePayout = lumpSumLeaveAmount;
      vsipPayout = vsipAmount;
      separationPayoutDone = true;
    }

    // ── Other investments: draw down liquid pools in retirement, then grow ─────────
    // Each pool is drawn at the same rate as the TSP once retired and accessible. Deferred
    // is ordinary income (+RMD); Roth is tax-free; taxable realizes capital gains on the
    // gain portion only; illiquid (real estate/other) is never drawn, only grown.
    const onlyContributeWhileWorking = stillWorking ? 1 : 0;
    let otherDeferredDistribution = 0;
    let otherRothDistribution = 0;
    let otherTaxableDistribution = 0;
    let otherTaxableGains = 0;
    if (canAccessTSP) {
      otherDeferredDistribution = otherDeferredBalance * (effectiveWithdrawalRate / 100);
      if (age >= rmdAge) {
        const rmd = requiredMinimumDistribution(otherDeferredBalance, age);
        if (rmd > otherDeferredDistribution) otherDeferredDistribution = Math.min(rmd, otherDeferredBalance);
      }
      otherRothDistribution = otherRothBalance * (effectiveWithdrawalRate / 100);
      otherTaxableDistribution = otherTaxableBalance * (effectiveWithdrawalRate / 100);
      // Realized gain portion = withdrawal × embedded unrealized-gain fraction.
      const gainFraction = otherTaxableBalance > 0
        ? Math.max(0, (otherTaxableBalance - otherTaxableBasis) / otherTaxableBalance)
        : 0;
      otherTaxableGains = otherTaxableDistribution * gainFraction;
    }
    // Update pools: subtract distributions, add (working-year) contributions, then grow.
    otherDeferredBalance = Math.max(0, (otherDeferredBalance - otherDeferredDistribution +
      contribByCat.deferred * onlyContributeWhileWorking) * (1 + deferredReturn));
    otherRothBalance = Math.max(0, (otherRothBalance - otherRothDistribution +
      contribByCat.roth * onlyContributeWhileWorking) * (1 + rothReturn));
    // Taxable basis tracks the principal: reduced by the non-gain portion withdrawn, increased by contributions.
    const taxablePrincipalWithdrawn = otherTaxableDistribution - otherTaxableGains;
    otherTaxableBasis = Math.max(0, otherTaxableBasis - taxablePrincipalWithdrawn +
      contribByCat.taxable * onlyContributeWhileWorking);
    otherTaxableBalance = Math.max(0, (otherTaxableBalance - otherTaxableDistribution +
      contribByCat.taxable * onlyContributeWhileWorking) * (1 + taxableReturn));
    otherIlliquidBalance = Math.max(0, (otherIlliquidBalance +
      contribByCat.illiquid * onlyContributeWhileWorking) * (1 + illiquidReturn));

    // Combined non-TSP portfolio drawdown income for this year.
    const otherInvestmentsDistribution = otherDeferredDistribution + otherRothDistribution +
      otherTaxableDistribution + nonFed401kDistribution;
    // Refresh the running aggregate used by net-worth / FIRE / guardrails.
    otherInvestmentsBalance = otherDeferredBalance + otherRothBalance + otherTaxableBalance + otherIlliquidBalance;

    // Calculate inflated living expenses for this year
    const yearsFromStart = age - startAge;
    const inflatedLivingExpenses = baseLivingExpenses * Math.pow(1 + expenseInflationRate / 100, yearsFromStart);

    // Apply living expenses based on settings
    // If applyExpensesFromCurrentAge is enabled, expenses start immediately
    // Otherwise, expenses only apply after leaving service
    const shouldApplyExpenses = applyExpensesFromCurrentAge || !stillWorking;
    // Medicare Part B applies regardless of working status once eligible at 65+
    let totalExpenses = shouldApplyExpenses ? (inflatedLivingExpenses + fehbCost) : 0;
    totalExpenses += medicarePremium;

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

    // Add life events costs (track one-time events so they can be excluded from the
    // perpetual FIRE expense base — a one-off cost shouldn't be annualized into a 25× target)
    let oneTimeLifeEventCosts = 0;
    (profile.planning?.lifeEvents || []).forEach(event => {
      if (event.year === year) {
        if (!event.recurring) {
          totalExpenses += event.amount || 0;
          oneTimeLifeEventCosts += event.amount || 0;
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

    // Total income (pension + TSP + Social Security + FERS Supplement + other sources
    // + non-TSP portfolio drawdown + one-time separation payouts)
    const totalIncome = pension + tspDistribution + socialSecurity + fersSupplement +
      spouseIncome + otherIncome + otherInvestmentsDistribution + lumpSumLeavePayout + vsipPayout;

    // Net income (after expenses and taxes) — progressive federal + optional state tax
    const filingStatus: FilingStatus = spouse ? 'married' : 'single';
    const spouseAgeThisYear = spouse ? spouseCurrentAge + (age - currentAge) : undefined;
    // Ordinary income: Traditional pension/TSP are taxable; Roth TSP distributions are NOT.
    // Roth conversions ARE taxable in the year of conversion. Earned income (part-time/
    // Barista-FIRE wages and side-hustle/self-employment) is fully taxable ordinary income.
    const rothConversionThisYear = !stillWorking
      ? Math.min(profile.tsp.rothConversionAnnual || 0, tspTradBalance + tspTradDistribution)
      : 0;
    // Deferred non-TSP withdrawals (Traditional IRA/401k + non-federal 401k) are ordinary
    // income; Roth withdrawals are excluded; taxable-account gains are taxed as capital gains.
    const ordinaryIncome = pension + fersSupplement + tspTradDistribution + rothConversionThisYear +
      otherIncome + otherDeferredDistribution + nonFed401kDistribution + lumpSumLeavePayout + vsipPayout +
      spousePension + spouseTspDistribution +
      (spouse && spouseCurrentAge + (age - currentAge) < spouseLeaveServiceAge ? spouseCurrentIncome : 0) +
      (spouse?.retirementIncome || 0);
    const totalSSIncome = socialSecurity + spouseSocialSecurity;
    // Inflation-index the 2024 brackets/standard deduction to this projection year.
    const taxInflationFactor = Math.pow(1 + profile.assumptions.inflationRate / 100, Math.max(0, year - TAX_BRACKET_BASE_YEAR));
    const taxResult = calculateRetirementTax({
      ordinaryIncome: Math.max(0, ordinaryIncome),
      socialSecurityIncome: Math.max(0, totalSSIncome),
      filingStatus,
      primaryAge: age,
      spouseAge: spouseAgeThisYear,
      stateTaxRate: profile.assumptions.stateTaxRate,
      capitalGains: otherTaxableGains,
      inflationFactor: taxInflationFactor,
    });
    const netIncome = totalIncome - totalExpenses - taxResult.totalTax;

    // ── FIRE metrics ──────────────────────────────────────────────────────────
    // Perpetual expense base for FIRE: exclude one-off, finite costs that shouldn't be
    // annualized into a 25× target (debt payments end when the loan is paid; one-time life
    // events happen once). Include this year's taxes, since the portfolio must fund them too.
    const perpetualExpenses = Math.max(
      0,
      totalExpenses - totalDebtPayments - oneTimeLifeEventCosts + taxResult.totalTax
    );

    // Pension-adjusted FIRE number: portfolio gap after guaranteed income at this year's expense level
    const guaranteedIncome = pension + fersSupplement + socialSecurity +
      (spousePension || 0) + (spouseSocialSecurity || 0);
    const incomeGap = Math.max(0, perpetualExpenses - guaranteedIncome);
    const adjustedFireNumber = incomeGap / (effectiveWithdrawalRate / 100);

    // Lean / Chubby / Fat FIRE numbers (scale only the living-expense portion)
    const nonLivingExpenses = perpetualExpenses - inflatedLivingExpenses;
    const leanTotalExp = inflatedLivingExpenses * leanMultiplier + nonLivingExpenses;
    const chubbyTotalExp = inflatedLivingExpenses * chubbyMultiplier + nonLivingExpenses;
    const fatTotalExp = inflatedLivingExpenses * fatMultiplier + nonLivingExpenses;
    const leanFireNumber = Math.max(0, leanTotalExp - guaranteedIncome) / (effectiveWithdrawalRate / 100);
    const chubbyFireNumber = Math.max(0, chubbyTotalExp - guaranteedIncome) / (effectiveWithdrawalRate / 100);
    const fatFireNumber = Math.max(0, fatTotalExp - guaranteedIncome) / (effectiveWithdrawalRate / 100);

    // CoastFIRE: balance needed now so that, with 0 new contributions, it grows to fireTargetAtRetirement
    const yearsUntilRetirementFromHere = Math.max(0, claimPensionAge - age);
    const coastFIRENumber = yearsUntilRetirementFromHere > 0
      ? fireTargetAtRetirement / Math.pow(1 + returnRate / 100, yearsUntilRetirementFromHere)
      : fireTargetAtRetirement;

    // FI and CoastFIRE: latch true only for the first year each condition is met.
    // Liquid worth counts all household investment assets (primary TSP, spouse TSP,
    // other investments, and any non-rolled-over non-federal 401k).
    const liquidWorth = tspBalance + otherInvestmentsBalance + spouseTspBalance + nonFederal401kBalance;
    const fiThisYear = !fiAchieved && liquidWorth >= adjustedFireNumber && adjustedFireNumber > 0;
    const coastThisYear = !coastAchieved && liquidWorth >= coastFIRENumber && coastFIRENumber > 0;
    if (fiThisYear) fiAchieved = true;
    if (coastThisYear) coastAchieved = true;

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
      otherInvestmentsDistribution,
      lumpSumLeavePayout,
      vsipPayout,
      supplementEarningsTestReduction,
      spouseIncome,
      spousePension,
      spouseTspDistribution,
      spouseSocialSecurity,
      spouseTspBalance: Math.max(0, spouseTspBalance),
      nonFederal401kBalance: Math.max(0, nonFederal401kBalance),
      fehbCost,
      medicarePremium,
      totalIncome,
      federalTax: taxResult.federalTax,
      stateTax: taxResult.stateTax,
      totalTax: taxResult.totalTax,
      capitalGainsTax: taxResult.capitalGainsTax,
      effectiveTaxRate: taxResult.effectiveRate,
      expenses: totalExpenses,
      collegeCosts,
      netIncome,
      tspBalance: Math.max(0, tspBalance),
      otherInvestmentsBalance: Math.max(0, otherInvestmentsBalance),
      adjustedFireNumber,
      leanFireNumber,
      chubbyFireNumber,
      fatFireNumber,
      coastFIRENumber,
      isFinanciallyIndependent: fiThisYear,
      isCoastFIREAchieved: coastThisYear,
      effectiveWithdrawalRate,
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
