import { describe, expect, it } from 'vitest';
import {
  formatInvoiceDate,
  formatCurrencyAmount,
  formatBillCount,
  formatPaymentAmount,
} from './payment-planner-format';

describe('payment display formatting', () => {
  it('uses two decimal places and no grouping in plain mode', () => {
    expect(formatPaymentAmount(1248500, 'plain')).toBe('1248500.00');
    expect(formatPaymentAmount(0.1 + 0.2, 'plain')).toBe('0.30');
  });
  it('uses Russian grouping and decimal separators in grouped mode', () => {
    expect(formatPaymentAmount(1248500, 'grouped').replace(/\s/g, ' ')).toBe(
      '1 248 500,00',
    );
  });
  it('formats source dates consistently without local timezone shifts', () => {
    expect(formatInvoiceDate('2026-10-02')).toBe('02.10.2026');
    expect(formatInvoiceDate('invalid')).toBe('Дата не указана');
  });
  it('keeps currency identity and fractional precision in compact amounts', () => {
    expect(
      formatCurrencyAmount(1248500, 'RUB', 'grouped', true).replace(/\s/g, ' '),
    ).toBe('1 248 500 ₽');
    expect(
      formatCurrencyAmount(12.34, 'EUR', 'grouped', true).replace(/\s/g, ' '),
    ).toBe('12,34 €');
    expect(formatCurrencyAmount(12, 'GBP', 'plain', true)).toBe('12.00 £');
    expect(formatCurrencyAmount(12, 'CHF', 'plain')).toBe('12.00 CHF');
    expect([1, 2, 5, 21].map(formatBillCount)).toEqual([
      '1 счёт',
      '2 счёта',
      '5 счетов',
      '21 счёт',
    ]);
  });
});
