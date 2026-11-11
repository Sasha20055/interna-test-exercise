import { PlanNotice } from './payment-planner-notice';
import styles from './payment-planner.module.css';
import { useMemo, type ReactElement } from 'react';
import { FreshnessMark } from '../platform/freshness-mark';
import { WidgetHeader } from '../platform/widget-card';
import { widgetCardClass } from '../platform/widget-card-class';
import type {
  ICollectionDataResult,
  TWidgetSize,
} from '../platform/widget-types';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import {
  computePaymentPlan,
  getOldestSelectedInvoiceDate,
} from './payment-planner-compute';
import { parsePaymentPlannerParams } from './payment-planner-params';
import { usePaymentPlannerState } from './payment-planner-state';
import { PaymentFilters, PaymentSelection } from './payment-planner-controls';
import { CurrencySummary, PaymentStatistics } from './payment-planner-summary';
import { ProviderBreakdown } from './payment-planner-breakdown';
import { PaymentQueueTable } from './payment-planner-table';
import { InvoiceDetails } from './payment-planner-details';
import { PlannerDialog } from './payment-planner-dialog';
import { PaymentDataState } from './payment-planner-data-state';
import { invoiceKey, formatInvoiceDate } from './payment-planner-format';

export interface IPaymentPlannerWidgetProps {
  /** Raw widget configuration from dashboard YAML / parameter editor. */
  params?: Record<string, unknown>;
  /** Collection data envelope from INTERA runtime. */
  data: ICollectionDataResult<IProviderPaymentQueueRow>;
  /** Explicit host size takes precedence over configuration. */
  size?: TWidgetSize;
}

