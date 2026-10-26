import { useEffect, useMemo, useRef, useState } from 'react';
import { createOrder, getMenu, getQuote, getUnits } from './api';
import heroImage from './assets/hero-mesa.webp';
import boloImage from './assets/bolo-milho.webp';
import carneImage from './assets/carne-sol.webp';
import tapiocaImage from './assets/tapioca-queijo.webp';
import queijoImage from './assets/queijo-coalho.webp';
import cuscuzImage from './assets/cuscuz-sertao.webp';
import baiaoImage from './assets/baiao-dois.webp';
import carneMacaxeiraImage from './assets/carne-sol-macaxeira.webp';
import cajaImage from './assets/suco-caja.webp';
import aguaCocoImage from './assets/agua-coco.webp';
import boloRoloImage from './assets/bolo-rolo.webp';
import cartolaImage from './assets/cartola.webp';
import sucoCajuImage from './assets/suco-caju.webp';
import sucoGraviolaImage from './assets/suco-graviola.webp';
import sucoAcerolaImage from './assets/suco-acerola.webp';
import colaImage from './assets/cola-tradicional.webp';
import colaZeroImage from './assets/cola-zero.webp';
import guaranaImage from './assets/guarana.webp';
import aguaMineralImage from './assets/agua-mineral.webp';
import tapiocaCarneSolImage from './assets/tapioca-carne-sol.webp';
import tapiocaFrangoImage from './assets/tapioca-frango.webp';
import tapiocaCocoImage from './assets/tapioca-coco.webp';
import macaxeiraFritaImage from './assets/macaxeira-frita.webp';
import farofaBananaImage from './assets/farofa-banana.webp';
import vinagreteImage from './assets/vinagrete.webp';
import type {
  Channel,
  CreatedOrder,
  Fulfillment,
  PaymentMethod,
  PaymentOutcome,
  Product,
  Quote,
  Unit,
} from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type OrderStep = 1 | 2 | 3 | 4;
type MenuCategory = 'Todos' | 'Pratos' | 'Tapiocas' | 'Acompanhamentos' | 'Bebidas' | 'Doces';
const stepPaths: Record<OrderStep, string> = { 1: '/', 2: '/cardapio', 3: '/checkout', 4: '/comprovante' };
const menuCategories: MenuCategory[] = ['Todos', 'Pratos', 'Tapiocas', 'Acompanhamentos', 'Bebidas', 'Doces'];
const productCategories: Record<string, Exclude<MenuCategory, 'Todos'>> = {
  'bolo-milho': 'Doces',
  'carne-sol': 'Pratos',
  'baiao-dois': 'Pratos',
  'carne-sol-macaxeira': 'Pratos',
  'tapioca-queijo': 'Tapiocas',
  'tapioca-carne-sol': 'Tapiocas',
  'tapioca-frango': 'Tapiocas',
  'tapioca-coco': 'Tapiocas',
  'queijo-coalho': 'Acompanhamentos',
  'macaxeira-frita': 'Acompanhamentos',
  'farofa-banana': 'Acompanhamentos',
  vinagrete: 'Acompanhamentos',
  'cuscuz-sertao': 'Pratos',
  'suco-caja': 'Bebidas',
  'suco-caju': 'Bebidas',
  'suco-graviola': 'Bebidas',
  'suco-acerola': 'Bebidas',
  'agua-coco': 'Bebidas',
  'cola-tradicional': 'Bebidas',
  'cola-zero': 'Bebidas',
  guarana: 'Bebidas',
  'agua-mineral': 'Bebidas',
  'bolo-rolo': 'Doces',
  cartola: 'Doces',
};
const productImages: Record<string, string> = {
  'bolo-milho': boloImage,
  'carne-sol': carneImage,
  'tapioca-queijo': tapiocaImage,
  'tapioca-carne-sol': tapiocaCarneSolImage,
  'tapioca-frango': tapiocaFrangoImage,
  'tapioca-coco': tapiocaCocoImage,
  'queijo-coalho': queijoImage,
  'macaxeira-frita': macaxeiraFritaImage,
  'farofa-banana': farofaBananaImage,
  vinagrete: vinagreteImage,
  'cuscuz-sertao': cuscuzImage,
  'baiao-dois': baiaoImage,
  'carne-sol-macaxeira': carneMacaxeiraImage,
  'suco-caja': cajaImage,
  'suco-caju': sucoCajuImage,
  'suco-graviola': sucoGraviolaImage,
  'suco-acerola': sucoAcerolaImage,
  'agua-coco': aguaCocoImage,
  'cola-tradicional': colaImage,
  'cola-zero': colaZeroImage,
  guarana: guaranaImage,
  'agua-mineral': aguaMineralImage,
  'bolo-rolo': boloRoloImage,
  cartola: cartolaImage,
};

