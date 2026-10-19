"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../../src/utils/errors");
describe('error classes', () => {
    it('AppError carries status code, code and details', () => {
        const err = new errors_1.AppError('boom', 418, 'TEAPOT', { hint: true });
        expect(err.statusCode).toBe(418);
        expect(err.code).toBe('TEAPOT');
        expect(err.details).toEqual({ hint: true });
        expect(err).toBeInstanceOf(Error);
    });
    it('uses default messages and status codes', () => {
        expect(new errors_1.BadRequestError().statusCode).toBe(400);
        expect(new errors_1.UnauthorizedError().statusCode).toBe(401);
        expect(new errors_1.ForbiddenError().statusCode).toBe(403);
        expect(new errors_1.NotFoundError().statusCode).toBe(404);
        expect(new errors_1.ConflictError().statusCode).toBe(409);
        expect(new errors_1.ValidationError().statusCode).toBe(422);
        expect(new errors_1.BadRequestError().message).toBe('Bad request');
        expect(new errors_1.UnauthorizedError().message).toBe('Unauthorized');
        expect(new errors_1.ForbiddenError().message).toBe('Forbidden');
        expect(new errors_1.NotFoundError().message).toBe('Resource not found');
        expect(new errors_1.ConflictError().message).toBe('Conflict');
        expect(new errors_1.ValidationError().message).toBe('Validation failed');
    });
    it('accepts custom messages', () => {
        expect(new errors_1.NotFoundError('nope').message).toBe('nope');
        expect(new errors_1.ConflictError('clash', { field: 'x' }).details).toEqual({ field: 'x' });
    });
});
//# sourceMappingURL=errors.test.js.map