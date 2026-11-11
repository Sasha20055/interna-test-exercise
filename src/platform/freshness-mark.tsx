import styles from './freshness-mark.module.css';
import type { ReactElement } from 'react';

export type TFreshnessSource = 'rows' | 'metric' | 'silent';

interface IFreshnessMarkProps {
  source: TFreshnessSource;
  stale: boolean;
  lastSuccessAt: string | null;
  showLabel?: boolean;
}

export function FreshnessMark({
  source,
  stale,
  lastSuccessAt,
  showLabel = false,
}: IFreshnessMarkProps): ReactElement | null {
  if (stale) {
    const hint = lastSuccessAt
      ? `Данные устарели — последнее обновление: ${lastSuccessAt}`
      : 'Данные устарели';
    return (
      <span
        className={`${styles['dash-freshness']} ${styles['dash-freshness--stale']}`}
        role="status"
        title={hint}
      >
        <span className={styles['dash-freshness__dot']} aria-hidden="true" />
        Stale
      </span>
    );
  }

  if (source === 'silent') {
    return null;
  }

  if (source === 'metric') {
    const hint = lastSuccessAt
      ? `Обновлено: ${lastSuccessAt}`
      : 'Данные актуальны';
    return (
      <span
        className={`${styles['dash-freshness']} ${styles['dash-freshness--ring']}`}
        role="img"
        aria-label={hint}
        title={hint}
      />
    );
  }

  const liveHint = lastSuccessAt
    ? `Актуальные данные (${lastSuccessAt})`
    : 'Актуальные данные';
  return (
    <span
      className={`${styles['dash-freshness']} ${styles['dash-freshness--live']}`}
      role="img"
      aria-label={liveHint}
      title={liveHint}
    >
      <span className={styles['dash-freshness__dot']} aria-hidden="true" />
      {showLabel ? 'Live' : null}
    </span>
  );
}
