# Plano de testes

Os comandos usam Node.js 24. A execução atual e os resultados estão resumidos em `relatorio-final-conformidade.md`; as evidências brutas ficam em `evidencias/`.

| Categoria | Objetivo e escopo | Ferramenta / ambiente | Entrada | Aprovação | Evidência |
|---|---|---|---|---|---|
| Unitário | Cálculo, descontos, validações, status e limite de itens | `node:test`; local/CI | Fixtures sintéticas, dependências injetadas | Casos críticos verdes; cobertura domínio ≥80% meta | `evidencias/unit/` log + cobertura |
| Integração | Use case, store, pagamento e fidelidade mock | `node:test`; processo em memória | Mocks determinísticos | Aprovação grava um pedido; falhas não gravam; idempotência respeitada | `evidencias/integration/` |
| Sistema/API | Contratos, HTTP status, headers, validação, auth e rate limit, incluindo painel protegido | `node:test` + `fetch`; servidor local | JSON malformado/limite, chaves e tokens sintéticos | Contratos RF01–RF18 corretos; dados pessoais e tokens ausentes da listagem administrativa | `evidencias/integration/` |
| E2E | LP `/` → `/cardapio` → `/checkout` → `/comprovante`; painel `/admin`; falha de pagamento, retorno com carrinho, proteção por chave e navegação por teclado | Playwright; navegador local | Browser instalado, servidor de teste | Pedido confirmado; falha mantém carrinho; acesso sem estado é redirecionado; chave administrativa protege a lista; skip link e transição de etapa acessíveis por teclado | `evidencias/e2e/` screenshots/log |
| Regressão | Reexecutar casos críticos após mudança | `npm test` e `npm run test:e2e` | Build atual | Nenhum crítico regressivo | Logs de cada execução |
| UAT | Verificar se clientes entendem unidade, quantidades, total, pagamento simulado e retirada | Roteiro manual em navegador local | 3–5 participantes voluntários; catálogo e pagamentos simulados | Tarefas críticas concluídas sem ajuda; confusões/erros registrados sem PII | Roteiro na seção abaixo; folha de resultados anonimizada |
| Usabilidade | Fricção, clareza de erro, confirmação e taxa de conclusão | Observação manual; questionários SUS/CSAT opcionais | Usuários representativos após protótipo | Rodada exploratória; amostra pequena não deve ser tratada como estimativa estatística | `docs/metricas.md`; respostas sem identificação |
| Responsividade/mobile | Viewport 360×800, overflow, foco e alvos de toque | Playwright + inspeção manual/teclado | Chromium viewport mobile | Sem scroll horizontal; controles ≥44×44 CSS px; foco visível e fluxo por teclado | Screenshot, teste E2E e folha manual abaixo |
| Desempenho/carga | Latência p50/p95/p99, taxa de erro, duração e throughput; mix menu/pedido | `scripts/run-load-test.mjs` + `scripts/load-test.mjs`; localhost | Rampa até 500 VUs, aquecimento, sustentação e redução gradual; dados sintéticos | Metas RQF01/RQF02; reportar se não atingir | JSON + resumo em `evidencias/performance/` |
| Estresse | Observar degradação acima da carga de referência | Script local com VUs configuráveis | Ambiente isolado; nunca contra produção | Em 1.000 VUs, erro zero e p95 abaixo dos limites locais; não representa capacidade de produção | `evidencias/performance/stress-local-1000-2026-11-09.json` |
| Segurança | Entrada, autorização por token e chave administrativa, minimização de dados, preço, rate limit, headers, logs e erros | Testes de contrato locais | Payloads sintéticos malformados | Sem acesso não autorizado, preço adulterado aceito ou segredo em log; listagem sem nome/token do cliente | `lgpd.md` e `evidencias/security/` |
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

## Roteiro de UAT e acessibilidade manual

**Status em 10/11/2026:** revisão técnica por teclado executada; UAT e escuta com leitor de tela aguardam participantes. A [evidência da revisão](../evidencias/accessibility/revisao-manual-2026-11-10.txt) registra os passos observados e as correções de foco. Convide de 3 a 5 pessoas voluntárias que representem clientes do cardápio. Explique que é um protótipo local com pagamento simulado, não peça dados pessoais e não grave áudio/vídeo sem consentimento. A amostra é exploratória, não representa satisfação de toda a clientela.

