import { toFiniteNumber } from '../platform/to-finite-number';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import type { IPaymentPlannerConfig } from './payment-planner-params';

/** Processed invoice row in the sorted queue. */
export interface IQueueBillItem {
  /** 1-based position in the filtered & sorted queue. */
  queuePosition: number;
  row: IProviderPaymentQueueRow;
  /** Numeric `payment_rank` (`null` if missing/invalid). */
  rank: number | null;
  /** Numeric `provider_total_due` (`null` if missing or `<= 0`). */
  providerAmount: number | null;
  /** `true` when `provider_total_due` is `null`, `<= 0`, or non-numeric. */
  hasInvalidAmount: boolean;
  /** `true` when `queuePosition <= effectiveSelectedCount`. */
  selected: boolean;
  /** Numeric `customer_total_due` (`null` if absent or non-numeric). */
  customerAmount: number | null;
  /** `true` when both `customer_bill_no` (non-empty) and a valid `customerAmount` are present. */
  hasCustomerBill: boolean;
}

/** Aggregated payment sum for a single currency across selected valid bills. */
export interface ICurrencyTotal {
  currencyId: number;
  currencyName: string;
  /** Total amount of selected valid bills in this currency. */
  totalAmount: number;
  /** Number of selected valid bills in this currency. */
  billCount: number;
  /** Number of unique providers in this currency among selected valid bills. */
  providerCount: number;
}

/** Per-provider payment share within a specific currency across selected valid bills. */
export interface IProviderCurrencyBreakdownItem {
  providerId: number;
  providerName: string;
  currencyId: number;
  currencyName: string;
  billCount: number;
  totalAmount: number;
  /** Share (`0..100`) of this provider's `totalAmount` within `currencyTotal.totalAmount`. */
  sharePercent: number;
}

/** Interactive UI overrides inside the widget (slider override, quick filter overrides). */
export interface IPaymentPlannerRuntimeState {
  selectedCountOverride?: number;
}

export interface IPaymentPlanResult {
  /** Total bills in the filtered queue. */
  totalQueueCount: number;
  /** Clamped number of selected bills: `Math.min(Math.max(0, selectedCount), totalQueueCount)`. */
  effectiveSelectedCount: number;
  /** Number of unique providers across valid selected bills. */
  selectedProviderCount: number;
  /** Count of selected bills that have `hasInvalidAmount === true` (excluded from sums). */
  invalidSelectedCount: number;
  /** Totals per currency for selected valid bills (never summing across currencies). */
  currencyTotals: ICurrencyTotal[];
  /** Provider breakdown per currency for selected valid bills, sorted by `totalAmount` descending. */
  providerBreakdown: IProviderCurrencyBreakdownItem[];
  /** Full filtered and sorted queue. */
  queueItems: IQueueBillItem[];
  /** Queue sliced to `config.rowLimit` for table display. */
  visibleQueueItems: IQueueBillItem[];
}

/**
 * Pure computation of the provider payment plan from `provider-payment-queue` rows.
 *
 * Must NOT depend on React or DOM APIs.
 *
 * Key domain rules:
 * 1. Scope filters (`providerId`, `billingCycleId`, `currencyIds`) are applied BEFORE sorting and selecting
 *    the first `selectedCount` bills.
 * 2. Sorting order:
 *    - `payment_rank` ascending (valid finite ranks first; missing/invalid ranks last),
 *    - `provider_bill_id` ascending as tie-breaker (since Enigma partitions `payment_rank` by `provider_id`),
 *    - original array index (stable order).
 * 3. Selection: `effectiveSelectedCount = Math.min(Math.max(0, selectedCount), filteredQueue.length)`.
 *    The first `effectiveSelectedCount` items in the sorted queue have `selected = true`.
 * 4. Invalid amounts: if `toFiniteNumber(row.provider_total_due)` is `null` or `<= 0`, mark
 *    `hasInvalidAmount = true`. Never treat invalid amounts as `0` in aggregates — exclude them from
 *    `currencyTotals` and `providerBreakdown` and increment `invalidSelectedCount` when selected.
 * 5. Never sum amounts across different currencies.
 */
