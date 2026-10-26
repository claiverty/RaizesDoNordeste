import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await expect(page.getByRole('status').filter({ hasText: 'Pagamento simulado recusado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Pedido RN-/ })).toHaveCount(0);
  await expect(page.locator('#cart-list').getByText('Tapioca com queijo coalho')).toBeVisible();
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
