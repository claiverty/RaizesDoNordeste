import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const adminHeaders = { Authorization: 'Bearer admin-e2e-key-000000000000000000000000' };

test('pedido aprovado percorre a jornada em viewport mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Recife Centro/ }).check();
  await page.getByRole('button', { name: 'Ver cardápio' }).click();
  await expect(page).toHaveURL(/\/cardapio$/);
  await expect(page.locator('.product')).toHaveCount(24);
  await page.getByRole('button', { name: 'Bebidas' }).click();
  await expect(page.locator('.product')).toHaveCount(9);
  await expect(page.getByRole('heading', { name: 'Suco de caju' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Refrigerante de cola', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Refrigerante de guaraná' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Água mineral' })).toBeVisible();
  await expect(page.getByText('Cortesia', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Doces' }).click();
  await expect(page.locator('.product')).toHaveCount(3);
  await page.getByRole('button', { name: 'Todos' }).click();
  const registrationFields = await page.locator('input[type="email"], input[type="password"], input[type="tel"], input[name*="cpf"], input[name*="address"], [autocomplete*="address"]').count();
  expect(registrationFields).toBe(0);
  await page.getByRole('button', { name: 'Adicionar Bolo de milho' }).click();
  await page.getByRole('button', { name: 'Ir para checkout' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('#quote-breakdown .price-row.total strong')).toHaveText(/12,50/);
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(page).toHaveURL(/\/comprovante$/);
  await expect(page.getByRole('heading', { name: /Pedido RN-/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Itens do pedido' })).toBeVisible();
  await expect(page.getByText('Bolo de milho', { exact: true })).toBeVisible();
  await expect(page.getByText('Total pago')).toBeVisible();
  await expect(page.getByText('Forma de pagamento')).toBeVisible();
  await expect(page.getByText('PIX', { exact: true })).toBeVisible();
  await expect(page.getByText('Senha de retirada')).toBeVisible();
  await expect(page.locator('.receipt-pickup-code strong')).toHaveText(/^\d+$/);
  await expect(page.getByText(/Nenhuma cobrança real foi realizada/)).toBeVisible();
  await page.screenshot({ path: 'evidencias/e2e/ct001-confirmacao-mobile.png', fullPage: true });

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    buttons: [...document.querySelectorAll('.button')].map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.buttons.length).toBeGreaterThan(0);
  expect(dimensions.buttons.every((button) => button.width >= 44 && button.height >= 44)).toBe(true);
});

test('falha de pagamento mantém o carrinho e não mostra confirmação', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Recife Centro/ }).check();
  await page.getByRole('button', { name: 'Ver cardápio' }).click();
  await page.getByRole('button', { name: 'Adicionar Tapioca com queijo coalho' }).click();
  await page.getByRole('button', { name: 'Ir para checkout' }).click();
  await page.getByLabel('Resultado simulado').selectOption('DECLINED');
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  const paymentError = page.getByRole('status').filter({ hasText: 'Pagamento simulado recusado' });
  await expect(paymentError).toBeVisible();
  await expect(paymentError).toBeFocused();
  await expect(page.getByRole('heading', { name: /Pedido RN-/ })).toHaveCount(0);
  await expect(page.locator('#cart-list').getByText('Tapioca com queijo coalho')).toBeVisible();
  const checkoutTargets = await page.locator('.button-qty').evaluateAll((buttons) => buttons.map((button) => {
    const { width, height } = button.getBoundingClientRect();
    return { width, height };
  }));
  expect(checkoutTargets).toHaveLength(2);
  expect(checkoutTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
});

test('voltar do checkout preserva os itens do carrinho', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Recife Centro/ }).check();
  await page.getByRole('button', { name: 'Ver cardápio' }).click();
  await page.getByRole('button', { name: 'Adicionar Bolo de milho' }).click();
  await page.getByRole('button', { name: 'Ir para checkout' }).click();
  await expect(page.locator('#cart-list').getByText('Bolo de milho')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao cardápio' }).click();
  await expect(page).toHaveURL(/\/cardapio$/);
  const boloCard = page.locator('.product').filter({ has: page.getByRole('heading', { name: 'Bolo de milho' }) });
  await expect(boloCard.getByRole('button', { name: 'Diminuir Bolo de milho' })).toBeVisible();
  await expect(boloCard.locator('.product-quantity-count')).toHaveText('1');
  await expect(page.getByText('1 item no carrinho')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('radio', { name: /Recife Centro/ })).toBeChecked();
});

test('rotas de etapa abrem a aplicação e protegem checkout sem pedido', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'O Nordeste servido à mesa.' })).toBeVisible();
});

