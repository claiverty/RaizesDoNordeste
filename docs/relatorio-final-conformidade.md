# Relatório final de qualidade

- **Data da validação local de código, interface, dependências e carga:** 09/11/2026
- **CI remoto:** último resultado publicado aprovado no commit `7e216c9` em 26/10/2026. O workflow local foi atualizado para as actions v7; aguarda push para nova validação remota.
- **Carga local de 500 VUs:** 09/11/2026
- **Produto:** Raízes do Nordeste — protótipo da feature Realização de Pedido
- **Ambiente:** Windows; Node.js 24.13.0; dados sintéticos; HTTP local; store em memória
- **Escopo da decisão:** apresentação acadêmica/profissional do protótipo. Esta decisão não aprova operação comercial.

As verificações automatizadas deste relatório foram repetidas na versão atual do projeto em 09/11/2026. A carga foi executada em ambiente local isolado.

## O que foi avaliado

Seleção de unidade e cardápio; carrinho e quantidades; preview de preço; cupom e fidelidade simulada; modalidade/canal; pagamento mock aprovado/recusado/timeout/indisponível; confirmação e consulta protegida; idempotência; validação e rate limit; logs e headers; interface móvel; acessibilidade automatizável; carga local; lint, sintaxe e vulnerabilidades das dependências.

## O que foi executado

- `npm run lint`: PASS, zero erros.
- `npm run check`: PASS, verificação estrita TypeScript e sintaxe Node.
- `npm run build`: PASS, SPA React compilada pelo Vite.
- `npm start`: PASS; o build servido respondeu `200` na rota `/` e `/api/v1/health` retornou `status: ok`.
- `npm test`: PASS, 22/22 testes unitários e de integração HTTP.
- `npm run test:coverage`: PASS, 22/22; gate de domínio ≥80% linhas e ≥75% branches alcançado (agregado incluído: 89,41%/84,27%).
- `npm run test:e2e`: PASS, 6/6; o novo caso de teclado foi repetido separadamente 3 vezes, com 3/3 aprovações.
- Carga isolada com 500 VUs; rampa 5 s, sustentação 30 s e redução 5 s: PASS, 202.779 respostas bem-sucedidas, 0 erros, menu p95 104,15 ms e pedido p95 103,98 ms na sustentação.
- Estresse local com 1.000 VUs: PASS, 197.279 respostas bem-sucedidas, 0 erros, menu p95 189,42 ms e pedido p95 189,44 ms na sustentação.
- `npm ci` e `npm audit`: PASS em 09/11/2026, instalação reproduzível e zero vulnerabilidades. O override de `minimatch` corrige a árvore transitiva sem rebaixar o ESLint.

Os logs e o JSON estão em `evidencias/`. Durante o desenvolvimento foram corrigidos seletores E2E ambíguos, assertivas desatualizadas e a importação do CSS no bundle Vite; a suíte completa passou depois das correções.

## Requisitos e qualidade

| Área | Situação observada | Limite da conclusão |
|---|---|---|
| RF01–RF16 da demonstração | PASS nos casos automatizados mapeados na matriz de rastreabilidade | Catálogo e integrações são fixos/simulados; não representam franquias reais. |
| Regras de pedido/preço/promoção | PASS nos fixtures: cálculo em centavos, revalidação no servidor, erros de cupom e ausência de pedido quando pagamento não aprova | Não houve concorrência de estoque real nem reconciliação de gateway. |
| Idempotência | PASS: 100 chamadas concorrentes da mesma chave produziram um pedido no processo de teste | Garantia apenas em uma instância volátil; R12 permanece aberto para produção. |
| Segurança técnica automatizada | PASS nos checks de autorização, entrada, rate limit, erros, headers e logs; auditoria de dependências sem vulnerabilidades | Não é pentest, análise de infraestrutura nem declaração de segurança total. |
| Experiência móvel/acessibilidade | PASS no teste automatizado em 360×800; sem overflow, botões ≥44 px e axe sem violações nos critérios WCAG 2.0/2.1 A/AA consultados | Sem validação manual com leitor de tela ou usuário. |
| UAT | Roteiro de cinco tarefas preparado no plano de testes | Ainda não executado com participantes; não há resultados de satisfação para reportar. |
| RNFs medidos | RQF01/02, parte de RQF04–12 aprovados no ambiente local | RQF03 disponibilidade mensal não foi medida; SUS/CSAT e MTTR não foram observados. |
| CI remoto | Último workflow publicado (`7e216c9`) aprovado; configuração local modernizada para actions v7 e Ubuntu 24.04 | A nova configuração ainda precisa ser enviada e executada no GitHub Actions. |
| LGPD | Controles de minimização, retenção demonstrativa, token e log foram exercitados em dados sintéticos | Não equivale a conformidade legal. Bases, retenção comercial, direitos e papéis precisam de avaliação formal. |

## Métricas

- Cobertura de `order-rules.mjs`: 90,67% linhas e 83,72% branches; `errors.mjs`: 80% linhas.
- Carga de referência (500 VUs): menu p50/p95/p99 82,07/104,15/116,96 ms; pedido 82,05/103,98/116,88 ms.
- 202.779 requisições medidas, nenhuma falha, throughput 5.795,32 req/s no intervalo medido com redução incluída.
- Estresse (1.000 VUs): 197.279 requisições medidas, nenhuma falha; p95 em sustentação de 189,42 ms no menu e 189,44 ms no pedido.
- Auditoria de dependências: zero vulnerabilidades após `npm ci` com override de `minimatch`.
- Nenhum defeito de aplicação confirmado nos 22 testes unitários/de integração e 6 testes E2E executados. Este resultado não estima defeitos fora do escopo.
- Disponibilidade mensal, CSAT, SUS, abandono e MTTR: NOT_EXECUTED.

## Defeitos e riscos remanescentes

**Defeitos confirmados:** nenhum nas verificações executadas. As correções dos seletores e assertivas E2E foram concluídas antes da execução final.

**Risco principal:** pedidos e chaves de idempotência são voláteis; reiniciar apaga os dados e múltiplas instâncias não compartilham estado (R12). Outros limites são ausência de autenticação corporativa, provedor real, TLS de produção, reconciliação, monitoramento de operação, integração com POS/estoque e validação jurídica.

## Limitações e recomendações

1. Não conectar pagamentos reais nem publicar como serviço comercial neste estado.
2. Antes de produção, implementar store transacional durável, idempotência distribuída, reconciliação/outbox, autenticação/autorização, TLS, gestão de segredos e observabilidade.
3. Aprovar política LGPD com controlador/jurídico: base por finalidade, períodos legais de guarda, direitos do titular, aviso e contratos com operadores.
4. Enviar o workflow atualizado e confirmar o novo CI remoto; executar UAT com participantes e validação manual com leitor de tela; repetir performance em ambiente representativo.
5. Medir satisfação/abandono e disponibilidade com uma amostra e janela adequadas antes de fixar metas operacionais.

## Decisão de release

### GO WITH RESTRICTIONS — demonstração acadêmica/profissional

Os fluxos críticos automatizados passaram, a auditoria de dependências está limpa e a carga local de estresse passou. O novo workflow remoto e a validação manual com pessoas ainda estão pendentes; as limitações do mock/armazenamento permanecem explícitas. Esta decisão permite apresentar o protótipo e suas evidências em portfólio/entrevista.

**NO-GO para release comercial.** A decisão muda somente após fechar os riscos de persistência, idempotência distribuída, pagamento real homologado, operação/segurança e revisão formal de privacidade, além de validar os SLOs em ambiente de produção representativo.
