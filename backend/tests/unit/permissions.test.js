"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("../../src/services/permissions");
describe('permission rules', () => {
    it('allows admins and owners to manage and delete', () => {
        expect((0, permissions_1.canManageProject)('ADMIN')).toBe(true);
        expect((0, permissions_1.canManageProject)('OWNER')).toBe(true);
        expect((0, permissions_1.canDeleteProject)('ADMIN')).toBe(true);
        expect((0, permissions_1.canDeleteProject)('OWNER')).toBe(true);
    });
    it('allows managers to manage but not delete', () => {
        expect((0, permissions_1.canManageProject)('MANAGER')).toBe(true);
        expect((0, permissions_1.canDeleteProject)('MANAGER')).toBe(false);
    });
    it('allows developers to contribute but not manage', () => {
        expect((0, permissions_1.canContribute)('DEVELOPER')).toBe(true);
        expect((0, permissions_1.canManageProject)('DEVELOPER')).toBe(false);
        expect((0, permissions_1.canDeleteProject)('DEVELOPER')).toBe(false);
    });
    it('restricts viewers from contributing', () => {
        expect((0, permissions_1.canContribute)('VIEWER')).toBe(false);
        expect((0, permissions_1.canManageProject)('VIEWER')).toBe(false);
    });
});
//# sourceMappingURL=permissions.test.js.map