import styles from './widget-card.module.css';

/**
 * Class of a widget's outer card — the chrome every dashboard card shares.
 * `flush` drops the inset for cards whose sections pad themselves.
 */
export function widgetCardClass(options: { flush?: boolean } = {}): string {
  return options.flush
    ? `${styles['dash-card']} ${styles['dash-card--flush']}`
    : styles['dash-card'];
}
