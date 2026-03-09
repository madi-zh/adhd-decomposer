export const MIN_PASSWORD_LENGTH = 8;
export const BCRYPT_SALT_ROUNDS = 12;

export const MIN_ESTIMATE_MINUTES = 1;
export const MAX_ESTIMATE_MINUTES = 480;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