test('campos e controles básicos de acessibilidade passam na análise axe', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('link de salto, seleção de unidade e avanço funcionam com teclado', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#pedido$/);
  await expect(page.locator('#pedido')).toBeFocused();

  const recife = page.getByRole('radio', { name: /Recife Centro/ });
  await recife.focus();
  await page.keyboard.press('Space');
  await expect(recife).toBeChecked();
  const menuButton = page.getByRole('button', { name: 'Ver cardápio' });
  await expect(menuButton).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(menuButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cardapio$/);
  await expect(page.locator('#page-title')).toBeFocused();
});

test('painel administrativo exige chave e lista pedidos sem dados pessoais', async ({ page }) => {
  const orderResponse = await page.request.post('http://127.0.0.1:4173/api/v1/orders', {
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'admin-e2e-order-0001' },
    data: {
      unitId: 'recife-centro',
      channel: 'WEB',
      fulfillment: 'PICKUP',
      customerName: 'Nome sintético de teste',
      items: [{ productId: 'bolo-milho', quantity: 1 }],
      payment: { method: 'PIX', outcome: 'APPROVED' },
    },
  });
  expect(orderResponse.status()).toBe(201);
  const createdOrder = await orderResponse.json();
  const unauthorizedResponse = await page.request.get('http://127.0.0.1:4173/api/v1/admin/orders');
  expect(unauthorizedResponse.status()).toBe(401);

  await page.goto('/admin');
  await page.getByLabel('Chave de acesso').fill('admin-e2e-key-000000000000000000000000');
  await page.getByRole('button', { name: /Acessar painel/ }).click();
  await expect(page.getByRole('heading', { name: 'Visão dos pedidos' })).toBeVisible();
  const adminAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(adminAccessibility.violations).toEqual([]);
  const orderRow = page.getByRole('row').filter({ hasText: createdOrder.orderNumber });
  await expect(orderRow).toContainText('Bolo de milho');
  await expect(orderRow).not.toContainText('Nome sintético de teste');
  await expect(orderRow).not.toContainText(createdOrder.accessToken);

  const unitFilter = page.getByLabel('Unidade');
  await unitFilter.selectOption('natal-norte');
  await expect(page.getByRole('heading', { name: 'Nenhum pedido encontrado' })).toBeVisible();
  await unitFilter.selectOption('recife-centro');
  await page.getByLabel('Canal').selectOption('APP');
  await expect(page.getByRole('heading', { name: 'Nenhum pedido encontrado' })).toBeVisible();
  await page.getByLabel('Canal').selectOption('WEB');
  await page.locator('#admin-period-filter').selectOption('all');
  await page.getByLabel('Buscar pedido').fill(createdOrder.orderNumber);
  await expect(page.getByRole('row').filter({ hasText: createdOrder.orderNumber })).toBeVisible();
  await page.getByLabel('Buscar pedido').fill('RN-INEXISTENTE');
  await expect(page.getByRole('heading', { name: 'Nenhum pedido encontrado' })).toBeVisible();

  await page.getByLabel('Buscar pedido').fill('');
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await page.screenshot({ path: 'evidencias/e2e/admin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Painel administrativo' })).toBeVisible();
  expect(await page.evaluate(() => globalThis.sessionStorage.getItem('raizes-admin-access-key'))).toBeNull();
});