export function computePaymentPlan(
  rows: readonly IProviderPaymentQueueRow[],
  config: IPaymentPlannerConfig,
  runtimeState?: IPaymentPlannerRuntimeState,
): IPaymentPlanResult {
  const filtered = rows
    .map((row, index) => ({
      row,
      index,
      rank: toFiniteNumber(row.payment_rank),
    }))
    .filter(
      ({ row }) =>
        (config.providerId === 'all' ||
          row.provider_id === config.providerId) &&
        (config.billingCycleId === 'all' ||
          row.billing_cycle_id === config.billingCycleId) &&
        (config.currencyIds.length === 0 ||
          config.currencyIds.includes(row.provider_currency_id)),
    )
    .sort((a, b) => {
      if (a.rank === null && b.rank !== null) return 1;
      if (a.rank !== null && b.rank === null) return -1;
      return (
        (a.rank !== null && b.rank !== null ? a.rank - b.rank : 0) ||
        a.row.provider_bill_id - b.row.provider_bill_id ||
        a.index - b.index
      );
    });
  const override = runtimeState?.selectedCountOverride;
  const requested =
    typeof override === 'number' && Number.isFinite(override)
      ? override
      : config.selectedCount;
  const effectiveSelectedCount = Math.min(
    Math.max(0, Math.round(requested)),
    filtered.length,
  );
  const queueItems: IQueueBillItem[] = filtered.map(({ row, rank }, index) => {
    const amount = toFiniteNumber(row.provider_total_due);
    const providerAmount = amount !== null && amount > 0 ? amount : null;
    const customerAmount = toFiniteNumber(row.customer_total_due);
    return {
      row,
      rank,
      queuePosition: index + 1,
      providerAmount,
      customerAmount,
      hasInvalidAmount: providerAmount === null,
      selected: index < effectiveSelectedCount,
      hasCustomerBill:
        Boolean(row.customer_bill_no?.trim()) && customerAmount !== null,
    };
  });
  const currencies = new Map<number, ICurrencyTotal>();
  const providersByCurrency = new Map<number, Set<number>>();
  const breakdown = new Map<string, IProviderCurrencyBreakdownItem>();
  const selectedProviders = new Set<number>();
  let invalidSelectedCount = 0;
  for (const item of queueItems) {
    if (!item.selected) continue;
    if (item.providerAmount === null) {
      invalidSelectedCount++;
      continue;
    }
    const { row, providerAmount } = item;
    const currencyId = row.provider_currency_id;
    const currency = currencies.get(currencyId) ?? {
      currencyId,
      currencyName: row.provider_currency_name,
      totalAmount: 0,
      billCount: 0,
      providerCount: 0,
    };
    const providerIds =
      providersByCurrency.get(currencyId) ?? new Set<number>();
    providerIds.add(row.provider_id);
    providersByCurrency.set(currencyId, providerIds);
    selectedProviders.add(row.provider_id);
    currency.totalAmount += providerAmount;
    currency.billCount++;
    currency.providerCount = providerIds.size;
    currencies.set(currencyId, currency);
    const key = `${row.provider_id}:${currencyId}`;
    const provider = breakdown.get(key) ?? {
      providerId: row.provider_id,
      providerName: row.provider_name,
      currencyId,
      currencyName: row.provider_currency_name,
      totalAmount: 0,
      billCount: 0,
      sharePercent: 0,
    };
    provider.totalAmount += providerAmount;
    provider.billCount++;
    breakdown.set(key, provider);
  }
  const providerBreakdown = [...breakdown.values()]
    .map((provider) => ({
      ...provider,
      sharePercent:
        (provider.totalAmount /
          (currencies.get(provider.currencyId)?.totalAmount ??
            provider.totalAmount)) *
        100,
    }))
    .sort(
      (a, b) =>
        b.totalAmount - a.totalAmount ||
        a.currencyId - b.currencyId ||
        a.providerId - b.providerId,
    );
  return {
    totalQueueCount: queueItems.length,
    effectiveSelectedCount,
    selectedProviderCount: selectedProviders.size,
    invalidSelectedCount,
    currencyTotals: [...currencies.values()].sort(
      (a, b) => a.currencyId - b.currencyId,
    ),
    providerBreakdown,
    queueItems,
    visibleQueueItems: queueItems.slice(0, config.rowLimit),
  };
}

export function getOldestSelectedInvoiceDate(
  items: readonly IQueueBillItem[],
): string | null {
  return items.reduce<string | null>((oldest, item) => {
    const value = item.row.provider_recv_date;
    const timestamp = Date.parse(value);
    return item.selected &&
      Number.isFinite(timestamp) &&
      (oldest === null || timestamp < Date.parse(oldest))
      ? value
      : oldest;
  }, null);
}
