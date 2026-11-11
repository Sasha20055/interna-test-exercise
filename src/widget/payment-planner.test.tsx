import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../data/mock-payment-queue.json';
import type { ICollectionDataResult } from '../platform/widget-types';
import type { IProviderPaymentQueueRow } from '../types/provider-payment-queue';
import { PaymentPlannerWidget } from './payment-planner';
import { PLANNER_CONTROLS_STORAGE_KEY } from './payment-planner-storage';

const data: ICollectionDataResult<IProviderPaymentQueueRow> = {
  items: fixture,
  loaded: true,
  loading: false,
  error: null,
  stale: false,
  lastSuccessAt: null,
};
const params = { selectedCount: 14 };
const widget = () => screen.getByRole('article');

/**
 * The vitest jsdom environment exposes `localStorage` as a plain object
 * without the Storage methods, so the file installs a real in-memory
 * implementation for persistence tests.
 */
const storage = new Map<string, string>();
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {
    this.style.display = 'block';
  };
  HTMLElement.prototype.hidePopover = function () {
    this.style.display = 'none';
  };
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  });
});
afterEach(() => {
  cleanup();
  storage.clear();
});

describe('payment planner interactions', () => {
  it('renders the supplied plan and applies count and filters', async () => {
    const user = userEvent.setup();
    render(<PaymentPlannerWidget data={data} params={params} />);
    expect(within(widget()).getByText('14 из 32 счетов')).toBeVisible();
    fireEvent.change(within(widget()).getByRole('slider'), {
      target: { value: '20' },
    });
    expect(screen.getByRole('spinbutton')).toHaveValue(20);
    expect(screen.getByText(/Некорректных выбранных счетов: 2/)).toBeVisible();
    await user.click(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    );
    await user.click(
      screen.getByRole('option', { name: 'Inmarsat Global Ltd', exact: true }),
    );
    expect(screen.getByText('4 из 4 счетов')).toBeVisible();
    expect(screen.getByText('Запрошено 20; доступно 4.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(screen.getByText('20 из 32 счетов')).toBeVisible();
  });
  it('commits rounded numeric drafts and restores an empty draft', async () => {
    const user = userEvent.setup();
    render(<PaymentPlannerWidget data={data} params={params} />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '2.6');
    await user.keyboard('{Enter}');
    expect(input).toHaveValue(3);
    expect(screen.getByRole('slider')).toHaveValue('3');
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue(3);
  });
  it('preserves choice and open details across replacement arrays, refresh and size changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PaymentPlannerWidget data={data} params={params} />,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    await user.click(
      screen.getByRole('button', {
        name: fixture[0].provider_bill_no,
        exact: true,
      }),
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Детали счёта');
    rerender(
      <PaymentPlannerWidget
        data={{ ...data, loading: true, items: fixture.map((r) => ({ ...r })) }}
        params={{ ...params, subtitle: 'Updated' }}
        size="half"
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Детали счёта');
    expect(within(widget()).getByRole('slider')).toHaveValue('20');
    rerender(
      <PaymentPlannerWidget
        data={{ ...data, items: [...fixture] }}
        params={{ ...params }}
        size="full"
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Детали счёта');
    expect(within(widget()).getByRole('slider')).toHaveValue('20');
    rerender(
      <PaymentPlannerWidget
        data={{
          ...data,
          items: fixture.filter(
            (r) => r.provider_bill_id !== fixture[0].provider_bill_id,
          ),
        }}
        params={params}
      />,
    );
    expect(
      within(screen.getByRole('dialog')).getByText(/Счёт больше недоступен/),
    ).toBeVisible();
  });
  it('resets only the changed external override and treats equivalent params as unchanged', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PaymentPlannerWidget data={data} params={params} />,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    await user.click(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    );
    await user.click(
      screen.getByRole('option', { name: 'Inmarsat Global Ltd', exact: true }),
    );
    rerender(
      <PaymentPlannerWidget
        data={data}
        params={{ selectedCount: 14, showSummary: false }}
      />,
    );
    expect(screen.getByRole('spinbutton')).toHaveValue(20);
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('Inmarsat Global Ltd');
    rerender(
      <PaymentPlannerWidget
        data={data}
        params={{ selectedCount: 3, showSummary: false }}
      />,
    );
    expect(screen.getByRole('spinbutton')).toHaveValue(3);
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('Inmarsat Global Ltd');
    rerender(
      <PaymentPlannerWidget
        data={data}
        params={{ selectedCount: 3, providerId: 1760 }}
      />,
    );
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('SatCom Global');
  });
  it('preserves requested count across queue shrink and restoration', () => {
    const { rerender } = render(
      <PaymentPlannerWidget data={data} params={params} />,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    rerender(
      <PaymentPlannerWidget
        data={{ ...data, items: fixture.slice(0, 3) }}
        params={params}
      />,
    );
    expect(screen.getByRole('slider')).toHaveValue('3');
    expect(screen.getByRole('spinbutton')).toHaveValue(20);
    rerender(<PaymentPlannerWidget data={data} params={params} />);
    expect(screen.getByRole('slider')).toHaveValue('20');
  });
  it('exposes all currencies in quarter without a combined amount', async () => {
    const user = userEvent.setup();
    render(<PaymentPlannerWidget data={data} params={params} size="quarter" />);
    const summary = screen.getByRole('region', { name: 'Суммы по валютам' });
    expect(within(summary).getAllByRole('term')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '+ ещё 2 валюты' }));
    expect(within(summary).getAllByRole('term')).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: 'Свернуть валюты' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
  it.each([1, 2])(
    'does not show extra currency disclosure with %s currencies',
    (count) => {
      const currencyIds = [
        ...new Set(fixture.map((r) => r.provider_currency_id)),
      ].slice(0, count);
      render(
        <PaymentPlannerWidget
          data={data}
          params={{ selectedCount: 32, currencyIds }}
          size="quarter"
        />,
      );
      expect(
        screen.queryByRole('button', { name: /ещё/ }),
      ).not.toBeInTheDocument();
    },
  );
  it('starts queue tables with fifteen rows and respects visibility flags in the dialog', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PaymentPlannerWidget data={data} params={{ ...params, rowLimit: 10 }} />,
    );
    expect(within(widget()).getAllByRole('row')).toHaveLength(16);
    await user.click(
      screen.getByRole('button', { name: /Открыть всю очередь/ }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('row')).toHaveLength(16);
    rerender(
      <PaymentPlannerWidget
        data={data}
        params={{
          ...params,
          showSummary: false,
          showCustomerBills: false,
          showProviderBreakdown: false,
        }}
      />,
    );
    expect(
      within(dialog).queryByRole('region', { name: 'Суммы по валютам' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('region', {
        name: 'Распределение по поставщикам',
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('columnheader', { name: 'Клиентский счёт' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', {
        name: fixture[0].provider_bill_no,
        exact: true,
      }),
    );
    expect(
      within(dialog).queryByText('Связанный клиентский счёт'),
    ).not.toBeInTheDocument();
  });
  it('keeps instances independent', () => {
    render(
      <>
        <PaymentPlannerWidget data={data} params={params} />
        <PaymentPlannerWidget data={data} params={params} />
      </>,
    );
    const [first, second] = screen.getAllByRole('article');
    fireEvent.change(within(first).getByRole('slider'), {
      target: { value: '2' },
    });
    expect(within(first).getByRole('slider')).toHaveValue('2');
    expect(within(second).getByRole('slider')).toHaveValue('14');
  });
});

describe('data lifecycle', () => {
  it('prioritizes initial loading, then initial error, then waiting', () => {
    const { rerender } = render(
      <PaymentPlannerWidget
        data={{ ...data, items: [], loaded: false, loading: true }}
      />,
    );
    expect(screen.getByLabelText('Загрузка плана платежей')).toBeVisible();
    expect(
      screen.queryByText('Очередь платежей пуста'),
    ).not.toBeInTheDocument();
    rerender(
      <PaymentPlannerWidget
        data={{ ...data, items: [], loaded: false, error: 'timeout' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Не удалось загрузить очередь',
    );
    rerender(
      <PaymentPlannerWidget data={{ ...data, items: [], loaded: false }} />,
    );
    expect(screen.getByText('Ожидаем данные очереди платежей.')).toBeVisible();
  });
  it('distinguishes empty source, unmatched filters, zero selection and all invalid', () => {
    const { rerender } = render(
      <PaymentPlannerWidget data={{ ...data, items: [] }} />,
    );
    expect(screen.getByText('Очередь платежей пуста')).toBeVisible();
    rerender(<PaymentPlannerWidget data={data} params={{ providerId: -1 }} />);
    expect(screen.getByText('По выбранным фильтрам счетов нет')).toBeVisible();
    rerender(
      <PaymentPlannerWidget data={data} params={{ selectedCount: 0 }} />,
    );
    expect(screen.getByText('Выберите счета для расчёта.')).toBeVisible();
    rerender(
      <PaymentPlannerWidget
        data={{ ...data, items: [{ ...fixture[0], provider_total_due: 0 }] }}
        params={{ selectedCount: 1 }}
      />,
    );
    expect(screen.getByText('Нет корректных сумм для расчёта.')).toBeVisible();
    expect(screen.getByText(/Некорректных выбранных счетов: 1/)).toBeVisible();
  });
  it('retains usable content on refresh errors and renders stale status', () => {
    render(
      <PaymentPlannerWidget
        data={{ ...data, stale: true, error: 'timeout' }}
        params={params}
      />,
    );
    expect(screen.getByText('Stale')).toBeVisible();
    expect(screen.getByText(/Не удалось обновить данные/)).toBeVisible();
    expect(screen.getByRole('slider')).toHaveValue('14');
  });
  it('retains warnings when summary is disabled', () => {
    render(
      <PaymentPlannerWidget
        data={data}
        params={{ selectedCount: 20, showSummary: false }}
      />,
    );
    expect(screen.getByText(/Некорректных выбранных счетов: 2/)).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Суммы по валютам' }),
    ).not.toBeInTheDocument();
  });
});

describe('persisted user controls', () => {
  it('restores saved controls while their external parameters are unchanged', () => {
    localStorage.setItem(
      PLANNER_CONTROLS_STORAGE_KEY,
      JSON.stringify({
        selectedCount: { signature: '14', value: 20 },
        providerId: { signature: 'all', value: 1770 },
        billingCycleId: { signature: 'all', value: 40 },
        currencyIds: { signature: '[]', value: [826] },
        breakdownCurrencyId: 826,
      }),
    );
    const { rerender } = render(
      <PaymentPlannerWidget data={data} params={params} />,
    );
    expect(screen.getByText('4 из 4 счетов')).toBeVisible();
    expect(screen.getByRole('spinbutton')).toHaveValue(20);
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('Inmarsat Global Ltd');
    expect(
      screen.getByRole('combobox', { name: 'Биллинговый цикл', exact: true }),
    ).toHaveTextContent(
      fixture.find((row) => row.billing_cycle_id === 40)?.billing_cycle_name ??
        '',
    );
    expect(screen.getByLabelText('GBP')).toBeChecked();
    expect(
      screen.getByRole('combobox', { name: 'Валюта распределения' }),
    ).toHaveTextContent('GBP');
    rerender(
      <PaymentPlannerWidget
        data={data}
        params={{ ...params, selectedCount: 3 }}
      />,
    );
    expect(screen.getByRole('spinbutton')).toHaveValue(3);
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('Inmarsat Global Ltd');
  });
  it('ignores saved controls entered against different external parameters', () => {
    localStorage.setItem(
      PLANNER_CONTROLS_STORAGE_KEY,
      JSON.stringify({
        selectedCount: { signature: '99', value: 20 },
        providerId: { signature: '1760', value: 1770 },
      }),
    );
    render(<PaymentPlannerWidget data={data} params={params} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(14);
    expect(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    ).toHaveTextContent('Все поставщики');
  });
  it('saves the full control snapshot on each user change', async () => {
    const user = userEvent.setup();
    render(<PaymentPlannerWidget data={data} params={params} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } });
    await user.click(
      screen.getByRole('combobox', { name: 'Поставщик', exact: true }),
    );
    await user.click(
      screen.getByRole('option', { name: 'Inmarsat Global Ltd', exact: true }),
    );
    expect(
      JSON.parse(localStorage.getItem(PLANNER_CONTROLS_STORAGE_KEY) ?? '{}'),
    ).toEqual({
      selectedCount: { signature: '14', value: 20 },
      providerId: { signature: 'all', value: 1770 },
      billingCycleId: { signature: 'all', value: 'all' },
      currencyIds: { signature: '[]', value: [] },
    });
  });
  it('renders with defaults when the stored snapshot is corrupt', () => {
    localStorage.setItem(PLANNER_CONTROLS_STORAGE_KEY, '{not json');
    render(<PaymentPlannerWidget data={data} params={params} />);
    expect(screen.getByText('14 из 32 счетов')).toBeVisible();
  });
});
