# Métricas, KPIs e SLOs

Metas abaixo são **propostas** para a jornada de pedido. Resultados locais atuais estão registrados no [relatório final](relatorio-final-conformidade.md); objetivos de produção exigem baseline real por unidade, canal e dispositivo.

| Métrica / KPI | Definição e fórmula | Fonte / frequência | Responsável | Meta | Alerta e ação |
|---|---|---|---|---|---|
| Taxa de defeitos | Defeitos válidos encontrados ×100 / casos executados, separados por severidade; reportar também defeitos escapados em produção / pedidos concluídos. | Test tracker por ciclo e mensal; no protótipo, casos e log de execução | QA | 0 blocker/critical aberto antes de release; tendência de escape decrescente | Qualquer blocker/critical bloqueia release; classificar raiz e adicionar regressão |
| Cobertura de linhas | Linhas executadas / linhas instrumentadas ×100; reportar domínio separadamente. | `node --experimental-test-coverage --test` por CI | Engenharia | ≥80% no domínio de pedido; sem usar cobertura como substituto de revisão | Abaixo da meta: ampliar casos de regra/branch e avaliar código não coberto |
| Tempo de resposta (SLI) | Distribuição de duração fim a fim; p50/p95/p99 por rota e operação; iniciar no request e encerrar após resposta. | Gerador local a cada mudança de performance; APM futuro contínuo | Engenharia/SRE | Cardápio p95 ≤250 ms; pedido aprovado p95 ≤750 ms sob carga local definida | Se estourar em 2 execuções comparáveis, bloquear gate, segmentar rota e perfilar |
| Disponibilidade (SLI/SLO) | Sondas bem-sucedidas / sondas válidas ×100 por janela mensal. Erros de usuário não contam como indisponibilidade; política precisa ser definida antes de produção. | Sonda externa/APM; mensal | SRE/Operação | ≥99,5% mensal para API de pedidos, excluída manutenção anunciada conforme política | Burn rate ou queda abaixo do SLO: incidente, rollback e revisão de capacidade/dependências |
| Taxa de sucesso do pedido | pedidos `CONFIRMED` / tentativas de checkout válidas ×100, por canal/unidade. | Eventos sem PII; diária/semanal | Produto/Operação | Baseline primeiro; após 4 semanas definir meta sem premiar recusas indevidas | Queda relevante vs. baseline: segmentar por erro, unidade e etapa; não atribuir causa sem evidência |
| Abandono de checkout | (checkouts iniciados − pedidos confirmados) / checkouts iniciados ×100, janela de sessão definida. | Analytics com eventos minimizados; semanal | Produto | Baseline inicial; meta de redução definida após 4 semanas e teste de usabilidade | Crescimento: verificar erro, preço, disponibilidade, tempo e etapa sem gravar conteúdo de campo |
| CSAT | Respostas 4–5 / respostas válidas ×100 em pergunta opcional pós-retirada, escala 1–5. | Pesquisa anônima e opcional, mensal; não implementada no protótipo | Produto/Operação | ≥80% após amostra adequada; reportar n e intervalo | <80% ou queda ≥5 p.p.: classificar comentários sem coletar dados sensíveis e investigar |
| SUS | Soma das contribuições SUS ×2,5; contribuição para item ímpar = resposta−1; par = 5−resposta. | Questionário de 10 itens em rodada moderada, por versão | UX/QA | SUS ≥75 como alvo exploratório; amostra e contexto reportados | <75: identificar tarefas com fricção e validar correções com nova rodada |
| MTTR | Soma do tempo de detecção até restauração / incidentes resolvidos; também mediana por severidade. | Sistema de incidentes, mensal | SRE/Operação | SEV1 ≤2 h; SEV2 ≤1 dia útil, metas iniciais a recalibrar | Estouro: revisar runbook, alerta, acesso a responsáveis e dependências |
| Requisições repetidas | Tentativas duplicadas por chave / pedidos confirmados e quantidade de conflito por chave. | Métrica de API sem armazenar chave; diária | Engenharia/Operação | 0 pedidos duplicados confirmados | Qualquer duplicado: bloquear release, reconciliar pagamento e abrir incidente |

## Método de satisfação

No protótipo, não há pesquisa nem amostra de usuários; portanto CSAT e SUS estão **não medidos**. Em UAT, convidar usuários representativos após a retirada (sem condicionar o serviço), permitir pular, não associar resposta ao nome/pedido, e divulgar finalidade/retenção. SUS exige os dez itens padronizados e cálculo acima. Relatar número de respostas, taxa de resposta e contexto; não declarar satisfação a partir de uma ou duas opiniões.

## Resultados medidos nesta execução

| Métrica | Resultado observado | Interpretação |
|---|---|---|
| Defeitos confirmados em automação | 0 encontrados em 22 testes de domínio/API e 5 testes E2E executados | Não equivale a taxa de defeitos de produção; cobertura limitada ao escopo automatizado. |
| Cobertura do domínio incluído | 89,41% linhas / 84,27% branches agregadas; `order-rules.mjs` 90,67% linhas / 83,72% branches | Acima dos gates de 80% linhas e 75% branches. |
| Latência sob carga local (500 VUs) | Sustentação: menu p50/p95/p99 = 118,39/149,16/184,94 ms; pedido = 118,38/149,67/185,55 ms | Os dois p95 passaram os alvos de 250 ms e 750 ms na máquina local. |
| Erros/throughput da carga | 0/146.101 = 0%; 4.175,49 req/s na janela medida | Carga sintética local; não extrapolar para produção. |
| Disponibilidade mensal | NOT_EXECUTED | Não houve coleta contínua por um mês. |
| CSAT/SUS | NOT_EXECUTED | Sem usuários participantes; E2E não mede satisfação. |
| MTTR | NOT_EXECUTED | Nenhum incidente de operação real foi acompanhado. |

Evidências: [carga](../evidencias/performance/ct015-load-500.json) e [cobertura](../evidencias/unit/coverage-run.txt).

## SLOs versus protótipo

SLI/SLO pressupõe coleta em serviço operado. Teste local de percentis mede só a máquina e a versão usadas. A disponibilidade mensal de 99,5%, CSAT, SUS, defeitos em produção e MTTR não podem ser medidos pelo conjunto atual de testes unitários/integração; precisam de instrumentação/rotina real.
