# Plano de testes

Os comandos usam Node.js 24. A execução atual e os resultados estão resumidos em `relatorio-final-conformidade.md`; as evidências brutas ficam em `evidencias/`.

| Categoria | Objetivo e escopo | Ferramenta / ambiente | Entrada | Aprovação | Evidência |
|---|---|---|---|---|---|
| Unitário | Cálculo, descontos, validações, status e limite de itens | `node:test`; local/CI | Fixtures sintéticas, dependências injetadas | Casos críticos verdes; cobertura domínio ≥80% meta | `evidencias/unit/` log + cobertura |
| Integração | Use case, store, pagamento e fidelidade mock | `node:test`; processo em memória | Mocks determinísticos | Aprovação grava um pedido; falhas não gravam; idempotência respeitada | `evidencias/integration/` |
| Sistema/API | Contratos, HTTP status, headers, validação, auth e rate limit | `node:test` + `fetch`; servidor local | JSON malformado/limite, chaves e tokens sintéticos | Contratos RF01–RF15 corretos | `evidencias/integration/` |
| E2E | LP `/` → `/cardapio` → `/checkout` → `/comprovante`; falha de pagamento e retorno com carrinho preservado | Playwright; navegador local | Browser instalado, servidor de teste | Pedido confirmado; falha mantém carrinho; acesso sem estado é redirecionado; console sem erro; fluxo responsivo | `evidencias/e2e/` screenshots/log |
| Regressão | Reexecutar casos críticos após mudança | `npm test` e `npm run test:e2e` | Build atual | Nenhum crítico regressivo | Logs de cada execução |
| UAT | Verificar se cliente/operação entendem preço, canal, modalidade e estado | Roteiro manual local | Participantes internos; sem dados reais | Tarefas completadas sem ajuda crítica; observações registradas | Roteiro assinado/observações, se realizado |
| Usabilidade | Fricção, clareza de erro, confirmação e taxa de conclusão | Observação manual; futuro SUS/CSAT | Usuários representativos após protótipo | Meta SUS ≥75 em rodada exploratória; separar amostra pequena como evidência qualitativa | `evidencias/mobile/` roteiro e respostas anonimizadas |
| Responsividade/mobile | Viewport 360×800, overflow, foco e alvos de toque | Playwright + inspeção manual | Chromium viewport mobile | Sem scroll horizontal; controles ≥44×44 CSS px; labels/foco | Screenshot e resultado DOM |
| Desempenho/carga | Latência p50/p95/p99, taxa de erro, duração e throughput; mix menu/pedido | `scripts/run-load-test.mjs` + `scripts/load-test.mjs`; localhost | Rampa até 500 VUs, aquecimento, sustentação e redução gradual; dados sintéticos | Metas RQF01/RQF02; reportar se não atingir | JSON + resumo em `evidencias/performance/` |
| Estresse | Observar degradação acima do alvo até erro/limite | Script de carga com VUs configuráveis | Ambiente isolado; não executar contra produção | Falhas controladas; serviço recupera após carga | JSON; recomendado manual antes de release |
| Segurança | Entrada, autorização por token, preço, rate limit, headers, logs e erros | Testes de contrato locais | Payloads sintéticos malformados | Sem acesso não autorizado, preço adulterado aceito ou segredo em log | `lgpd.md` e `evidencias/security/` |
| LGPD | Necessidade, finalidade, minimização, acesso, retenção, logs e exclusão | Revisão documental + testes | Apenas dados sintéticos | Nenhum campo desnecessário é exigido; pedido consultado só com token; retenção demonstrativa documentada | `lgpd.md` |

## Comandos previstos

```powershell
npm test
npm run test:coverage
npm run test:e2e
npm run load:local -- --vus 500 --warmup 5 --duration 30 --ramp-down 5
```

## Critérios de execução

- Testes de pagamento e fidelidade usam mocks injetáveis, sem chamadas externas.
- Em CI, unitários, integração e build/sintaxe são gates rápidos. E2E pode rodar em job separado após instalar o browser. Carga/stress não roda em cada commit.
- Nenhum resultado será inferido a partir de documentação ou script existente. A execução é datada e salva quando ocorrer.

## Casos de teste

Os estados abaixo refletem a execução local até 26/10/2026, incluindo a carga de CT015. Os dados são sintéticos e as evidências estão em `evidencias/` e `docs/relatorio-final-conformidade.md`.

### CT001 — Pedido básico aprovado

