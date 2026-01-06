/**
 * Sample Scenarios from PRD
 * Pre-built scenarios to help users understand the tool
 */

import type { Scenario } from '../types';
import { DEFAULT_ASSUMPTIONS, DEFAULT_TSP } from '../types';

/**
 * Scenario 1: The Boomerang Fed
 * Employee who left and returned to federal service
 */
export const boomerangFed: Scenario = {
  id: 'boomerang-fed',
  name: 'The Boomerang Fed',
  createdAt: new Date('2026-01-01'),
  lastModified: new Date('2026-01-01'),
  metadata: {
    isPreBuilt: true,
    description:
      'Joined federal service in 2000, left for private sector in 2008, returned in 2015. Exploring retirement options with service break.',
    tags: ['service-break', 'mid-career', 'fers'],
  },
  profile: {
    personal: {
      birthYear: 1980,
      gender: 'male',
    },
    employment: {
      servicePeriods: [
        {
          id: 'period-1',
          startDate: new Date('2000-01-01'),
          endDate: new Date('2008-12-31'),
          system: 'FERS',
          isActive: false,
        },
        {
          id: 'period-2',
          startDate: new Date('2015-01-01'),
          system: 'FERS',
          isActive: true,
        },
      ],
      currentOrLastSalary: 95000,
    },
    retirement: {
      survivorAnnuityType: 'none',
      intendedRetirementAge: 60,
    },
    tsp: {
      currentBalance: 120000,
      annualContribution: 10000,
      returnAssumption: DEFAULT_TSP.returnAssumption!,
    },
    assumptions: DEFAULT_ASSUMPTIONS,
  },
};

/**
 * Scenario 2: Early Retirement Dream
 * Long career employee considering early retirement
 */
export const earlyRetirement: Scenario = {
  id: 'early-retirement',
  name: 'Early Retirement Dream',
  createdAt: new Date('2026-01-01'),
  lastModified: new Date('2026-01-01'),
  metadata: {
    isPreBuilt: true,
    description:
      'Hired in 1988, 38 years of continuous service. Exploring retirement at 55 with survivor benefits for spouse.',
    tags: ['early-retirement', 'long-career', 'fers', 'survivor-benefits'],
  },
  profile: {
    personal: {
      birthYear: 1971,
      gender: 'female',
      spouseInfo: {
        age: 52,
        gender: 'male',
      },
    },
    employment: {
      servicePeriods: [
        {
          id: 'period-1',
          startDate: new Date('1988-01-01'),
          system: 'FERS',
          isActive: true,
        },
      ],
      currentOrLastSalary: 155000,
    },
    retirement: {
      survivorAnnuityType: 'standard',
      intendedRetirementAge: 55,
    },
    tsp: {
      currentBalance: 650000,
      annualContribution: 23000,
      returnAssumption: DEFAULT_TSP.returnAssumption!,
    },
    assumptions: DEFAULT_ASSUMPTIONS,
  },
};

/**
 * Scenario 3: Long Career + Healthcare Focus
 * Traditional retirement age with focus on healthcare costs
 */
export const longCareerHealthcare: Scenario = {
  id: 'long-career-healthcare',
  name: 'Long Career + Healthcare Focus',
  createdAt: new Date('2026-01-01'),
  lastModified: new Date('2026-01-01'),
  metadata: {
    isPreBuilt: true,
    description:
      '34 years of continuous service, nearing traditional retirement age. Main concern is healthcare transition to Medicare and FEHB.',
    tags: ['traditional-retirement', 'healthcare', 'fers', 'single'],
  },
  profile: {
    personal: {
      birthYear: 1963,
      gender: 'male',
    },
    employment: {
      servicePeriods: [
        {
          id: 'period-1',
          startDate: new Date('1992-01-01'),
          system: 'FERS',
          isActive: true,
        },
      ],
      currentOrLastSalary: 140000,
    },
    retirement: {
      survivorAnnuityType: 'none',
      intendedRetirementAge: 62,
    },
    tsp: {
      currentBalance: 520000,
      annualContribution: 20000,
      returnAssumption: DEFAULT_TSP.returnAssumption!,
    },
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      fehbCoverageLevel: 'self',
    },
  },
};

/**
 * All sample scenarios
 */
export const sampleScenarios: Scenario[] = [
  boomerangFed,
  earlyRetirement,
  longCareerHealthcare,
];

/**
 * Get sample scenario by ID
 */
export function getSampleScenario(id: string): Scenario | undefined {
  return sampleScenarios.find((s) => s.id === id);
}
