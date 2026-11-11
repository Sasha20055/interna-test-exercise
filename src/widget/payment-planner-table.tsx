import {
  sortQueueTable,
  type IQueueSort,
  type TQueueSortColumn,
} from './payment-planner-table-sort';
import { useEffect, useRef, useState } from 'react';
import styles from './payment-planner.module.css';
import type { IQueueBillItem } from './payment-planner-compute';
import type { IPaymentPlannerConfig } from './payment-planner-params';
import {
  formatInvoiceDate,
  formatPaymentAmount,
  invoiceKey,
} from './payment-planner-format';

interface IQueueTableProps {
  items: readonly IQueueBillItem[];
  config: IPaymentPlannerConfig;
  total: number;
  emptyTitle: string;
  onInvoice: (key: string) => void;
}

export function PaymentQueueTable({
  items,
  config,
  total,
  emptyTitle,
  onInvoice,
}: IQueueTableProps) {
  const [sort, setSort] = useState<IQueueSort>({
    column: 'position',
    direction: 'ascending',
  });
  const [rowCount, setRowCount] = useState(15);
  const scroll = useRef<HTMLDivElement>(null);
  const threshold = useRef<HTMLTableRowElement>(null);
  const visibleItems = sortQueueTable(items, sort).slice(0, rowCount);
  const columns: { column: TQueueSortColumn; label: string }[] = [
    { column: 'position', label: '№ / ранг' },
    { column: 'provider', label: 'Поставщик / счёт' },
    ...(config.showCustomerBills
      ? [{ column: 'customer' as const, label: 'Клиентский счёт' }]
      : []),
    { column: 'date', label: 'Дата' },
    { column: 'amount', label: 'Сумма' },
  ];
  const hasMore = rowCount < items.length;
  useEffect(() => {
    if (
      !hasMore ||
      !threshold.current ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setRowCount((count) => Math.max(count, rowCount + 15));
        }
      },
      { root: scroll.current },
    );
    observer.observe(threshold.current);
    return () => observer.disconnect();
  }, [rowCount, hasMore, items, sort]);
  return (
    <section
      className={styles['dash-payment-planner__queue']}
      aria-label="Очередь платежей"
    >
      <div className={styles['dash-payment-planner__panel-heading']}>
        <h3>Очередь платежей</h3>
        <small>
          Показано {visibleItems.length} из {total}
        </small>
      </div>
      <div
        ref={scroll}
        className={styles['dash-payment-planner__table-scroll']}
        tabIndex={0}
        role="region"
        aria-label="Таблица очереди, прокрутка по горизонтали"
      >
        <table>
          <caption className={styles['dash-payment-planner__sr-only']}>
            Первые выбранные счета выделены. Некорректные суммы исключены из
            итогов.
          </caption>
          <thead>
            <tr>
              {columns.map(({ column, label }) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={sort.column === column ? sort.direction : 'none'}
                >
                  <button
                    type="button"
                    className={styles['dash-payment-planner__sort']}
                    title={
                      column === 'amount'
                        ? 'По числовому значению суммы в указанной валюте'
                        : undefined
                    }
                    onClick={() => {
                      setSort({
                        column,
                        direction:
                          sort.column === column &&
                          sort.direction === 'ascending'
                            ? 'descending'
                            : 'ascending',
                      });
                      setRowCount(15);
                      if (scroll.current) scroll.current.scrollTop = 0;
                    }}
                  >
                    {label}
                    <span aria-hidden="true">
                      {sort.column === column
                        ? sort.direction === 'ascending'
                          ? '↑'
                          : '↓'
                        : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={config.showCustomerBills ? 5 : 4}>{emptyTitle}</td>
              </tr>
            )}
            {visibleItems.map((item, index) => (
              <tr
                ref={
                  hasMore && index === Math.max(0, visibleItems.length - 5)
                    ? threshold
                    : undefined
                }
                key={`${invoiceKey(item.row)}:${item.queuePosition}`}
                data-selected={item.selected}
                data-invalid={item.hasInvalidAmount}
              >
                <td>
                  <strong>{item.queuePosition}</strong>
                  <small>Ранг: {item.rank ?? '—'}</small>
                  <span className={styles['dash-payment-planner__sr-only']}>
                    {item.selected ? 'Выбран' : 'Не выбран'}
                  </span>
                </td>
                <td>
                  <span>{item.row.provider_name}</span>
                  <button
                    type="button"
                    className={styles['dash-payment-planner__text-button']}
                    onClick={() => onInvoice(invoiceKey(item.row))}
                  >
                    {item.row.provider_bill_no ||
                      `Счёт #${item.row.provider_bill_id}`}
                  </button>
                </td>
                {config.showCustomerBills && (
                  <td>
                    {item.hasCustomerBill ? (
                      <>
                        <span>{item.row.customer_bill_no}</span>
                        <small>
                          {item.row.customer_name ?? 'Клиент не указан'}
                        </small>
                      </>
                    ) : (
                      <span className={styles['dash-payment-planner__muted']}>
                        Нет связанного счёта
                      </span>
                    )}
                  </td>
                )}
                <td>{formatInvoiceDate(item.row.provider_recv_date)}</td>
                <td>
                  {item.providerAmount === null ? (
                    <span className={styles['dash-payment-planner__invalid']}>
                      ⚠ Некорректная сумма<small>(Исключена)</small>
                    </span>
                  ) : (
                    <strong>
                      {formatPaymentAmount(
                        item.providerAmount,
                        config.amountFormat,
                      )}{' '}
                      <span>{item.row.provider_currency_name}</span>
                    </strong>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
