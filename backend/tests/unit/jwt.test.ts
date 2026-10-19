import { signAccessToken, signRefreshToken, verifyToken } from '../../src/utils/jwt';

describe('jwt utilities', () => {
  const base = { sub: 'user-1', email: 'a@b.c', name: 'A', role: 'DEVELOPER' as const };

  it('signs and verifies an access token', () => {
    const token = signAccessToken(base);
    const payload = verifyToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.type).toBe('access');
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken(base);
    expect(verifyToken(token).type).toBe('refresh');
  });

  it('throws on a tampered token', () => {
    const token = signAccessToken(base);
    expect(() => verifyToken(`${token}tampered`)).toThrow();
  });
});
