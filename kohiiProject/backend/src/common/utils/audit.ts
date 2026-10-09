import type { Prisma } from '../../generated/prisma/client.js';

// Ginagawang JSON-safe ang record (Decimal → number, Date → ISO string) bago i-save sa AuditLog
export function toAuditJson(record: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(record, (_key, value: unknown) =>
      value !== null && typeof value === 'object' && 'toNumber' in value
        ? (value as { toNumber: () => number }).toNumber()
        : value,
    ),
  ) as Prisma.InputJsonValue;
}
