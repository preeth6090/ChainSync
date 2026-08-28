import { describe, it, expect } from 'vitest';
import { resolveActiveCompanyId, NoActiveFirmError } from '@/lib/services/firm-context';

describe('resolveActiveCompanyId', () => {
  it('throws NoActiveFirmError when there are no memberships', () => {
    expect(() => resolveActiveCompanyId([])).toThrow(NoActiveFirmError);
  });

  it('returns the only membership when there is exactly one', () => {
    expect(resolveActiveCompanyId([{ companyId: 'firm-1', isDefault: true }])).toBe('firm-1');
  });

  it('falls back to the default membership when no cookie is given', () => {
    const memberships = [
      { companyId: 'firm-1', isDefault: false },
      { companyId: 'firm-2', isDefault: true },
    ];
    expect(resolveActiveCompanyId(memberships)).toBe('firm-2');
  });

  it('falls back to the first membership when none is marked default', () => {
    const memberships = [
      { companyId: 'firm-1', isDefault: false },
      { companyId: 'firm-2', isDefault: false },
    ];
    expect(resolveActiveCompanyId(memberships)).toBe('firm-1');
  });

  it('honors a cookie value for a firm the user belongs to', () => {
    const memberships = [
      { companyId: 'firm-1', isDefault: true },
      { companyId: 'firm-2', isDefault: false },
    ];
    expect(resolveActiveCompanyId(memberships, 'firm-2')).toBe('firm-2');
  });

  it('ignores a cookie value for a firm the user does not belong to', () => {
    const memberships = [{ companyId: 'firm-1', isDefault: true }];
    expect(resolveActiveCompanyId(memberships, 'not-a-member-firm')).toBe('firm-1');
  });
});
