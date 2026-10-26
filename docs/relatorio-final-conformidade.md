# Relatório final de qualidade

- **Data da validação de código, interface, dependências e carga:** 26/10/2026
- **Carga local de 500 VUs:** 26/10/2026
- **Produto:** Raízes do Nordeste — protótipo da feature Realização de Pedido
- **Ambiente:** Windows; Node.js 24.13.0; dados sintéticos; HTTP local; store em memória
- **Escopo da decisão:** apresentação acadêmica/profissional do protótipo. Esta decisão não aprova operação comercial.

As verificações automatizadas deste relatório foram repetidas na versão atual do projeto em 26/10/2026. A carga foi executada em ambiente local isolado.

## O que foi avaliado

Seleção de unidade e cardápio; carrinho e quantidades; preview de preço; cupom e fidelidade simulada; modalidade/canal; pagamento mock aprovado/recusado/timeout/indisponível; confirmação e consulta protegida; idempotência; validação e rate limit; logs e headers; interface móvel; acessibilidade automatizável; carga local; lint, sintaxe e vulnerabilidades das dependências.

## O que foi executado

- `npm run lint`: PASS, zero erros.
- `npm run check`: PASS, verificação estrita TypeScript e sintaxe Node.
- `npm run build`: PASS, SPA React compilada pelo Vite.
- `npm test`: PASS, 22/22 testes unitários e de integração HTTP.
- `npm run test:coverage`: PASS, 22/22; gate de domínio ≥80% linhas e ≥75% branches alcançado (agregado incluído: 89,41%/84,27%).
- `npm run test:e2e`: PASS, 5/5 na versão atual, incluindo a jornada até o comprovante, pagamento recusado, retorno ao cardápio, rotas protegidas e axe na landing page.
- Carga isolada com 500 VUs; rampa 5 s, sustentação 30 s e redução 5 s: PASS, 146.101 respostas bem-sucedidas, 0 erros, menu p95 149,16 ms e pedido p95 149,67 ms na sustentação.
- `npm audit --audit-level=high`: PASS em 26/10/2026, zero vulnerabilidades reportadas.

Os logs e o JSON estão em `evidencias/`. Durante o desenvolvimento foram corrigidos seletores E2E ambíguos, assertivas desatualizadas e a importação do CSS no bundle Vite; a suíte completa passou depois das correções.

## Requisitos e qualidade

| Área | Situação observada | Limite da conclusão |
|---|---|---|
| RF01–RF16 da demonstração | PASS nos casos automatizados mapeados na matriz de rastreabilidade | Catálogo e integrações são fixos/simulados; não representam franquias reais. |
| Regras de pedido/preço/promoção | PASS nos fixtures: cálculo em centavos, revalidação no servidor, erros de cupom e ausência de pedido quando pagamento não aprova | Não houve concorrência de estoque real nem reconciliação de gateway. |
| Idempotência | PASS: 100 chamadas concorrentes da mesma chave produziram um pedido no processo de teste | Garantia apenas em uma instância volátil; R12 permanece aberto para produção. |
| Segurança técnica automatizada | PASS nos checks de autorização, entrada, rate limit, erros, headers, logs e auditoria de dependências | Não é pentest, análise de infraestrutura nem declaração de segurança total. |
| Experiência móvel/acessibilidade | PASS no teste automatizado em 360×800; sem overflow, botões ≥44 px e axe sem violações nos critérios WCAG 2.0/2.1 A/AA consultados | Sem validação manual com leitor de tela ou usuário. |
| RNFs medidos | RQF01/02, parte de RQF04–12 aprovados no ambiente local | RQF03 disponibilidade mensal não foi medida; SUS/CSAT e MTTR não foram observados. |
| LGPD | Controles de minimização, retenção demonstrativa, token e log foram exercitados em dados sintéticos | Não equivale a conformidade legal. Bases, retenção comercial, direitos e papéis precisam de avaliação formal. |

## Métricas

- Cobertura de `order-rules.mjs`: 90,67% linhas e 83,72% branches; `errors.mjs`: 80% linhas.
- Carga durante sustentação: menu p50/p95/p99 118,39/149,16/184,94 ms; pedido 118,38/149,67/185,55 ms.
- 146.101 requisições medidas, nenhuma falha, throughput 4.175,49 req/s no intervalo medido com redução incluída.
- Nenhum defeito de aplicação confirmado nos 22 testes unitários/de integração e 5 testes E2E executados. Este resultado não estima defeitos fora do escopo.
- Disponibilidade mensal, CSAT, SUS, abandono e MTTR: NOT_EXECUTED.

## Defeitos e riscos remanescentes

**Defeitos confirmados:** nenhum nas verificações executadas. As correções dos seletores e assertivas E2E foram concluídas antes da execução final.

**Risco principal:** pedidos e chaves de idempotência são voláteis; reiniciar apaga os dados e múltiplas instâncias não compartilham estado (R12). Outros limites são ausência de autenticação corporativa, provedor real, TLS de produção, reconciliação, monitoramento de operação, integração com POS/estoque e validação jurídica.

## Limitações e recomendações

1. Não conectar pagamentos reais nem publicar como serviço comercial neste estado.
2. Antes de produção, implementar store transacional durável, idempotência distribuída, reconciliação/outbox, autenticação/autorização, TLS, gestão de segredos e observabilidade.
3. Aprovar política LGPD com controlador/jurídico: base por finalidade, períodos legais de guarda, direitos do titular, aviso e contratos com operadores.
4. Rodar CI no repositório remoto; completar UAT, leitor de tela, teste de stress e performance em ambiente representativo.
5. Medir satisfação/abandono e disponibilidade com uma amostra e janela adequadas antes de fixar metas operacionais.

## Decisão de release

### GO WITH RESTRICTIONS — demonstração acadêmica/profissional

Os fluxos críticos automatizados passaram, os resultados estão registrados e as restrições do mock/armazenamento estão explícitas. Esta decisão permite apresentar o protótipo e suas evidências em portfólio/entrevista.

**NO-GO para release comercial.** A decisão muda somente após fechar os riscos de persistência, idempotência distribuída, pagamento real homologado, operação/segurança e revisão formal de privacidade, além de validar os SLOs em ambiente de produção representativo.
