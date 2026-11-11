import type { TWidgetSize } from '../platform/widget-types';
import styles from './payment-planner.module.css';
import { useId, useState } from 'react';
import type { IPaymentPlanResult } from './payment-planner-compute';
import type { TAmountFormat } from './payment-planner-params';
import {
  formatCurrencyAmount,
  formatBillCount,
} from './payment-planner-format';

export function PaymentStatistics({ plan }: { plan: IPaymentPlanResult }) {
  return (
    <div className={styles['dash-payment-planner__statistics']}>
      <div>
        <strong>{plan.totalQueueCount}</strong>
        <span>счетов в очереди</span>
      </div>
      <div className={styles['dash-payment-planner__selected-stat']}>
        <strong>{plan.effectiveSelectedCount}</strong>
        <span>выбрано к оплате</span>
      </div>
      <div>
        <strong>{plan.selectedProviderCount}</strong>
        <span>поставщиков</span>
      </div>
    </div>
  );
}

export function CurrencySummary({
  plan,
  format,
  size = 'full',
}: {
  plan: IPaymentPlanResult;
  format: TAmountFormat;
  size?: TWidgetSize;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const compact = size === 'quarter';
  const priority: Record<string, number> = { RUB: 0, USD: 1, EUR: 2, GBP: 3 };
  const currencies = [...plan.currencyTotals].sort(
    (a, b) =>
      (priority[a.currencyName] ?? 4) - (priority[b.currencyName] ?? 4) ||
      a.currencyId - b.currencyId,
  );
  const visible = compact && !expanded ? currencies.slice(0, 2) : currencies;
  const remaining = Math.max(0, plan.currencyTotals.length - 2);
  return (
    <section
      className={`${styles['dash-payment-planner__panel']} ${styles['dash-payment-planner__currency-summary']}`}
      data-summary-size={size}
      aria-label="Суммы по валютам"
    >
      <h3>
        {compact
          ? `Валют в плане: ${currencies.length}`
          : 'Сумма к оплате по валютам'}
      </h3>
      {plan.currencyTotals.length === 0 ? (
        <p className={styles['dash-payment-planner__muted']}>
          {plan.effectiveSelectedCount === 0
            ? 'Выберите счета для расчёта.'
            : 'Нет корректных сумм для расчёта.'}
        </p>
      ) : (
        <dl className={styles['dash-payment-planner__currencies']} id={id}>
          {visible.map((currency) => (
            <div key={currency.currencyId}>
              <dt>{currency.currencyName}</dt>
              <dd>
                <strong title={formatBillCount(currency.billCount)}>
                  {formatCurrencyAmount(
                    currency.totalAmount,
                    currency.currencyName,
                    format,
                    compact,
                  )}
                </strong>
                {size === 'half' && (
                  <small>{formatBillCount(currency.billCount)}</small>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {compact && remaining > 0 && (
        <button
          className={styles['dash-payment-planner__action']}
          type="button"
          aria-label={
            expanded ? 'Свернуть валюты' : `+ ещё ${remaining} валюты`
          }
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Свернуть валюты' : `+ ещё ${remaining} валюты`}
          {!expanded && (
            <span aria-hidden="true">
              {' '}
              (
              {currencies
                .slice(2)
                .map((currency) => currency.currencyName)
                .join(', ')}
              )
            </span>
          )}
        </button>
      )}
    </section>
  );
}
