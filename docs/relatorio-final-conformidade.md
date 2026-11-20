# Relatório final de qualidade

- **Data da validação local mais recente do checkout:** 20/11/2026
- **CI remoto anterior à demonstração de privacidade:** commit `1bc80b0`, [workflow Quality checks](https://github.com/claiverty/RaizesDoNordeste/actions/runs/44758411689), jobs de unitários/API e E2E mobile aprovados. O código de privacidade descrito abaixo ainda está apenas no workspace e não foi validado por esse CI.
- **CI anterior do acesso por PIN:** código `83d82bd` aprovado em 17/11/2026 no [workflow Quality checks, execução 13](https://github.com/claiverty/RaizesDoNordeste/actions/runs/44128433320). Metadados preservados em [pin-quality-2026-11-17.json](../evidencias/ci/pin-quality-2026-11-17.json).
- **Carga local de 500 VUs:** 09/11/2026
- **Produto:** Raízes do Nordeste — protótipo da feature Realização de Pedido
- **Ambiente:** Windows; Node.js 24.13.0; dados sintéticos; HTTP local; store em memória
- **Escopo da decisão:** apresentação acadêmica/profissional do protótipo. Esta decisão não aprova operação comercial.

Lint, TypeScript/sintaxe, testes de domínio/API, cobertura e E2E foram executados localmente em 20/11/2026 para a demonstração de privacidade no checkout. A alteração ainda não tem CI remoto. Build, auditoria de dependências, carga/estresse e smoke de `npm start` mantêm as evidências históricas descritas abaixo e não foram repetidos nesta atualização. A carga/estresse de 09/11/2026 pertence à versão anterior. A revisão técnica por teclado foi executada em 10/11/2026; UAT e escuta com leitor de tela aguardam coleta humana.

### Aviso e consentimento de privacidade no checkout — 20/11/2026

O checkout apresenta os dados usados no pedido, finalidade, retenção demonstrativa e informação de que não há pagamento real. O consentimento para o pedido começa desmarcado e o botão de confirmação permanece desabilitado até a escolha. A API também rejeita pedidos sem esse aceite. Nome curto continua opcional: se informado, requer uma autorização separada; a interface não o envia sem opt-in e a API rejeita nome recebido sem autorização. O pedido sintético registra versão do aviso e instante do aceite; o instante do nome só é registrado quando autorizado. Os registros ficam em memória e expiram em 24 horas ou ao reiniciar o processo.

Em 20/11/2026, `npm run lint`, `npm run check`, `npm test`, `npm run test:coverage` e `npm run test:e2e` passaram; foram 28/28 testes unitários/API e 11/11 testes E2E. A cobertura agregada foi 88,17% de linhas e 85,22% de branches; `order-rules.mjs` atingiu 89,16% e 84,82%, respectivamente. O CT029 inclui a tela mobile antes da aceitação, a validação server-side e a autorização separada do nome. Veja [evidência E2E](../evidencias/e2e/e2e-run.txt), [integração](../evidencias/integration/integration-run.txt), [cobertura](../evidencias/unit/coverage-run.txt) e [captura do aviso](../evidencias/e2e/ct029-checkout-privacidade-mobile.png).

Essa é uma demonstração técnica e acadêmica, não uma determinação de base legal nem uma declaração de conformidade. A base aplicável, o controlador, os prazos comerciais, os direitos e o texto final precisam de avaliação formal antes de qualquer operação real.

## O que foi avaliado

### Atualização do acesso por PIN — 17/11/2026

A entrada administrativa passou a usar PIN de quatro dígitos, configurado somente em `ADMIN_PIN` no servidor. A validação local passou com 27 testes unitários/de integração e 10 E2E, incluindo PIN incorreto/correto, formato inválido, saída da sessão e rejeição do PIN como token de consulta de pedido. O valor local foi configurado no `.env` ignorado pelo Git e sua aceitação foi verificada sem registrar a credencial. [Tela de entrada](../evidencias/e2e/admin-pin-mobile.png).

A presença de `ADMIN_PIN` como segredo de Production foi confirmada na Vercel, sem ler seu valor. O código `83d82bd` foi publicado com status success e aprovado no CI. As sete rotas da interface e a saúde da API responderam 200; as consultas administrativas de pedidos e catálogo aceitaram o PIN configurado, enquanto ausência de PIN e PIN incorreto retornaram 401. A [evidência de publicação e autenticação](../evidencias/deployment/pin-smoke-2026-11-17.json) contém somente resultados, sem a credencial. Os registros anteriores abaixo são preservados como histórico.

Seleção de unidade e cardápio; carrinho e quantidades; preview de preço; cupom e fidelidade simulada; modalidade/canal; pagamento mock aprovado/recusado/timeout/indisponível; confirmação e consulta protegida; painel `/admin` com PIN, filtros e métricas; minimização da resposta administrativa; idempotência; validação e rate limit; logs e headers; interface móvel; acessibilidade automatizável; carga local; lint, sintaxe e vulnerabilidades das dependências.

## O que foi executado

- `npm run lint`: PASS, zero erros.
- `npm run check`: PASS, verificação estrita TypeScript e sintaxe Node.
- `npm run build`: PASS, SPA React compilada pelo Vite.
- `npm start`: PASS em 09/11/2026; build servido respondeu `200` em `/` e `/admin`; `/api/v1/health` retornou `status: ok` e a lista administrativa sem chave retornou `401`.
- `npm run test:coverage`: PASS em 20/11/2026, 28/28; gate de domínio ≥80% linhas e ≥75% branches alcançado (agregado incluído: 88,17%/85,22%; `order-rules.mjs`: 89,16%/84,82%).
- `npm run test:e2e`: PASS em 20/11/2026, 11/11; inclui autenticação, filtros, minimização, controles móveis e CT029 de consentimento/opt-in.
- Carga isolada com 500 VUs; rampa 5 s, sustentação 30 s e redução 5 s: PASS, 202.779 respostas bem-sucedidas, 0 erros, menu p95 104,15 ms e pedido p95 103,98 ms na sustentação.
- Estresse local com 1.000 VUs: PASS, 197.279 respostas bem-sucedidas, 0 erros, menu p95 189,42 ms e pedido p95 189,44 ms na sustentação.
- `npm ci`: PASS em 09/11/2026. `npm audit`: repetido em 17/11/2026, zero vulnerabilidades; resultado em `evidencias/security/npm-audit-2026-11-17.json`. O override de `minimatch` corrige a árvore transitiva sem rebaixar o ESLint.
- Revisão técnica manual por teclado: PASS nos passos registrados em [revisao-manual-2026-11-10.txt](../evidencias/accessibility/revisao-manual-2026-11-10.txt). Inclui unidade, categoria, adição/remoção, erro e recuperação até o comprovante.
- Publicação Vercel em 10/11/2026: código `6db3e05` com status Ready em Production; as cinco rotas retornaram 200, saúde retornou `ok` e listagem administrativa sem chave retornou 401 `ADMIN_UNAUTHORIZED`. `ADMIN_API_KEY` foi observada como segredo de Production, sem ler seu valor. [Evidência de publicação](../evidencias/deployment/smoke-2026-11-10.json).
- Gestão administrativa em 17/11/2026: PASS, criação/edição/exclusão de produtos e unidades, disponibilidade, liberação com cardápio, bloqueio de unidade desativada, cancelamento de exclusão e preservação de pedidos confirmados. A checagem de preço desatualizado impediu pagamento antes da nova revisão. As duas telas e o diálogo de exclusão passaram na análise axe consultada; telas sem overflow em 360×800. [Cardápio](../evidencias/e2e/admin-cardapio-mobile.png), [unidades](../evidencias/e2e/admin-unidades-mobile.png).
- Publicação Vercel em 17/11/2026: status success para `2faf3d5`; `/admin`, `/admin/cardapio` e `/admin/unidades` retornaram 200; catálogo administrativo sem chave retornou 401; cardápio público retornou categoria e chave de imagem. [Evidência de publicação](../evidencias/deployment/smoke-2026-11-17.json). Mutações com chave válida foram exercitadas no ambiente local e no CI com dados sintéticos.

Os logs, screenshots e JSON estão em `evidencias/`. A rodada de 10/11/2026 corrigiu perda de foco ao substituir Adicionar pelos controles de quantidade e após recusa do pagamento, contraste insuficiente nas categorias inativas e área de toque reduzida nos controles de quantidade. O desenho compacto dos botões foi preservado. CT026 e o cenário de pagamento recusado cobrem a regressão; a suíte completa passou após as correções.

## Requisitos e qualidade

| Área | Situação observada | Limite da conclusão |
|---|---|---|
| RF01–RF21 da demonstração | PASS nos casos automatizados mapeados na matriz de rastreabilidade | Catálogo é editável em memória; integrações são simuladas; consulta de pedidos é somente de leitura e os cadastros são temporários. |
| Regras de pedido/preço/promoção | PASS nos fixtures: cálculo em centavos, revalidação no servidor, erros de cupom e ausência de pedido quando pagamento não aprova | Não houve concorrência de estoque real nem reconciliação de gateway. |
| Idempotência | PASS: 100 chamadas concorrentes da mesma chave produziram um pedido no processo de teste | Garantia apenas em uma instância volátil; R12 permanece aberto para produção. |
| Segurança técnica automatizada | PASS nos checks de autorização do pedido e do painel, minimização, entrada, rate limit, erros, headers e logs; auditoria sem vulnerabilidades; PIN correto aceito e acesso sem PIN ou com PIN incorreto rejeitado na Vercel | Não é pentest, análise de infraestrutura nem declaração de segurança total. O PIN é destinado à demonstração; não equivale a autenticação corporativa. |
| Experiência móvel/acessibilidade | PASS nos cenários em 360×800; overflow verificado no comprovante/painel; alvos de quantidade no cardápio/checkout e botões do comprovante ≥44×44 px; axe sem violações nas tags WCAG 2.0/2.1 A/AA consultadas na LP, cardápio e painel; revisão técnica por teclado registrada | A inspeção da árvore acessível não comprova os anúncios de um leitor de tela. A escuta humana permanece pendente. |
| UAT | Roteiro de cinco tarefas e [ficha para 3–5 voluntários](../evidencias/uat/resultados.csv) preparados | Ainda não executado com participantes; não há resultados de satisfação para reportar. |
| RNFs medidos | RQF01/02, parte de RQF04–12 aprovados no ambiente local | RQF03 disponibilidade mensal não foi medida; SUS/CSAT e MTTR não foram observados. |
| CI remoto | Commit `1bc80b0` aprovado no workflow Quality checks anterior à demonstração de privacidade | Unitários/API e E2E mobile passaram; o resultado não cobre o código local de privacidade descrito neste relatório. |
| LGPD | Controles de minimização, retenção demonstrativa, token e log foram exercitados em dados sintéticos | Não equivale a conformidade legal. Bases, retenção comercial, direitos e papéis precisam de avaliação formal. |
| Privacidade no checkout | RF22/RQF14 e CT029 aprovados localmente em 20/11/2026; sem aceite explícito a API rejeita pedido e nome curto só é enviado com opt-in próprio | Ainda não passou no CI remoto; consentimento obrigatório atende ao critério demonstrativo e não define a base legal de uma operação comercial. |

## Métricas

- Cobertura local de 20/11/2026: agregado 88,17% linhas e 85,22% branches; `order-rules.mjs` 89,16%/84,82%; `errors.mjs` 80% linhas.
- Carga de referência (500 VUs): menu p50/p95/p99 82,07/104,15/116,96 ms; pedido 82,05/103,98/116,88 ms.
- 202.779 requisições medidas, nenhuma falha, throughput 5.795,32 req/s no intervalo medido com redução incluída.
- Estresse (1.000 VUs): 197.279 requisições medidas, nenhuma falha; p95 em sustentação de 189,42 ms no menu e 189,44 ms no pedido.
- Auditoria de dependências: zero vulnerabilidades após `npm ci` com override de `minimatch`.
- Nenhum defeito confirmado permanece aberto nos 28 testes unitários/API e 11 testes E2E executados localmente em 20/11/2026. Este resultado não estima defeitos fora do escopo nem substitui execução de CI após commit.
- Disponibilidade mensal, CSAT, SUS, abandono e MTTR: NOT_EXECUTED.

## Defeitos e riscos remanescentes

**Defeitos confirmados em aberto:** nenhum no escopo executado. Perda de foco, contraste das categorias e alvos de quantidade encontrados na rodada foram corrigidos e cobertos por regressão. A evidência manual distingue o comportamento exposto na árvore acessível da fala ainda não observada.

**Risco principal:** pedidos e chaves de idempotência são voláteis; reiniciar apaga os dados e múltiplas instâncias não compartilham estado (R12). O painel depende da mesma memória e não representa um histórico confiável. O PIN de produção está configurado; deve ser mantido fora do repositório e usado apenas pelo responsável pela demonstração. Outros limites são ausência de autenticação corporativa, provedor real, reconciliação, monitoramento de operação, integração com POS/estoque e homologação da infraestrutura/privacidade para uso comercial.

Os novos cadastros de produtos e unidades também são voláteis, por escolha explícita do modo de demonstração. Reiniciar o processo restaura os dados iniciais; instâncias da Vercel podem apresentar estados distintos. A interface informa esse limite. Não foram habilitados banco de dados nem upload de imagens; as fotos são escolhidas na galeria local.

## Limitações e recomendações

1. Não conectar pagamentos reais nem publicar como serviço comercial neste estado.
2. Antes de produção, implementar store transacional durável, idempotência distribuída, reconciliação/outbox, autenticação/autorização, TLS, gestão de segredos e observabilidade.
3. Aprovar política LGPD com controlador/jurídico: base por finalidade, períodos legais de guarda, direitos do titular, aviso e contratos com operadores.
4. Coletar UAT com 3–5 participantes usando a ficha e executar a escuta com leitor de tela do plano de testes; atualizar este relatório com resultados reais. Para uso operacional futuro, repetir performance em ambiente representativo.
5. Medir satisfação/abandono e disponibilidade com uma amostra e janela adequadas antes de fixar metas operacionais.

## Decisão de release

### GO WITH RESTRICTIONS — demonstração acadêmica/profissional

Os fluxos críticos automatizados e o CI remoto passaram, a auditoria de dependências está limpa e a carga local de estresse passou. A revisão técnica por teclado foi registrada. UAT e escuta com leitor de tela aguardam coleta humana; as limitações do mock/armazenamento permanecem explícitas. Esta decisão permite apresentar o protótipo e suas evidências em avaliação, portfólio ou entrevista, informando essas pendências.

**NO-GO para release comercial.** A decisão muda somente após fechar os riscos de persistência, idempotência distribuída, pagamento real homologado, operação/segurança e revisão formal de privacidade, além de validar os SLOs em ambiente de produção representativo.