test('quantidades preservam o foco ao adicionar, limitar e remover pelo teclado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Recife Centro/ }).check();
  await page.getByRole('button', { name: 'Ver cardápio' }).click();
  await page.getByRole('button', { name: 'Tapiocas', exact: true }).click();
  const add = page.getByRole('button', { name: 'Adicionar Tapioca com queijo coalho', exact: true });
  const increase = page.getByRole('button', { name: 'Aumentar Tapioca com queijo coalho', exact: true });
  const decrease = page.getByRole('button', { name: 'Diminuir Tapioca com queijo coalho', exact: true });
  const announcement = page.getByRole('status').filter({ hasText: 'Tapioca com queijo coalho' });

  await add.focus();
  await page.keyboard.press('Enter');
  await expect(increase).toBeFocused();
  await expect(announcement).toHaveText('Tapioca com queijo coalho: 1 unidade no carrinho.');
  await page.keyboard.press('Enter');
  await expect(increase).toBeFocused();
  await expect(announcement).toHaveText('Tapioca com queijo coalho: 2 unidades no carrinho.');
  const quantityTargets = await page.getByRole('group', { name: 'Quantidade de Tapioca com queijo coalho' }).getByRole('button').evaluateAll((buttons) => buttons.map((button) => {
    const { width, height } = button.getBoundingClientRect();
    return { width, height };
  }));
  expect(quantityTargets).toHaveLength(2);
  expect(quantityTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: 'evidencias/e2e/ct026-quantidade-teclado.png' });

  await page.keyboard.press('Shift+Tab');
  await expect(decrease).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(add).toBeFocused();
  await expect(announcement).toHaveText('Tapioca com queijo coalho removido do carrinho.');
  await expect(page.getByText('0 itens no carrinho', { exact: true })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(increase).toBeFocused();
  for (let quantity = 1; quantity < 20; quantity += 1) await page.keyboard.press('Enter');
  await expect(increase).toBeDisabled();
  await expect(decrease).toBeFocused();
  await expect(announcement).toHaveText('Tapioca com queijo coalho: 20 unidades no carrinho.');
  await page.keyboard.press('Enter');
  await expect(increase).toBeEnabled();
  await expect(decrease).toBeFocused();
  await expect(announcement).toHaveText('Tapioca com queijo coalho: 19 unidades no carrinho.');
});

