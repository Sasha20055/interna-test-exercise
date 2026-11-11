import { describe, expect, it } from 'vitest';
import fixture from '../data/mock-payment-queue.json';
import { computePaymentPlan } from './payment-planner-compute';
import { parsePaymentPlannerParams } from './payment-planner-params';
import { sortQueueTable } from './payment-planner-table-sort';

const items = computePaymentPlan(
  fixture,
  parsePaymentPlannerParams({ selectedCount: 14 }),
).queueItems;

describe('queue presentation sorting', () => {
  it('sorts all amounts numerically in both directions with invalid amounts last', () => {
    for (const direction of ['ascending', 'descending'] as const) {
      const result = sortQueueTable(items, { column: 'amount', direction });
      const amounts = result.flatMap((item) =>
        item.providerAmount === null ? [] : [item.providerAmount],
      );
      expect(
        amounts.every(
          (value, index) =>
            index === 0 ||
            (direction === 'ascending'
              ? value >= amounts[index - 1]
              : value <= amounts[index - 1]),
        ),
      ).toBe(true);
      expect(
        result
          .slice(-items.filter((item) => item.providerAmount === null).length)
          .every((item) => item.providerAmount === null),
      ).toBe(true);
    }
  });
  it('sorts dates and natural text while keeping selection and source order intact', () => {
    const original = items.map((item) => ({
      position: item.queuePosition,
      selected: item.selected,
    }));
    expect(
      sortQueueTable(items, { column: 'date', direction: 'descending' })[0].row
        .provider_recv_date,
    ).toBe('2026-10-20');
    const result = sortQueueTable(items, {
      column: 'provider',
      direction: 'ascending',
    });
    expect(result[0].row.provider_name).toBe('Inmarsat Global Ltd');
    expect(
      items.map((item) => ({
        position: item.queuePosition,
        selected: item.selected,
      })),
    ).toEqual(original);
    expect(result.filter((item) => item.selected)).toHaveLength(14);
    expect(
      sortQueueTable(items, { column: 'position', direction: 'descending' })[0]
        .queuePosition,
    ).toBe(32);
  });
});
