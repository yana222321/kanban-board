import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password utilities', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('Secret123!');
    expect(hash).not.toBe('Secret123!');
    await expect(verifyPassword('Secret123!', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('Secret123!');
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
