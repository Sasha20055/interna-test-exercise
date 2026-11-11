import type { IQueueBillItem } from './payment-planner-compute';

export type TQueueSortColumn =
  'position' | 'provider' | 'customer' | 'date' | 'amount';
export interface IQueueSort {
  column: TQueueSortColumn;
  direction: 'ascending' | 'descending';
}

function sortValue(
  item: IQueueBillItem,
  column: TQueueSortColumn,
): string | number | null {
  switch (column) {
    case 'position':
      return item.queuePosition;
    case 'provider':
      return `${item.row.provider_name}\0${item.row.provider_bill_no}`;
    case 'customer':
      return item.hasCustomerBill
        ? `${item.row.customer_bill_no}\0${item.row.customer_name ?? ''}`
        : null;
    case 'date': {
      const date = Date.parse(item.row.provider_recv_date);
      return Number.isFinite(date) ? date : null;
    }
    case 'amount':
      return item.providerAmount;
  }
}

export function sortQueueTable(
  items: readonly IQueueBillItem[],
  sort: IQueueSort,
): IQueueBillItem[] {
  return [...items].sort((a, b) => {
    const left = sortValue(a, sort.column);
    const right = sortValue(b, sort.column);
    if (left === null)
      return right === null ? a.queuePosition - b.queuePosition : 1;
    if (right === null) return -1;
    const comparison =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'ru', {
            numeric: true,
            sensitivity: 'base',
          });
    return (
      comparison * (sort.direction === 'ascending' ? 1 : -1) ||
      a.queuePosition - b.queuePosition
    );
  });
}
