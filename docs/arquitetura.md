# Arquitetura

## Visão e contexto

Protótipo de monólito modular com API em Node.js 24 e JavaScript ESM, e SPA em React + TypeScript estrito compilada por Vite. O build da interface fica em `dist/client`; o servidor HTTP nativo entrega a SPA e a API na mesma origem. No desenvolvimento, Vite roda separado com HMR e encaminha `/api` para o servidor Node. O repositório em memória e os mocks permitem testes rápidos e determinísticos; reinício apaga pedidos, chaves e estado de limite. Persistência em memória é um trade-off didático e bloqueia uso comercial.

A SPA apresenta uma etapa por vez em rotas próprias: LP `/` para escolher unidade, `/cardapio`, `/checkout` e `/comprovante`. O progresso fica visível durante a jornada, e voltar/avançar pelo navegador mantém o estado do pedido na sessão atual.

```mermaid
flowchart LR
  C[Cliente APP / WEB / TOTEM / BALCÃO / PICKUP] -->|HTTP local ou HTTPS no deploy| S[Raízes do Nordeste]
  S --> UI[SPA React + TypeScript]
  V[Vite: build e servidor de desenvolvimento] -. compila .-> UI
  UI -->|JSON /api/v1| API[API HTTP]
  API --> DOM[Aplicação e domínio de pedidos]
  DOM --> CAT[Catálogo por unidade]
  DOM --> LOY[Mock de fidelidade]
  DOM --> PAY[Mock de pagamento]
  DOM --> STORE[(Repositório em memória)]
  EXT[Gateway / fidelidade / POS reais - fora do escopo] -. futura substituição .-> LOY
  EXT -. futura substituição .-> PAY
```

## Componentes e responsabilidades

```mermaid
flowchart TB
  subgraph HTTP[Interface e transporte]
    STATIC[Build Vite: SPA e assets]
    ROUTES[Rotas /api/v1]
    VALID[Parser, validação, limite de corpo e rate limit]
  end
  subgraph APP[Aplicação e domínio]
    UC[CreateOrder use case]
    RULES[Regras: disponibilidade, preço, desconto, status]
    ERR[Erros de domínio estruturados]
  end
  subgraph INFRA[Infraestrutura substituível]
    CATALOG[Catálogo fixo por unidade]
    MEMORY[(OrderStore em memória)]
    LOYALTY[Loyalty mock]
    PAYMENT[Payment mock]
  end
  STATIC --> ROUTES
  ROUTES --> VALID --> UC
  UC --> RULES
  RULES --> CATALOG
  UC --> MEMORY
  UC --> LOYALTY
  UC --> PAYMENT
  UC --> ERR
```

## Fluxo de realização do pedido

```mermaid
sequenceDiagram
  actor Cliente
  participant UI as Interface
  participant API as API
  participant UC as Aplicação/domínio
  participant Store as Store em memória
  participant Loyalty as Fidelidade mock
  participant Pay as Pagamento mock
  Cliente->>UI: Escolhe unidade
  Cliente->>UI: Avança ao cardápio e adiciona itens
  UI->>API: GET cardápio
  API-->>UI: Preços e disponibilidade da unidade
  Cliente->>UI: Avança ao checkout, revisa pedido e confirma
  UI->>API: POST /orders/quote
  API-->>UI: Subtotal, descontos e total calculados no servidor
  UI->>API: POST /orders + Idempotency-Key
  API->>UC: Comando sem preço confiável do cliente
  UC->>Store: Reserva chave e valida fingerprint
  UC->>UC: Revalida unidade, itens, preço e cupom
  opt Resgate de fidelidade
    UC->>Loyalty: Consultar/resgatar pontos simulados
    Loyalty-->>UC: Desconto ou erro
  end
  UC->>Pay: Autorizar pagamento simulado e valor final
  alt Pagamento aprovado
    Pay-->>UC: Aprovado
    UC->>Store: Persiste pedido confirmado e token
    UC-->>API: Número e resumo do pedido
    API-->>UI: Confirmação
  else Recusado ou timeout
    Pay-->>UC: Erro controlado
    UC->>Store: Guarda resultado idempotente, sem pedido confirmado
    UC-->>API: Erro seguro
    API-->>UI: Mantém carrinho e informa próximo passo
  end
```

## Fluxo do pagamento mock

```mermaid
stateDiagram-v2
  [*] --> TentativaRecebida
  TentativaRecebida --> EntradaValidada
  EntradaValidada --> ChaveReservada
  ChaveReservada --> SimulacaoPagamento
  SimulacaoPagamento --> Confirmado: APPROVED
  SimulacaoPagamento --> Recusado: DECLINED
  SimulacaoPagamento --> Timeout: TIMEOUT
  Confirmado --> ResultadoIdempotente
  Recusado --> ResultadoIdempotente
  Timeout --> ResultadoIdempotente
  ResultadoIdempotente --> [*]
```

O mock não captura PAN, CVV, token de cartão ou credencial bancária e não efetua liquidação. O seletor de resultado existe exclusivamente para testar estados em ambiente demonstrativo. Antes de produção, substituir por provedor homologado, webhooks autenticados, controle de timeout/reconciliação e armazenamento transacional/outbox; tais itens não fazem parte desta implementação.

## Pontos de teste

```mermaid
flowchart LR
  B[Domínio puro] --> UT[Teste unitário: preço, cupom, limite, status]
  A[Use case + adapters] --> IT[Integração: idempotência e falhas de mock]
  H[HTTP + memória] --> API[Contrato: status, headers, auth, rate limit]
  UI[React + TypeScript no navegador] --> E2E[E2E: pedido e falha em viewport mobile]
  L[Servidor + gerador de carga] --> PERF[Desempenho: percentis, erro e throughput]
  SEC[API e logs] --> ST[Segurança: validação, acesso e ausência de PII]
  M[Interface] --> MAN[Manual: teclado, leitor de tela, clareza e compreensão]
```

## Erros, idempotência e privacidade

- Erros públicos usam `code`, mensagem segura e `requestId`; exceções internas não são serializadas.
- Cada request recebe `X-Request-Id`; logs guardam método, rota normalizada, status e duração, nunca corpo, headers de autenticação ou query sensível.
- O corpo JSON tem limite, validações de enumeração/quantidade/tamanho, rate limit por origem e cabeçalhos de segurança.
- Pedido recuperável exige token aleatório próprio; o token não é incluído em logs. O exemplo retorna o token ao cliente uma vez para permitir consulta anônima controlada.
- Idempotência valida fingerprint do payload e armazena resposta por 24 horas em memória. Em multi-instância precisa de persistência atômica compartilhada e estados de processamento duráveis.

## Escalabilidade e trade-offs

A aplicação é stateless quanto à interface, mas **não** quanto aos pedidos, idempotência ou rate limit: tudo reside no processo. Isso simplifica demonstração e testes, ao custo de perder dados em reinício e não coordenar múltiplas réplicas. Catálogo fixo é suficiente para validar contrato, mas não substitui integração de estoque/preço nem cache com invalidação. Um banco relacional, transação/outbox, autenticação institucional, observabilidade centralizada, TLS e gestão de segredos são pré-requisitos de produção, não funcionalidades alegadas aqui.