Entregue as tarefas sem ensinar a interface:

1. Escolha a unidade Recife Centro e encontre uma tapioca e uma bebida.
2. Adicione duas unidades, reduza para uma e explique o que significa a água como cortesia.
3. Vá ao checkout, escolha retirada e confira se os itens e o total estão claros.
4. Simule pagamento recusado; observe se entende o erro e se o carrinho continua disponível.
5. Tente novamente com pagamento aprovado; encontre no comprovante os itens, total, forma de pagamento e senha de retirada.

Para cada pessoa, registre somente código anônimo, tarefa concluída, tempo aproximado, pedido de ajuda, erro observado e comentário. Considere a rodada aprovada quando todas as tarefas críticas forem concluídas sem ajuda, o valor e o estado do pagamento forem compreendidos e a retirada for localizada. Registre qualquer falha sem suavizar o resultado; abra defeito para problema reproduzível. Se aplicar SUS/CSAT, use as fórmulas de `docs/metricas.md` e reporte tamanho da amostra.

Preencha a [ficha de UAT](../evidencias/uat/resultados.csv), que abre em uma planilha com separador ponto e vírgula. Ela contém cinco tarefas (T01–T05, na ordem acima) para P01–P05; três participantes são o mínimo desta rodada e P04/P05 são opcionais. Para cada tarefa, informe data, navegador/dispositivo em `ambiente`, tempo em segundos, `SIM`/`NAO` em ajuda, dificuldade e comentário. Use `PASS`, `FAIL` ou `NAO_EXECUTADO` em resultado. Tarefa concluída com orientação do facilitador deve ser marcada `FAIL` para o critério sem ajuda, com a orientação descrita. Mantenha as linhas não realizadas como `NAO_EXECUTADO`.