export function PaymentPlannerWidget({
  params,
  data,
  size,
}: IPaymentPlannerWidgetProps): ReactElement {
  const config = useMemo(() => parsePaymentPlannerParams(params), [params]);
  const state = usePaymentPlannerState(config);
  const effectiveSize = size ?? config.size;
  const plan = computePaymentPlan(data.items, state.effectiveConfig, {
    selectedCountOverride: state.selectedCount,
  });
  const queueKey = JSON.stringify([
    state.queueResetVersion,
    state.effectiveConfig.providerId,
    state.effectiveConfig.billingCycleId,
    [...state.effectiveConfig.currencyIds].sort((a, b) => a - b),
  ]);
  const selectedInvoice = plan.queueItems.find(
    (item) => invoiceKey(item.row) === state.invoiceKey,
  );
  const openInvoice = (key: string) => {
    state.setInvoiceKey(key);
    state.setDialog('invoice');
  };
  const full = effectiveSize === 'full';
  const withSlider = full || effectiveSize === 'half';
  const breakdownProps = {
    plan,
    format: config.amountFormat,
    currencyId: state.currencyId,
    onCurrency: state.setCurrencyId,
  };
  const oldestSelectedDate = getOldestSelectedInvoiceDate(plan.queueItems);
  const overview = (
    <div
      className={
        full
          ? styles['dash-payment-planner__overview']
          : styles['dash-payment-planner__stack']
      }
    >
      {config.showSummary && (
        <CurrencySummary
          plan={plan}
          format={config.amountFormat}
          size={effectiveSize}
        />
      )}
      {config.showProviderBreakdown && (full || effectiveSize === 'third') && (
        <ProviderBreakdown {...breakdownProps} compact={!full} />
      )}
    </div>
  );
  return (
    <article
      className={`${styles['dash-payment-planner']} ${widgetCardClass()}`}
      data-size={effectiveSize}
      aria-label={config.description}
    >
      <WidgetHeader
        title={config.description}
        subtitle={config.subtitle}
        aside={
          data.loaded ? (
            <FreshnessMark
              source="rows"
              stale={data.stale}
              lastSuccessAt={data.lastSuccessAt}
              showLabel={withSlider}
            />
          ) : null
        }
      />
      {!data.loaded ? (
        <PaymentDataState data={data} />
      ) : (
        <>
          {full && config.showSummary && <PaymentStatistics plan={plan} />}
          {full && overview}
          {full && (
            <PaymentFilters
              rows={data.items}
              config={state.effectiveConfig}
              onProvider={state.setProviderId}
              onCycle={state.setBillingCycleId}
              onCurrencies={state.setCurrencyIds}
              onReset={state.resetFilters}
            />
          )}
          {withSlider ? (
            <PaymentSelection
              requested={state.selectedCount}
              effective={plan.effectiveSelectedCount}
              total={plan.totalQueueCount}
              compact={!full}
              onChange={state.setSelectedCount}
            />
          ) : (
            <div className={styles['dash-payment-planner__count']}>
              <strong>
                {plan.effectiveSelectedCount}{' '}
                {effectiveSize === 'third' && (
                  <span>/ {plan.totalQueueCount}</span>
                )}
              </strong>
              <small>
                {effectiveSize === 'quarter'
                  ? `из ${plan.totalQueueCount} к оплате`
                  : `счетов в плане${config.showSummary ? ` · ${plan.selectedProviderCount} поставщиков` : ''}`}
              </small>
            </div>
          )}
          {full && (
            <PlanNotice
              invalidSelectedCount={plan.invalidSelectedCount}
              loading={data.loading}
              error={data.error}
            />
          )}
          {!full && plan.totalQueueCount === 0 && (
            <div
              className={styles['dash-payment-planner__empty']}
              role="status"
            >
              <h3>
                {data.items.length === 0
                  ? 'Очередь платежей пуста'
                  : 'По выбранным фильтрам счетов нет'}
              </h3>
              <p>
                {data.items.length === 0
                  ? 'Новые счета появятся после обновления данных.'
                  : 'Измените фильтры или откройте полную очередь для их сброса.'}
              </p>
            </div>
          )}
          {!full && overview}
          {effectiveSize === 'half' && config.showSummary && (
            <div className={styles['dash-payment-planner__meta']}>
              <p>
                Поставщиков в плане:{' '}
                <strong>{plan.selectedProviderCount}</strong>
              </p>
              <p>
                Старейший счёт:{' '}
                <strong>
                  {oldestSelectedDate
                    ? formatInvoiceDate(oldestSelectedDate)
                    : '—'}
                </strong>
              </p>
            </div>
          )}
          {!full && (
            <PlanNotice
              invalidSelectedCount={plan.invalidSelectedCount}
              loading={data.loading}
              error={data.error}
              compact
            />
          )}
          {full && (
            <PaymentQueueTable
              key={queueKey}
              items={plan.queueItems}
              config={config}
              total={plan.totalQueueCount}
              emptyTitle={
                data.items.length === 0
                  ? 'Очередь платежей пуста'
                  : 'По выбранным фильтрам счетов нет'
              }
              onInvoice={openInvoice}
            />
          )}
          <button
            type="button"
            className={styles['dash-payment-planner__action']}
            onClick={() => state.setDialog('queue')}
          >
            {effectiveSize === 'quarter' && config.showSummary
              ? 'Все валюты →'
              : full || effectiveSize === 'half'
                ? 'Открыть всю очередь платежей →'
                : 'Открыть детали →'}
          </button>
        </>
      )}
      <PlannerDialog
        open={state.dialog !== null}
        viewportHeight={state.dialog === 'queue'}
        title={
          state.dialog === 'invoice'
            ? 'Детали счёта'
            : 'Полная очередь платежей'
        }
        onClose={() => state.setDialog(null)}
      >
        {state.dialog === 'invoice' ? (
          <>
            <button
              type="button"
              className={styles['dash-payment-planner__text-button']}
              onClick={() => state.setDialog('queue')}
            >
              ← К очереди
            </button>
            <PlanNotice
              invalidSelectedCount={plan.invalidSelectedCount}
              loading={data.loading}
              error={data.error}
            />
            <InvoiceDetails item={selectedInvoice} config={config} />
          </>
        ) : (
          <>
            <PaymentFilters
              rows={data.items}
              config={state.effectiveConfig}
              onProvider={state.setProviderId}
              onCycle={state.setBillingCycleId}
              onCurrencies={state.setCurrencyIds}
              onReset={state.resetFilters}
            />
            <PaymentSelection
              requested={state.selectedCount}
              effective={plan.effectiveSelectedCount}
              total={plan.totalQueueCount}
              onChange={state.setSelectedCount}
            />
            <PlanNotice
              invalidSelectedCount={plan.invalidSelectedCount}
              loading={data.loading}
              error={data.error}
            />
            {config.showSummary && (
              <CurrencySummary plan={plan} format={config.amountFormat} />
            )}
            {config.showProviderBreakdown && (
              <ProviderBreakdown {...breakdownProps} />
            )}
            <PaymentQueueTable
              key={queueKey}
              items={plan.queueItems}
              config={config}
              total={plan.totalQueueCount}
              emptyTitle={
                data.items.length === 0
                  ? 'Очередь платежей пуста'
                  : 'По выбранным фильтрам счетов нет'
              }
              onInvoice={openInvoice}
            />
          </>
        )}
      </PlannerDialog>
    </article>
  );
}
