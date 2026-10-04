/**
 * TSP calculator tests — employer match, RMD table/ages.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  calculateEmployerMatch,
  requiredMinimumDistribution,
  rmdStartAge,
} from '../tspCalculator';

describe('FERS employer match — golden paths', () => {
  it('0% employee contribution → 1% automatic only', () => {
    expect(calculateEmployerMatch(100_000, 0)).toBeCloseTo(1_000, 2);
  });

  it('3% contribution → 1% + 3% match', () => {
    expect(calculateEmployerMatch(100_000, 3)).toBeCloseTo(4_000, 2);
  });

  it('5% contribution → full 5% (1% auto + 3% + 1%)', () => {
    expect(calculateEmployerMatch(100_000, 5)).toBeCloseTo(5_000, 2);
  });

  it('4% contribution → 1% + 3% + 0.5% = 4.5%', () => {
    expect(calculateEmployerMatch(100_000, 4)).toBeCloseTo(4_500, 2);
  });

  it('caps at 5% of salary', () => {
    expect(calculateEmployerMatch(100_000, 10)).toBeCloseTo(5_000, 2);
  });
});

describe('RMD start age (SECURE 2.0) — golden paths', () => {
  it('born 1959 or earlier → 73', () => {
    expect(rmdStartAge(1959)).toBe(73);
    expect(rmdStartAge(1950)).toBe(73);
  });

  it('born 1960 or later → 75', () => {
    expect(rmdStartAge(1960)).toBe(75);
    expect(rmdStartAge(1981)).toBe(75);
  });
});

describe('RMD amounts — IRS Uniform Lifetime Table golden paths', () => {
  it('$1M at 75 → $1M / 24.6 = $40,650.41', () => {
    expect(requiredMinimumDistribution(1_000_000, 75)).toBeCloseTo(40_650.41, 2);
  });

  it('$1M at 73 → $1M / 26.5', () => {
    expect(requiredMinimumDistribution(1_000_000, 73)).toBeCloseTo(37_735.85, 2);
  });

  it('no RMD below the start age (default 73; 75 when specified)', () => {
    expect(requiredMinimumDistribution(1_000_000, 72)).toBe(0);
    expect(requiredMinimumDistribution(1_000_000, 74, 75)).toBe(0);
    expect(requiredMinimumDistribution(1_000_000, 75, 75)).toBeGreaterThan(0);
  });
});
