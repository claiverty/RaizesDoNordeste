import { randomUUID } from 'node:crypto';
import { AppError, badRequest } from '../domain/errors.mjs';

const units = [
  {
    id: 'recife-centro',
    name: 'Raízes do Nordeste — Recife Centro',
    city: 'Recife',
    active: true,
    channels: ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'],
  },
  {
    id: 'natal-norte',
    name: 'Raízes do Nordeste — Natal Norte',
    city: 'Natal',
    active: false,
    channels: ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'],
  },
];

const productsByUnit = {
  'recife-centro': [
    { id: 'bolo-milho', name: 'Bolo de milho', description: 'Fatia da casa, receita tradicional.', priceCents: 1250, available: true },
    { id: 'carne-sol', name: 'Escondidinho de carne de sol', description: 'Purê de macaxeira e carne de sol.', priceCents: 2890, available: true },
    { id: 'baiao-dois', name: 'Baião de dois com carne de sol', description: 'Feijão-fradinho, arroz, queijo coalho e carne de sol.', priceCents: 3190, available: true },
    { id: 'carne-sol-macaxeira', name: 'Carne de sol com macaxeira', description: 'Carne acebolada, macaxeira dourada e vinagrete.', priceCents: 3690, available: true },
    { id: 'tapioca-queijo', name: 'Tapioca com queijo coalho', description: 'Feita na hora, com queijo coalho.', priceCents: 1600, available: true },
    { id: 'tapioca-carne-sol', name: 'Tapioca de carne de sol com queijo coalho', description: 'Carne de sol desfiada e queijo coalho derretido.', priceCents: 2190, available: true },
    { id: 'tapioca-frango', name: 'Tapioca de frango cremoso', description: 'Frango desfiado, requeijão cremoso e cheiro-verde.', priceCents: 1890, available: true },
    { id: 'tapioca-coco', name: 'Tapioca de coco com leite condensado', description: 'Coco ralado fresco e leite condensado.', priceCents: 1690, available: true },
    { id: 'queijo-coalho', name: 'Queijo coalho na chapa', description: 'Porção individual.', priceCents: 950, available: true },
    { id: 'macaxeira-frita', name: 'Macaxeira frita', description: 'Porção crocante com molho de ervas da casa.', priceCents: 1290, available: true },
    { id: 'farofa-banana', name: 'Farofa de banana-da-terra', description: 'Farofa de mandioca tostada com banana dourada.', priceCents: 890, available: true },
    { id: 'vinagrete', name: 'Vinagrete da casa', description: 'Tomate, cebola, pimentão, coentro e limão.', priceCents: 590, available: true },
    { id: 'cuscuz-sertao', name: 'Cuscuz sertanejo', description: 'Indisponível nesta unidade hoje.', priceCents: 1850, available: false },
    { id: 'suco-caja', name: 'Suco de cajá', description: 'Polpa de cajá batida e servida gelada · 300 ml.', priceCents: 950, available: true },
    { id: 'suco-caju', name: 'Suco de caju', description: 'Suco de caju natural e gelado · 300 ml.', priceCents: 950, available: true },
    { id: 'suco-graviola', name: 'Suco de graviola', description: 'Suco cremoso de graviola · 300 ml.', priceCents: 1050, available: true },
    { id: 'suco-acerola', name: 'Suco de acerola', description: 'Suco de acerola natural e gelado · 300 ml.', priceCents: 890, available: true },
    { id: 'agua-coco', name: 'Água de coco', description: 'Água de coco gelada · 300 ml.', priceCents: 800, available: true },
    { id: 'cola-tradicional', name: 'Refrigerante de cola', description: 'Lata gelada · 350 ml.', priceCents: 650, available: true },
    { id: 'cola-zero', name: 'Refrigerante de cola zero', description: 'Lata gelada, sem açúcar · 350 ml.', priceCents: 650, available: true },
    { id: 'guarana', name: 'Refrigerante de guaraná', description: 'Lata gelada · 350 ml.', priceCents: 650, available: true },
    { id: 'agua-mineral', name: 'Água mineral', description: 'Garrafa de água mineral sem gás · cortesia da casa.', priceCents: 0, available: true },
    { id: 'bolo-rolo', name: 'Bolo de rolo', description: 'Massa fina enrolada com camadas de goiabada.', priceCents: 1200, available: true },
    { id: 'cartola', name: 'Cartola pernambucana', description: 'Banana dourada, queijo coalho, açúcar e canela.', priceCents: 1490, available: true },
  ],
  'natal-norte': [
    { id: 'bolo-milho', name: 'Bolo de milho', description: 'Fatia da casa, receita tradicional.', priceCents: 1290, available: true },
    { id: 'carne-sol', name: 'Escondidinho de carne de sol', description: 'Purê de macaxeira e carne de sol.', priceCents: 2950, available: true },
  ],
};

