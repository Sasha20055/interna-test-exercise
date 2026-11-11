import { SearchSelect } from '../platform/search-select';
import styles from './payment-planner.module.css';
import { useState } from 'react';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import type { IPaymentPlannerConfig } from './payment-planner-params';

interface ISelectionProps {
  requested: number;
  effective: number;
  total: number;
  compact?: boolean;
  onChange: (value: number) => void;
}

export function PaymentSelection({
  requested,
  effective,
  total,
  compact,
  onChange,
}: ISelectionProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim() !== '') {
      const value = Number(draft);
      if (Number.isFinite(value)) onChange(Math.max(0, Math.round(value)));
    }
    setDraft(null);
  };
  return (
    <section
      className={styles['dash-payment-planner__selection']}
      aria-label="Выбор счетов"
    >
      <div className={styles['dash-payment-planner__selection-label']}>
        <strong>
          {effective} из {total} счетов
        </strong>
        {compact && (
          <span className={styles['dash-payment-planner__selection-percent']}>
            {total === 0 ? 0 : Math.round((effective / total) * 100)}%
          </span>
        )}
        {!compact && (
          <label>
            Счетов к оплате
            <input
              type="number"
              min="0"
              step="1"
              aria-label="Количество счетов"
              value={draft ?? requested}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') setDraft(null);
              }}
            />
          </label>
        )}
      </div>
      <input
        type="range"
        aria-label="Выбрать первые счета"
        min="0"
        max={total}
        step="1"
        value={effective}
        disabled={total === 0}
        onChange={(event) => {
          setDraft(null);
          onChange(Number(event.target.value));
        }}
      />
      {requested > total && (
        <small>
          Запрошено {requested}; доступно {total}.
        </small>
      )}
    </section>
  );
}

interface IFiltersProps {
  rows: readonly IProviderPaymentQueueRow[];
  config: IPaymentPlannerConfig;
  onProvider: (value: number | 'all') => void;
  onCycle: (value: number | 'all') => void;
  onCurrencies: (value: number[]) => void;
  onReset: () => void;
}

export function PaymentFilters({
  rows,
  config,
  onProvider,
  onCycle,
  onCurrencies,
  onReset,
}: IFiltersProps) {
  const providers = new Map(
    rows.map((row) => [row.provider_id, row.provider_name]),
  );
  const cycles = new Map(
    rows.map((row) => [row.billing_cycle_id, row.billing_cycle_name]),
  );
  const currencies = new Map(
    rows.map((row) => [row.provider_currency_id, row.provider_currency_name]),
  );
  const selectValue = (value: string) =>
    value === 'all' ? 'all' : Number(value);
  return (
    <div className={styles['dash-payment-planner__filters']}>
      <label>
        Поставщик
        <SearchSelect
          label="Поставщик"
          value={config.providerId}
          onValueChange={(value) => onProvider(selectValue(value))}
        >
          <option value="all">Все поставщики</option>
          {config.providerId !== 'all' && !providers.has(config.providerId) && (
            <option value={config.providerId}>
              Недоступный поставщик #{config.providerId}
            </option>
          )}
          {[...providers].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SearchSelect>
      </label>
      <label>
        Биллинговый цикл
        <SearchSelect
          label="Биллинговый цикл"
          value={config.billingCycleId}
          onValueChange={(value) => onCycle(selectValue(value))}
        >
          <option value="all">Все циклы</option>
          {config.billingCycleId !== 'all' &&
            !cycles.has(config.billingCycleId) && (
              <option value={config.billingCycleId}>
                Недоступный цикл #{config.billingCycleId}
              </option>
            )}
          {[...cycles].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SearchSelect>
      </label>
      <fieldset>
        <legend>
          Валюты <span>(не выбрано — все)</span>
        </legend>
        <div className={styles['dash-payment-planner__checks']}>
          {[...currencies].map(([id, name]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={config.currencyIds.includes(id)}
                onChange={() =>
                  onCurrencies(
                    config.currencyIds.includes(id)
                      ? config.currencyIds.filter((value) => value !== id)
                      : [...config.currencyIds, id],
                  )
                }
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className={styles['dash-payment-planner__text-button']}
        onClick={onReset}
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
