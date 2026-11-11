import styles from './payment-planner.module.css';
import type { IQueueBillItem } from './payment-planner-compute';
import type { IPaymentPlannerConfig } from './payment-planner-params';
import {
  formatInvoiceDate,
  formatPaymentAmount,
} from './payment-planner-format';

export function InvoiceDetails({
  item,
  config,
}: {
  item: IQueueBillItem | undefined;
  config: IPaymentPlannerConfig;
}) {
  if (!item)
    return <p role="status">Счёт больше недоступен в текущих данных.</p>;
  const { row } = item;
  return (
    <div className={styles['dash-payment-planner__details']}>
      <h3>{row.provider_bill_no || `Счёт #${row.provider_bill_id}`}</h3>
      <p>
        {item.selected ? 'Включён в план' : 'Не включён в план'} · Позиция{' '}
        {item.queuePosition} · Ранг {item.rank ?? 'не указан'}
      </p>
      <dl>
        <div>
          <dt>Поставщик</dt>
          <dd>
            {row.provider_name} · {row.provider_code}
          </dd>
        </div>
        <div>
          <dt>ID счёта / код</dt>
          <dd>
            {row.provider_bill_id} / {row.provider_bill_code}
          </dd>
        </div>
        <div>
          <dt>Дата получения</dt>
          <dd>{formatInvoiceDate(row.provider_recv_date)}</dd>
        </div>
        <div>
          <dt>Биллинговый цикл</dt>
          <dd>{row.billing_cycle_name}</dd>
        </div>
        <div>
          <dt>Сумма поставщика</dt>
          <dd>
            {item.providerAmount === null ? (
              <span className={styles['dash-payment-planner__invalid']}>
                Некорректная сумма — исключена из итогов (исходное значение:{' '}
                {String(row.provider_total_due ?? 'не указано')})
              </span>
            ) : (
              `${formatPaymentAmount(item.providerAmount, config.amountFormat)} ${row.provider_currency_name}`
            )}
          </dd>
        </div>
      </dl>
      {config.showCustomerBills && (
        <section>
          <h3>Связанный клиентский счёт</h3>
          {item.hasCustomerBill && item.customerAmount !== null ? (
            <dl>
              <div>
                <dt>Номер / ID</dt>
                <dd>
                  {row.customer_bill_no} / {row.customer_bill_id ?? '—'}
                </dd>
              </div>
              <div>
                <dt>Клиент</dt>
                <dd>
                  {row.customer_name ?? '—'} · {row.customer_code ?? '—'}
                </dd>
              </div>
              <div>
                <dt>ИНН</dt>
                <dd>{row.customer_inn ?? '—'}</dd>
              </div>
              <div>
                <dt>Сумма клиента</dt>
                <dd>
                  {formatPaymentAmount(
                    item.customerAmount,
                    config.amountFormat,
                  )}
                  <small>Валюта не указана источником</small>
                </dd>
              </div>
              <div>
                <dt>Комментарий</dt>
                <dd>{row.customer_comments?.trim() || 'Нет комментария'}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles['dash-payment-planner__muted']}>
              Нет связанного клиентского счёта с корректной суммой.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
