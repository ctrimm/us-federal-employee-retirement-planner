/**
 * Formatter tests — regression for the "29 years, 12 months" display bug (2026-10-04).
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { formatYearsOfService } from '../../utils/formatters';

describe('formatYearsOfService', () => {
  it('29.993 years (30 calendar years via 365.25 math) → "30 years"', () => {
    expect(formatYearsOfService(29.993)).toBe('30 years');
  });

  it('22.333 years → "22 years, 4 months"', () => {
    expect(formatYearsOfService(22.333)).toBe('22 years, 4 months');
  });

  it('exact whole years → "N years"', () => {
    expect(formatYearsOfService(25)).toBe('25 years');
  });

  it('months never read 12', () => {
    expect(formatYearsOfService(29.96)).toBe('30 years');
    expect(formatYearsOfService(10.5)).toBe('10 years, 6 months');
  });
});
