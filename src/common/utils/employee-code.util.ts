import { randomInt } from 'crypto';

const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Generates a random employee/admin code like "EMP-7F3K9Q" or "ADM-7F3K9Q". */
export function generateEmployeeCode(prefix: 'EMP' | 'ADM', length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return `${prefix}-${code}`;
}
