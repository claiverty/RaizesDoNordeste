import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminCatalogRequest } from './api';
import { productImages } from './product-media';
import Icon from './Icon';
import type { AdminCatalog, Product, ProductInput, Unit, UnitInput } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type ProductDraft = ProductInput & { id?: string; price: string };
type UnitDraft = UnitInput & { id?: string };
type Removal = { kind: 'product' | 'unit'; id: string; name: string; unitId?: string };

interface Props {
  section: 'menu' | 'units';
  catalog: AdminCatalog;
  accessPin: string;
  onChange: (catalog: AdminCatalog) => void;
  onUnauthorized: () => void;
}

export default function AdminCatalogManager({ section, catalog, accessPin, onChange, onUnauthorized }: Props) {
  const requestedUnit = new URLSearchParams(window.location.search).get('unidade');
  const [selectedUnit, setSelectedUnit] = useState(requestedUnit ?? catalog.units[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [unitDraft, setUnitDraft] = useState<UnitDraft | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formSession, setFormSession] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const restoreHeadingAfterRemoval = useRef(false);
  const unitId = catalog.units.some((unit) => unit.id === selectedUnit) ? selectedUnit : catalog.units[0]?.id ?? '';
  const unit = catalog.units.find((entry) => entry.id === unitId);
  const products = catalog.productsByUnit[unitId] ?? [];
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const filteredProducts = products.filter((product) => `${product.name} ${product.category}`.toLocaleLowerCase('pt-BR').includes(term));
  const filteredUnits = catalog.units.filter((entry) => `${entry.name} ${entry.city}`.toLocaleLowerCase('pt-BR').includes(term));

  useEffect(() => { if (formSession) nameRef.current?.focus(); }, [formSession]);
  useEffect(() => { if (error && !removal) errorRef.current?.focus(); }, [error, removal]);
  useEffect(() => {
    if (!removal && restoreHeadingAfterRemoval.current) {
      restoreHeadingAfterRemoval.current = false;
      headingRef.current?.focus();
    }
  }, [removal]);

  function clearForm(focus = true) {
    setProductDraft(null);
    setUnitDraft(null);
    if (focus) headingRef.current?.focus();
  }

  function openProduct(product?: Product) {
    setError('');
    setNotice('');
    setProductDraft(product ? { ...product, price: (product.priceCents / 100).toFixed(2).replace('.', ',') }
      : { name: '', description: '', category: 'Pratos', priceCents: 0, price: '', imageKey: '', available: true });
    setFormSession((session) => session + 1);
  }

  function openUnit(entry?: Unit) {
    setError('');
    setNotice('');
    setUnitDraft(entry ? { ...entry } : { name: '', city: '', active: false, channels: ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'] });
    setFormSession((session) => session + 1);
  }

  async function mutate(path: string, method: string, body: unknown, success: string): Promise<boolean> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      onChange(await adminCatalogRequest(accessPin, path, method, body));
      setNotice(success);
      return true;
    } catch (caught) {
      const failure = caught as Error & { status?: number };
      setError(failure.message || 'Não foi possível salvar. Tente novamente.');
      if (failure.status === 401 || failure.status === 503) onUnauthorized();
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productDraft || !unitId || busy) return;
    if (!/^\d{1,5}(?:[,.]\d{1,2})?$/.test(productDraft.price.trim())) {
      setError('Informe um preço como 18,90. Use 0 para cortesia.');
      return;
    }
    const [whole, fraction = ''] = productDraft.price.trim().replace(',', '.').split('.');
    const input: ProductInput = {
      name: productDraft.name, description: productDraft.description, category: productDraft.category,
      priceCents: Number(whole) * 100 + Number(fraction.padEnd(2, '0')), imageKey: productDraft.imageKey, available: productDraft.available,
    };
    const path = `/units/${encodeURIComponent(unitId)}/products${productDraft.id ? `/${encodeURIComponent(productDraft.id)}` : ''}`;
    if (await mutate(path, productDraft.id ? 'PATCH' : 'POST', input, productDraft.id ? 'Produto atualizado.' : 'Produto cadastrado no cardápio.')) clearForm();
  }

  async function saveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unitDraft || busy) return;
    const { id, ...input } = unitDraft;
    if (await mutate(`/units${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PATCH' : 'POST', input, id ? 'Unidade atualizada.' : 'Unidade cadastrada. Prepare o cardápio antes de liberá-la.')) clearForm();
  }

  async function remove() {
    if (!removal || busy) return;
    const path = removal.kind === 'unit' ? `/units/${encodeURIComponent(removal.id)}` : `/units/${encodeURIComponent(removal.unitId!)}/products/${encodeURIComponent(removal.id)}`;
    if (await mutate(path, 'DELETE', undefined, removal.kind === 'unit' ? 'Unidade e seu cardápio excluídos. Pedidos confirmados foram preservados.' : 'Produto excluído. Pedidos confirmados foram preservados.')) {
      restoreHeadingAfterRemoval.current = true;
      setRemoval(null);
      clearForm();
    }
  }

  return <>
    <section className="admin-intro">
      <div><p className="admin-eyebrow">Gestão da operação</p><h1 ref={headingRef} tabIndex={-1}>{section === 'menu' ? 'Gerenciar cardápio' : 'Gerenciar unidades'}</h1>
        <p>{section === 'menu' ? 'Cadastre produtos e controle o que cada unidade oferece.' : 'Prepare novas lojas e controle quais recebem pedidos.'}</p></div>
      <button className="admin-primary-button" type="button" disabled={busy || (section === 'menu' && !unit)} onClick={() => section === 'menu' ? openProduct() : openUnit()}><Icon name="plus" />{section === 'menu' ? 'Novo produto' : 'Nova unidade'}</button>
    </section>

    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {error && !removal && <p className="admin-error admin-dashboard-error" ref={errorRef} tabIndex={-1} role="alert">{error}</p>}

    <section className="admin-management-toolbar" aria-label="Filtros dos cadastros">
      {section === 'menu' && <label htmlFor="management-unit">Unidade<select id="management-unit" value={unitId} disabled={busy || productDraft !== null} onChange={(event) => { setSelectedUnit(event.target.value); setSearch(''); setNotice(''); setError(''); }}>
        {!catalog.units.length && <option value="">Nenhuma unidade cadastrada</option>}
        {catalog.units.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.active ? '' : ' · desativada'}</option>)}
      </select></label>}
      <label htmlFor="management-search">{section === 'menu' ? 'Buscar produto' : 'Buscar unidade'}<input id="management-search" type="search" value={search} placeholder={section === 'menu' ? 'Nome ou categoria' : 'Nome ou cidade'} onChange={(event) => setSearch(event.target.value)} /></label>
    </section>

    {productDraft && <section className="admin-panel-card admin-editor" aria-labelledby="product-form-title">
      <h2 id="product-form-title">{productDraft.id ? 'Editar produto' : 'Novo produto'}<small>{unit?.name}</small></h2>
      <form onSubmit={saveProduct} className="admin-management-form">
        <label htmlFor="product-name">Nome do produto<input ref={nameRef} id="product-name" required maxLength={100} value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
        <label htmlFor="product-category">Categoria<select id="product-category" value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value as ProductInput['category'] })}>{catalog.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="admin-field-wide" htmlFor="product-description">Descrição<textarea id="product-description" required rows={3} maxLength={300} value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label>
        <label htmlFor="product-price">Preço (R$)<input id="product-price" inputMode="decimal" required placeholder="18,90" aria-describedby="product-price-help" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /><small id="product-price-help">Use 0 para oferecer como cortesia.</small></label>
        <label htmlFor="product-photo">Foto da galeria<select id="product-photo" value={productDraft.imageKey} onChange={(event) => setProductDraft({ ...productDraft, imageKey: event.target.value })}><option value="">Sem foto</option>{catalog.imageKeys.map((key) => <option key={key} value={key}>{Object.values(catalog.productsByUnit).flat().find((product) => product.id === key)?.name ?? key.replaceAll('-', ' ')}</option>)}</select></label>
        {productImages[productDraft.imageKey] && <img className="admin-photo-preview" src={productImages[productDraft.imageKey]} alt="Prévia da foto escolhida" />}
        <label className="admin-checkbox admin-field-wide"><input type="checkbox" checked={productDraft.available} onChange={(event) => setProductDraft({ ...productDraft, available: event.target.checked })} />Disponível para pedidos</label>
        <div className="admin-form-actions admin-field-wide"><button className="admin-primary-button" type="submit" disabled={busy}><Icon name="save" />{busy ? 'Salvando…' : 'Salvar produto'}</button><button className="admin-back-button" type="button" disabled={busy} onClick={() => clearForm()}>Cancelar</button></div>
      </form>
    </section>}

    {unitDraft && <section className="admin-panel-card admin-editor" aria-labelledby="unit-form-title">
      <h2 id="unit-form-title">{unitDraft.id ? 'Editar unidade' : 'Nova unidade'}</h2>
      <form onSubmit={saveUnit} className="admin-management-form">
        <label htmlFor="unit-name">Nome da unidade<input ref={nameRef} id="unit-name" required maxLength={100} placeholder="Recife Boa Viagem" value={unitDraft.name} onChange={(event) => setUnitDraft({ ...unitDraft, name: event.target.value })} /></label>
        <label htmlFor="unit-city">Cidade<input id="unit-city" required maxLength={80} value={unitDraft.city} onChange={(event) => setUnitDraft({ ...unitDraft, city: event.target.value })} /></label>
        <p className="admin-field-help admin-field-wide">Novas unidades começam desativadas. Cadastre ao menos um produto disponível e use “Liberar” para começar a receber pedidos.</p>
        <div className="admin-form-actions admin-field-wide"><button className="admin-primary-button" type="submit" disabled={busy}><Icon name="save" />{busy ? 'Salvando…' : 'Salvar unidade'}</button><button className="admin-back-button" type="button" disabled={busy} onClick={() => clearForm()}>Cancelar</button></div>
      </form>
    </section>}

    {section === 'menu' ? <section className="admin-management-grid" aria-label="Produtos da unidade">
      {filteredProducts.map((product) => <article className="admin-panel-card admin-product-card" key={product.id} aria-labelledby={`name-${product.id}`}>
        <div className="admin-product-thumb">{productImages[product.imageKey] ? <img src={productImages[product.imageKey]} alt="" loading="lazy" /> : <span>Sem foto</span>}</div>
        <div className="admin-product-details"><p className="admin-eyebrow">{product.category}</p><h2 id={`name-${product.id}`}>{product.name}</h2><p>{product.description}</p><div className="admin-product-meta"><strong>{product.priceCents ? money.format(product.priceCents / 100) : 'Cortesia'}</strong><span className={`admin-availability${product.available ? ' is-available' : ''}`}>{product.available ? 'Disponível' : 'Indisponível'}</span></div></div>
        <div className="admin-row-actions"><button type="button" disabled={busy} aria-label={`Editar ${product.name}`} onClick={() => openProduct(product)}><Icon name="edit" />Editar</button><button type="button" disabled={busy} aria-label={`${product.available ? 'Indisponibilizar' : 'Disponibilizar'} ${product.name}`} onClick={() => { clearForm(false); void mutate(`/units/${encodeURIComponent(unitId)}/products/${encodeURIComponent(product.id)}`, 'PATCH', { available: !product.available }, product.available ? 'Produto marcado como indisponível.' : 'Produto disponível para pedidos.'); }}><Icon name={product.available ? 'eyeClosed' : 'eye'} />{product.available ? 'Indisponibilizar' : 'Disponibilizar'}</button><button className="admin-delete-button" type="button" disabled={busy} aria-label={`Excluir ${product.name}`} onClick={() => { setError(''); setRemoval({ kind: 'product', id: product.id, name: product.name, unitId }); }}><Icon name="trash" />Excluir</button></div>
      </article>)}
      {!filteredProducts.length && <div className="admin-empty-state admin-panel-card"><h2>{!catalog.units.length ? 'Cadastre sua primeira unidade' : products.length ? 'Nenhum produto encontrado' : 'O cardápio está vazio'}</h2><p>{!catalog.units.length ? 'Abra Unidades para criar uma loja.' : products.length ? 'Tente outro nome ou categoria.' : 'Use Novo produto para começar.'}</p></div>}
    </section> : <section className="admin-management-grid" aria-label="Unidades cadastradas">
      {filteredUnits.map((entry) => {
        const menu = catalog.productsByUnit[entry.id] ?? [];
        const availableCount = menu.filter((product) => product.available).length;
        return <article className="admin-panel-card admin-unit-card" key={entry.id} aria-labelledby={`name-${entry.id}`}>
          <div className="admin-unit-status"><span className={`admin-availability${entry.active ? ' is-available' : ''}`}>{entry.active ? 'Liberada para pedidos' : 'Desativada'}</span><span>{menu.length} {menu.length === 1 ? 'produto' : 'produtos'}</span></div>
          <h2 id={`name-${entry.id}`}>{entry.name}</h2><p>{entry.city}</p>
          {!entry.active && !availableCount && <p className="admin-field-help">Adicione um produto disponível para liberar esta unidade.</p>}
          <a className="admin-manage-menu-link" href={`/admin/cardapio?unidade=${encodeURIComponent(entry.id)}`}>Gerenciar cardápio <Icon name="arrowRight" /></a>
          <div className="admin-row-actions"><button type="button" disabled={busy} aria-label={`Editar ${entry.name}`} onClick={() => openUnit(entry)}><Icon name="edit" />Editar</button><button type="button" disabled={busy || (!entry.active && !availableCount)} aria-label={`${entry.active ? 'Desativar' : 'Liberar'} ${entry.name}`} onClick={() => { clearForm(false); void mutate(`/units/${encodeURIComponent(entry.id)}`, 'PATCH', { active: !entry.active }, entry.active ? 'Unidade desativada para novos pedidos.' : 'Unidade liberada para pedidos.'); }}><Icon name={entry.active ? 'lock' : 'store'} />{entry.active ? 'Desativar' : 'Liberar'}</button><button className="admin-delete-button" type="button" disabled={busy} aria-label={`Excluir ${entry.name}`} onClick={() => { setError(''); setRemoval({ kind: 'unit', id: entry.id, name: entry.name }); }}><Icon name="trash" />Excluir</button></div>
        </article>;
      })}
      {!filteredUnits.length && <div className="admin-empty-state admin-panel-card"><h2>{catalog.units.length ? 'Nenhuma unidade encontrada' : 'Nenhuma unidade cadastrada'}</h2><p>{catalog.units.length ? 'Tente outro nome ou cidade.' : 'Use Nova unidade para começar.'}</p></div>}
    </section>}

    {removal && <DeleteDialog name={removal.name} unit={removal.kind === 'unit'} busy={busy} error={error} onClose={() => { setRemoval(null); setError(''); }} onConfirm={() => void remove()} />}
  </>;
}

function DeleteDialog({ name, unit, busy, error, onClose, onConfirm }: { name: string; unit: boolean; busy: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="admin-delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <p className="admin-eyebrow">Confirmar exclusão</p><h2 id="delete-title">Excluir {name}?</h2>
    <p id="delete-description">{unit ? 'A unidade e todos os produtos do seu cardápio serão removidos.' : 'Este produto será removido do cardápio desta unidade.'} Pedidos já confirmados serão preservados. Esta ação não pode ser desfeita nesta sessão.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="admin-form-actions"><button autoFocus className="admin-back-button" type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className="admin-primary-button admin-confirm-delete" type="button" disabled={busy} onClick={onConfirm}><Icon name="trash" />{busy ? 'Excluindo…' : unit ? 'Excluir unidade' : 'Excluir produto'}</button></div>
  </dialog>;
}

