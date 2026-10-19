/**
 * Discount code lookups and checks shared by /api/discounts and /api/orders.
 */
import { Models, Query } from 'node-appwrite';
import { DiscountRule } from '@clapculture/shared';
import { getAppwriteClient } from './appwrite';
import { cached, invalidate } from './cache';

export type DiscountDoc = Models.Document & Record<string, unknown>;

const getDbId = () => process.env.APPWRITE_DATABASE_ID || 'clapculture_db';

// Attributes of the live `discounts` collection. Anything else in a request
// body (e.g. the admin page's old `isActive`) made Appwrite reject the save.
const WRITABLE_FIELDS = ['code', 'type', 'value', 'minOrder', 'expiry', 'usageLimit', 'usageCount', 'active'] as const;

export function normalizeCode(code: unknown): string {
  return String(code || '').trim().toUpperCase().slice(0, 100);
}

export function pickDiscountFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    const value = body[field];
    switch (field) {
      case 'code':
        data.code = normalizeCode(value);
        break;
      case 'value':
        data.value = Number(value) || 0;
        break;
      case 'minOrder':
        data.minOrder = value === null || value === '' ? null : Number(value) || 0;
        break;
      case 'usageLimit':
      case 'usageCount':
        data[field] = value === null || value === '' ? null : Math.max(0, Math.floor(Number(value) || 0));
        break;
      case 'active':
        data.active = Boolean(value);
        break;
      default:
        data[field] = String(value ?? '');
    }
  }
  return data;
}

/** Active discount with this code, or null. Cached until the next discount write. */
export function getDiscountByCode(code: string): Promise<DiscountDoc | null> {
  const clean = normalizeCode(code);
  if (!clean) return Promise.resolve(null);
  return cached('discounts', `code:${clean}`, 300, async () => {
    const { databases } = getAppwriteClient();
    const response = await databases.listDocuments(getDbId(), 'discounts', [
      Query.equal('code', clean),
      Query.equal('active', true),
      Query.limit(1),
    ]);
    return (response.documents[0] as DiscountDoc | undefined) || null;
  });
}

function expiryTime(expiry: string): number {
  // A date picked in the admin (YYYY-MM-DD) is valid through the end of that day in India.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? `${expiry}T23:59:59+05:30` : expiry;
  return new Date(value).getTime();
}

/** Why a discount can't be used right now, or null when it can. */
export function discountUnavailableReason(discount: DiscountDoc | null): string | null {
  if (!discount) return 'Invalid discount code';
  if (typeof discount.expiry === 'string' && discount.expiry && expiryTime(discount.expiry) < Date.now()) {
    return 'Discount code expired';
  }
  if (discount.usageLimit && Number(discount.usageCount) >= Number(discount.usageLimit)) {
    return 'Discount usage limit reached';
  }
  return null;
}

export function toDiscountRule(discount: DiscountDoc): DiscountRule {
  return {
    code: String(discount.code),
    type: String(discount.type),
    value: Number(discount.value) || 0,
    minOrder: discount.minOrder === null || discount.minOrder === undefined ? null : Number(discount.minOrder),
  };
}

/** Count one use of a discount (read-modify-write; fine at this store's order volume). */
export async function incrementDiscountUsage(discountId: string): Promise<void> {
  const { databases } = getAppwriteClient();
  const current = await databases.getDocument(getDbId(), 'discounts', discountId);
  await databases.updateDocument(getDbId(), 'discounts', discountId, {
    usageCount: (Number(current.usageCount) || 0) + 1,
  });
  await invalidate('discounts');
}
