import { describe, expect, test } from 'vitest';
import { TENANT_ASSIGNABLE_ROLES, isTenantAssignableRole, toAssignableRole } from './admin';

describe('TENANT_ASSIGNABLE_ROLES', () => {
  test('includes tenant_admin and loan_officer, not legacy admin', () => {
    expect(TENANT_ASSIGNABLE_ROLES).toContain('tenant_admin');
    expect(TENANT_ASSIGNABLE_ROLES).toContain('loan_officer');
    expect(TENANT_ASSIGNABLE_ROLES).toContain('client');
    expect(TENANT_ASSIGNABLE_ROLES).not.toContain('admin');
  });

  test('isTenantAssignableRole rejects the legacy admin coerce-to-client path', () => {
    expect(isTenantAssignableRole('tenant_admin')).toBe(true);
    expect(isTenantAssignableRole('admin')).toBe(false);
    expect(isTenantAssignableRole('client')).toBe(true);
  });

  test('toAssignableRole never silently demotes tenant_admin to client', () => {
    expect(toAssignableRole('tenant_admin')).toBe('tenant_admin');
    expect(toAssignableRole('loan_officer')).toBe('loan_officer');
    expect(toAssignableRole('client')).toBe('client');
    expect(toAssignableRole('admin')).toBe('tenant_admin');
    expect(toAssignableRole(undefined)).toBe('client');
  });
});
