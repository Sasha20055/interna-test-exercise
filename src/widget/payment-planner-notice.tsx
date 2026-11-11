import { useId } from 'react';
import styles from './payment-planner.module.css';

interface IPlanNoticeProps {
  invalidSelectedCount: number;
  loading: boolean;
  error: string | null;
  compact?: boolean;
}

export function PlanNotice({
  invalidSelectedCount,
  loading,
  error,
  compact = false,
}: IPlanNoticeProps) {
  const id = useId();
  const content = (
    <>
      {invalidSelectedCount > 0 && (
        <p>
          ⚠ Некорректных выбранных счетов: {invalidSelectedCount}. Суммы
          исключены из итогов.
        </p>
      )}
      {error !== null && (
        <div>
          Не удалось обновить данные. Показан последний доступный план.
          <details>
            <summary>Техническая информация</summary>
            {error}
          </details>
        </div>
      )}
      {loading && <p>Обновление данных… Текущий план сохранён.</p>}
      {invalidSelectedCount === 0 && error === null && !loading && (
        <p>
          Некорректные суммы исключаются из итогов. Позиции счетов в плане
          сохраняются.
        </p>
      )}
    </>
  );
  return (
    <section
      className={styles['dash-payment-planner__notice']}
      data-compact={compact}
      data-warning={invalidSelectedCount > 0 || error !== null}
      role="status"
      aria-label="Состояние плана"
      aria-atomic="true"
    >
      {compact ? (
        <>
          <button
            type="button"
            popoverTarget={id}
            className={styles['dash-payment-planner__notice-trigger']}
            aria-label="Подробности состояния плана"
          >
            {invalidSelectedCount > 0
              ? `⚠ Исключено: ${invalidSelectedCount}`
              : error !== null
                ? '⚠ Ошибка обновления'
                : loading
                  ? 'Обновление…'
                  : 'Проверка сумм'}
            <span aria-hidden="true">ⓘ</span>
          </button>
          <div
            id={id}
            popover="auto"
            className={styles['dash-payment-planner__notice-popover']}
          >
            {content}
            <button type="button" popoverTarget={id} popoverTargetAction="hide">
              Закрыть подсказку
            </button>
          </div>
        </>
      ) : (
        content
      )}
    </section>
  );
}