const categories = ['Pratos', 'Tapiocas', 'Acompanhamentos', 'Bebidas', 'Doces'];
const channels = ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'];
const categoryById = Object.fromEntries([
  ['Pratos', ['carne-sol', 'baiao-dois', 'carne-sol-macaxeira', 'cuscuz-sertao']],
  ['Tapiocas', ['tapioca-queijo', 'tapioca-carne-sol', 'tapioca-frango', 'tapioca-coco']],
  ['Acompanhamentos', ['queijo-coalho', 'macaxeira-frita', 'farofa-banana', 'vinagrete']],
  ['Bebidas', ['suco-caja', 'suco-caju', 'suco-graviola', 'suco-acerola', 'agua-coco', 'cola-tradicional', 'cola-zero', 'guarana', 'agua-mineral']],
  ['Doces', ['bolo-milho', 'bolo-rolo', 'cartola']],
].flatMap(([category, ids]) => ids.map((id) => [id, category])));

export function createCatalog() {
  const currentUnits = structuredClone(units);
  const menus = structuredClone(productsByUnit);
  for (const menu of Object.values(menus)) {
    for (const product of menu) Object.assign(product, { category: categoryById[product.id], imageKey: product.id });
  }

  function requireUnit(unitId) {
    const unit = currentUnits.find((candidate) => candidate.id === unitId);
    if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Unidade não encontrada.');
    return unit;
  }

  function requireProduct(unitId, productId) {
    requireUnit(unitId);
    const product = menus[unitId].find((candidate) => candidate.id === productId);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado nesta unidade.');
    return product;
  }

  function ensureUnitCanOpen(unit, menu) {
    if (unit.active && !menu.some((product) => product.available)) {
      throw new AppError(409, 'UNIT_MENU_EMPTY', 'Adicione ao menos um prato disponível antes de liberar a unidade.');
    }
  }

  return Object.freeze({
    listUnits: () => structuredClone(currentUnits),
    getUnit: (unitId) => structuredClone(currentUnits.find((unit) => unit.id === unitId) ?? null),
    getMenu: (unitId) => structuredClone(menus[unitId] ?? null),
    snapshot: () => structuredClone({ units: currentUnits, productsByUnit: menus, categories, imageKeys: Object.keys(categoryById), persistence: 'memory' }),
    createUnit(input) {
      const values = unitValues(input, false);
      if (currentUnits.length >= 100) throw new AppError(409, 'UNIT_LIMIT', 'A demonstração permite até 100 unidades.');
      if (values.active) throw new AppError(409, 'UNIT_MENU_EMPTY', 'Cadastre a unidade desativada e prepare o cardápio antes de liberá-la.');
      if (currentUnits.some((unit) => unit.name.toLocaleLowerCase('pt-BR') === values.name.toLocaleLowerCase('pt-BR') && unit.city.toLocaleLowerCase('pt-BR') === values.city.toLocaleLowerCase('pt-BR'))) {
        throw new AppError(409, 'UNIT_DUPLICATED', 'Já existe uma unidade com esse nome nesta cidade.');
      }
      const unit = { id: newId(values.name), ...values };
      currentUnits.push(unit);
      menus[unit.id] = [];
      return structuredClone(unit);
    },
    updateUnit(unitId, input) {
      const unit = requireUnit(unitId);
      const next = { ...unit, ...unitValues(input, true) };
      ensureUnitCanOpen(next, menus[unitId]);
      if (currentUnits.some((other) => other.id !== unitId && other.name.toLocaleLowerCase('pt-BR') === next.name.toLocaleLowerCase('pt-BR') && other.city.toLocaleLowerCase('pt-BR') === next.city.toLocaleLowerCase('pt-BR'))) {
        throw new AppError(409, 'UNIT_DUPLICATED', 'Já existe uma unidade com esse nome nesta cidade.');
      }
      Object.assign(unit, next);
      return structuredClone(unit);
    },
    deleteUnit(unitId) {
      const unit = requireUnit(unitId);
      currentUnits.splice(currentUnits.indexOf(unit), 1);
      delete menus[unitId];
    },
    createProduct(unitId, input) {
      requireUnit(unitId);
      const values = productValues(input, false);
      if (menus[unitId].length >= 200) throw new AppError(409, 'PRODUCT_LIMIT', 'A demonstração permite até 200 produtos por unidade.');
      const product = { id: newId(values.name), ...values };
      menus[unitId].push(product);
      return structuredClone(product);
    },
    updateProduct(unitId, productId, input) {
      const product = requireProduct(unitId, productId);
      const next = { ...product, ...productValues(input, true) };
      Object.assign(product, next);
      return structuredClone(product);
    },
    deleteProduct(unitId, productId) {
      const product = requireProduct(unitId, productId);
      menus[unitId].splice(menus[unitId].indexOf(product), 1);
    },
  });
}

