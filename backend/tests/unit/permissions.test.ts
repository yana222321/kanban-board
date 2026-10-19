import {
  canContribute,
  canDeleteProject,
  canManageProject,
} from '../../src/services/permissions';

describe('permission rules', () => {
  it('allows admins and owners to manage and delete', () => {
    expect(canManageProject('ADMIN')).toBe(true);
    expect(canManageProject('OWNER')).toBe(true);
    expect(canDeleteProject('ADMIN')).toBe(true);
    expect(canDeleteProject('OWNER')).toBe(true);
  });

  it('allows managers to manage but not delete', () => {
    expect(canManageProject('MANAGER')).toBe(true);
    expect(canDeleteProject('MANAGER')).toBe(false);
  });

  it('allows developers to contribute but not manage', () => {
    expect(canContribute('DEVELOPER')).toBe(true);
    expect(canManageProject('DEVELOPER')).toBe(false);
    expect(canDeleteProject('DEVELOPER')).toBe(false);
  });

  it('restricts viewers from contributing', () => {
    expect(canContribute('VIEWER')).toBe(false);
    expect(canManageProject('VIEWER')).toBe(false);
  });
});
