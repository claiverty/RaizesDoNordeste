# Relatório final de qualidade

- **Data da validação local de código, interface e auditoria de dependências:** 10/11/2026
- **CI remoto:** código `6db3e05` aprovado em 10/11/2026 no [workflow Quality checks, execução 9](https://github.com/claiverty/RaizesDoNordeste/actions/runs/42835645597), com os jobs de unitários/integração e E2E aprovados. Metadados preservados em [quality-2026-11-10.json](../evidencias/ci/quality-2026-11-10.json).
- **Carga local de 500 VUs:** 09/11/2026
- **Produto:** Raízes do Nordeste — protótipo da feature Realização de Pedido
- **Ambiente:** Windows; Node.js 24.13.0; dados sintéticos; HTTP local; store em memória
- **Escopo da decisão:** apresentação acadêmica/profissional do protótipo. Esta decisão não aprova operação comercial.

Lint, TypeScript/sintaxe, build, cobertura e E2E foram repetidos em 10/11/2026. A carga e o smoke de `npm start` mantêm as evidências históricas de 09/11/2026. A validação inclui a extensão `/admin` para análise de pedidos, com acesso por chave e resposta minimizada. A revisão técnica por teclado foi executada em 10/11/2026; UAT e escuta com leitor de tela aguardam coleta humana.

## O que foi avaliado

Seleção de unidade e cardápio; carrinho e quantidades; preview de preço; cupom e fidelidade simulada; modalidade/canal; pagamento mock aprovado/recusado/timeout/indisponível; confirmação e consulta protegida; painel `/admin` com chave, filtros e métricas; minimização da resposta administrativa; idempotência; validação e rate limit; logs e headers; interface móvel; acessibilidade automatizável; carga local; lint, sintaxe e vulnerabilidades das dependências.

## O que foi executado

- `npm run lint`: PASS, zero erros.
- `npm run check`: PASS, verificação estrita TypeScript e sintaxe Node.
- `npm run build`: PASS, SPA React compilada pelo Vite.
- `npm start`: PASS em 09/11/2026; build servido respondeu `200` em `/` e `/admin`; `/api/v1/health` retornou `status: ok` e a lista administrativa sem chave retornou `401`.
- `npm test`: PASS, 24/24 testes unitários e de integração HTTP.
- `npm run test:coverage`: PASS, 24/24; gate de domínio ≥80% linhas e ≥75% branches alcançado (agregado incluído: 89,41%/84,27%).
- `npm run test:e2e`: PASS, 8/8; inclui autenticação, filtros, minimização de dados, saída do painel, quantidades por teclado, foco após recusa e alvos de toque dos controles de quantidade em viewport móvel.
- Carga isolada com 500 VUs; rampa 5 s, sustentação 30 s e redução 5 s: PASS, 202.779 respostas bem-sucedidas, 0 erros, menu p95 104,15 ms e pedido p95 103,98 ms na sustentação.
- Estresse local com 1.000 VUs: PASS, 197.279 respostas bem-sucedidas, 0 erros, menu p95 189,42 ms e pedido p95 189,44 ms na sustentação.
- `npm ci`: PASS em 09/11/2026. `npm audit`: repetido em 10/11/2026, zero vulnerabilidades. O override de `minimatch` corrige a árvore transitiva sem rebaixar o ESLint.
- Revisão técnica manual por teclado: PASS nos passos registrados em [revisao-manual-2026-11-10.txt](../evidencias/accessibility/revisao-manual-2026-11-10.txt). Inclui unidade, categoria, adição/remoção, erro e recuperação até o comprovante.
- Publicação Vercel em 10/11/2026: código `6db3e05` com status Ready em Production; as cinco rotas retornaram 200, saúde retornou `ok` e listagem administrativa sem chave retornou 401 `ADMIN_UNAUTHORIZED`. `ADMIN_API_KEY` foi observada como segredo de Production, sem ler seu valor. [Evidência de publicação](../evidencias/deployment/smoke-2026-11-10.json).

Os logs, screenshots e JSON estão em `evidencias/`. A rodada de 10/11/2026 corrigiu perda de foco ao substituir Adicionar pelos controles de quantidade e após recusa do pagamento, contraste insuficiente nas categorias inativas e área de toque reduzida nos controles de quantidade. O desenho compacto dos botões foi preservado. CT026 e o cenário de pagamento recusado cobrem a regressão; a suíte completa passou após as correções.

## Requisitos e qualidade

| Área | Situação observada | Limite da conclusão |
|---|---|---|
| RF01–RF18 da demonstração | PASS nos casos automatizados mapeados na matriz de rastreabilidade | Catálogo e integrações são fixos/simulados; painel é somente de leitura e os dados permanecem voláteis. |
| Regras de pedido/preço/promoção | PASS nos fixtures: cálculo em centavos, revalidação no servidor, erros de cupom e ausência de pedido quando pagamento não aprova | Não houve concorrência de estoque real nem reconciliação de gateway. |
| Idempotência | PASS: 100 chamadas concorrentes da mesma chave produziram um pedido no processo de teste | Garantia apenas em uma instância volátil; R12 permanece aberto para produção. |
| Segurança técnica automatizada | PASS nos checks de autorização do pedido e do painel, minimização, entrada, rate limit, erros, headers e logs; auditoria sem vulnerabilidades; presença do segredo de produção e rejeição de acesso sem chave confirmadas na Vercel | Não é pentest, análise de infraestrutura nem declaração de segurança total. Login administrativo com chave válida foi exercitado localmente; o valor da chave de produção não foi lido nesta rodada. |
| Experiência móvel/acessibilidade | PASS nos cenários em 360×800; overflow verificado no comprovante/painel; alvos de quantidade no cardápio/checkout e botões do comprovante ≥44×44 px; axe sem violações nas tags WCAG 2.0/2.1 A/AA consultadas na LP, cardápio e painel; revisão técnica por teclado registrada | A inspeção da árvore acessível não comprova os anúncios de um leitor de tela. A escuta humana permanece pendente. |
| UAT | Roteiro de cinco tarefas e [ficha para 3–5 voluntários](../evidencias/uat/resultados.csv) preparados | Ainda não executado com participantes; não há resultados de satisfação para reportar. |
| RNFs medidos | RQF01/02, parte de RQF04–12 aprovados no ambiente local | RQF03 disponibilidade mensal não foi medida; SUS/CSAT e MTTR não foram observados. |
| CI remoto | Código `6db3e05` aprovado na execução 9 do Quality checks em 10/11/2026, usando actions v7 e Ubuntu 24.04 | Resultado restrito ao código e aos cenários dessa execução; o link da evidência está no início deste relatório. |
| LGPD | Controles de minimização, retenção demonstrativa, token e log foram exercitados em dados sintéticos | Não equivale a conformidade legal. Bases, retenção comercial, direitos e papéis precisam de avaliação formal. |

## Métricas

- Cobertura de `order-rules.mjs`: 90,67% linhas e 83,72% branches; `errors.mjs`: 80% linhas.
- Carga de referência (500 VUs): menu p50/p95/p99 82,07/104,15/116,96 ms; pedido 82,05/103,98/116,88 ms.
- 202.779 requisições medidas, nenhuma falha, throughput 5.795,32 req/s no intervalo medido com redução incluída.
- Estresse (1.000 VUs): 197.279 requisições medidas, nenhuma falha; p95 em sustentação de 189,42 ms no menu e 189,44 ms no pedido.
- Auditoria de dependências: zero vulnerabilidades após `npm ci` com override de `minimatch`.
- Nenhum defeito confirmado permanece aberto nos 24 testes unitários/de integração e 8 testes E2E executados após as correções. Este resultado não estima defeitos fora do escopo.
- Disponibilidade mensal, CSAT, SUS, abandono e MTTR: NOT_EXECUTED.

## Defeitos e riscos remanescentes

**Defeitos confirmados em aberto:** nenhum no escopo executado. Perda de foco, contraste das categorias e alvos de quantidade encontrados na rodada foram corrigidos e cobertos por regressão. A evidência manual distingue o comportamento exposto na árvore acessível da fala ainda não observada.

**Risco principal:** pedidos e chaves de idempotência são voláteis; reiniciar apaga os dados e múltiplas instâncias não compartilham estado (R12). O painel depende da mesma memória e não representa um histórico confiável. A chave de produção está configurada; deve ser mantida fora do repositório e usada apenas pelo responsável pela demonstração. Outros limites são ausência de autenticação corporativa, provedor real, reconciliação, monitoramento de operação, integração com POS/estoque e homologação da infraestrutura/privacidade para uso comercial.

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
