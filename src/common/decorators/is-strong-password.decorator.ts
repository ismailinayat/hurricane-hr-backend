import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/** Requires at least 8 characters with an uppercase letter, a lowercase letter, and a digit. */
export function IsStrongPassword() {
  return applyDecorators(
    IsString(),
    MinLength(8),
    Matches(STRONG_PASSWORD_PATTERN, {
      message:
        'password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  );
}
