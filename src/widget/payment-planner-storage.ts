import { isRecord } from '../platform/widget-param-readers';

/**
 * Best-effort persistence of user-entered planner controls (selection count,
 * provider/cycle/currency filters and the breakdown currency) in
 * `localStorage`. A quota limit, blocked storage or a missing global must
 * never break rendering: reads return an empty snapshot and writes are
 * silently dropped.
 */
export const PLANNER_CONTROLS_STORAGE_KEY = 'payment-planner-controls';

/** A saved control plus the external-parameter signature it was entered against. */
export interface IPersistedControl<T> {
  signature: string;
  value: T;
}

/**
 * Persisted user controls. Every entry is optional so a partially corrupt
 * snapshot still restores the fields that parse. The breakdown currency has
 * no external parameter, so its entry stores the plain value.
 */
export interface IPersistedPlannerControls {
  selectedCount?: IPersistedControl<number>;
  providerId?: IPersistedControl<number | 'all'>;
  billingCycleId?: IPersistedControl<number | 'all'>;
  currencyIds?: IPersistedControl<number[]>;
  breakdownCurrencyId?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIdControlValue(value: unknown): value is number | 'all' {
  return value === 'all' || isFiniteNumber(value);
}

function parseControl<T>(
  raw: unknown,
  isValue: (value: unknown) => value is T,
): IPersistedControl<T> | undefined {
  if (!isRecord(raw) || typeof raw.signature !== 'string') return undefined;
  return isValue(raw.value)
    ? { signature: raw.signature, value: raw.value }
    : undefined;
}

/** Mirrors the params parser: keep unique finite ids, preserving their order. */
function parseCurrencyIds(
  raw: unknown,
): IPersistedControl<number[]> | undefined {
  if (!isRecord(raw) || typeof raw.signature !== 'string') return undefined;
  if (!Array.isArray(raw.value)) return undefined;
  return {
    signature: raw.signature,
    value: [...new Set(raw.value.filter(isFiniteNumber))],
  };
}

/** Parses a decoded storage body, dropping every malformed entry. */
export function parsePersistedControls(
  raw: unknown,
): IPersistedPlannerControls {
  if (!isRecord(raw)) return {};
  return {
    selectedCount: parseControl(raw.selectedCount, isFiniteNumber),
    providerId: parseControl(raw.providerId, isIdControlValue),
    billingCycleId: parseControl(raw.billingCycleId, isIdControlValue),
    currencyIds: parseCurrencyIds(raw.currencyIds),
    breakdownCurrencyId: isFiniteNumber(raw.breakdownCurrencyId)
      ? raw.breakdownCurrencyId
      : undefined,
  };
}

/** Reads the persisted snapshot; absent or unreadable storage yields `{}`. */
export function readPersistedPlannerControls(): IPersistedPlannerControls {
  try {
    const raw = localStorage.getItem(PLANNER_CONTROLS_STORAGE_KEY);
    return raw === null ? {} : parsePersistedControls(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Writes the full snapshot; storage failures are dropped, never thrown. */
export function persistPlannerControls(
  controls: IPersistedPlannerControls,
): void {
  try {
    localStorage.setItem(
      PLANNER_CONTROLS_STORAGE_KEY,
      JSON.stringify(controls),
    );
  } catch {
    // Best effort by contract: the in-memory plan stays authoritative.
  }
}
