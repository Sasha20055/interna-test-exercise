import { test, expect, type Locator } from '@playwright/test';

async function revealFullQueue(container: Locator) {
  const scroll = container.getByRole('region', {
    name: 'Таблица очереди, прокрутка по горизонтали',
    exact: true,
  });
  await expect(container.getByRole('row')).toHaveCount(16);
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(container.getByRole('row')).toHaveCount(31);
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(container.getByRole('row')).toHaveCount(33);
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
}

test('planning workflow, full queue, native dialog focus and local operation', async ({
  page,
}) => {
  const external: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173'))
      external.push(request.url());
  });
  await page.goto('/');
  const widget = page.getByRole('article');
  await expect(widget.getByText('14 из 32 счетов')).toBeVisible();
  const slider = widget.getByRole('slider');
  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(widget.getByRole('spinbutton')).toHaveValue('1');
  await widget.getByRole('spinbutton').fill('20');
  await widget.getByRole('spinbutton').press('Enter');
  await expect(
    widget.getByText(/Некорректных выбранных счетов: 2/),
  ).toBeVisible();
  const trigger = widget.getByRole('button', { name: /Открыть всю очередь/ });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await revealFullQueue(dialog);
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).focus();
  await expect(
    dialog.getByRole('button', { name: 'Закрыть', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await widget
    .getByRole('combobox', { name: 'Поставщик', exact: true })
    .click();
  await page
    .getByRole('option', { name: 'Inmarsat Global Ltd', exact: true })
    .click();
  await expect(widget.getByText('4 из 4 счетов')).toBeVisible();
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('refresh keeps selection and open invoice; flags update details', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  await widget.getByRole('spinbutton').fill('20');
  await widget.getByRole('spinbutton').press('Enter');
  await widget.getByRole('button', { name: 'INV-77602', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Связанный клиентский счёт')).toBeVisible();
  // Host refresh controls are outside the native modal's inert background.
  await page
    .getByRole('button', { name: 'refreshing', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'INV-77602', exact: true }),
  ).toBeVisible();
  await expect(widget.getByRole('spinbutton')).toHaveValue('20');
  await page
    .getByRole('button', { name: 'ready', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Параметры виджета', exact: true })
    .click();
  await page.getByText('Изменить параметры', { exact: true }).click();
  await page.getByLabel('showCustomerBills', { exact: true }).uncheck();
  await page.keyboard.press('Escape');
  await widget.getByRole('button', { name: 'INV-77602', exact: true }).click();
  await expect(dialog.getByText('Связанный клиентский счёт')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'refresh-error', exact: true })
    .click();
  await expect(widget.getByText(/Не удалось обновить данные/)).toBeVisible();
  await expect(widget.getByRole('spinbutton')).toHaveValue('20');
});

for (const theme of ['light', 'dark']) {
  for (const size of ['full', 'half', 'third', 'quarter']) {
    test(`${size} in ${theme} theme has no page overflow and exposes its data`, async ({
      page,
    }, testInfo) => {
      await page.goto('/');
      await page.getByRole('button', { name: theme, exact: true }).click();
      await page.getByRole('button', { name: size, exact: true }).click();
      const widget = page.getByRole('article');
      await expect(widget).toHaveAttribute('data-size', size);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (size === 'quarter') {
        await widget.getByRole('button', { name: '+ ещё 2 валюты' }).click();
        await expect(widget.getByRole('term')).toHaveCount(4);
      } else {
        await expect(widget.getByRole('term')).toHaveCount(4);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await widget.screenshot({
        path: testInfo.outputPath(`${size}-${theme}.png`),
      });
      await page.setViewportSize({ width: 375, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(widget).toBeVisible();
    });
  }
}

test('contract grid renders independent instances', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Все 4', exact: true }).click();
  const widgets = page.getByRole('article');
  await expect(widgets).toHaveCount(4);
  const full = page.locator('article[data-size="full"]');
  const half = page.locator('article[data-size="half"]');
  await full.getByRole('spinbutton').fill('2');
  await full.getByRole('spinbutton').press('Enter');
  await expect(half.getByRole('slider')).toHaveValue('14');
  const spans = await page
    .locator('[data-preview-size]')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).gridColumn),
    );
  expect(spans).toEqual(['span 4', 'span 3', 'span 2', 'span 1']);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('initial and empty states remain distinct', async ({ page }) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  await page.getByRole('button', { name: 'loading', exact: true }).click();
  await expect(widget.getByLabel('Загрузка плана платежей')).toBeVisible();
  await page.getByRole('button', { name: 'error', exact: true }).click();
  await expect(widget.getByRole('alert')).toContainText(
    'Не удалось загрузить очередь',
  );
  await page.getByRole('button', { name: 'empty', exact: true }).click();
  await expect(widget.getByText('Очередь платежей пуста')).toBeVisible();
  await page.getByRole('button', { name: 'stale', exact: true }).click();
  await expect(widget.getByText('Stale')).toBeVisible();
});

test('restores persisted user controls after a page reload', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  await widget.getByRole('spinbutton').fill('20');
  await widget.getByRole('spinbutton').press('Enter');
  await widget
    .getByRole('combobox', { name: 'Поставщик', exact: true })
    .click();
  await page
    .getByRole('option', { name: 'SatCom Global', exact: true })
    .click();
  await widget.getByRole('combobox', { name: 'Валюта распределения' }).click();
  await page.getByRole('option', { name: 'USD', exact: true }).click();
  await page.reload();
  await expect(widget.getByText('7 из 7 счетов')).toBeVisible();
  await expect(widget.getByRole('spinbutton')).toHaveValue('20');
  await expect(
    widget.getByRole('combobox', { name: 'Поставщик', exact: true }),
  ).toHaveText('SatCom Global⌄');
  await expect(
    widget.getByRole('combobox', { name: 'Валюта распределения' }),
  ).toHaveText('USD⌄');
});

test('persists a single filter reset and sandbox preferences', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  const provider = widget.getByRole('combobox', {
    name: 'Поставщик',
    exact: true,
  });
  const cycle = widget.getByRole('combobox', { name: 'Биллинговый цикл' });
  const currencies = widget.getByRole('checkbox');
  await provider.click();
  await page
    .getByRole('option', { name: 'SatCom Global', exact: true })
    .click();
  await cycle.click();
  await page.getByRole('option').nth(1).click();
  await currencies.first().check();
  await widget.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await page.getByRole('button', { name: 'dark', exact: true }).click();
  await page.getByRole('button', { name: 'half', exact: true }).click();

  await page.getByRole('button', { name: 'stale', exact: true }).click();

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'stale', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(widget.getByText('Stale', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('button', { name: 'half', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'full', exact: true }).click();
  await expect(provider).toHaveText('Все поставщики⌄');
  await expect(cycle).toHaveText('Все циклы⌄');
  await expect(widget.getByRole('checkbox', { checked: true })).toHaveCount(0);
  await expect(widget.getByText('14 из 32 счетов')).toBeVisible();
});

test('shows the reference titles for each widget size', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Все 4', exact: true }).click();
  for (const title of [
    'Provider Payment Planner',
    'План платежей',
    'К оплате',
    'Платежи',
  ]) {
    await expect(
      page.getByRole('article', { name: title, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'half', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'План платежей' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Параметры виджета', exact: true })
    .click();
  await expect(
    page
      .getByRole('table', { name: 'Параметры виджета (params)' })
      .getByRole('row'),
  ).toHaveCount(10);
  await page.getByText('Изменить параметры', { exact: true }).click();
  await page.getByLabel('Заголовок (description)').fill('Мой план');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('article', { name: 'Мой план' })).toBeVisible();
});

test('uses the browser theme until the user saves a preference', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'light', exact: true }).click();
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

for (const theme of ['light', 'dark']) {
  test(`settings overlay, searchable selects and compact dialogs in ${theme}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: theme, exact: true }).click();
    const widget = page.getByRole('article');
    const initial = await widget.boundingBox();
    await page.getByRole('button', { name: 'Все 4', exact: true }).click();
    const full = page.locator('article[data-size="full"]');
    expect((await full.boundingBox())?.width).toBe(initial?.width);
    await page.getByRole('button', { name: 'full', exact: true }).click();
    const settings = page.getByRole('button', {
      name: 'Параметры виджета',
      exact: true,
    });
    await settings.click();
    const drawer = page.getByRole('dialog', {
      name: 'Параметры виджета',
      exact: true,
    });
    await expect(drawer).toBeVisible();
    expect((await widget.boundingBox())?.width).toBe(initial?.width);
    await drawer.getByText('Изменить параметры', { exact: true }).click();
    await drawer
      .getByRole('combobox', { name: 'Формат (amountFormat)' })
      .click();
    await page
      .getByRole('textbox', {
        name: 'Поиск: Формат (amountFormat)',
        exact: true,
      })
      .fill('plain');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(
      drawer.getByRole('combobox', { name: 'Формат (amountFormat)' }),
    ).toContainText('plain');
    await drawer.screenshot({
      path: testInfo.outputPath(`drawer-${theme}.png`),
    });
    await page.mouse.click(10, 200);
    await expect(drawer).not.toBeVisible();
    await expect(settings).toBeFocused();

    await widget
      .getByRole('combobox', { name: 'Поставщик', exact: true })
      .click();
    const search = page.getByRole('textbox', {
      name: 'Поиск: Поставщик',
      exact: true,
    });
    await search.fill('SatCom');
    await page.screenshot({
      path: testInfo.outputPath(`search-${theme}.png`),
      animations: 'disabled',
    });
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(widget.getByText('7 из 7 счетов')).toBeVisible();
    await widget.getByRole('button', { name: 'Сбросить фильтры' }).click();
    await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Полная очередь платежей',
      exact: true,
    });
    await revealFullQueue(dialog);
    await dialog
      .getByRole('combobox', { name: 'Поставщик', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Поиск: Поставщик', exact: true })
      .fill('nothing-matches');
    await expect(
      page.getByText('Ничего не найдено', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('region', { name: 'Содержимое окна', exact: true })
      .evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
    await expect(dialog.getByRole('row').last()).toBeInViewport();
    const gap = await dialog.evaluate((element) => {
      const table = element.querySelector(
        'section[aria-label="Очередь платежей"]',
      );
      return table
        ? element.getBoundingClientRect().bottom -
            table.getBoundingClientRect().bottom
        : Infinity;
    });
    expect(gap).toBeLessThan(40);
    await expect(
      dialog.getByRole('heading', {
        name: 'Полная очередь платежей',
        exact: true,
      }),
    ).toBeInViewport();
    await dialog.screenshot({
      path: testInfo.outputPath(`queue-${theme}.png`),
    });
    await page.mouse.click(5, 300);
    await expect(dialog).not.toBeVisible();
    await widget
      .getByRole('button', { name: 'INV-77602', exact: true })
      .click();
    const details = page.getByRole('dialog', { name: 'Детали счёта' });
    await expect(details).toBeVisible();
    await page.mouse.click(5, 300);
    await expect(details).not.toBeVisible();
    await page.setViewportSize({ width: 375, height: 700 });
    await settings.click();
    await expect(drawer).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('progressively reveals rows, corrects keyboard layout and contains table scrolling', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  const table = widget.getByRole('region', {
    name: 'Таблица очереди, прокрутка по горизонтали',
    exact: true,
  });
  await expect(widget.getByRole('row')).toHaveCount(16);
  const height = (await table.boundingBox())?.height;
  await table.evaluate((element) => {
    const threshold = element.querySelectorAll('tbody tr')[10];
    if (threshold instanceof HTMLElement)
      element.scrollTop = threshold.offsetTop - element.clientHeight + 20;
  });
  await expect(widget.getByRole('row')).toHaveCount(31);
  await table.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(widget.getByRole('row')).toHaveCount(33);
  await table.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await table.hover();
  const pageScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 1000);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  await table.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.mouse.wheel(0, -1000);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);

  await widget
    .getByRole('combobox', { name: 'Поставщик', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Поиск: Поставщик', exact: true })
    .fill('Ыфесщь');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page
    .getByRole('option', { name: 'SatCom Global', exact: true })
    .click();
  await expect(widget.getByRole('row')).toHaveCount(8);
  expect((await table.boundingBox())?.height).toBe(height);
  await table.hover();
  const shortQueueScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 1000);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await page.evaluate(() => scrollY)).toBe(shortQueueScroll);
  await widget
    .getByRole('combobox', { name: 'Биллинговый цикл', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Поиск: Биллинговый цикл', exact: true })
    .fill('t;tv');
  await expect(page.getByRole('option').first()).toContainText('Ежемесячный');
  await page.keyboard.press('Escape');
  await widget.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(widget.getByRole('row')).toHaveCount(16);
  expect((await table.boundingBox())?.height).toBe(height);
  await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Полная очередь платежей',
    exact: true,
  });
  await expect(dialog).toHaveCSS('transform', 'none');
  const before = await dialog.boundingBox();
  await revealFullQueue(dialog);
  const body = dialog.getByRole('region', {
    name: 'Содержимое окна',
    exact: true,
  });
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const modalTable = dialog.getByRole('region', {
    name: 'Таблица очереди, прокрутка по горизонтали',
    exact: true,
  });
  await modalTable.hover();
  const bodyScroll = await body.evaluate((element) => element.scrollTop);
  const documentScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 1000);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await body.evaluate((element) => element.scrollTop)).toBe(bodyScroll);
  expect(await page.evaluate(() => scrollY)).toBe(documentScroll);
  await dialog
    .getByRole('combobox', { name: 'Поставщик', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Поиск: Поставщик', exact: true })
    .fill('SatCom');
  await page
    .getByRole('option', { name: 'SatCom Global', exact: true })
    .click();
  expect(await dialog.boundingBox()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('');
});

for (const width of [1440, 375]) {
  test(`uses explicit modal heights at ${width}px`, async ({ page }) => {
    const height = 1200;
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const settings = page.getByRole('button', {
      name: 'Параметры виджета',
      exact: true,
    });
    await settings.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('transform', 'none');
    await expect(dialog.getByRole('table')).toBeVisible();
    expect((await dialog.boundingBox())?.height).toBe(height);
    expect((await dialog.boundingBox())?.y).toBe(0);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(settings).toBeFocused();

    const widget = page.getByRole('article');
    const queueTrigger = widget.getByRole('button', {
      name: /Открыть всю очередь/,
    });
    await queueTrigger.click();
    await expect(dialog).toHaveCSS('transform', 'none');
    expect((await dialog.boundingBox())?.height).toBe(height - 48);
    expect((await dialog.boundingBox())?.y).toBe(24);
    await dialog
      .getByRole('button', { name: 'INV-77602', exact: true })
      .click();
    await expect(dialog).toHaveAccessibleName('Детали счёта');
    expect((await dialog.boundingBox())?.height).toBeLessThan(height - 48);
    await dialog.getByRole('button', { name: '← К очереди' }).click();
    await expect(dialog).toHaveAccessibleName('Полная очередь платежей');
    expect((await dialog.boundingBox())?.height).toBe(height - 48);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(queueTrigger).toBeFocused();
  });
}

test('keeps modal content and geometry throughout the closing animation', async ({
  page,
}) => {
  await page.goto('/');
  for (const trigger of [
    page
      .getByRole('article')
      .getByRole('button', { name: /Открыть всю очередь/ }),
    page
      .getByRole('article')
      .getByRole('button', { name: 'INV-77602', exact: true }),
    page.getByRole('button', { name: 'Параметры виджета', exact: true }),
  ]) {
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('transform', 'none');
    const frames = await dialog.evaluate((element) => {
      if (!(element instanceof HTMLDialogElement))
        throw new Error('Expected a native dialog');
      const before = element.getBoundingClientRect();
      const heading = element.querySelector('h2')?.textContent;
      const content = element.querySelector(
        '[aria-label="Содержимое окна"]',
      )?.textContent;
      const snapshots: {
        height: number;
        width: number;
        top: number;
        heading: string | null | undefined;
        content: string | null | undefined;
      }[] = [];
      return new Promise<{
        before: { height: number; width: number; top: number };
        heading: string | null | undefined;
        content: string | null | undefined;
        snapshots: typeof snapshots;
      }>((resolve) => {
        const capture = () => {
          if (!element.open) {
            resolve({
              before: {
                height: before.height,
                width: before.width,
                top: before.top,
              },
              heading,
              content,
              snapshots,
            });
            return;
          }
          const bounds = element.getBoundingClientRect();
          snapshots.push({
            height: bounds.height,
            width: bounds.width,
            top: bounds.top,
            heading: element.querySelector('h2')?.textContent,
            content: element.querySelector('[aria-label="Содержимое окна"]')
              ?.textContent,
          });
          requestAnimationFrame(capture);
        };
        element
          .querySelector<HTMLButtonElement>('button[aria-label="Закрыть"]')
          ?.click();
        requestAnimationFrame(capture);
      });
    });
    expect(frames.snapshots.length).toBeGreaterThan(0);
    for (const frame of frames.snapshots) {
      expect(frame.height).toBeCloseTo(frames.before.height, 0);
      expect(frame.width).toBeCloseTo(frames.before.width, 0);
      expect(frame.top).toBeGreaterThanOrEqual(frames.before.top - 1);
      expect(frame.top).toBeLessThanOrEqual(frames.before.top + 13);
      expect(frame.heading).toBe(frames.heading);
      expect(frame.content).toBe(frames.content);
    }
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const trigger = page.getByRole('button', {
    name: 'Параметры виджета',
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Закрыть', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('plan warnings and refresh messages do not shift surrounding content', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  const table = widget.getByRole('region', {
    name: 'Таблица очереди, прокрутка по горизонтали',
    exact: true,
  });
  const summary = widget.getByRole('region', {
    name: 'Суммы по валютам',
    exact: true,
  });
  const beforeTable = await table.boundingBox();
  const beforeSummary = await summary.boundingBox();
  await widget.getByRole('spinbutton').fill('20');
  await widget.getByRole('spinbutton').press('Enter');
  await expect(
    widget.getByRole('status', { name: 'Состояние плана' }),
  ).toContainText('Некорректных выбранных счетов: 2');
  expect(await table.boundingBox()).toEqual(beforeTable);
  expect(await summary.boundingBox()).toEqual(beforeSummary);
  await page
    .getByRole('button', { name: 'refresh-error', exact: true })
    .click();
  await expect(
    widget.getByRole('status', { name: 'Состояние плана' }),
  ).toContainText('Не удалось обновить данные');
  await widget.getByText('Техническая информация', { exact: true }).click();
  expect(await table.boundingBox()).toEqual(beforeTable);
  expect(await summary.boundingBox()).toEqual(beforeSummary);
  await page.getByRole('button', { name: 'ready', exact: true }).click();
  await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Полная очередь платежей',
    exact: true,
  });
  await expect(dialog).toHaveCSS('transform', 'none');
  const modalSummary = dialog.getByRole('region', {
    name: 'Суммы по валютам',
    exact: true,
  });
  const modalBefore = await modalSummary.boundingBox();
  await dialog.getByRole('spinbutton').fill('14');
  await dialog.getByRole('spinbutton').press('Enter');
  await expect(
    dialog.getByRole('status', { name: 'Состояние плана' }),
  ).not.toContainText('⚠');
  expect(await modalSummary.boundingBox()).toEqual(modalBefore);
});

test('summary and notice blocks pass wheel scrolling to the page or modal body', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  await widget.getByRole('spinbutton').fill('20');
  await widget.getByRole('spinbutton').press('Enter');
  for (const block of [
    widget.getByRole('region', {
      name: 'Распределение по поставщикам',
      exact: true,
    }),
    widget.getByRole('status', { name: 'Состояние плана', exact: true }),
  ]) {
    await page.evaluate(() => scrollTo(0, 0));
    await block.hover();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 150);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before);
  }
  await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Полная очередь платежей',
    exact: true,
  });
  await expect(dialog).toHaveCSS('transform', 'none');
  const body = dialog.getByRole('region', {
    name: 'Содержимое окна',
    exact: true,
  });
  await dialog
    .getByRole('status', { name: 'Состояние плана', exact: true })
    .hover();
  const before = await body.evaluate((element) => element.scrollTop);
  const pageBefore = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 150);
  await expect
    .poll(() => body.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before);
  expect(await page.evaluate(() => scrollY)).toBe(pageBefore);
});

test('compact card composition matches the reference and warnings reveal without resizing', async ({
  page,
}, testInfo) => {
  for (const size of ['half', 'third', 'quarter']) {
    await page.goto('/');
    await page.getByRole('button', { name: size, exact: true }).click();
    const widget = page.getByRole('article');
    const before = await widget.boundingBox();
    const summary = widget.getByRole('region', {
      name: 'Суммы по валютам',
      exact: true,
    });
    await expect(summary.getByRole('term')).toHaveCount(
      size === 'quarter' ? 2 : 4,
    );
    await expect(summary).toContainText('₽');
    await expect(summary).toContainText('$');
    if (size === 'half') {
      await expect(widget.getByText('44%', { exact: true })).toBeVisible();
      await expect(
        widget.getByText('02.10.2026', { exact: true }),
      ).toBeVisible();
    }
    if (size === 'quarter') {
      await expect(
        widget.getByRole('button', { name: 'Все валюты →', exact: true }),
      ).toBeVisible();
    }
    await widget.screenshot({
      path: testInfo.outputPath(`${size}-reference.png`),
    });
    await page
      .getByRole('button', { name: 'Параметры виджета', exact: true })
      .click();
    const settings = page.getByRole('dialog', {
      name: 'Параметры виджета',
      exact: true,
    });
    await settings.getByText('Изменить параметры', { exact: true }).click();
    await settings.getByRole('slider').focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Escape');
    await expect(settings).not.toBeVisible();
    await expect(
      widget.getByRole('status', { name: 'Состояние плана' }),
    ).toContainText('⚠ Исключено: 2');
    const after = await widget.boundingBox();
    expect(after?.height).toBe(before?.height);
    await widget
      .getByRole('button', { name: 'Подробности состояния плана', exact: true })
      .click();
    await expect(
      widget.getByText(
        '⚠ Некорректных выбранных счетов: 2. Суммы исключены из итогов.',
        { exact: true },
      ),
    ).toBeVisible();
    expect((await widget.boundingBox())?.height).toBe(after?.height);
    await page.keyboard.press('Escape');
  }
});

test('table sorting preserves the plan and loading rows does not extend the document', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  const documentHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const cardHeight = (await widget.boundingBox())?.height;
  await revealFullQueue(widget);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    documentHeight,
  );
  expect((await widget.boundingBox())?.height).toBe(cardHeight);
  await widget.getByRole('button', { name: 'Дата', exact: true }).click();
  await expect(
    widget.getByRole('columnheader', { name: 'Дата' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await widget.getByRole('button', { name: 'Дата', exact: true }).click();
  await expect(
    widget.getByRole('columnheader', { name: 'Дата' }),
  ).toHaveAttribute('aria-sort', 'descending');
  await expect(
    widget.getByRole('row').nth(1).getByRole('cell').first().locator('strong'),
  ).toHaveText('32');
  await expect(
    widget.getByText('14 из 32 счетов', { exact: true }),
  ).toBeVisible();
  await expect(widget.getByRole('row')).toHaveCount(16);
  await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Сумма', exact: true }).click();
  await expect(
    dialog.getByRole('columnheader', { name: 'Сумма' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await dialog.getByRole('button', { name: 'Сумма', exact: true }).click();
  await expect(
    dialog.getByRole('columnheader', { name: 'Сумма' }),
  ).toHaveAttribute('aria-sort', 'descending');
});

test('resetting default filters also resets sorting and progress in both tables', async ({
  page,
}) => {
  await page.goto('/');
  const widget = page.getByRole('article');
  await widget.getByRole('button', { name: 'Дата', exact: true }).click();
  await widget.getByRole('button', { name: 'Дата', exact: true }).click();
  await widget
    .getByRole('button', { name: 'Сбросить фильтры', exact: true })
    .click();
  await expect(
    widget.getByRole('columnheader', { name: '№ / ранг' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await expect(
    widget.getByRole('row').nth(1).getByRole('cell').first().locator('strong'),
  ).toHaveText('1');
  await widget.getByRole('button', { name: 'Дата', exact: true }).click();
  await widget.getByRole('button', { name: /Открыть всю очередь/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Сумма', exact: true }).click();
  await revealFullQueue(dialog);
  await dialog
    .getByRole('button', { name: 'Сбросить фильтры', exact: true })
    .click();
  for (const table of [widget, dialog]) {
    await expect(
      table.getByRole('columnheader', { name: '№ / ранг' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.getByRole('row')).toHaveCount(16);
    await expect(
      table.getByRole('row').nth(1).getByRole('cell').first().locator('strong'),
    ).toHaveText('1');
  }
});
