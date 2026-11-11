import { SearchSelect } from '../platform/search-select';
import styles from './payment-planner.module.css';
import type { CSSProperties } from 'react';
import type { IPaymentPlanResult } from './payment-planner-compute';
import type { TAmountFormat } from './payment-planner-params';
import { formatCurrencyAmount } from './payment-planner-format';

const COLORS = [
  'green',
  'magenta',
  'orange',
  'blue',
  'violet',
  'aqua',
  'yellow',
];
function color(providerId: number) {
  return `var(--chart-${COLORS[Math.abs(Math.trunc(providerId)) % COLORS.length]})`;
}

interface IBreakdownProps {
  plan: IPaymentPlanResult;
  format: TAmountFormat;
  currencyId: number | null;
  onCurrency: (id: number) => void;
  compact?: boolean;
}

export function ProviderBreakdown({
  plan,
  format,
  currencyId,
  onCurrency,
  compact,
}: IBreakdownProps) {
  const currency =
    plan.currencyTotals.find((item) => item.currencyId === currencyId) ??
    plan.currencyTotals[0];
  const providers = plan.providerBreakdown.filter(
    (item) => item.currencyId === currency?.currencyId,
  );
  return (
    <section
      className={styles['dash-payment-planner__panel']}
      data-compact={Boolean(compact)}
      aria-label="Распределение по поставщикам"
    >
      <div className={styles['dash-payment-planner__panel-heading']}>
        <h3>{compact ? 'Доли поставщиков' : 'По поставщикам'}</h3>
        {currency && (
          <label>
            <span className={styles['dash-payment-planner__sr-only']}>
              Валюта распределения
            </span>
            <SearchSelect
              label="Валюта распределения"
              value={currency.currencyId}
              onValueChange={(value) => onCurrency(Number(value))}
            >
              {plan.currencyTotals.map((item) => (
                <option key={item.currencyId} value={item.currencyId}>
                  {item.currencyName}
                </option>
              ))}
            </SearchSelect>
          </label>
        )}
      </div>
      {!currency ? (
        <p className={styles['dash-payment-planner__muted']}>
          Нет данных для распределения.
        </p>
      ) : (
        <>
          <div
            className={styles['dash-payment-planner__bar']}
            aria-hidden="true"
          >
            {providers.map((provider) => (
              <span
                key={provider.providerId}
                style={{
                  width: `${provider.sharePercent}%`,
                  background: color(provider.providerId),
                }}
              />
            ))}
          </div>
          <ul
            className={`${styles['dash-payment-planner__providers']} ${compact ? styles['dash-payment-planner__providers--compact'] : ''}`}
          >
            {providers.map((provider) => (
              <li
                key={provider.providerId}
                style={
                  {
                    '--provider-color': color(provider.providerId),
                  } as CSSProperties
                }
              >
                <span title={provider.providerName}>
                  {provider.providerName} <small>({provider.billCount})</small>
                </span>
                <strong>
                  {!compact &&
                    `${formatCurrencyAmount(provider.totalAmount, provider.currencyName, format)} · `}
                  {provider.sharePercent.toFixed(1)}%
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
