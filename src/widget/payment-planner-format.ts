import { formatValue } from '../platform/value-format';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import type { TAmountFormat } from './payment-planner-params';

export function formatPaymentAmount(
  amount: number,
  format: TAmountFormat,
): string {
  return format === 'plain'
    ? amount.toFixed(2)
    : formatValue(amount, 'decimal');
}

export function invoiceKey(row: IProviderPaymentQueueRow): string {
  return `${row.provider_id}:${row.provider_bill_id}`;
}

export function formatInvoiceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Дата не указана';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  format: TAmountFormat,
  compact = false,
): string {
  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const value =
    compact && format === 'grouped' && Number.isInteger(amount)
      ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
          amount,
        )
      : formatPaymentAmount(amount, format);
  return `${value} ${symbols[currency] ?? currency}`;
}

export function formatBillCount(count: number): string {
  const forms: Record<string, string> = {
    one: 'счёт',
    few: 'счёта',
    many: 'счетов',
    other: 'счёта',
  };
  return `${count} ${forms[new Intl.PluralRules('ru-RU').select(count)]}`;
}
