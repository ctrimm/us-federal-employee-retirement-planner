/**
 * Custom hook for managing scenarios and calculations
 */

import { useState, useEffect, useMemo } from 'react';
import type { Scenario, UserProfile, ProjectionYear, EligibilityInfo, PensionBreakdown } from '../types';
import { generateProjections, determineEligibility, getPensionBreakdown } from '../logic/projectionEngine';

export function useScenario(initialScenario?: Scenario) {
  const [scenario, setScenario] = useState<Scenario | null>(initialScenario || null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate projections whenever scenario changes
  const projections = useMemo((): ProjectionYear[] => {
    if (!scenario) return [];

    try {
      setIsCalculating(true);
      return generateProjections(scenario.profile);
    } catch (error) {
      console.error('Error generating projections:', error);
      return [];
    } finally {
      setIsCalculating(false);
    }
  }, [scenario]);

  // Calculate eligibility
  const eligibility = useMemo((): EligibilityInfo | null => {
    if (!scenario) return null;

    try {
      return determineEligibility(scenario.profile);
    } catch (error) {
      console.error('Error determining eligibility:', error);
      return null;
    }
  }, [scenario]);

  // Calculate pension breakdown
  const pensionBreakdown = useMemo((): PensionBreakdown | null => {
    if (!scenario) return null;

    try {
      return getPensionBreakdown(scenario.profile);
    } catch (error) {
      console.error('Error calculating pension:', error);
      return null;
    }
  }, [scenario]);

  // Update scenario profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!scenario) return;

    setScenario({
      ...scenario,
      profile: {
        ...scenario.profile,
        personal: updates.personal ? { ...scenario.profile.personal, ...updates.personal } : scenario.profile.personal,
        employment: updates.employment ? { ...scenario.profile.employment, ...updates.employment } : scenario.profile.employment,
        retirement: updates.retirement ? { ...scenario.profile.retirement, ...updates.retirement } : scenario.profile.retirement,
        tsp: updates.tsp ? { ...scenario.profile.tsp, ...updates.tsp } : scenario.profile.tsp,
        otherInvestments: updates.otherInvestments ? { ...scenario.profile.otherInvestments, ...updates.otherInvestments } : scenario.profile.otherInvestments,
        assumptions: updates.assumptions ? { ...scenario.profile.assumptions, ...updates.assumptions } : scenario.profile.assumptions,
        planning: updates.planning ? { ...scenario.profile.planning, ...updates.planning } : scenario.profile.planning,
      },
      lastModified: new Date(),
    });
  };

  // Create new scenario
  const createScenario = (name: string, profile: UserProfile) => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      createdAt: new Date(),
      lastModified: new Date(),
      profile,
      metadata: {
        isPreBuilt: false,
      },
    };

    setScenario(newScenario);
    return newScenario;
  };

  // Load scenario
  const loadScenario = (newScenario: Scenario) => {
    setScenario(newScenario);
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
