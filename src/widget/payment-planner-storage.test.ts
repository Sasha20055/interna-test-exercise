import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PLANNER_CONTROLS_STORAGE_KEY,
  parsePersistedControls,
  persistPlannerControls,
  readPersistedPlannerControls,
} from './payment-planner-storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('persisted planner controls parsing', () => {
  it('parses a complete valid snapshot', () => {
    const snapshot = {
      selectedCount: { signature: '14', value: 20 },
      providerId: { signature: 'all', value: 1770 },
      billingCycleId: { signature: 'all', value: 'all' },
      currencyIds: { signature: '[]', value: [643, 840, 643] },
      breakdownCurrencyId: 826,
    };
    expect(parsePersistedControls(snapshot)).toEqual({
      selectedCount: { signature: '14', value: 20 },
      providerId: { signature: 'all', value: 1770 },
      billingCycleId: { signature: 'all', value: 'all' },
      currencyIds: { signature: '[]', value: [643, 840] },
      breakdownCurrencyId: 826,
    });
  });
  it('drops malformed control entries but salvages valid currency ids', () => {
    expect(
      parsePersistedControls({
        selectedCount: { signature: 14, value: 20 },
        providerId: { signature: 'all', value: '1770' },
        billingCycleId: { value: 40 },
        currencyIds: { signature: '[]', value: [643, '840', null] },
        breakdownCurrencyId: '826',
      }),
    ).toEqual({ currencyIds: { signature: '[]', value: [643] } });
  });
  it('returns an empty snapshot for non-record bodies', () => {
    expect(parsePersistedControls(null)).toEqual({});
    expect(parsePersistedControls('text')).toEqual({});
    expect(parsePersistedControls([1])).toEqual({});
  });
});

describe('persisted planner controls storage access', () => {
  it('round-trips a snapshot through the storage', () => {
    const entries = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
    });
    persistPlannerControls({
      selectedCount: { signature: '14', value: 20 },
      breakdownCurrencyId: 826,
    });
    expect(entries.get(PLANNER_CONTROLS_STORAGE_KEY)).toBe(
      '{"selectedCount":{"signature":"14","value":20},"breakdownCurrencyId":826}',
    );
    expect(readPersistedPlannerControls()).toEqual({
      selectedCount: { signature: '14', value: 20 },
      breakdownCurrencyId: 826,
    });
  });
  it('reads an empty snapshot when nothing is stored', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
    });
    expect(readPersistedPlannerControls()).toEqual({});
  });
  it('stays best-effort when storage is missing or throwing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readPersistedPlannerControls()).toEqual({});
    expect(() =>
      persistPlannerControls({
        selectedCount: { signature: '14', value: 20 },
      }),
    ).not.toThrow();
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
    });
    expect(readPersistedPlannerControls()).toEqual({});
    expect(() =>
      persistPlannerControls({
        selectedCount: { signature: '14', value: 20 },
      }),
    ).not.toThrow();
  });
});