function stepFromPath(pathname: string): OrderStep | null {
  const entry = Object.entries(stepPaths).find(([, path]) => path === pathname);
  return entry ? Number(entry[0]) as OrderStep : null;
}

function App() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [menu, setMenu] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('Todos');
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [couponDraft, setCouponDraft] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('PICKUP');
  const channel: Channel = 'WEB';
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome>('APPROVED');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'info' | 'success' | 'error' } | null>(null);
  const [orderKey, setOrderKey] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CreatedOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<OrderStep>(() => stepFromPath(window.location.pathname) ?? 1);
  const previousStepRef = useRef(currentStep);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  const cartItems = useMemo(
    () => Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
    [cart],
  );
  const hasCartItems = cartItems.length > 0;

  function navigateToStep(nextStep: OrderStep, replace = false) {
    const nextPath = stepPaths[nextStep];
    if (window.location.pathname !== nextPath) {
      if (replace) window.history.replaceState({ orderStep: nextStep }, '', nextPath);
      else window.history.pushState({ orderStep: nextStep }, '', nextPath);
    }
    setCurrentStep(nextStep);
  }

  useEffect(() => {
    const syncStepFromUrl = () => {
      const nextStep = stepFromPath(window.location.pathname);
      if (nextStep === null) {
        window.history.replaceState({}, '', stepPaths[1]);
        setCurrentStep(1);
        return;
      }
      setCurrentStep(nextStep);
    };
    window.addEventListener('popstate', syncStepFromUrl);
    if (stepFromPath(window.location.pathname) === null) syncStepFromUrl();
    return () => window.removeEventListener('popstate', syncStepFromUrl);
  }, []);

  useEffect(() => {
    let fallbackStep: OrderStep | null = null;
    if (currentStep === 2 && !unitId) fallbackStep = 1;
    if (currentStep === 3 && (!unitId || !hasCartItems)) fallbackStep = unitId ? 2 : 1;
    if (currentStep === 4 && !confirmedOrder) fallbackStep = hasCartItems ? 3 : unitId ? 2 : 1;
    if (fallbackStep !== null) {
      window.history.replaceState({ orderStep: fallbackStep }, '', stepPaths[fallbackStep]);
      setCurrentStep(fallbackStep);
    }
  }, [currentStep, unitId, hasCartItems, confirmedOrder]);

  useEffect(() => {
    const pageTitles: Record<OrderStep, string> = {
      1: 'Escolha sua unidade | Raízes do Nordeste',
      2: 'Cardápio | Raízes do Nordeste',
      3: 'Checkout | Raízes do Nordeste',
      4: 'Comprovante | Raízes do Nordeste',
    };
    document.title = pageTitles[currentStep];
  }, [currentStep]);

  useEffect(() => {
    let active = true;
    getUnits()
      .then((nextUnits) => {
        if (active) setUnits(nextUnits);
      })
      .catch(() => {
        if (active) setMessage({ text: 'Não foi possível carregar as unidades. Atualize a página para tentar novamente.', kind: 'error' });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!unitId) {
      setMenu([]);
      setMenuLoading(false);
      return () => { active = false; };
    }
    setMenuLoading(true);
    getMenu(unitId)
      .then((nextMenu) => {
        if (active) setMenu(nextMenu);
      })
      .catch((error: Error) => {
        if (active) {
          setMenu([]);
          setMessage({ text: error.message || 'Cardápio indisponível. Tente novamente em instantes.', kind: 'error' });
        }
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => { active = false; };
  }, [unitId]);

  useEffect(() => {
    let active = true;
    if (!unitId || !hasCartItems) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      return () => { active = false; };
    }

    const order = {
      unitId,
      channel,
      fulfillment,
      items: cartItems,
      ...(couponCode ? { couponCode } : {}),
      useLoyalty,
    };
    setQuote(null);
    setQuoteError('');
    setQuoteLoading(true);
    getQuote(order)
      .then((nextQuote) => {
        if (active) setQuote(nextQuote);
      })
      .catch((error: Error) => {
        if (active) setQuoteError(error.message || 'Sem conexão para validar o total. Tente novamente antes de confirmar.');
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => { active = false; };
  }, [unitId, fulfillment, cartItems, couponCode, useLoyalty, hasCartItems]);

  useEffect(() => {
    if (confirmedOrder) confirmationRef.current?.focus();
  }, [confirmedOrder]);

  useEffect(() => {
    if (currentStep !== previousStepRef.current && currentStep < 4) stepHeadingRef.current?.focus();
    previousStepRef.current = currentStep;
  }, [currentStep]);

  function resetAttempt() {
    setOrderKey(null);
    setConfirmedOrder(null);
    setMessage(null);
  }

  function onUnitChange(nextUnitId: string) {
    resetAttempt();
    navigateToStep(1);
    setUnitId(nextUnitId);
    setSelectedCategory('Todos');
    setCart({});
    setCouponCode('');
    setCouponDraft('');
    setQuote(null);
  }

  function updateQuantity(productId: string, quantity: number | ((current: number) => number)) {
    const product = menu.find((item) => item.id === productId);
    if (!product?.available) return;
    resetAttempt();
    setQuote(null);
    setCart((current) => {
      const next = { ...current };
      const nextQuantity = typeof quantity === 'function' ? quantity(current[productId] ?? 0) : quantity;
      if (nextQuantity < 1) delete next[productId];
      else next[productId] = Math.min(nextQuantity, 20);
      return next;
    });
  }

  function applyCoupon() {
    resetAttempt();
    setCouponCode(couponDraft.trim().toUpperCase());
  }

  function onOrderOptionChange() {
    resetAttempt();
  }

  function currentOrderBody() {
    return {
      unitId,
      channel,
      fulfillment,
      items: cartItems,
      ...(couponCode ? { couponCode } : {}),
      useLoyalty,
      ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
      payment: { method: paymentMethod, outcome: paymentOutcome },
    };
  }

  async function submitOrder() {
    if (!quote || !hasCartItems || isSubmitting) return;
    setMessage(null);
    setConfirmedOrder(null);
    setIsSubmitting(true);
    const idempotencyKey = orderKey ?? crypto.randomUUID();
    setOrderKey(idempotencyKey);
    try {
      const order = await createOrder(currentOrderBody(), idempotencyKey);
      setConfirmedOrder(order);
      setMessage(null);
      navigateToStep(4);
    } catch (caught) {
      const error = caught as Error & { code?: string };
      setMessage({ text: error.message, kind: 'error' });
      if (error.code !== 'PAYMENT_TIMEOUT' && error.code !== 'REQUEST_IN_PROGRESS') setOrderKey(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewOrder() {
    resetAttempt();
    navigateToStep(1);
    setUnitId('');
    setMenu([]);
    setCart({});
    setCouponCode('');
    setCouponDraft('');
    setUseLoyalty(false);
    setFulfillment('PICKUP');
    setCustomerName('');
    setPaymentMethod('PIX');
    setPaymentOutcome('APPROVED');
    setQuote(null);
  }

  const canSubmit = Boolean(quote) && hasCartItems && !quoteLoading && !isSubmitting && !confirmedOrder;
  const canReview = Boolean(quote) && hasCartItems && !quoteLoading;
  const selectedUnit = units.find((unit) => unit.id === unitId);
  const visibleMenu = selectedCategory === 'Todos'
    ? menu
    : menu.filter((item) => productCategories[item.id] === selectedCategory);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      <a className="skip-link" href="#pedido">Ir para o conteúdo</a>
      <header className="site-header">
        <nav className="site-nav" aria-label="Navegação principal">
          {currentStep === 1 ? <><a href="#unit-selection">UNIDADES</a><a href="#nossa-cozinha">NOSSA COZINHA</a></> : <a href="/" onClick={(event) => { event.preventDefault(); navigateToStep(1); }}>INÍCIO</a>}
        </nav>
        <a className="wordmark" href="/" aria-label="Raízes do Nordeste — início" onClick={(event) => { event.preventDefault(); navigateToStep(1); }}>
          <strong>RAÍZES</strong><span>DO NORDESTE</span>
        </a>
        <div className="header-actions">
          <span className="demo-badge">PEDIDO SIMULADO</span>
          {currentStep === 1 && <a className="header-order" href="#unit-selection">FAZER PEDIDO <span aria-hidden="true">↗</span></a>}
          {currentStep === 2 && <button className="header-order" type="button" disabled={!canReview} onClick={() => navigateToStep(3)}>CARRINHO · {itemCount}</button>}
          {currentStep === 3 && <a className="header-order" href="#summary-title">Ver resumo</a>}
          {currentStep === 4 && <button className="header-order" type="button" onClick={startNewOrder}>OUTRO PEDIDO</button>}
        </div>
      </header>

      <main id="pedido" className={`layout${currentStep === 1 ? ' landing-layout' : ''}`}>
        {currentStep === 1 ? <>
          <section className="home-hero" aria-labelledby="page-title">
            <img className="home-hero-image" src={heroImage} alt="Mesa posta com pratos nordestinos, cuscuz, tapioca, carne de sol e queijo coalho" fetchPriority="high" />
            <div className="home-hero-shade" />
            <div className="home-hero-copy">
              <p className="eyebrow">Comida com história</p>
              <h1 id="page-title" tabIndex={-1} ref={stepHeadingRef}>O Nordeste servido à mesa.</h1>
              <p>Receitas cheias de identidade, feitas para compartilhar bons momentos.</p>
              <a className="button button-lime" href="#unit-selection">ESCOLHA SUA UNIDADE <span aria-hidden="true">→</span></a>
            </div>
            <span className="hero-caption">Sabores que trazem a gente pra perto.</span>
          </section>

          <section id="unit-selection" className="unit-section" aria-labelledby="unit-title">
            <div className="unit-section-copy">
              <p className="eyebrow">Por onde começamos?</p>
              <h2 id="unit-title">Escolha sua unidade</h2>
              <p>Consulte o cardápio e a disponibilidade do local escolhido.</p>
            </div>
            <div className="unit-section-options">
              <fieldset className="unit-options">
                <legend className="sr-only">Unidades disponíveis</legend>
                {!units.length && <p className="muted">Carregando unidades…</p>}
                {units.map((unit) => {
                  const unitLabel = unit.name.replace('Raízes do Nordeste — ', '');
                  return <label className={`unit-choice${unitId === unit.id ? ' is-selected' : ''}${unit.active ? '' : ' is-unavailable'}`} key={unit.id}>
                    <input type="radio" name="unitId" value={unit.id} checked={unitId === unit.id} disabled={!unit.active} onChange={() => onUnitChange(unit.id)} />
                    <span className="unit-choice-copy"><strong>{unitLabel}</strong><small>{unit.city} · {unit.active ? 'Aberta para pedidos' : 'Temporariamente indisponível'}</small></span>
                    <span className={`unit-status${unit.active ? ' is-open' : ''}`}>{unit.active ? 'Aberta' : 'Indisponível'}</span>
                  </label>;
                })}
              </fieldset>
              <button className="button button-primary landing-cta" type="button" disabled={!unitId || menuLoading || menu.length === 0} onClick={() => { setMessage(null); navigateToStep(2); }}>
                {menuLoading ? 'Carregando cardápio…' : 'Ver cardápio'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section id="nossa-cozinha" className="home-note" aria-labelledby="kitchen-title">
            <p className="eyebrow">Raízes do Nordeste</p>
            <h2 id="kitchen-title">Um pedaço da nossa cultura em cada receita.</h2>
            <p>Do cuscuz à tapioca, reunimos sabores que fazem parte da mesa nordestina.</p>
          </section>
        </> : <>
          <section className="intro" aria-labelledby="page-title">
            <p className="eyebrow">Pedido digital · {currentStep === 4 ? 'Concluído' : `Etapa ${currentStep - 1} de 3`}</p>
            <h1 id="page-title" tabIndex={-1} ref={stepHeadingRef}>
              {currentStep === 2 && 'Cardápio da unidade'}
              {currentStep === 3 && 'Revise e confirme'}
              {currentStep === 4 && 'Comprovante do pedido'}
            </h1>
            <p>
              {currentStep === 2 && 'Escolha seus favoritos. O carrinho permanece salvo enquanto você avança e volta.'}
              {currentStep === 3 && 'Confira os itens, escolha como receber e veja o total final.'}
              {currentStep === 4 && 'Seu pedido demonstrativo foi registrado com sucesso.'}
            </p>
          </section>

          <nav className="stepper" aria-label="Etapas do pedido"><ol>
          {(['Cardápio', 'Checkout', 'Comprovante'] as const).map((label, index) => {
            const number = index + 2;
            const status = currentStep === number ? 'is-current' : currentStep > number ? 'is-complete' : '';
            return <li className={`stepper-step ${status}`} key={label}>
              <span className="stepper-number" aria-current={currentStep === number ? 'step' : undefined}>{index + 1}</span><span>{label}</span>
            </li>;
          })}
          </ol></nav>

        </>}

        {message && <div className={`message${message.kind === 'error' ? ' error' : ''}`} role="status" aria-live="polite">{message.text}</div>}

        {currentStep > 1 && <div className={`order-grid${currentStep === 3 ? '' : ' single-column'}`}>
          <div className="main-column">
            {currentStep === 2 && <section className="card menu-card" aria-labelledby="menu-title">
              <div className="section-heading"><div><h2 id="menu-title">Cardápio</h2><p>{selectedUnit ? `${selectedUnit.name} · adicione os itens que deseja.` : 'Adicione os itens que deseja.'}</p></div></div>
              <nav className="menu-categories" aria-label="Categorias do cardápio">
                {menuCategories.map((category) => <button key={category} type="button" className={`category-button${selectedCategory === category ? ' is-active' : ''}`} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}</button>)}
              </nav>
              <div id="menu-list" className="menu-list">
                {menuLoading && <p className="muted">Carregando cardápio…</p>}
                {!menuLoading && menu.length === 0 && <p className="muted">Cardápio indisponível. Volte e escolha outra unidade.</p>}
                {!menuLoading && menu.length > 0 && visibleMenu.length === 0 && <p className="muted empty-category">Nenhum item nesta categoria para esta unidade.</p>}
                {visibleMenu.map((item) => {
                  const quantity = cart[item.id] ?? 0;
                  return <article className="product" key={item.id}>
                    <div className="product-image-wrap">
                      <img className="product-image" src={productImages[item.id] ?? heroImage} alt={`Imagem ilustrativa de ${item.name}`} loading="lazy" />
                      {!item.available && <span className="product-unavailable">Indisponível hoje</span>}
                    </div>
                    <div className="product-copy"><p className="product-category">{productCategories[item.id] ?? 'Da casa'}</p><h3>{item.name}</h3><p>{item.description}</p>
                      <div className="product-footer"><strong>{item.priceCents === 0 ? 'Cortesia' : money.format(item.priceCents / 100)}</strong>
                        {item.available && quantity > 0 ? (
                          <div className="product-quantity-controls" role="group" aria-label={`Quantidade de ${item.name}`}>
                            <QuantityButton label={`Diminuir ${item.name}`} onClick={() => updateQuantity(item.id, (current) => current - 1)}>−</QuantityButton>
                            <span className="product-quantity-count" aria-label={`${quantity} unidades`}>{quantity}</span>
                            <QuantityButton label={`Aumentar ${item.name}`} disabled={quantity >= 20} onClick={() => updateQuantity(item.id, (current) => current + 1)}>+</QuantityButton>
                          </div>
                        ) : (
                          <button className="button button-add" type="button" disabled={!item.available} aria-label={`${item.available ? 'Adicionar' : 'Indisponível'} ${item.name}`} onClick={() => updateQuantity(item.id, 1)}>
                            {item.available ? 'Adicionar' : 'Indisponível'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>;
                })}
              </div>
            </section>}

            {currentStep === 2 && <>
              <section className="card menu-cart-summary" aria-label="Resumo rápido do carrinho">
                <div><strong>{itemCount === 1 ? '1 item no carrinho' : `${itemCount} itens no carrinho`}</strong><span>{quote ? money.format(quote.totalCents / 100) : quoteLoading && hasCartItems ? 'Calculando total…' : 'Adicione ao menos um item'}</span></div>
                <button className="button button-primary action-button" type="button" disabled={!canReview} onClick={() => { setMessage(null); navigateToStep(3); }}>Ir para checkout</button>
              </section>
              <div className="step-actions"><button className="button button-secondary action-button" type="button" onClick={() => window.history.back()}>Trocar unidade</button><span className="muted">Ao voltar do checkout, seus itens continuam no carrinho.</span></div>
            </>}

            {currentStep === 3 && <section className="card checkout-cart-card" aria-labelledby="checkout-cart-title">
              <div className="section-heading"><div><h2 id="checkout-cart-title">Seu carrinho</h2><p>{itemCount === 1 ? '1 item no pedido.' : `${itemCount} itens no pedido.`}</p></div></div>
              <div id="cart-list" className="cart-list checkout-cart-list">
                {!hasCartItems && <p className="muted">Seu carrinho está vazio.</p>}
                {cartItems.map(({ productId, quantity }) => {
                  const product = menu.find((item) => item.id === productId);
                  if (!product) return null;
                  return (
                    <div className="cart-line checkout-cart-line" key={product.id}>
                      <div className="checkout-cart-image"><img src={productImages[product.id] ?? heroImage} alt="" loading="lazy" /><span aria-label={`${quantity} unidades`}>{quantity}</span></div>
                      <div className="checkout-cart-detail">
                        <div className="cart-line-name">{product.name}</div>
                        <div className="cart-line-meta">{product.priceCents === 0 ? 'Cortesia' : `${money.format(product.priceCents / 100)} cada`}</div>
                        <div className="checkout-cart-controls">
                          <QuantityButton label={`Diminuir ${product.name}`} onClick={() => updateQuantity(product.id, (current) => current - 1)}>−</QuantityButton>
                          <span aria-label={`${quantity} unidades`}>{quantity}</span>
                          <QuantityButton label={`Aumentar ${product.name}`} disabled={quantity >= 20} onClick={() => updateQuantity(product.id, (current) => current + 1)}>+</QuantityButton>
                        </div>
                      </div>
                      <strong className="checkout-cart-line-total">{product.priceCents === 0 ? 'Cortesia' : money.format((product.priceCents * quantity) / 100)}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="coupon-row">
                <label htmlFor="coupon-code">Cupom</label>
                <div className="inline-control"><input id="coupon-code" type="text" maxLength={32} autoComplete="off" placeholder="Digite o código" value={couponDraft} onChange={(event) => setCouponDraft(event.target.value)} /><button id="apply-coupon" className="button button-secondary" type="button" onClick={applyCoupon}>Aplicar</button></div>
              </div>
              <label className="choice loyalty-choice"><input id="use-loyalty" type="checkbox" checked={useLoyalty} onChange={(event) => { setUseLoyalty(event.target.checked); onOrderOptionChange(); }} /><span>Usar benefício simulado de fidelidade <small>500 pontos · até R$ 3,00</small></span></label>
              <div className="step-actions checkout-back-action"><button className="button button-secondary action-button" type="button" onClick={() => window.history.back()}>Voltar ao cardápio</button></div>
            </section>}

          </div>

          {currentStep === 3 && <div className="checkout-side-column">
            {currentStep === 3 && <section className="card" aria-labelledby="options-title">
              <div className="section-heading"><div><h2 id="options-title">Como prefere?</h2><p>Sem cadastro e sem endereço para este pedido demonstrativo.</p></div></div>
              <div className="field-grid fulfillment-grid">
                <fieldset>
                  <legend>Modalidade</legend>
                  <label className="choice"><input type="radio" name="fulfillment" value="PICKUP" checked={fulfillment === 'PICKUP'} onChange={() => { setFulfillment('PICKUP'); onOrderOptionChange(); }} /><span>Retirar no balcão</span></label>
                  <label className="choice"><input type="radio" name="fulfillment" value="DINE_IN" checked={fulfillment === 'DINE_IN'} onChange={() => { setFulfillment('DINE_IN'); onOrderOptionChange(); }} /><span>Consumir na unidade</span></label>
                </fieldset>
              </div>
              <div className="field-grid checkout-fields customer-field">
                <div>
                  <label htmlFor="customer-name">Nome curto para chamada <span className="optional">opcional</span></label>
                  <input id="customer-name" name="customerName" type="text" autoComplete="given-name" maxLength={40} placeholder="Ex.: Ana" value={customerName} onChange={(event) => { setCustomerName(event.target.value); resetAttempt(); }} />
                  <small>Não informe sobrenome, CPF, telefone ou endereço.</small>
                </div>
              </div>
            </section>}

            {currentStep === 3 && <section className="card checkout-payment-card" aria-labelledby="payment-title">
              <div className="section-heading"><div><h2 id="payment-title">Pagamento</h2><p>Selecione uma opção para esta simulação.</p></div></div>
              <div className="field-grid payment-fields">
                <div>
                  <label htmlFor="payment-method">Forma de pagamento</label>
                  <select id="payment-method" value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value as PaymentMethod); onOrderOptionChange(); }}><option value="PIX">PIX</option><option value="CARD">Cartão (simulado)</option></select>
                </div>
                <div>
                  <label htmlFor="payment-outcome">Resultado simulado</label>
                  <select id="payment-outcome" value={paymentOutcome} onChange={(event) => { setPaymentOutcome(event.target.value as PaymentOutcome); onOrderOptionChange(); }}><option value="APPROVED">Aprovado</option><option value="DECLINED">Recusado</option><option value="TIMEOUT">Timeout</option></select>
                </div>
              </div>
              <div className="payment-note" aria-label="Aviso de pagamento">
                <span className="lock-mark" aria-hidden="true">✓</span>
                <div><strong>Ambiente de demonstração</strong><p>Nenhum pagamento real será feito. Nenhum dado de cartão é solicitado ou armazenado.</p></div>
              </div>
            </section>}

          {currentStep === 3 && <aside className="summary card" aria-labelledby="summary-title">
            <div className="section-heading"><div><h2 id="summary-title">Total do pedido</h2><p>Confira os valores antes de confirmar.</p></div></div>
            <div id="quote-breakdown" className="price-breakdown" aria-live="polite">
              {quoteError ? <p className="message error">{quoteError}</p> : quote ? <QuoteBreakdown quote={quote} /> : <p className="muted">{quoteLoading ? 'Calculando total…' : 'Adicione um produto para calcular o total.'}</p>}
            </div>
            <button id="submit-order" className="button button-primary" type="button" disabled={!canSubmit} onClick={submitOrder}>{isSubmitting ? 'Processando…' : 'Confirmar pedido'}</button>
            <p className="privacy-note">O nome curto é opcional e expira após 24 horas; a limpeza automática ocorre em até 1 minuto. Ao reiniciar o servidor, os pedidos de demonstração são removidos.</p>
            {confirmedOrder && <div id="confirmation" className="confirmation" role="status" aria-live="polite" tabIndex={-1} ref={confirmationRef}>
              <h3>Pedido {confirmedOrder.orderNumber} confirmado</h3>
              <p>Total: {money.format(confirmedOrder.totalCents / 100)} · {confirmedOrder.fulfillment === 'PICKUP' ? 'retirada no balcão' : 'consumo na unidade'}</p>
              <p>Pagamento aprovado pela simulação. Nenhuma cobrança real foi realizada.</p>
              <p>Guarde o número do pedido para a retirada.</p>
            </div>}
          </aside>}
          </div>}
        </div>}

        {currentStep === 4 && confirmedOrder && <section id="confirmation" className="confirmation confirmation-screen" role="status" aria-live="polite" tabIndex={-1} ref={confirmationRef}>
          <span className="confirmation-mark" aria-hidden="true">✓</span><p className="eyebrow">Pedido concluído</p>
          <h2>Pedido {confirmedOrder.orderNumber} confirmado</h2>
          <div className="receipt-pickup-code">
            <span>{confirmedOrder.fulfillment === 'PICKUP' ? 'Senha de retirada' : 'Número do pedido'}</span>
            <strong>{confirmedOrder.fulfillment === 'PICKUP' ? String(Number(confirmedOrder.orderNumber.slice(3))) : confirmedOrder.orderNumber}</strong>
            {confirmedOrder.fulfillment === 'PICKUP' && <small>Informe esta senha no balcão.</small>}
          </div>
          <div className="receipt-grid">
            <section className="receipt-section" aria-labelledby="receipt-items-title">
              <div className="receipt-section-heading"><h3 id="receipt-items-title">Itens do pedido</h3><span>{confirmedOrder.items.reduce((count, item) => count + item.quantity, 0)} itens</span></div>
              <ul className="receipt-items">
                {confirmedOrder.items.map((item) => (
                  <li className="receipt-item" key={item.productId}>
                    <div className="receipt-product">
                      <img src={productImages[item.productId] ?? heroImage} alt="" />
                      <div><strong>{item.name}</strong><small>{item.quantity} × {item.unitPriceCents === 0 ? 'Cortesia' : money.format(item.unitPriceCents / 100)}</small></div>
                    </div>
                    <strong>{item.lineTotalCents === 0 ? 'Cortesia' : money.format(item.lineTotalCents / 100)}</strong>
                  </li>
                ))}
              </ul>
              <div className="receipt-totals">
                <PriceRow label="Subtotal" cents={confirmedOrder.subtotalCents} />
                {confirmedOrder.discounts.map((discount) => <PriceRow key={`${discount.type}-${discount.code ?? discount.amountCents}`} label={discount.label} cents={-discount.amountCents} discount />)}
                <PriceRow label="Total pago" cents={confirmedOrder.totalCents} total />
              </div>
            </section>
            <section className="receipt-section" aria-labelledby="receipt-details-title">
              <h3 id="receipt-details-title">Detalhes do pedido</h3>
              <dl className="receipt-details">
                <div><dt>Unidade</dt><dd>{selectedUnit?.name ?? 'Unidade selecionada'}</dd></div>
                <div><dt>Modalidade</dt><dd>{confirmedOrder.fulfillment === 'PICKUP' ? 'Retirada no balcão' : 'Consumo na unidade'}</dd></div>
                <div><dt>Forma de pagamento</dt><dd>{confirmedOrder.payment.method === 'PIX' ? 'PIX' : 'Cartão (simulado)'}</dd></div>
                <div><dt>Status</dt><dd className="receipt-payment-status">Aprovado · simulado</dd></div>
              </dl>
              <p className="receipt-demo-note">Nenhuma cobrança real foi realizada.</p>
            </section>
          </div>
          <button className="button button-primary action-button" type="button" onClick={startNewOrder}>Fazer outro pedido</button>
        </section>}
        <footer><p>Projeto de Qualidade de Software · Raízes do Nordeste</p><p>Protótipo local · catálogo e integrações simulados</p></footer>
      </main>
    </>
  );
}

function QuantityButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: string; disabled?: boolean }) {
  return <button className="button button-qty" type="button" aria-label={label} disabled={disabled} onClick={onClick}><span className={`quantity-control-symbol${children === '+' ? ' is-plus' : ''}`} aria-hidden="true">{children}</span></button>;
}

function QuoteBreakdown({ quote }: { quote: Quote }) {
  return <>
    <PriceRow label="Subtotal" cents={quote.subtotalCents} />
    {quote.discounts.map((discount) => <PriceRow key={`${discount.type}-${discount.code ?? discount.amountCents}`} label={discount.label} cents={-discount.amountCents} discount />)}
    <PriceRow label="Total" cents={quote.totalCents} total />
  </>;
}

function PriceRow({ label, cents, discount = false, total = false }: { label: string; cents: number; discount?: boolean; total?: boolean }) {
  const className = ['price-row', discount && 'discount', total && 'total'].filter(Boolean).join(' ');
  return <div className={className}><span>{label}</span><strong>{money.format(cents / 100)}</strong></div>;
}

export default App;
