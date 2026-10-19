"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../../src/utils/jwt");
describe('jwt utilities', () => {
    const base = { sub: 'user-1', email: 'a@b.c', name: 'A', role: 'DEVELOPER' };
    it('signs and verifies an access token', () => {
        const token = (0, jwt_1.signAccessToken)(base);
        const payload = (0, jwt_1.verifyToken)(token);
        expect(payload.sub).toBe('user-1');
        expect(payload.type).toBe('access');
    });
    it('signs and verifies a refresh token', () => {
        const token = (0, jwt_1.signRefreshToken)(base);
        expect((0, jwt_1.verifyToken)(token).type).toBe('refresh');
    });
    it('throws on a tampered token', () => {
        const token = (0, jwt_1.signAccessToken)(base);
        expect(() => (0, jwt_1.verifyToken)(`${token}tampered`)).toThrow();
    });
});
//# sourceMappingURL=jwt.test.js.map