test('admin cadastra, edita, libera e exclui produtos e unidades com confirmação', async ({ page }) => {
  await page.goto('/admin/unidades');
  await page.getByLabel('Chave de acesso').fill('admin-e2e-key-000000000000000000000000');
  await page.getByRole('button', { name: 'Acessar painel' }).click();
  await expect(page.getByRole('heading', { name: 'Gerenciar unidades' })).toBeVisible();
  await page.getByRole('button', { name: 'Nova unidade', exact: true }).click();
  await page.getByLabel('Nome da unidade').fill('Unidade QA Litoral');
  await page.getByLabel('Cidade', { exact: true }).fill('Olinda');
  await page.getByRole('button', { name: 'Salvar unidade' }).click();
  const unitCard = page.getByRole('article', { name: 'Unidade QA Litoral', exact: true });
  await expect(unitCard.getByRole('button', { name: 'Liberar Unidade QA Litoral' })).toBeDisabled();
  await unitCard.getByRole('link', { name: 'Gerenciar cardápio' }).click();
  await expect(page).toHaveURL(/\/admin\/cardapio\?unidade=/);
  await expect(page.getByRole('heading', { name: 'Gerenciar cardápio' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo produto', exact: true }).click();
  await page.getByLabel('Nome do produto').fill('Peixe QA');
  await page.getByLabel('Descrição', { exact: true }).fill('Peixe com arroz e salada.');
  await page.getByLabel('Preço (R$)').fill('24,90');
  await page.getByLabel('Foto da galeria').selectOption('carne-sol-macaxeira');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  await page.getByRole('button', { name: 'Editar Peixe QA', exact: true }).click();
  await page.getByLabel('Nome do produto').fill('Peixe grelhado QA');
  await page.getByLabel('Preço (R$)').fill('26,50');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  const productCard = page.getByRole('article', { name: 'Peixe grelhado QA', exact: true });
  await expect(productCard).toContainText('26,50');
  await productCard.getByRole('button', { name: 'Indisponibilizar Peixe grelhado QA' }).click();
  await expect(productCard.getByText('Indisponível', { exact: true })).toBeVisible();
  await productCard.getByRole('button', { name: 'Disponibilizar Peixe grelhado QA', exact: true }).click();
  const menuAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(menuAxe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: 'evidencias/e2e/admin-cardapio-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Unidades', exact: true }).click();
  await unitCard.getByRole('button', { name: 'Liberar Unidade QA Litoral' }).click();
  await expect(unitCard.getByText('Liberada para pedidos')).toBeVisible();
  const unitAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(unitAxe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: 'evidencias/e2e/admin-unidades-mobile.png', fullPage: true });

  const customer = await page.context().newPage();
  await customer.goto('/');
  await customer.getByRole('radio', { name: /Unidade QA Litoral/ }).check();
  await customer.getByRole('button', { name: 'Ver cardápio' }).click();
  await customer.getByRole('button', { name: 'Pratos', exact: true }).click();
  await customer.getByRole('button', { name: 'Adicionar Peixe grelhado QA' }).click();
  await customer.getByRole('button', { name: 'Ir para checkout' }).click();
  await customer.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(customer.getByRole('heading', { name: /Pedido RN-/ })).toBeVisible();
  await expect(customer.getByText('Unidade QA Litoral', { exact: true })).toBeVisible();
  await unitCard.getByRole('button', { name: 'Desativar Unidade QA Litoral' }).click();
  await expect(unitCard.getByText('Desativada', { exact: true })).toBeVisible();
  await unitCard.getByRole('link', { name: 'Gerenciar cardápio' }).click();
  await page.getByRole('button', { name: 'Excluir Peixe grelhado QA' }).click();
  const deletion = page.getByRole('dialog');
  await expect(deletion.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await deletion.getByRole('button', { name: 'Cancelar' }).click();
  await expect(productCard).toBeVisible();
  await page.getByRole('button', { name: 'Excluir Peixe grelhado QA' }).click();
  const dialogAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(dialogAxe.violations).toEqual([]);
  await deletion.getByRole('button', { name: 'Excluir produto', exact: true }).click();
  await expect(productCard).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Gerenciar cardápio' })).toBeFocused();
  await page.getByRole('link', { name: 'Unidades', exact: true }).click();
  await unitCard.getByRole('button', { name: 'Excluir Unidade QA Litoral' }).click();
  await deletion.getByRole('button', { name: 'Excluir unidade', exact: true }).click();
  await expect(unitCard).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Gerenciar unidades' })).toBeFocused();
  const orders = await (await page.request.get('/api/v1/admin/orders', { headers: adminHeaders })).json();
  expect(orders.orders.some((order) => order.unitName === 'Unidade QA Litoral' && order.items.some((item) => item.name === 'Peixe grelhado QA') && order.totalCents === 2650)).toBe(true);
  await customer.close();
});

test('checkout atualiza o total e pede nova confirmação quando o admin muda o preço', async ({ page }) => {
  const created = await (await page.request.post('/api/v1/admin/units', { headers: adminHeaders, data: { name: 'Unidade QA Preço', city: 'Recife', active: false } })).json();
  const unit = created.units.find((entry) => entry.name === 'Unidade QA Preço');
  const added = await (await page.request.post(`/api/v1/admin/units/${unit.id}/products`, { headers: adminHeaders, data: { name: 'Prato de teste', description: 'Porção individual.', priceCents: 1000, category: 'Pratos', imageKey: '', available: true } })).json();
  const product = added.productsByUnit[unit.id][0];
  await page.request.patch(`/api/v1/admin/units/${unit.id}`, { headers: adminHeaders, data: { active: true } });
  await page.goto('/');
  await page.getByRole('radio', { name: /Unidade QA Preço/ }).check();
  await page.getByRole('button', { name: 'Ver cardápio' }).click();
  await page.getByRole('button', { name: 'Adicionar Prato de teste' }).click();
  await page.getByRole('button', { name: 'Ir para checkout' }).click();
  await expect(page.locator('#quote-breakdown .price-row.total strong')).toHaveText(/10,00/);
  await page.request.patch(`/api/v1/admin/units/${unit.id}/products/${product.id}`, { headers: adminHeaders, data: { priceCents: 1200 } });
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'O cardápio foi atualizado' })).toBeFocused();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('#quote-breakdown .price-row.total strong')).toHaveText(/12,00/);
  await expect(page.locator('.cart-line-meta')).toHaveText(/12,00 cada/);
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(page).toHaveURL(/\/comprovante$/);
  await expect(page.locator('.receipt-totals')).toContainText('12,00');
  await page.request.delete(`/api/v1/admin/units/${unit.id}`, { headers: adminHeaders });
});
