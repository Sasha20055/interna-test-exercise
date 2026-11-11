import styles from './payment-planner.module.css';
import type { ICollectionDataResult } from '../platform/widget-types';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';

export function PaymentDataState({
  data,
}: {
  data: ICollectionDataResult<IProviderPaymentQueueRow>;
}) {
  if (data.loading)
    return (
      <div
        className={styles['dash-payment-planner__skeleton']}
        role="status"
        aria-label="Загрузка плана платежей"
      >
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  if (data.error !== null)
    return (
      <div className={styles['dash-payment-planner__empty']} role="alert">
        <h3>Не удалось загрузить очередь</h3>
        <p>
          Данные временно недоступны. Дождитесь следующего обновления платформы.
        </p>
        <details>
          <summary>Техническая информация</summary>
          <p>{data.error}</p>
        </details>
      </div>
    );
  return (
    <div className={styles['dash-payment-planner__empty']} role="status">
      Ожидаем данные очереди платежей.
    </div>
  );
}