function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.includes(key))) {
    throw badRequest('CATALOG_FIELDS_INVALID', 'Informe apenas os campos permitidos do cadastro.');
  }
}

function text(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[<>\u0000-\u001f]/.test(value)) {
    throw badRequest('CATALOG_FIELD_INVALID', `Confira o campo ${field} (até ${max} caracteres).`);
  }
  return value.trim();
}

function boolean(value, field) {
  if (typeof value !== 'boolean') throw badRequest('CATALOG_FIELD_INVALID', `O campo ${field} deve ser verdadeiro ou falso.`);
  return value;
}

function unitValues(input, partial) {
  fields(input, ['name', 'city', 'active', 'channels']);
  const result = {};
  if (!partial || input.name !== undefined) result.name = text(input.name, 'nome', 100);
  if (!partial || input.city !== undefined) result.city = text(input.city, 'cidade', 80);
  if (!partial || input.active !== undefined) result.active = boolean(input.active === undefined ? false : input.active, 'liberada');
  if (!partial || input.channels !== undefined) {
    const selected = input.channels ?? channels;
    if (!Array.isArray(selected) || !selected.length || selected.length > channels.length || selected.some((channel) => !channels.includes(channel)) || new Set(selected).size !== selected.length) {
      throw badRequest('CATALOG_CHANNELS_INVALID', 'Escolha canais válidos e sem repetição.');
    }
    result.channels = [...selected];
  }
  return result;
}

function productValues(input, partial) {
  fields(input, ['name', 'description', 'priceCents', 'category', 'imageKey', 'available']);
  const result = {};
  if (!partial || input.name !== undefined) result.name = text(input.name, 'nome', 100);
  if (!partial || input.description !== undefined) result.description = text(input.description, 'descrição', 300);
  if (!partial || input.priceCents !== undefined) {
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 1_000_000) throw badRequest('PRICE_INVALID', 'Informe um preço entre R$ 0,00 e R$ 10.000,00, em centavos inteiros.');
    result.priceCents = input.priceCents;
  }
  if (!partial || input.category !== undefined) {
    if (!categories.includes(input.category)) throw badRequest('CATEGORY_INVALID', 'Escolha uma categoria do cardápio.');
    result.category = input.category;
  }
  if (!partial || input.imageKey !== undefined) {
    if (input.imageKey !== '' && !Object.hasOwn(categoryById, input.imageKey)) throw badRequest('IMAGE_INVALID', 'Escolha uma foto da galeria ou a opção sem foto.');
    result.imageKey = input.imageKey;
  }
  if (!partial || input.available !== undefined) result.available = boolean(input.available, 'disponível');
  return result;
}

function newId(name) {
  const slug = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'cadastro';
  return `${slug}-${randomUUID().slice(0, 8)}`;
}

export const catalog = createCatalog();
