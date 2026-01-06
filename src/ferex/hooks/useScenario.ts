/**
 * Custom hook for managing scenarios and calculations
 * FIXED: Removed side effects from useMemo, using useState + useEffect pattern
 */

import { useState, useEffect } from 'react';
import type { Scenario, UserProfile, ProjectionYear, EligibilityInfo, PensionBreakdown } from '../types';
import { generateProjections, determineEligibility, getPensionBreakdown } from '../logic/projectionEngine';

/**
 * Deep clone a UserProfile to ensure all nested objects get new references
 * This is critical for React's dependency tracking to work correctly
 */
function deepCloneUserProfile(profile: UserProfile): UserProfile {
  // Use JSON.parse/stringify for deep cloning
  // This guarantees ALL nested objects get new references
  return JSON.parse(JSON.stringify(profile));
}

/**
 * Deep merge partial updates into a user profile
 * Returns a completely new UserProfile with new object references at all levels
 */
function deepMergeProfile(base: UserProfile, updates: Partial<UserProfile>): UserProfile {
  // Start with a deep clone of the base
  const merged = deepCloneUserProfile(base);

  // Apply updates, ensuring each section gets proper deep merge
  if (updates.personal) {
    merged.personal = { ...merged.personal, ...updates.personal };
  }

  if (updates.employment) {
    merged.employment = {
      ...merged.employment,
      ...updates.employment,
      // Ensure arrays are properly copied
      servicePeriods: updates.employment.servicePeriods
        ? [...updates.employment.servicePeriods]
        : merged.employment.servicePeriods,
    };
  }

  if (updates.retirement) {
    merged.retirement = { ...merged.retirement, ...updates.retirement };
  }

  if (updates.tsp) {
    merged.tsp = { ...merged.tsp, ...updates.tsp };
  }

  if (updates.otherInvestments) {
    merged.otherInvestments = {
      ...merged.otherInvestments,
      ...updates.otherInvestments,
      // Ensure accounts array is properly copied
      accounts: updates.otherInvestments.accounts
        ? [...updates.otherInvestments.accounts]
        : merged.otherInvestments.accounts,
    };
  }

  if (updates.assumptions) {
    merged.assumptions = { ...merged.assumptions, ...updates.assumptions };
  }

  if (updates.planning) {
    merged.planning = {
      ...merged.planning,
      ...updates.planning,
      // Ensure all planning arrays are properly copied
      children: updates.planning.children
        ? [...updates.planning.children]
        : merged.planning.children,
      lifeEvents: updates.planning.lifeEvents
        ? [...updates.planning.lifeEvents]
        : merged.planning.lifeEvents,
      milestones: updates.planning.milestones
        ? [...updates.planning.milestones]
        : merged.planning.milestones,
      debts: updates.planning.debts
        ? [...updates.planning.debts]
        : merged.planning.debts,
      assets: updates.planning.assets
        ? [...updates.planning.assets]
        : merged.planning.assets,
    };
  }

  return merged;
}

export function useScenario(initialScenario?: Scenario) {
  const [scenario, setScenario] = useState<Scenario | null>(initialScenario || null);
  const [isCalculating, setIsCalculating] = useState(false);

  // State for calculated values (instead of useMemo)
  const [projections, setProjections] = useState<ProjectionYear[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityInfo | null>(null);
  const [pensionBreakdown, setPensionBreakdown] = useState<PensionBreakdown | null>(null);

  // Effect to recalculate when scenario changes
  // This replaces the problematic useMemo with side effects
  useEffect(() => {
    if (!scenario) {
      console.log('[useScenario] No scenario, clearing calculations');
      setProjections([]);
      setEligibility(null);
      setPensionBreakdown(null);
      setIsCalculating(false);
      return;
    }

    console.log('[useScenario] Scenario changed, recalculating...', {
      scenarioId: scenario.id,
      timestamp: new Date().toISOString(),
      profileSnapshot: {
        leaveServiceAge: scenario.profile.retirement.leaveServiceAge,
        claimPensionAge: scenario.profile.retirement.intendedRetirementAge,
        tspReturn: scenario.profile.tsp.returnAssumption,
        annualExpenses: scenario.profile.assumptions.annualLivingExpenses,
        sickLeaveHours: scenario.profile.employment.sickLeaveHours,
      },
    });

    setIsCalculating(true);

    try {
      // Calculate all derived values
      const newProjections = generateProjections(scenario.profile);
      const newEligibility = determineEligibility(scenario.profile);
      const newPensionBreakdown = getPensionBreakdown(scenario.profile);

      console.log('[useScenario] Calculations complete', {
        projectionsCount: newProjections.length,
        firstYearAge: newProjections[0]?.age,
        lastYearAge: newProjections[newProjections.length - 1]?.age,
        eligibility: newEligibility,
        annualPension: newPensionBreakdown?.annualPension,
      });

      // Update all calculated state
      setProjections(newProjections);
      setEligibility(newEligibility);
      setPensionBreakdown(newPensionBreakdown);
    } catch (error) {
      console.error('[useScenario] Error during calculations:', error);
      setProjections([]);
      setEligibility(null);
      setPensionBreakdown(null);
    } finally {
      setIsCalculating(false);
    }
  }, [scenario]);

  // Update scenario profile with deep merging
  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!scenario) {
      console.warn('[useScenario] updateProfile called with no scenario');
      return;
    }

    console.log('[useScenario] updateProfile called', {
      updates: Object.keys(updates),
      timestamp: new Date().toISOString(),
    });

    // Create a completely new profile with deep merge
    const newProfile = deepMergeProfile(scenario.profile, updates);

    // Create new scenario object with new profile
    const newScenario: Scenario = {
      ...scenario,
      profile: newProfile,
      lastModified: new Date(),
    };

    console.log('[useScenario] Setting new scenario', {
      oldScenarioId: scenario.id,
      newScenarioId: newScenario.id,
      profileChanged: scenario.profile !== newProfile, // Should always be true
    });

    setScenario(newScenario);
  };

  // Create new scenario
  const createScenario = (name: string, profile: UserProfile) => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      createdAt: new Date(),
      lastModified: new Date(),
      profile: deepCloneUserProfile(profile), // Deep clone to ensure clean state
      metadata: {
        isPreBuilt: false,
      },
    };

    console.log('[useScenario] Creating new scenario', {
      scenarioId: newScenario.id,
      name,
    });

    setScenario(newScenario);
    return newScenario;
  };

  // Load scenario
  const loadScenario = (newScenario: Scenario) => {
    console.log('[useScenario] Loading scenario', {
      scenarioId: newScenario.id,
      name: newScenario.name,
    });

    // Deep clone the profile to ensure clean state
    const clonedScenario: Scenario = {
      ...newScenario,
      profile: deepCloneUserProfile(newScenario.profile),
    };

    setScenario(clonedScenario);
  };

  return {
    scenario,
    projections,
    eligibility,
    pensionBreakdown,
    isCalculating,
    updateProfile,
    createScenario,
    loadScenario,
  };
}