- **Requisito:** RF01–RF04, RF08–RF12. **Prioridade:** P0. **Tipo:** E2E/sistema.
- **Pré-condições:** API e UI disponíveis; unidade Recife Centro ativa; mock aprovado.
- **Dados:** 1 `bolo-milho`, quantidade 1; canal WEB; retirada; nome sintético `QA`; chave única.
- **Passos:** abrir LP; selecionar unidade; avançar ao cardápio; adicionar item; abrir checkout; conferir total; escolher retirada e mock aprovado; confirmar.
- **Esperado:** HTTP 201, total calculado no servidor, status confirmado, número/token, um pedido persistido.
- **Pós-condição:** consulta com token retorna o mesmo pedido.
- **Evidência:** [execução E2E](../evidencias/e2e/e2e-run.txt) e [screenshot mobile](../evidencias/e2e/ct001-confirmacao-mobile.png). **Status:** PASS.

### CT002 — Produto indisponível

- **Requisito:** RF02–RF04. **Prioridade:** P0. **Tipo:** integração negativa.
- **Pré-condições:** produto indisponível no catálogo da unidade.
- **Dados:** pedido contendo produto indisponível e outro disponível; pagamento aprovado.
- **Passos:** enviar pedido pela API.
- **Esperado:** erro `PRODUCT_UNAVAILABLE`; pagamento não chamado; nenhum pedido persistido.
- **Pós-condição:** catálogo e store sem alteração. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT003 — Carrinho vazio

- **Requisito:** RF03. **Prioridade:** P0. **Tipo:** unitário/integração negativa.
- **Pré-condições:** unidade ativa.
- **Dados:** `items: []`.
- **Passos:** enviar confirmação sem itens.
- **Esperado:** 400/422 com código `CART_EMPTY`; mock não chamado.
- **Pós-condição:** nenhum pedido. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT004 — Cupom válido

- **Requisito:** RF05. **Prioridade:** P1. **Tipo:** unitário/sistema.
- **Pré-condições:** item elegível e total suficiente.
- **Dados:** subtotal de R$ 20,00; cupom `BOASVINDAS10`.
- **Passos:** simular cálculo e confirmar pedido.
- **Esperado:** desconto de R$ 2,00 (10% em centavos), aplicado uma vez; total detalhado antes do pagamento.
- **Pós-condição:** pedido aprovado registra subtotal, desconto e total coerentes. **Evidência:** [cobertura/testes](../evidencias/unit/coverage-run.txt). **Status:** PASS.

### CT005 — Cupom inválido

- **Requisito:** RF06. **Prioridade:** P0. **Tipo:** integração negativa.
- **Pré-condições:** unidade e itens válidos.
- **Dados:** cupom `NAOEXISTE`.
- **Passos:** confirmar pedido com o cupom.
- **Esperado:** `COUPON_INVALID`, total não recebe desconto e pagamento não é chamado.
- **Pós-condição:** sem pedido. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT006 — Cupom expirado

- **Requisito:** RF06. **Prioridade:** P1. **Tipo:** unitário/integração negativa.
- **Pré-condições:** unidade e itens válidos.
- **Dados:** cupom `VENCIDO`.
- **Passos:** confirmar pedido.
- **Esperado:** `COUPON_EXPIRED`, mensagem distinta de cupom inexistente; sem desconto nem pagamento.
- **Pós-condição:** nenhum pedido. **Evidência:** [cobertura/testes](../evidencias/unit/coverage-run.txt). **Status:** PASS.

### CT007 — Pagamento aprovado

- **Requisito:** RF10–RF11. **Prioridade:** P0. **Tipo:** integração/E2E.
- **Pré-condições:** pedido válido e chave inédita.
- **Dados:** mock `APPROVED`.
- **Passos:** confirmar uma vez.
- **Esperado:** HTTP 201, pedido `CONFIRMED` persistido uma única vez e token retornado.
- **Pós-condição:** consulta autorizada devolve o pedido. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT008 — Pagamento recusado

- **Requisito:** RF10–RF11. **Prioridade:** P0. **Tipo:** integração negativa.
- **Pré-condições:** pedido válido.
- **Dados:** mock `DECLINED`.
- **Passos:** confirmar.
- **Esperado:** código `PAYMENT_DECLINED`; nenhum pedido confirmado; mensagem segura.
- **Pós-condição:** carrinho pode ser corrigido e submetido com nova chave. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT009 — Timeout do pagamento

- **Requisito:** RF10, RF12. **Prioridade:** P0. **Tipo:** integração negativa.
- **Pré-condições:** adaptador mock configurado para timeout.
- **Dados:** mesmo payload e chave única.
- **Passos:** enviar pedido; repetir após receber timeout.
- **Esperado:** timeout seguro sem pedido; repetição reproduz resultado sem invocar pagamento novamente.
- **Pós-condição:** zero pedidos confirmados para chave. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT010 — Requisição repetida/idempotência