Use a [demonstração online](https://raizesdonordeste7.vercel.app) ou `http://127.0.0.1:5173` com `npm run dev`. Comece uma sessão limpa em `/` para cada pessoa. Não ensine onde clicar; se a pessoa travar, anote a dificuldade antes de ajudar. Ao terminar, conte tarefas aprovadas e ajudas por participante, separe falhas reproduzíveis de opiniões e atualize o relatório final com o tamanho real da amostra. A execução do agente de desenvolvimento não conta como participante.

Na mesma sessão, faça inspeção manual por teclado e com Narrador do Windows (ou leitor de tela escolhido pelo participante):

- confirme que o primeiro `Tab` mostra o link “Ir para o conteúdo” e `Enter` leva o foco ao conteúdo principal;
- percorra etapas e controles usando `Tab`, `Shift+Tab`, setas, `Espaço` e `Enter`, verificando ordem e indicador de foco;
- confirme que unidade selecionada, categoria ativa, quantidades, erros de pagamento e atualização de etapa são anunciados de forma compreensível;
- leia o comprovante do início ao fim e confirme que itens, valores, forma de pagamento e senha de retirada são anunciados na ordem esperada.

Registre navegador, sistema, leitor de tela e versão, sem incluir nome ou dado de contato. A revisão técnica confirmou a estrutura acessível e o foco, mas não observou áudio. A escuta do leitor de tela e o UAT permanecem **não executados** até a coleta humana.

Para a escuta, abra o Narrador pelo menu Iniciar do Windows, escolha `/` em uma sessão limpa e execute os passos acima ouvindo a saída. Preencha os resultados abaixo; se o navegador integrado não for reconhecido pelo Narrador, use Edge ou Chrome e registre qual foi usado.

| Verificação com leitor de tela | Resultado | Anúncio ouvido / dificuldade |
|---|---|---|
| Unidade selecionada, unidade indisponível e título ao mudar de etapa | NAO_EXECUTADO | A preencher |
| Categoria ativa, adição, quantidade 1→2→1 e remoção | NAO_EXECUTADO | A preencher |
| Recusa de pagamento, motivo do erro e recuperação até aprovação | NAO_EXECUTADO | A preencher |
| Itens, valores, pagamento e senha de retirada no comprovante | NAO_EXECUTADO | A preencher |

Ambiente da escuta: data, sistema, navegador/versão e leitor/versão **a preencher**. Considere `PASS` apenas quando o anúncio permitir entender e concluir a ação sem depender da tela; registre anúncio ausente, repetição que atrapalha ou ordem confusa como `FAIL`.

## Casos de teste

Os estados abaixo refletem a execução automatizada em 10/11/2026 e a carga de CT015 em 09/11/2026. Os dados são sintéticos e as evidências estão em `evidencias/` e `docs/relatorio-final-conformidade.md`.

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

### CT024 — Autorização e minimização no painel

- **Requisito:** RF18, RQF13. **Prioridade:** P0. **Tipo:** segurança/API.
- **Pré-condições:** serviço com `ADMIN_API_KEY` configurada e pedido sintético criado.
- **Dados:** chave ausente, chave incorreta, chave correta e pedido com nome/token sintéticos.
- **Passos:** consultar a listagem sem chave e com chave incorreta; consultar com chave correta; inspecionar os campos retornados.
- **Esperado:** acessos inválidos recebem 401; o acesso válido recebe apenas dados operacionais, sem nome, ID interno, token ou expiração; método diferente de GET recebe 405.
- **Pós-condição:** pedido permanece inalterado. **Evidência:** [testes de integração](../evidencias/integration/integration-run.txt). **Status:** PASS — acessos ausentes/incorretos negados, resposta minimizada, sem cache e método diferente de GET negado.

### CT025 — Login, filtros e saída do painel

- **Requisito:** RF17, RF18, RQF13. **Prioridade:** P1. **Tipo:** E2E/interface responsiva.
- **Pré-condições:** pedido sintético disponível e chave de teste definida no servidor E2E.
- **Dados:** pedido com produto e nome sintético; chave de teste.
- **Passos:** acessar `/admin`; tentar a listagem sem credencial; informar chave; filtrar por unidade e canal; localizar o pedido por número e buscar um número inexistente; verificar ausência de overflow horizontal; encerrar sessão.
- **Esperado:** o painel exige chave, apresenta pedido e indicadores, não mostra dados pessoais, passa a análise axe, não tem rolagem horizontal e retorna à tela de acesso após remover a chave da sessão ao sair.
- **Pós-condição:** chave removida da sessão do navegador. **Evidência:** [execução E2E](../evidencias/e2e/e2e-run.txt), [painel mobile](../evidencias/e2e/admin-mobile.png). **Status:** PASS — 1/1 cenário E2E com filtros por unidade, canal e número, saída e viewport móvel.

### CT026 — Quantidades e recuperação de erro por teclado

- **Requisito:** RF03, RF10, RQF09/RQF10. **Prioridade:** P1. **Tipo:** acessibilidade/E2E/regressão.
- **Pré-condições:** unidade Recife Centro e categoria Tapiocas disponíveis; viewport 360×800.
- **Dados:** Tapioca com queijo coalho; quantidades 0, 1, 2, 20 e 19; pagamento simulado recusado.
- **Passos:** adicionar pelo Enter; aumentar; usar Shift+Tab para diminuir até zero; adicionar novamente e atingir 20; reduzir para 19. Em outro cenário, enviar pagamento recusado e verificar o foco na mensagem.
- **Esperado:** foco passa ao controle de aumentar após adicionar, volta a Adicionar ao remover e passa a Diminuir no limite; quantidade/remoção são expostas em região de status; limite de 20 impede aumento adicional; recusa recebe foco e preserva o carrinho; controles de quantidade no cardápio e checkout têm área clicável ≥44×44 CSS px. Axe não encontra violações nas tags consultadas no cardápio com item selecionado.
- **Pós-condição:** carrinho editável e tentativa recuperável. **Evidência:** [E2E](../evidencias/e2e/e2e-run.txt), [foco no controle](../evidencias/e2e/ct026-quantidade-teclado.png), [revisão técnica manual](../evidencias/accessibility/revisao-manual-2026-11-10.txt). **Status:** PASS. A fala do leitor de tela aguarda escuta humana.
