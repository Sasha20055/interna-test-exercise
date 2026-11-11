import { SearchSelect } from '../platform/search-select';
import { ModalDialog } from '../platform/modal-dialog';
import styles from './sandbox.module.css';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import mockQueue from '../data/mock-payment-queue.json';
import {
  WIDGET_ROW_LIMITS,
  type ICollectionDataResult,
  type TWidgetRowLimit,
  type TWidgetSize,
} from '../platform/widget-types';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import { PaymentPlannerWidget } from '../widget/payment-planner';
import {
  AMOUNT_FORMATS,
  type TAmountFormat,
} from '../widget/payment-planner-params';

const DATA_MODES = [
  'ready',
  'stale',
  'refreshing',
  'refresh-error',
  'loading',
  'empty',
  'error',
] as const;
const DATA_MODE_STORAGE_KEY = 'payment-planner-data-mode';

const VIEW_SIZES = ['full', 'half', 'third', 'quarter', 'all'] as const;
const THEMES = ['light', 'dark'] as const;

function readPreference<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): T {
  try {
    const saved = localStorage.getItem(key);
    return options.find((option) => option === saved) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

const PARAMETER_REFERENCE = [
  ['selectedCount', 'number ≥ 0 (по умолчанию 10)'],
  ['currencyIds', 'number[] ([] — все)'],
  ['providerId', "number | 'all' (по умолчанию 'all')"],
  ['billingCycleId', "number | 'all' (по умолчанию 'all')"],
  ['amountFormat', "'grouped' | 'plain'"],
  ['rowLimit', '10 | 25 | 50 | 100 (по умолчанию 10)'],
  ['showCustomerBills', 'boolean (по умолчанию true)'],
  ['showProviderBreakdown', 'boolean (по умолчанию true)'],
  ['showSummary', 'boolean (по умолчанию true)'],
  ['size', "'full' | 'half' | 'third' | 'quarter'"],
] as const;

const SIZE_TITLES: Record<TWidgetSize, string> = {
  full: 'Provider Payment Planner',
  half: 'План платежей',
  third: 'К оплате',
  quarter: 'Платежи',
};

const SIZE_LABELS: Record<TWidgetSize, string> = {
  full: 'XL · full (4×2 — ~880px)',
  half: 'L · half (3×2 — ~600px)',
  third: 'M · third (2×2 — ~400px)',
  quarter: 'S · quarter (1×2 — ~240px)',
};

const rows: readonly IProviderPaymentQueueRow[] = mockQueue;

export function SandboxApp(): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    readPreference(
      'payment-planner-theme',
      THEMES,
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
    ),
  );
  const [viewSize, setViewSize] = useState(() =>
    readPreference('payment-planner-view-size', VIEW_SIZES, 'full'),
  );
  const [dataMode, setDataMode] = useState(() =>
    readPreference(DATA_MODE_STORAGE_KEY, DATA_MODES, 'ready'),
  );

  const [description, setDescription] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [selectedCount, setSelectedCount] = useState(14);
  const [currencyIds, setCurrencyIds] = useState<number[]>([]);
  const [providerId, setProviderId] = useState<number | 'all'>('all');
  const [billingCycleId, setBillingCycleId] = useState<number | 'all'>('all');
  const [amountFormat, setAmountFormat] = useState<TAmountFormat>('grouped');
  const [rowLimit, setRowLimit] = useState<TWidgetRowLimit>(10);
  const [showCustomerBills, setShowCustomerBills] = useState(true);
  const [showProviderBreakdown, setShowProviderBreakdown] = useState(true);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const providers = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.provider_id, r.provider_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const currencies = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.provider_currency_id, r.provider_currency_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const billingCycles = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.billing_cycle_id, r.billing_cycle_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const dataEnvelope = useMemo<
    ICollectionDataResult<IProviderPaymentQueueRow>
  >(() => {
    switch (dataMode) {
      case 'loading':
        return {
          items: [],
          loading: true,
          loaded: false,
          error: null,
          stale: false,
          lastSuccessAt: null,
        };
      case 'refreshing':
        return {
          items: rows,
          loading: true,
          loaded: true,
          error: null,
          stale: false,
          lastSuccessAt: '2026-10-24T10:15:00Z',
        };
      case 'refresh-error':
        return {
          items: rows,
          loading: false,
          loaded: true,
          error: 'Enigma API request timed out',
          stale: true,
          lastSuccessAt: '2026-10-24T10:15:00Z',
        };
      case 'stale':
        return {
          items: rows,
          loading: false,
          loaded: true,
          error: null,
          stale: true,
          lastSuccessAt: '2026-10-24T08:40:00Z',
        };
      case 'empty':
        return {
          items: [],
          loading: false,
          loaded: true,
          error: null,
          stale: false,
          lastSuccessAt: '2026-10-24T10:15:00Z',
        };
      case 'error':
        return {
          items: [],
          loading: false,
          loaded: false,
          error:
            'Enigma API request timed out after 15000 ms for /api/ProviderPaymentQueue/bysky/query',
          stale: false,
          lastSuccessAt: null,
        };
      default:
        return {
          items: rows,
          loading: false,
          loaded: true,
          error: null,
          stale: false,
          lastSuccessAt: '2026-10-24T10:15:00Z',
        };
    }
  }, [dataMode]);

  const rawParams = useMemo<Record<string, unknown>>(
    () => ({
      description:
        description.trim() ||
        SIZE_TITLES[viewSize === 'all' ? 'full' : viewSize],
      subtitle:
        subtitle ||
        (viewSize === 'full' || viewSize === 'all'
          ? `Очередь к оплате по payment_rank · ${currencies.length} валюты`
          : ''),
      size: viewSize === 'all' ? 'full' : viewSize,
      selectedCount,
      currencyIds,
      providerId,
      billingCycleId,
      amountFormat,
      rowLimit,
      showCustomerBills,
      showProviderBreakdown,
      showSummary,
    }),
    [
      description,
      subtitle,
      currencies.length,
      viewSize,
      selectedCount,
      currencyIds,
      providerId,
      billingCycleId,
      amountFormat,
      rowLimit,
      showCustomerBills,
      showProviderBreakdown,
      showSummary,
    ],
  );

  const toggleCurrency = (cId: number) => {
    setCurrencyIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId],
    );
  };

  const resetParams = () => {
    setDescription('');
    setSubtitle('');
    setSelectedCount(14);
    setCurrencyIds([]);
    setProviderId('all');
    setBillingCycleId('all');
    setAmountFormat('grouped');
    setRowLimit(10);
    setShowCustomerBills(true);
    setShowProviderBreakdown(true);
    setShowSummary(true);
  };

  return (
    <div className={styles['sandbox-shell']}>
      <header className={styles['sandbox-topbar']}>
        <div className={styles['sandbox-brand']}>
          <span className={styles['sandbox-brand__badge']}>INTERA</span>
          <span>Task 2 — Provider Payment Planner Widget</span>
        </div>

        <div className={styles['sandbox-toolbar']}>
          <div className={styles['sandbox-toolbar__group']}>
            <span className={styles['sandbox-toolbar__label']}>Размер:</span>
            <div className={styles['sandbox-seg']}>
              {VIEW_SIZES.map((sz) => (
                <button
                  key={sz}
                  aria-pressed={viewSize === sz}
                  type="button"
                  className={`${styles['sandbox-seg__btn']} ${viewSize === sz ? styles['sandbox-seg__btn--active'] : ''}`}
                  onClick={() => {
                    setViewSize(sz);
                    savePreference('payment-planner-view-size', sz);
                  }}
                >
                  {sz === 'all' ? 'Все 4' : sz}
                </button>
              ))}
            </div>
          </div>

          <div className={styles['sandbox-toolbar__group']}>
            <span className={styles['sandbox-toolbar__label']}>Состояние:</span>
            <div className={styles['sandbox-seg']}>
              {DATA_MODES.map((st) => (
                <button
                  key={st}
                  aria-pressed={dataMode === st}
                  type="button"
                  className={`${styles['sandbox-seg__btn']} ${dataMode === st ? styles['sandbox-seg__btn--active'] : ''}`}
                  onClick={() => {
                    setDataMode(st);
                    savePreference(DATA_MODE_STORAGE_KEY, st);
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className={styles['sandbox-toolbar__group']}>
            <span className={styles['sandbox-toolbar__label']}>Тема:</span>
            <div className={styles['sandbox-seg']}>
              {THEMES.map((th) => (
                <button
                  key={th}
                  aria-pressed={theme === th}
                  type="button"
                  className={`${styles['sandbox-seg__btn']} ${theme === th ? styles['sandbox-seg__btn--active'] : ''}`}
                  onClick={() => {
                    setTheme(th);
                    savePreference('payment-planner-theme', th);
                  }}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles['sandbox-settings-button']}
          aria-label="Параметры виджета"
          aria-haspopup="dialog"
          onClick={() => setSettingsOpen(true)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 17h16" />
            <circle cx="9" cy="7" r="3" fill="var(--bg-elevated)" />
            <circle cx="15" cy="17" r="3" fill="var(--bg-elevated)" />
          </svg>
        </button>
      </header>

      <main className={styles['sandbox-body']}>
        <section className={styles['sandbox-stage']}>
          {viewSize === 'all' ? (
            <div className={styles['sandbox-all-grid']}>
              <div
                data-preview-size="full"
                className={styles['sandbox-frame--full']}
              >
                <div className={styles['sandbox-slot-label']}>
                  {SIZE_LABELS.full}
                </div>
                <PaymentPlannerWidget
                  params={{ ...rawParams, size: 'full' }}
                  data={dataEnvelope}
                  size="full"
                />
              </div>
              <div className={styles['sandbox-all-grid__bottom']}>
                {(['half', 'third', 'quarter'] as const).map((sz) => (
                  <div
                    key={sz}
                    data-preview-size={sz}
                    className={styles['sandbox-frame--' + sz]}
                  >
                    <div className={styles['sandbox-slot-label']}>
                      {SIZE_LABELS[sz]}
                    </div>
                    <PaymentPlannerWidget
                      params={{
                        ...rawParams,
                        description: description.trim() || SIZE_TITLES[sz],
                        subtitle,
                        size: sz,
                      }}
                      data={dataEnvelope}
                      size={sz}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles['sandbox-frame--' + viewSize]}>
              <div className={styles['sandbox-slot-label']}>
                {SIZE_LABELS[viewSize]}
              </div>
              <PaymentPlannerWidget
                params={rawParams}
                data={dataEnvelope}
                size={viewSize}
              />
            </div>
          )}
        </section>

        <ModalDialog
          open={settingsOpen}
          title="Параметры виджета"
          onClose={() => setSettingsOpen(false)}
          drawer
        >
          <aside className={styles['sandbox-panel']}>
            <header className={styles['sandbox-panel__header']}>
              <h3 id="sandbox-params-title">Параметры виджета (params)</h3>
              <p>Контракт parsePaymentPlannerParams</p>
            </header>
            <table
              className={styles['sandbox-panel__reference']}
              aria-labelledby="sandbox-params-title"
            >
              <tbody>
                {PARAMETER_REFERENCE.map(([name, contract]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{contract}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className={styles['sandbox-panel__settings']}>
              <summary>Изменить параметры</summary>
              <div className={styles['sandbox-panel__fields']}>
                <label className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Заголовок (description)
                  </span>
                  <input
                    className={styles['sandbox-input']}
                    placeholder={
                      SIZE_TITLES[viewSize === 'all' ? 'full' : viewSize]
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <label className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Счетов к оплате (selectedCount: {selectedCount})
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={rows.length}
                    value={selectedCount}
                    onChange={(e) => setSelectedCount(Number(e.target.value))}
                  />
                </label>

                <div className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Валюты (currencyIds — пусто = все)
                  </span>
                  <div className={styles['sandbox-checks']}>
                    {currencies.map(([id, name]) => (
                      <label key={id} className={styles['sandbox-check']}>
                        <input
                          type="checkbox"
                          checked={currencyIds.includes(id)}
                          onChange={() => toggleCurrency(id)}
                        />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Поставщик (providerId)
                  </span>
                  <SearchSelect
                    label="Поставщик (providerId)"
                    className={styles['sandbox-select']}
                    value={String(providerId)}
                    onValueChange={(value) =>
                      setProviderId(value === 'all' ? 'all' : Number(value))
                    }
                  >
                    <option value="all">all (все поставщики)</option>
                    {providers.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name} (#{id})
                      </option>
                    ))}
                  </SearchSelect>
                </label>

                <label className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Биллинговый цикл (billingCycleId)
                  </span>
                  <SearchSelect
                    label="Биллинговый цикл (billingCycleId)"
                    className={styles['sandbox-select']}
                    value={String(billingCycleId)}
                    onValueChange={(value) =>
                      setBillingCycleId(value === 'all' ? 'all' : Number(value))
                    }
                  >
                    <option value="all">all (все циклы)</option>
                    {billingCycles.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name} (#{id})
                      </option>
                    ))}
                  </SearchSelect>
                </label>

                <div className={styles['sandbox-row-2']}>
                  <label className={styles['sandbox-field']}>
                    <span className={styles['sandbox-field__label']}>
                      Формат (amountFormat)
                    </span>
                    <SearchSelect
                      label="Формат (amountFormat)"
                      className={styles['sandbox-select']}
                      value={amountFormat}
                      onValueChange={(value) => {
                        const format = AMOUNT_FORMATS.find(
                          (format) => format === value,
                        );
                        if (format !== undefined) setAmountFormat(format);
                      }}
                    >
                      {AMOUNT_FORMATS.map((af) => (
                        <option key={af} value={af}>
                          {af}
                        </option>
                      ))}
                    </SearchSelect>
                  </label>

                  <label className={styles['sandbox-field']}>
                    <span className={styles['sandbox-field__label']}>
                      Расчётный срез (rowLimit)
                    </span>
                    <SearchSelect
                      label="Расчётный срез (rowLimit)"
                      className={styles['sandbox-select']}
                      value={rowLimit}
                      onValueChange={(value) => {
                        const limit = WIDGET_ROW_LIMITS.find(
                          (limit) => limit === Number(value),
                        );
                        if (limit !== undefined) setRowLimit(limit);
                      }}
                    >
                      {WIDGET_ROW_LIMITS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </SearchSelect>
                    <small>В таблице строки появляются пачками по 15.</small>
                  </label>
                </div>

                <div className={styles['sandbox-field']}>
                  <span className={styles['sandbox-field__label']}>
                    Отображение блоков
                  </span>
                  <div className={styles['sandbox-checks']}>
                    <label className={styles['sandbox-check']}>
                      <input
                        type="checkbox"
                        checked={showSummary}
                        onChange={(e) => setShowSummary(e.target.checked)}
                      />
                      <span>showSummary</span>
                    </label>
                    <label className={styles['sandbox-check']}>
                      <input
                        type="checkbox"
                        checked={showProviderBreakdown}
                        onChange={(e) =>
                          setShowProviderBreakdown(e.target.checked)
                        }
                      />
                      <span>showProviderBreakdown</span>
                    </label>
                    <label className={styles['sandbox-check']}>
                      <input
                        type="checkbox"
                        checked={showCustomerBills}
                        onChange={(e) => setShowCustomerBills(e.target.checked)}
                      />
                      <span>showCustomerBills</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles['sandbox-reset-btn']}
                  onClick={resetParams}
                >
                  Сбросить параметры по умолчанию
                </button>
              </div>
            </details>
          </aside>
        </ModalDialog>
      </main>
    </div>
  );
}
