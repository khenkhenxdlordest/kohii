// Single place for password handling.
// DEV: PASSWORD_HASHING=false → stored as plain text (easy testing).
// FINAL DEFENSE: set PASSWORD_HASHING=true, then re-seed / reset all passwords.
import bcrypt from 'bcryptjs';

const hashingEnabled = () => process.env.PASSWORD_HASHING === 'true';

export async function hashPassword(plain: string): Promise<string> {
  return hashingEnabled() ? bcrypt.hash(plain, 10) : plain;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return hashingEnabled() ? bcrypt.compare(plain, stored) : plain === stored;
}
