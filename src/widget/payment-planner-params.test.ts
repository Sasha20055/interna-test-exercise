import { describe, expect, it } from 'vitest';
import { parsePaymentPlannerParams as parse } from './payment-planner-params';

describe('defensive parameters', () => {
  it('trims text and falls back to the legacy title', () => {
    expect(
      parse({ description: ' ', title: ' Plan ', subtitle: ' Queue ' }),
    ).toMatchObject({ description: 'Plan', subtitle: 'Queue' });
  });
  it.each([NaN, Infinity, '14', null, {}, true])(
    'rejects malformed numeric parameters %s',
    (value) => {
      expect(
        parse({
          selectedCount: value,
          providerId: value,
          billingCycleId: value,
        }),
      ).toMatchObject({
        selectedCount: 10,
        providerId: 'all',
        billingCycleId: 'all',
      });
    },
  );
  it('rounds counts and deduplicates finite currency IDs', () => {
    expect(
      parse({
        selectedCount: 2.6,
        currencyIds: [3, 1, 3, NaN, Infinity, '2', null],
      }),
    ).toMatchObject({ selectedCount: 3, currencyIds: [3, 1] });
  });
  it.each([10, 25, 50, 100])('accepts row limit %s and its alias', (limit) => {
    expect(parse({ rowLimit: limit }).rowLimit).toBe(limit);
    expect(parse({ maxRows: limit }).rowLimit).toBe(limit);
  });
  it('uses nullish alias precedence, not truthiness', () => {
    expect(parse({ rowLimit: null, maxRows: 25 }).rowLimit).toBe(25);
    expect(parse({ rowLimit: 0, maxRows: 25 }).rowLimit).toBe(10);
    expect(parse({ rowLimit: 50, maxRows: 25 }).rowLimit).toBe(50);
  });
  it('validates enums and strict booleans', () => {
    expect(
      parse({
        size: 'large',
        amountFormat: 'currency',
        showSummary: 'false',
        showCustomerBills: 0,
        showProviderBreakdown: false,
      }),
    ).toMatchObject({
      size: 'full',
      amountFormat: 'grouped',
      showSummary: true,
      showCustomerBills: true,
      showProviderBreakdown: false,
    });
    expect(
      parse({
        size: 'quarter',
        amountFormat: 'plain',
        providerId: -1,
        billingCycleId: 0,
      }),
    ).toMatchObject({
      size: 'quarter',
      amountFormat: 'plain',
      providerId: -1,
      billingCycleId: 0,
    });
  });
});
