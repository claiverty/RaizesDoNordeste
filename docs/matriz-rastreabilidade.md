# Matriz de rastreabilidade

Resultados atualizados após execução local em 26/10/2026, incluindo carga de CT015. `PASS` é restrito às verificações e evidências listadas; não representa garantia de produção.

| Requisito / critério de aceitação | Risco | Caso(s) | Automação / arquivo | Resultado | Evidência |
|---|---|---|---|---|---|
| RF01 — unidade ativa lista; unidade indisponível bloqueia | R04 | CT012, CT020 | `test/api.test.mjs`; `test/domain.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RF02 — cardápio e preço correspondem à unidade | R03, R04 | CT017, CT019 | `test/api.test.mjs`; `e2e/order-flow.spec.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt), [E2E](../evidencias/e2e/e2e-run.txt) |
| RF03 — carrinho com quantidade 1–20; vazio e duplicado rejeitados | R01, R02 | CT003, CT018 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS | [cobertura/unitários](../evidencias/unit/coverage-run.txt), [integração](../evidencias/integration/integration-run.txt) |
| RF04 — servidor revalida item, disponibilidade e preço antes de autorizar | R03, R04 | CT002, CT012, CT017 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RF05 — cupom válido desconta 10% em centavos | R06 | CT004 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS | [cobertura/unitários](../evidencias/unit/coverage-run.txt) |
| RF06 — cupom inválido/expirado bloqueia pagamento | R06 | CT005, CT006 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS | [unitários](../evidencias/unit/coverage-run.txt), [integração](../evidencias/integration/integration-run.txt) |
| RF07 — fidelidade mock falha sem cobrança nem pedido | R07 | CT011 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RF08/RF09 — modalidade e canal válidos registrados | R03, R11 | CT001, CT019 | `test/api.test.mjs`; `e2e/order-flow.spec.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt), [E2E](../evidencias/e2e/e2e-run.txt) |
| RF10/RF11 — apenas aprovação confirma e retorna número | R01, R08 | CT007–CT009 | `test/domain.test.mjs`; `test/api.test.mjs`; `e2e/order-flow.spec.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt), [E2E](../evidencias/e2e/e2e-run.txt) |
| RF12 — mesma chave/payload não duplica; chave com payload diferente conflita | R02, R08 | CT009, CT010 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS — 100 chamadas concorrentes no teste do caso de uso | [unitários](../evidencias/unit/coverage-run.txt), [integração](../evidencias/integration/integration-run.txt) |
| RF13 — erros estruturados, input limitado e logs sem payload | R05, R09 | CT016–CT018 | `test/api.test.mjs` | PASS nos checks técnicos | [privacidade e segurança](lgpd.md), [integração](../evidencias/integration/integration-run.txt) |
| RF14 — excesso recebe 429 e Retry-After | R09, R10 | CT018 | `test/api.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RF15 — consulta de pedido requer token próprio | R05 | CT013, CT016 | `test/api.test.mjs` | PASS | [privacidade e segurança](lgpd.md) |
| RF16 — prévia calcula valor com as regras do pedido, sem pagamento nem persistência | R03, R06, R07 | CT021 | `test/api.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RQF01/RQF02 — latência, erro e throughput por operação sob carga | R10 | CT015 | `scripts/load-test.mjs` | PASS nesta carga local de 500 VUs | [JSON de carga](../evidencias/performance/ct015-load-500.json), [métricas](metricas.md) |
| RQF03 — disponibilidade mensal ≥99,5% (meta futura) | R10 | Não pode ser provado por CT015 local | Sonda mensal não configurada | NOT_EXECUTED | Sem evidência mensal neste protótipo |
| RQF04 — ≤1 pedido por chave em chamadas concorrentes | R02 | CT010 | `test/domain.test.mjs` | PASS — 1 pedido para 100 tentativas na mesma chave | [unitários](../evidencias/unit/coverage-run.txt) |
| RQF05 — total e detalhamento diferem R$ 0,00 | R03, R06 | CT004–CT006, CT017 | `test/domain.test.mjs`; `test/api.test.mjs` | PASS nos fixtures executados | [unitários](../evidencias/unit/coverage-run.txt), [integração](../evidencias/integration/integration-run.txt) |
| RQF06/RQF07 — sem PII sintética nos logs e sem leitura sem token | R05 | CT013, CT016 | `test/api.test.mjs` | PASS nos checks técnicos; revisão jurídica não executada | [privacidade e segurança](lgpd.md) |
| RQF08 — limite nominal por IP | R09 | CT018 | `test/api.test.mjs` | PASS | [integração](../evidencias/integration/integration-run.txt) |
| RQF09/RQF10 — LP e telas em rotas próprias, carrinho preservado ao voltar, sem cadastro; mobile sem overflow e botões ≥44 px | R11 | CT014, CT022, CT023 | `e2e/order-flow.spec.mjs` | PASS — 5/5 em 360×800, incluindo catálogo de 24 itens, bebidas e água cortesia | [execução E2E](../evidencias/e2e/e2e-run.txt), [LP mobile](../evidencias/e2e/ct000-landing-mobile.png), [checkout](../evidencias/e2e/ct0003-checkout-desktop.png), [comprovante mobile](../evidencias/e2e/ct001-confirmacao-mobile.png) |
| RQF11/RQF12 — request ID/log estruturado e cobertura de domínio | R01, R05 | CT016–CT018 | `test/api.test.mjs`; `npm run test:coverage` | PASS; cobertura agregada do escopo incluído 89,41% linhas / 84,27% branches | [cobertura](../evidencias/unit/coverage-run.txt), [privacidade e segurança](lgpd.md) |

## Ligações e limites antes de uso real

Pedidos e idempotência residem em memória; CT020 confirmou que reiniciar perde dados. Após reinício, a mesma chave pode ser processada novamente se um gateway real for conectado sem armazenamento transacional compartilhado. Por isso, R12 permanece aberto e nenhuma garantia de idempotência de produção pode ser feita sem persistência distribuída, restrição atômica e reconciliação. Não existe perfil de cliente/fidelidade real; o mock só valida o comportamento técnico de sucesso/falha.
