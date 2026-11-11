import { useState } from 'react';
import type { IPaymentPlannerConfig } from './payment-planner-params';
import {
  persistPlannerControls,
  readPersistedPlannerControls,
  type IPersistedControl,
} from './payment-planner-storage';

function useParameterOverride<T>(external: T, signature: string, initial?: T) {
  const [state, setState] = useState(() => ({
    signature,
    value: initial === undefined ? external : initial,
  }));
  if (state.signature !== signature) {
    setState({ signature, value: external });
  }
  const value = state.signature === signature ? state.value : external;
  return [value, (next: T) => setState({ signature, value: next })] as const;
}

/** A saved control applies only while its external parameter stayed unchanged. */
function restoredControl<T>(
  control: IPersistedControl<T> | undefined,
  signature: string,
): T | undefined {
  return control !== undefined && control.signature === signature
    ? control.value
    : undefined;
}

export function usePaymentPlannerState(config: IPaymentPlannerConfig) {
  const [persisted] = useState(readPersistedPlannerControls);
  const selectedCountSignature = String(config.selectedCount);
  const providerSignature = String(config.providerId);
  const cycleSignature = String(config.billingCycleId);
  const currencySignature = JSON.stringify(
    [...config.currencyIds].sort((a, b) => a - b),
  );
  const [selectedCount, selectCount] = useParameterOverride(
    config.selectedCount,
    selectedCountSignature,
    restoredControl(persisted.selectedCount, selectedCountSignature),
  );
  const [providerId, chooseProvider] = useParameterOverride(
    config.providerId,
    providerSignature,
    restoredControl(persisted.providerId, providerSignature),
  );
  const [billingCycleId, chooseCycle] = useParameterOverride(
    config.billingCycleId,
    cycleSignature,
    restoredControl(persisted.billingCycleId, cycleSignature),
  );
  const [currencyIds, chooseCurrencies] = useParameterOverride(
    config.currencyIds,
    currencySignature,
    restoredControl(persisted.currencyIds, currencySignature),
  );
  const [currencyId, chooseBreakdownCurrency] = useState<number | null>(
    persisted.breakdownCurrencyId ?? null,
  );
  const [queueResetVersion, resetQueue] = useState(0);
  const [dialog, setDialog] = useState<'queue' | 'invoice' | null>(null);
  const [invoiceKey, setInvoiceKey] = useState<string | null>(null);
  const saveControls = (patch: {
    selectedCount?: number;
    providerId?: number | 'all';
    billingCycleId?: number | 'all';
    currencyIds?: number[];
    breakdownCurrencyId?: number;
  }) => {
    const breakdownCurrencyId = patch.breakdownCurrencyId ?? currencyId;
    persistPlannerControls({
      selectedCount: {
        signature: selectedCountSignature,
        value: patch.selectedCount ?? selectedCount,
      },
      providerId: {
        signature: providerSignature,
        value: patch.providerId ?? providerId,
      },
      billingCycleId: {
        signature: cycleSignature,
        value: patch.billingCycleId ?? billingCycleId,
      },
      currencyIds: {
        signature: currencySignature,
        value: patch.currencyIds ?? currencyIds,
      },
      breakdownCurrencyId:
        breakdownCurrencyId === null ? undefined : breakdownCurrencyId,
    });
  };
  return {
    effectiveConfig: { ...config, providerId, billingCycleId, currencyIds },
    selectedCount,
    setSelectedCount: (value: number) => {
      selectCount(value);
      saveControls({ selectedCount: value });
    },
    setProviderId: (value: number | 'all') => {
      chooseProvider(value);
      saveControls({ providerId: value });
    },
    setBillingCycleId: (value: number | 'all') => {
      chooseCycle(value);
      saveControls({ billingCycleId: value });
    },
    setCurrencyIds: (value: number[]) => {
      chooseCurrencies(value);
      saveControls({ currencyIds: value });
    },
    queueResetVersion,
    resetFilters: () => {
      resetQueue((version) => version + 1);
      chooseProvider('all');
      chooseCycle('all');
      chooseCurrencies([]);
      saveControls({
        providerId: 'all',
        billingCycleId: 'all',
        currencyIds: [],
      });
    },
    dialog,
    setDialog,
    invoiceKey,
    setInvoiceKey,
    currencyId,
    setCurrencyId: (value: number) => {
      chooseBreakdownCurrency(value);
      saveControls({ breakdownCurrencyId: value });
    },
  };
}
