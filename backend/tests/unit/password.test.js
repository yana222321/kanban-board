"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_1 = require("../../src/utils/password");
describe('password utilities', () => {
    it('hashes a password and verifies it', async () => {
        const hash = await (0, password_1.hashPassword)('Secret123!');
        expect(hash).not.toBe('Secret123!');
        await expect((0, password_1.verifyPassword)('Secret123!', hash)).resolves.toBe(true);
    });
    it('rejects a wrong password', async () => {
        const hash = await (0, password_1.hashPassword)('Secret123!');
        await expect((0, password_1.verifyPassword)('wrong', hash)).resolves.toBe(false);
    });
});
//# sourceMappingURL=password.test.js.map