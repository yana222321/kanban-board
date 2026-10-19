import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/utils/errors';

describe('error classes', () => {
  it('AppError carries status code, code and details', () => {
    const err = new AppError('boom', 418, 'TEAPOT', { hint: true });
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.details).toEqual({ hint: true });
    expect(err).toBeInstanceOf(Error);
  });

  it('uses default messages and status codes', () => {
    expect(new BadRequestError().statusCode).toBe(400);
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new ConflictError().statusCode).toBe(409);
    expect(new ValidationError().statusCode).toBe(422);

    expect(new BadRequestError().message).toBe('Bad request');
    expect(new UnauthorizedError().message).toBe('Unauthorized');
    expect(new ForbiddenError().message).toBe('Forbidden');
    expect(new NotFoundError().message).toBe('Resource not found');
    expect(new ConflictError().message).toBe('Conflict');
    expect(new ValidationError().message).toBe('Validation failed');
  });

  it('accepts custom messages', () => {
    expect(new NotFoundError('nope').message).toBe('nope');
    expect(new ConflictError('clash', { field: 'x' }).details).toEqual({ field: 'x' });
  });
});
