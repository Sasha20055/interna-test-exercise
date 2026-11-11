import { describe, expect, it } from 'vitest';
import fixture from '../data/mock-payment-queue.json';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import {
  computePaymentPlan,
  getOldestSelectedInvoiceDate,
} from './payment-planner-compute';
import { parsePaymentPlannerParams } from './payment-planner-params';

const row = (
  overrides: Partial<IProviderPaymentQueueRow> = {},
): IProviderPaymentQueueRow => ({ ...fixture[0], ...overrides });
const compute = (
  rows: readonly IProviderPaymentQueueRow[],
  params: Record<string, unknown> = {},
) => computePaymentPlan(rows, parsePaymentPlannerParams(params));

describe('payment plan invariants', () => {
  it.each([
    [14, 0, { RUB: 1248500, USD: 103500, EUR: 12600, GBP: 11000 }],
    [20, 2, { RUB: 1622500, USD: 125500, EUR: 22200, GBP: 11000 }],
  ] as const)(
    'matches fixture checkpoint N=%s',
    (selectedCount, invalid, amounts) => {
      const plan = compute(fixture, { selectedCount });
      expect(
        Object.fromEntries(
          plan.currencyTotals.map((c) => [c.currencyName, c.totalAmount]),
        ),
      ).toEqual(amounts);
      expect(plan.invalidSelectedCount).toBe(invalid);
      expect(plan.selectedProviderCount).toBe(6);
      for (const c of plan.currencyTotals) {
        expect(
          plan.providerBreakdown
            .filter((p) => p.currencyId === c.currencyId)
            .reduce((sum, p) => sum + p.sharePercent, 0),
        ).toBeCloseTo(100);
      }
    },
  );
  it('sorts invalid ranks last and resolves ties stably without mutation', () => {
    const input = Object.freeze(
      [
        row({ payment_rank: null, provider_bill_id: 1 }),
        row({
          payment_rank: '2',
          provider_bill_id: 4,
          provider_bill_no: 'first',
        }),
        row({
          payment_rank: 2,
          provider_bill_id: 4,
          provider_bill_no: 'second',
        }),
        row({ payment_rank: 'bad', provider_bill_id: 0 }),
        row({ payment_rank: 1, provider_bill_id: 9 }),
        row({ payment_rank: Infinity, provider_bill_id: 2 }),
      ].map((r) => Object.freeze(r)),
    );
    const before = structuredClone(input);
    const result = compute(input);
    expect(result.queueItems.map((i) => i.row.provider_bill_id)).toEqual([
      9, 4, 4, 0, 1, 2,
    ]);
    expect(
      result.queueItems.slice(1, 3).map((i) => i.row.provider_bill_no),
    ).toEqual(['first', 'second']);
    expect(input).toEqual(before);
  });
  it.each([null, 0, -1, '', 'bad', NaN, Infinity])(
    'keeps invalid amount %s in the selected slice',
    (amount) => {
      const plan = compute(
        [row({ provider_total_due: amount }), row({ provider_bill_id: 99999 })],
        { selectedCount: 1 },
      );
      expect(plan.effectiveSelectedCount).toBe(1);
      expect(plan.invalidSelectedCount).toBe(1);
      expect(plan.queueItems[0]).toMatchObject({
        selected: true,
        hasInvalidAmount: true,
        providerAmount: null,
      });
      expect(plan.currencyTotals).toEqual([]);
      expect(plan.providerBreakdown).toEqual([]);
      expect(plan.selectedProviderCount).toBe(0);
    },
  );
  it('combines filters before selection', () => {
    const target = fixture[8];
    const params = {
      providerId: target.provider_id,
      billingCycleId: target.billing_cycle_id,
      currencyIds: [target.provider_currency_id],
      selectedCount: 100,
    };
    const expected = fixture.filter(
      (r) =>
        r.provider_id === params.providerId &&
        r.billing_cycle_id === params.billingCycleId &&
        params.currencyIds.includes(r.provider_currency_id),
    );
    const plan = compute(fixture, params);
    expect(plan.totalQueueCount).toBe(expected.length);
    expect(plan.effectiveSelectedCount).toBe(expected.length);
  });
  it('keeps currencies and providers separate with fractional source strings', () => {
    const plan = compute([
      row({
        provider_total_due: '0.1',
        provider_currency_id: 1,
        provider_id: 1,
      }),
      row({
        provider_total_due: '0.2',
        provider_currency_id: 1,
        provider_id: 2,
      }),
      row({
        provider_total_due: '0.7',
        provider_currency_id: 2,
        provider_id: 1,
      }),
    ]);
    expect(plan.currencyTotals[0].totalAmount).toBeCloseTo(0.3);
    expect(plan.currencyTotals[0].providerCount).toBe(2);
    expect(plan.currencyTotals[1].totalAmount).toBe(0.7);
    expect(plan.selectedProviderCount).toBe(2);
    expect(plan.providerBreakdown).toHaveLength(3);
  });
  it('does not let display limits alter the plan', () => {
    const short = compute(fixture, { selectedCount: 30, rowLimit: 10 });
    const long = compute(fixture, { selectedCount: 30, rowLimit: 100 });
    expect(short.visibleQueueItems).toHaveLength(10);
    expect(long.visibleQueueItems).toHaveLength(fixture.length);
    expect(short.currencyTotals).toEqual(long.currencyTotals);
    expect(short.queueItems).toEqual(long.queueItems);
  });
  it.each([
    [0, 0],
    [-2, 0],
    [1.6, 2],
    [100, fixture.length],
    [NaN, 10],
    [Infinity, 10],
  ])('normalizes override %s to %s', (override, expected) => {
    const plan = computePaymentPlan(
      fixture,
      parsePaymentPlannerParams(undefined),
      { selectedCountOverride: override },
    );
    expect(plan.effectiveSelectedCount).toBe(expected);
    expect(plan.queueItems.filter((i) => i.selected)).toHaveLength(expected);
  });
  it.each([
    [0, 'C', true],
    [-1, 'C', true],
    [' 2 ', 'C', true],
    [null, 'C', false],
    ['bad', 'C', false],
    [1, ' ', false],
  ] as const)(
    'checks customer amount %s and number %s',
    (amount, number, expected) => {
      expect(
        compute([row({ customer_total_due: amount, customer_bill_no: number })])
          .queueItems[0].hasCustomerBill,
      ).toBe(expected);
    },
  );
  it('handles empty input and zero selection', () => {
    expect(compute([]).queueItems).toEqual([]);
    const plan = compute(fixture, { selectedCount: 0 });
    expect(plan.currencyTotals).toEqual([]);
    expect(plan.effectiveSelectedCount).toBe(0);
    expect(plan.totalQueueCount).toBe(fixture.length);
  });
  it('finds the oldest selected invoice independently of rank and skips invalid dates', () => {
    const rows = [
      row({
        provider_bill_id: 1,
        payment_rank: 1,
        provider_recv_date: '2026-10-10',
      }),
      row({
        provider_bill_id: 2,
        payment_rank: 2,
        provider_recv_date: '2026-10-02',
      }),
      row({
        provider_bill_id: 3,
        payment_rank: 3,
        provider_recv_date: 'invalid',
      }),
      row({
        provider_bill_id: 4,
        payment_rank: 4,
        provider_recv_date: '2025-01-01',
      }),
    ];
    expect(
      getOldestSelectedInvoiceDate(
        compute(rows, { selectedCount: 3 }).queueItems,
      ),
    ).toBe('2026-10-02');
    expect(
      getOldestSelectedInvoiceDate(
        compute(rows, { selectedCount: 0 }).queueItems,
      ),
    ).toBeNull();
    expect(getOldestSelectedInvoiceDate([])).toBeNull();
  });
});