- **Requisito:** RF12. **Prioridade:** P0. **Tipo:** integração/concorrência.
- **Pré-condições:** store limpo; mock aprovado.
- **Dados:** mesmo payload e `Idempotency-Key` em 2 ou mais chamadas concorrentes e sequenciais.
- **Passos:** disparar chamadas simultâneas; repetir após conclusão; reusar chave com payload alterado.
- **Esperado:** no máximo um pedido; replay da resposta após conclusão; em andamento ou fingerprint diferente retorna conflito; payload diferente não cobra.
- **Pós-condição:** um registro confirmado. **Evidência:** [teste concorrente de 100 chamadas](../evidencias/unit/coverage-run.txt). **Status:** PASS.

### CT011 — Falha no serviço de fidelidade

- **Requisito:** RF07. **Prioridade:** P1. **Tipo:** integração de falha.
- **Pré-condições:** comando solicita benefício; mock de fidelidade falha.
- **Dados:** itens válidos, `useLoyalty: true`.
- **Passos:** confirmar.
- **Esperado:** `LOYALTY_UNAVAILABLE`; sem pagamento, desconto ou pedido confirmado.
- **Pós-condição:** usuário pode tentar sem benefício com nova chave. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT012 — Franquia indisponível

- **Requisito:** RF01, RF04. **Prioridade:** P0. **Tipo:** API negativa.
- **Pré-condições:** unidade Natal Norte marcada inativa.
- **Dados:** pedido válido para a unidade inativa.
- **Passos:** chamar endpoint de criação.
- **Esperado:** `UNIT_UNAVAILABLE`; pagamento não chamado; nenhum pedido.
- **Pós-condição:** sem mutação. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT013 — Acesso não autorizado ao pedido

- **Requisito:** RF15. **Prioridade:** P0. **Tipo:** segurança/API.
- **Pré-condições:** um pedido confirmado com token sintético.
- **Dados:** sem Authorization, token inválido e token de outro pedido.
- **Passos:** consultar recurso em cada condição; depois consultar com token correto.
- **Esperado:** tentativas não autorizadas recebem 401/403 sem revelar dados; token correto só acessa seu pedido.
- **Pós-condição:** nenhum dado de outro pedido exposto. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT014 — Comportamento mobile

- **Requisito:** RNF mobile, RF02–RF11. **Prioridade:** P1. **Tipo:** E2E responsivo/acessibilidade básica.
- **Pré-condições:** servidor e navegador; viewport 360×800.
- **Dados:** pedido de um item.
- **Passos:** navegar com toque/teclado; executar fluxo; observar overflow, foco, labels e dimensões de controles.
- **Esperado:** sem rolagem horizontal; botões principais ≥44×44 px; campos rotulados; fluxo concluível sem hover.
- **Pós-condição:** confirmação visível. **Evidência:** [screenshot mobile](../evidencias/e2e/ct001-confirmacao-mobile.png) e [execução E2E](../evidencias/e2e/e2e-run.txt). **Status:** PASS.

### CT015 — Carga concorrente

- **Requisito:** RQF01–RQF02, RNF escalabilidade. **Prioridade:** P1. **Tipo:** carga/desempenho.
- **Pré-condições:** servidor isolado e carga configurada; sem usuários reais.
- **Dados:** 10→50→100→250→500 VUs, mistura de GET catálogo e POST sintético; executar duração configurada.
- **Passos:** aquecer, aumentar carga, manter e reduzir; registrar cada resposta.
- **Esperado:** relatório com p50/p95/p99, erro, throughput, duração e VUs reais; comparar metas 250 ms/750 ms e erro <1%.
- **Pós-condição:** servidor respondeu após teste. **Evidência:** [JSON bruto de carga](../evidencias/performance/ct015-load-500.json). **Status:** PASS.

### CT016 — Dados pessoais e LGPD

- **Requisito:** RF13, RF15 e LGPD. **Prioridade:** P0. **Tipo:** segurança/privacidade.
- **Pré-condições:** logs capturados; fixtures sintéticas.
- **Dados:** nome curto sintético permitido; CPF/telefone/endereço/campo extra e tentativa de payload com token.
- **Passos:** submeter entrada com campo indevido; criar pedido válido; inspecionar resposta, logs, TTL e consulta.
- **Esperado:** dados desnecessários rejeitados/ignorados conforme contrato; nada sensível é registrado em log; pedido exige token; retenção demonstrativa é documentada.
- **Pós-condição:** fixtures removíveis; sem PII real. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt) e [controles de privacidade e segurança](lgpd.md). **Status:** PASS para checks técnicos automatizados; avaliação jurídica formal permanece fora do teste.

