// Simpleng validation para sa request body (walang class-validator).
// Lahat ay nagbabato ng BadRequestException na may malinaw na mensahe para sa UI.
import { BadRequestException } from '@nestjs/common';

export function requireString(value: unknown, field: string, maxLength = 100): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new BadRequestException(`${field} must be at most ${maxLength} characters.`);
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string, maxLength = 100): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireString(value, field, maxLength);
}

export function requireId(value: unknown, field: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestException(`${field} is invalid.`);
  return id;
}

export function requirePrice(value: unknown, field = 'Price'): number {
  const price = Number(value);
  if (value === '' || value === null || !Number.isFinite(price) || price <= 0) {
    throw new BadRequestException(`${field} must be greater than 0.`);
  }
  if (price > 99_999_999) throw new BadRequestException(`${field} is too large.`);
  // Hanggang 2 decimal places lang (centavos)
  return Math.round(price * 100) / 100;
}

/** Dami ng stock (hanggang 3 decimal places, hal. 0.5 kg = 500 g) */
export function requireQty(value: unknown, field = 'Quantity', allowZero = false): number {
  const qty = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(qty) || qty < 0 || (!allowZero && qty === 0)) {
    throw new BadRequestException(`${field} must be ${allowZero ? '0 or more' : 'greater than 0'}.`);
  }
  if (qty > 999_999_999) throw new BadRequestException(`${field} is too large.`);
  return Math.round(qty * 1000) / 1000;
}

export function optionalQty(value: unknown, field: string, allowZero = false): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireQty(value, field, allowZero);
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new BadRequestException(`${field} must be true or false.`);
  return value;
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** null sa body = burahin; undefined = huwag galawin */
export const nullable = <T>(value: unknown, parse: (v: unknown) => T | undefined): T | null | undefined =>
  value === undefined ? undefined : value === null || value === '' ? null : parse(value);
