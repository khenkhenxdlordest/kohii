import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

type AuditTone = 'create' | 'update' | 'remove' | 'price';

interface ActionMeta {
  label: string;
  tone: AuditTone;
}

// Bawat `action` na naka-save sa AuditLog sa ibang module (categories, products,
// inventory, users, auth, stores) — tingnan ang toAuditJson() at ang mga tx.auditLog.create() calls
const ACTION_META: Record<string, ActionMeta> = {
  EMPLOYEE_CREATE: { label: 'Employee added', tone: 'create' },
  EMPLOYEE_UPDATE: { label: 'Employee updated', tone: 'update' },
  EMPLOYEE_ACTIVATE: { label: 'Employee activated', tone: 'create' },
  EMPLOYEE_DEACTIVATE: { label: 'Employee deactivated', tone: 'remove' },
  EMPLOYEE_JOB_CHANGE: { label: 'Employee job changed', tone: 'update' },
  EMPLOYEE_PASSWORD_RESET: { label: 'Password reset', tone: 'update' },
  STAFF_DEPLOY: { label: 'Staff deployed', tone: 'update' },
  PRODUCT_CREATE: { label: 'Product added', tone: 'create' },
  PRODUCT_UPDATE: { label: 'Product updated', tone: 'update' },
  PRODUCT_DEACTIVATE: { label: 'Product deactivated', tone: 'remove' },
  PRICE_ADD: { label: 'Price added', tone: 'price' },
  PRICE_CHANGE: { label: 'Price changed', tone: 'price' },
  PRICE_REMOVE: { label: 'Price removed', tone: 'price' },
  CATEGORY_CREATE: { label: 'Category added', tone: 'create' },
  CATEGORY_UPDATE: { label: 'Category updated', tone: 'update' },
  CATEGORY_DEACTIVATE: { label: 'Category deactivated', tone: 'remove' },
  INVENTORY_ITEM_CREATE: { label: 'Inventory item added', tone: 'create' },
  INVENTORY_ITEM_UPDATE: { label: 'Inventory item updated', tone: 'update' },
  INVENTORY_ITEM_DEACTIVATE: { label: 'Inventory item deactivated', tone: 'remove' },
  PROFILE_UPDATE: { label: 'Profile updated', tone: 'update' },
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'Employee',
  UserProfile: 'Profile',
  Product: 'Product',
  Category: 'Category',
  InventoryItem: 'Inventory',
};

// Ang mga field na ito lang ang ipinapakita sa "Change" column; hindi lahat ng laman ng JSON
const SUMMARY_KEYS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'group', label: 'Group' },
  { key: 'type', label: 'Type' },
  { key: 'unit', label: 'Unit' },
  { key: 'price', label: 'Price' },
  { key: 'size', label: 'Size' },
  { key: 'position', label: 'Position' },
  { key: 'shift', label: 'Shift' },
  { key: 'role', label: 'Role' },
  { key: 'job', label: 'Job' },
  { key: 'lowStockThreshold', label: 'Low stock at' },
  { key: 'reason', label: 'Reason' },
];

function getString(value: Prisma.JsonValue | null | undefined, keys: string[]): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return null;
}

/** Pangalan ng apektadong tao/bagay: `name` (Product/Category/InventoryItem) o buong pangalan mula sa profile (User) */
function subjectFromRecord(value: Prisma.JsonValue | null | undefined): string | null {
  const name = getString(value, ['name']);
  if (name) return name;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const profile = (value as Record<string, unknown>).profile;
    if (profile && typeof profile === 'object') {
      const firstName = getString(profile as Prisma.JsonValue, ['firstName']);
      const lastName = getString(profile as Prisma.JsonValue, ['lastName']);
      if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');
    }
    const username = getString(value, ['username']);
    if (username) return `@${username}`;
  }
  return null;
}

/** Maikling buod ng pagbabago, hal. "Price: 95 | Reason: promo" */
function summarize(value: Prisma.JsonValue | null | undefined): string {
  if (!value) return 'N/A';
  if (typeof value !== 'object' || Array.isArray(value)) return String(value);
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const { key, label } of SUMMARY_KEYS) {
    const v = record[key];
    if (v !== undefined && v !== null && v !== '') parts.push(`${label}: ${v}`);
  }
  return parts.length > 0 ? parts.join(' | ') : 'N/A';
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(limit = 20) {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { user: { select: { username: true, profile: { select: { firstName: true, lastName: true } } } } },
    });

    // Ang PRICE_* ay walang pangalan ng produkto sa before/after, kaya isang batch query lang
    const priceProductIds = [
      ...new Set(
        logs
          .filter((log) => log.entity === 'Product' && log.action.startsWith('PRICE_'))
          .map((log) => Number(log.entityId)),
      ),
    ];
    const priceProducts = priceProductIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: priceProductIds } }, select: { id: true, name: true } })
      : [];
    const priceProductNames = new Map(priceProducts.map((p) => [p.id, p.name]));

    return logs.map((log) => {
      const meta = ACTION_META[log.action] ?? { label: log.action, tone: 'update' as const };
      const actor = log.user?.profile
        ? `${log.user.profile.firstName} ${log.user.profile.lastName}`
        : (log.user?.username ?? 'System');

      let subject = subjectFromRecord(log.after) ?? subjectFromRecord(log.before);
      if (!subject && log.action.startsWith('PRICE_')) {
        subject = priceProductNames.get(Number(log.entityId)) ?? null;
      }

      return {
        id: log.id,
        action: log.action,
        label: meta.label,
        tone: meta.tone,
        entity: ENTITY_LABELS[log.entity] ?? log.entity,
        subject: subject ?? `#${log.entityId}`,
        change: summarize(log.after) !== 'N/A' ? summarize(log.after) : summarize(log.before),
        actor,
        createdAt: log.createdAt.toISOString(),
      };
    });
  }
}