### CT017 — Adulteração de preço e unidade

- **Requisito:** RF02, RF04–RF06. **Prioridade:** P0. **Tipo:** segurança/integridade.
- **Pré-condições:** API ativa.
- **Dados:** preço e desconto forjados no corpo; item real em unidade diferente.
- **Passos:** alterar preço enviado; tentar item desconhecido/incompatível; comparar total calculado.
- **Esperado:** preço do cliente ignorado ou payload extra rejeitado; total usa catálogo da unidade; nenhuma divergência cobrada.
- **Pós-condição:** nenhum pedido incorreto. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT018 — Payload inválido, excesso de corpo e rate limit

- **Requisito:** RF13–RF14. **Prioridade:** P1. **Tipo:** segurança/API.
- **Pré-condições:** limite de corpo e rate limit configuráveis no app de teste.
- **Dados:** JSON malformado, body acima do limite e requisições acima da janela.
- **Passos:** enviar cada condição; inspecionar status e headers.
- **Esperado:** 400 para JSON malformado, 413 para body excedente e 429 + `Retry-After` para excesso; sem stack trace.
- **Pós-condição:** serviço permanece disponível. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT019 — Consistência de preço por canal

- **Requisito:** RF02, RF04, RF09. **Prioridade:** P1. **Tipo:** integração/regressão.
- **Pré-condições:** unidade e cardápio ativos.
- **Dados:** mesma unidade/item, canais APP, WEB, TOTEM, BALCÃO e PICKUP.
- **Passos:** consultar cardápio e simular pedido equivalente por canal.
- **Esperado:** preço/regra iguais; canal preservado no pedido; diferenças só se regra futura explícita.
- **Pós-condição:** sem divergência. **Evidência:** [teste de paridade entre canais](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT020 — Expiração/reinício do armazenamento volátil

- **Requisito:** RF12, RNF confiabilidade e RF15. **Prioridade:** P1. **Tipo:** sistema/limitação.
- **Pré-condições:** servidor local sem banco persistente.
- **Dados:** pedido e chave sintéticos; reinício do processo.
- **Passos:** criar pedido; reiniciar; consultar pedido/chave; verificar limpeza TTL em teste de relógio.
- **Esperado:** limite de 24h no processo é aplicado; reinício perde dados, conforme limitação declarada; o comportamento não é aprovado para produção.
- **Pós-condição:** perda após reinício e expiração foram reproduzidas; risco R12 permanece aberto para produção. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt) e cobertura. **Status:** PASS.

### CT021 — Prévia não paga nem persiste pedido

- **Requisito:** RF16. **Prioridade:** P0. **Tipo:** integração/API.
- **Pré-condições:** unidade disponível e servidor com contadores observáveis no teste.
- **Dados:** item válido, cupom ativo e sem dados de pagamento.
- **Passos:** chamar `POST /api/v1/orders/quote`; ler subtotal, desconto e total; consultar contagem de pedidos e chamadas do mock.
- **Esperado:** prévia coerente com o catálogo; zero chamadas de pagamento; zero pedido confirmado.
- **Pós-condição:** pedido ainda não foi criado. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS.

### CT022 — Voltar do checkout preserva o carrinho

- **Requisito:** RQF10. **Prioridade:** P1. **Tipo:** E2E/regressão.
- **Pré-condições:** unidade ativa e cardápio disponível.
- **Dados:** um `bolo-milho` no carrinho.
- **Passos:** avançar ao cardápio; adicionar o item; abrir checkout; voltar ao cardápio.
- **Esperado:** quantidade e resumo do carrinho permanecem iguais, sem repetir a seleção do item.
- **Pós-condição:** cliente pode continuar editando ou revisar novamente. **Evidência:** [execução E2E](../evidencias/e2e/e2e-run.txt). **Status:** PASS.

### CT023 — Rotas da jornada e proteção de etapa

- **Requisito:** RQF10. **Prioridade:** P1. **Tipo:** E2E/navegação.
- **Pré-condições:** aplicação publicada pelo servidor local.
- **Dados:** acesso direto a `/checkout` sem estado de pedido.
- **Passos:** abrir `/checkout`; observar carregamento da SPA e retorno à landing page; concluir as etapas em sequência e observar URLs.
- **Esperado:** rotas reconhecidas (`/`, `/cardapio`, `/checkout`, `/comprovante`); acesso a checkout sem unidade/carrinho retorna à landing page.
- **Pós-condição:** fluxo permanece disponível na sessão. **Evidência:** [execução E2E](../evidencias/e2e/e2e-run.txt). **Status:** PASS.
