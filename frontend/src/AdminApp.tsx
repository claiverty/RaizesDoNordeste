import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getAdminOrders } from './api';
import type { AdminOrder, Channel } from './types';
import './admin.css';

const ACCESS_KEY_STORAGE = 'raizes-admin-access-key';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
type Period = '7' | '30' | 'all';
type ApiFailure = Error & { code?: string; status?: number };

function asApiFailure(value: unknown): ApiFailure {
  return value instanceof Error ? value as ApiFailure : new Error('Não foi possível acessar o painel.');
}

function unitLabel(unitId: string): string {
  const names: Record<string, string> = {
    'recife-centro': 'Recife Centro',
    'natal-norte': 'Natal Norte',
  };
  return names[unitId] ?? unitId;
}

function channelLabel(channel: Channel): string {
  const names: Record<Channel, string> = {
    APP: 'Aplicativo',
    WEB: 'Site',
    TOTEM: 'Totem',
    BALCAO: 'Balcão',
    PICKUP: 'Retirada',
  };
  return names[channel];
}

function AdminApp() {
  const [accessKey, setAccessKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [period, setPeriod] = useState<Period>('7');

  useEffect(() => {
    document.title = 'Painel administrativo | Raízes do Nordeste';
    let active = true;
    const savedKey = window.sessionStorage.getItem(ACCESS_KEY_STORAGE) ?? '';
    setDraftKey(savedKey);
    getAdminOrders(savedKey)
      .then((nextOrders) => {
        if (!active) return;
        setAccessKey(savedKey);
        setOrders(nextOrders);
        setAuthorized(true);
        setConfigured(true);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const failure = asApiFailure(caught);
        setConfigured(failure.status !== 503);
        if (failure.status === 401) {
          window.sessionStorage.removeItem(ACCESS_KEY_STORAGE);
          setErrorMessage(savedKey ? 'A chave salva nesta sessão expirou ou está incorreta.' : '');
        } else {
          setErrorMessage(failure.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const cutoff = period === 'all' ? null : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    const normalizedSearch = search.trim().toLocaleUpperCase('pt-BR');
    return orders.filter((order) => {
      if (cutoff !== null && new Date(order.createdAt).getTime() < cutoff) return false;
      if (selectedUnit !== 'all' && order.unitId !== selectedUnit) return false;
      if (selectedChannel !== 'all' && order.channel !== selectedChannel) return false;
      if (normalizedSearch && !order.orderNumber.toLocaleUpperCase('pt-BR').includes(normalizedSearch)) return false;
      return true;
    });
  }, [orders, period, search, selectedChannel, selectedUnit]);

  const summary = useMemo(() => {
    const totalCents = filteredOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const productTotals = new Map<string, { name: string; quantity: number; revenueCents: number }>();
    const channelCounts = new Map<Channel, number>();
    for (const order of filteredOrders) {
      channelCounts.set(order.channel, (channelCounts.get(order.channel) ?? 0) + 1);
      for (const item of order.items) {
        const current = productTotals.get(item.productId) ?? { name: item.name, quantity: 0, revenueCents: 0 };
        current.quantity += item.quantity;
        current.revenueCents += item.lineTotalCents;
        productTotals.set(item.productId, current);
      }
    }
    return {
      totalCents,
      averageCents: filteredOrders.length ? Math.round(totalCents / filteredOrders.length) : 0,
      products: [...productTotals.entries()]
        .map(([id, values]) => ({ id, ...values }))
        .sort((left, right) => right.quantity - left.quantity),
      channels: [...channelCounts.entries()].sort((left, right) => right[1] - left[1]),
    };
  }, [filteredOrders]);

  const dailyOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const count = filteredOrders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return createdAt >= day.getTime() && createdAt < nextDay.getTime();
      }).length;
      return {
        day,
        count,
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day).replace('.', ''),
      };
    });
  }, [filteredOrders]);

  const maxDailyCount = Math.max(1, ...dailyOrders.map((item) => item.count));

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = draftKey.trim();
    if (!candidate) {
      setErrorMessage('Informe a chave de acesso.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const nextOrders = await getAdminOrders(candidate);
      window.sessionStorage.setItem(ACCESS_KEY_STORAGE, candidate);
      setAccessKey(candidate);
      setOrders(nextOrders);
      setAuthorized(true);
      setConfigured(true);
    } catch (caught) {
      const failure = asApiFailure(caught);
      setConfigured(failure.status !== 503);
      setErrorMessage(failure.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrders() {
    setRefreshing(true);
    setErrorMessage('');
    try {
      setOrders(await getAdminOrders(accessKey));
    } catch (caught) {
      const failure = asApiFailure(caught);
      setErrorMessage(failure.message);
      if (failure.status === 401 || failure.status === 503) signOut();
    } finally {
      setRefreshing(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(ACCESS_KEY_STORAGE);
    setAccessKey('');
    setDraftKey('');
    setOrders([]);
    setAuthorized(false);
  }

  return (
    <div className="admin-shell">
      <a className="admin-skip-link" href="#admin-content">Ir para o conteúdo</a>
      <header className="admin-header">
        <a className="admin-brand" href="/" aria-label="Raízes do Nordeste — voltar ao site">
          <strong>RAÍZES</strong><span>DO NORDESTE</span>
        </a>
        <div className="admin-header-actions">
          <span className="admin-private-label"><span aria-hidden="true">●</span> Área administrativa</span>
          <a className="admin-back-link" href="/">Voltar à loja <span aria-hidden="true">↗</span></a>
          {authorized && <>
            <button className="admin-icon-button" type="button" onClick={refreshOrders} disabled={refreshing}>
              {refreshing ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button className="admin-logout" type="button" onClick={signOut}>Sair</button>
          </>}
        </div>
      </header>

      <main id="admin-content" className="admin-main">
        {loading && <div className="admin-loading" role="status">Carregando painel…</div>}

        {!loading && !authorized && configured === false && <section className="admin-access-card" aria-labelledby="admin-setup-title">
          <span className="admin-access-mark" aria-hidden="true">!</span>
          <p className="admin-eyebrow">Acesso restrito</p>
          <h1 id="admin-setup-title">Painel ainda não configurado</h1>
          <p>Defina a variável secreta <code>ADMIN_API_KEY</code> no ambiente do servidor para liberar o acesso administrativo.</p>
          {errorMessage && <p className="admin-error" role="alert">{errorMessage}</p>}
          <a className="admin-back-button" href="/">Voltar à loja</a>
        </section>}

        {!loading && !authorized && configured !== false && <section className="admin-access-card" aria-labelledby="admin-login-title">
          <span className="admin-access-mark" aria-hidden="true">RN</span>
          <p className="admin-eyebrow">Acesso restrito</p>
          <h1 id="admin-login-title">Painel administrativo</h1>
          <p>Entre com a chave de acesso da operação para consultar pedidos confirmados.</p>
          <form className="admin-login-form" onSubmit={signIn}>
            <label htmlFor="admin-access-key">Chave de acesso</label>
            <input
              id="admin-access-key"
              type="password"
              autoComplete="current-password"
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              placeholder="Digite sua chave"
              required
            />
            {errorMessage && <p className="admin-error" role="alert">{errorMessage}</p>}
            <button className="admin-primary-button" type="submit" disabled={loading}>Acessar painel <span aria-hidden="true">→</span></button>
          </form>
        </section>}

        {!loading && authorized && <>
          <section className="admin-intro">
            <div>
              <p className="admin-eyebrow">Operação Raízes do Nordeste</p>
              <h1>Visão dos pedidos</h1>
              <p>Acompanhe vendas confirmadas, unidades e itens mais pedidos.</p>
            </div>
            <span className="admin-live-badge"><span aria-hidden="true" /> Dados atualizados {dateTime.format(new Date())}</span>
          </section>

          {errorMessage && <p className="admin-error admin-dashboard-error" role="alert">{errorMessage}</p>}

          <section className="admin-filters" aria-label="Filtros dos pedidos">
            <label className="admin-filter-search" htmlFor="admin-order-search">
              <span>Buscar pedido</span>
              <input id="admin-order-search" type="search" placeholder="Ex.: RN-000123" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label htmlFor="admin-unit-filter">
              <span>Unidade</span>
              <select id="admin-unit-filter" value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)}>
                <option value="all">Todas as unidades</option>
                <option value="recife-centro">Recife Centro</option>
                <option value="natal-norte">Natal Norte</option>
              </select>
            </label>
            <label htmlFor="admin-channel-filter">
              <span>Canal</span>
              <select id="admin-channel-filter" value={selectedChannel} onChange={(event) => setSelectedChannel(event.target.value)}>
                <option value="all">Todos os canais</option>
                {(['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'] as Channel[]).map((channel) => <option key={channel} value={channel}>{channelLabel(channel)}</option>)}
              </select>
            </label>
            <label htmlFor="admin-period-filter">
              <span>Período</span>
              <select id="admin-period-filter" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="all">Todo o período disponível</option>
              </select>
            </label>
          </section>

          <section className="admin-metrics" aria-label="Indicadores do período">
            <article className="admin-metric-card">
              <span className="admin-metric-icon" aria-hidden="true">#</span>
              <p>Pedidos confirmados</p>
              <strong>{filteredOrders.length}</strong>
              <small>no período selecionado</small>
            </article>
            <article className="admin-metric-card">
              <span className="admin-metric-icon" aria-hidden="true">R$</span>
              <p>Vendas confirmadas</p>
              <strong>{currency.format(summary.totalCents / 100)}</strong>
              <small>pagamentos aprovados</small>
            </article>
            <article className="admin-metric-card">
              <span className="admin-metric-icon" aria-hidden="true">↗</span>
              <p>Ticket médio</p>
              <strong>{currency.format(summary.averageCents / 100)}</strong>
              <small>por pedido confirmado</small>
            </article>
            <article className="admin-metric-card admin-metric-highlight">
              <span className="admin-metric-icon" aria-hidden="true">★</span>
              <p>Mais pedido</p>
              <strong>{summary.products[0]?.name ?? '—'}</strong>
              <small>{summary.products[0] ? `${summary.products[0].quantity} unidades no período` : 'sem pedidos no período'}</small>
            </article>
          </section>

          <section className="admin-analysis-grid" aria-label="Análise de pedidos">
            <article className="admin-panel-card admin-chart-card">
              <div className="admin-card-heading">
                <div><p className="admin-eyebrow">Volume diário</p><h2>Pedidos por dia</h2></div>
                <span className="admin-chart-note">Últimos 7 dias</span>
              </div>
              <div className="admin-bar-chart" role="img" aria-label={`Pedidos confirmados nos últimos sete dias: ${dailyOrders.map((entry) => `${entry.label} ${entry.count}`).join(', ')}`}>
                {dailyOrders.map((entry) => <div className="admin-bar-column" key={entry.day.toISOString()}>
                  <strong>{entry.count}</strong>
                  <div className="admin-bar-track"><span style={{ height: `${entry.count ? Math.max(8, entry.count / maxDailyCount * 100) : 0}%` }} /></div>
                  <small>{entry.label}</small>
                </div>)}
              </div>
              <p className="admin-chart-footnote">O gráfico usa os pedidos recentes que correspondem aos filtros selecionados.</p>
            </article>

            <article className="admin-panel-card admin-breakdown-card">
              <div className="admin-card-heading">
                <div><p className="admin-eyebrow">Composição</p><h2>Itens mais pedidos</h2></div>
                <span className="admin-chart-note">Por quantidade</span>
              </div>
              {summary.products.length ? <ol className="admin-product-ranking">
                {summary.products.slice(0, 5).map((product, index) => <li key={product.id}>
                  <span className="admin-ranking-position">{String(index + 1).padStart(2, '0')}</span>
                  <span className="admin-ranking-name">{product.name}<small>{currency.format(product.revenueCents / 100)} em itens (bruto)</small></span>
                  <strong>{product.quantity}<small>un.</small></strong>
                </li>)}
              </ol> : <p className="admin-empty-inline">Ainda não há pedidos neste período.</p>}
              <div className="admin-channel-summary">
                <p className="admin-eyebrow">Pedidos por canal</p>
                {summary.channels.length ? summary.channels.map(([channel, count]) => <div className="admin-channel-row" key={channel}>
                  <span>{channelLabel(channel)}</span><span className="admin-channel-track"><i style={{ width: `${count / filteredOrders.length * 100}%` }} /></span><strong>{count}</strong>
                </div>) : <small>Os canais aparecerão quando houver pedidos.</small>}
              </div>
            </article>
          </section>

          <section className="admin-panel-card admin-orders-card" aria-labelledby="admin-orders-title">
            <div className="admin-card-heading admin-orders-heading">
              <div><p className="admin-eyebrow">Registro da operação</p><h2 id="admin-orders-title">Pedidos recentes</h2></div>
              <span className="admin-results-count">{filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}</span>
            </div>
            {filteredOrders.length ? <div className="admin-table-wrap" role="region" aria-label="Tabela rolável de pedidos" tabIndex={0}>
              <table className="admin-orders-table">
                <thead><tr><th>Pedido</th><th>Data e hora</th><th>Unidade</th><th>Canal</th><th>Modalidade</th><th>Itens</th><th>Pagamento</th><th className="admin-total-cell">Total</th></tr></thead>
                <tbody>{filteredOrders.map((order) => <tr key={order.orderNumber}>
                  <td><strong>{order.orderNumber}</strong><span className="admin-order-status">Confirmado</span></td>
                  <td>{dateTime.format(new Date(order.createdAt))}</td>
                  <td>{unitLabel(order.unitId)}</td>
                  <td><span className="admin-channel-pill">{channelLabel(order.channel)}</span></td>
                  <td>{order.fulfillment === 'PICKUP' ? 'Retirada' : 'Consumo na unidade'}</td>
                  <td><span className="admin-order-items">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</span></td>
                  <td>{order.payment.method === 'PIX' ? 'Pix' : 'Cartão'} <span className="admin-payment-approved">· Aprovado</span></td>
                  <td className="admin-total-cell"><strong>{currency.format(order.totalCents / 100)}</strong></td>
                </tr>)}</tbody>
              </table>
            </div> : <div className="admin-empty-state"><span aria-hidden="true">↗</span><h3>Nenhum pedido encontrado</h3><p>Ajuste os filtros ou aguarde a confirmação de novos pedidos.</p></div>}
          </section>

          <p className="admin-data-note">Os dados são demonstrativos, ficam em memória e expiram em até 24 horas. O painel omite nome e token de consulta do cliente.</p>
        </>}
      </main>
    </div>
  );
}

export default AdminApp;
