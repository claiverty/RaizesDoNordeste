# Projeto, requisitos e riscos

## Problema de negócio

A Raízes do Nordeste opera unidades franqueadas e precisa padronizar pedidos em canais digitais e presenciais. A inconsistência de catálogo/preço por unidade, falhas em integrações, repetição de pagamento após perda de conexão e fricção no checkout podem gerar perda de venda, retrabalho operacional e quebra de confiança.

## Objetivo e limites

O objetivo desta entrega é demonstrar uma jornada de pedido verificável e uma estratégia de qualidade rastreável. A aplicação é um protótipo local com catálogo fixo e armazenamento volátil em memória. Promoções, fidelidade e pagamento são simulados. Não é sistema de produção, não captura dados de cartão e não se conecta a franquias ou gateways reais.

## Atores e canais

| Ator | Necessidade | Canais considerados |
|---|---|---|
| Cliente | Consultar a unidade, montar pedido, conferir preço e receber confirmação | APP e WEB demonstrados; TOTEM, BALCÃO e PICKUP representados no campo de canal |
| Operação da unidade | Receber pedido confirmado sem divergência de preço ou duplicidade | API interna do protótipo; operação real fora do escopo |
| QA/engenharia | Reproduzir falhas, inspecionar contratos, testes, métricas e evidências | CLI, testes automatizados e navegador |
| Serviços externos | Simular decisão de fidelidade e pagamento | Adaptadores determinísticos locais |

## Jornada alvo

1. Cliente chega à landing page (`/`), escolhe uma unidade disponível e avança para `/cardapio`, onde consulta o catálogo e preços retornados pelo servidor.
2. Adiciona itens e quantidades ao carrinho; o cliente não define preço.
3. Pode informar cupom e solicitar resgate de benefício simulado.
4. Em `/checkout`, escolhe retirada no balcão ou consumo na unidade; no fluxo web, o sistema registra o canal WEB automaticamente.
5. Confere total, informa opcionalmente um nome curto para chamada e escolhe um resultado de pagamento simulado.
6. A API revalida unidade, itens, disponibilidade e preços; calcula descontos; processa a chave de idempotência.
7. O pedido só é persistido e confirmado se o mock de pagamento aprovar.
8. Em `/comprovante`, cliente recebe o número do pedido e um token temporário para consultar a confirmação.

## Diretrizes do fluxo

- A landing page apresenta a escolha de unidade e leva diretamente ao cardápio.
- O checkout mostra o total antes da confirmação e pede somente os dados necessários ao pedido; o nome para chamada é opcional.
- A interface informa quando o pagamento é simulado e quando a água é cortesia.

## Premissas e decisões

- Valores monetários são armazenados em centavos inteiros para evitar erros de ponto flutuante.
- O servidor é a fonte de verdade de disponibilidade, preço e total.
- Pedido sem pagamento aprovado não entra na coleção de pedidos confirmados.
- A chave de idempotência evita repetir o processamento da mesma tentativa no processo atual; a solução em memória não fornece garantia entre reinícios nem entre múltiplas instâncias.
- Dados de teste são sintéticos. Nenhum dado pessoal real deve ser usado.
- Metas de qualidade são alvos de validação do protótipo; não representam SLO medido de operação real.

## Fora do escopo

Gateway real, captura/armazenamento de cartão, autenticação federada, cadastro de conta, delivery com endereço, integração real de estoque/ERP/CRM/fidelidade, persistência durável, painel administrativo, emissão fiscal, implantação cloud e auditoria formal de segurança/LGPD.

## Fluxo de falha e recuperação

Erros de entrada e de regra retornam códigos estáveis e mensagens sem stack trace. Unidade ou produto indisponível bloqueia a tentativa antes do pagamento. Cupom inválido/expirado não é aplicado. Falha do mock de fidelidade não resulta em cobrança. Recusa e timeout de pagamento não criam pedido confirmado. A mesma chave e o mesmo conteúdo reproduzem a resposta gravada; a mesma chave com conteúdo diferente retorna conflito. A interface preserva o carrinho para que o cliente revise a tentativa.

## Requisitos funcionais

Prioridade: **P0** crítica para a jornada; **P1** importante; **P2** complementar. Os critérios descrevem o comportamento esperado; seu estado de execução aparece na matriz de rastreabilidade e no relatório final.

| ID | Título e descrição | Ator | Prioridade | Justificativa | Critérios de aceitação | Riscos | Canais |
|---|---|---|---|---|---|---|---|
| RF01 | Selecionar unidade: listar unidades e impedir pedido em unidade inativa. | Cliente | P0 | Catálogo e operação variam por franquia. | Lista mostra estado; unidade indisponível não permite checkout; API responde erro estável. | R04, R10 | APP, WEB, TOTEM, BALCÃO, PICKUP |
| RF02 | Consultar cardápio da unidade selecionada com preço e disponibilidade. | Cliente | P0 | Evita comprar item inexistente ou com preço de outra unidade. | Cada resposta é específica da unidade; itens indisponíveis são identificados; preço em BRL. | R03, R04 | APP, WEB, TOTEM, BALCÃO, PICKUP |
| RF03 | Manter carrinho com um ou mais produtos e quantidades inteiras de 1 a 20. | Cliente | P0 | Base para cálculo de pedido válido. | Carrinho vazio, produto repetido ou quantidade fora do limite não é confirmado. | R01, R02 | APP, WEB, TOTEM, BALCÃO |
| RF04 | Revalidar unidade, produto, disponibilidade e preço no servidor ao confirmar. | Sistema | P0 | O cliente não é fonte confiável para preço/estoque. | Totais são recalculados do catálogo; divergência não é cobrada; resposta orienta atualização do carrinho. | R03, R04 | Todos |
| RF05 | Aplicar cupom de promoção válido. | Cliente | P1 | Regras promocionais precisam ser consistentes entre canais. | `BOASVINDAS10` aplica 10% ao subtotal elegível uma única vez; total e desconto aparecem antes do pagamento. | R06 | APP, WEB, TOTEM, BALCÃO |
| RF06 | Rejeitar cupom inválido ou expirado sem alterar total. | Sistema | P0 | Evita desconto indevido e informação enganosa. | Códigos inválidos/expirados retornam erro distinto; pedido não segue com desconto não concedido. | R06 | Todos |
| RF07 | Consultar e resgatar benefício de fidelidade por adaptador simulado. | Cliente/Sistema | P1 | Demonstra integração desacoplada e cenário de falha. | Resgate de 500 pontos usa desconto de até R$ 3,00; falha externa retorna erro seguro; não há cobrança. | R07 | APP, WEB, TOTEM, BALCÃO |
| RF08 | Escolher modalidade de consumo: retirada no balcão ou consumo na unidade. | Cliente | P1 | Pedido precisa orientar a unidade sem coletar endereço. | Uma das opções é obrigatória e exibida na confirmação. | R10 | APP, WEB, TOTEM, BALCÃO, PICKUP |
| RF09 | Informar canal de origem dentre APP, WEB, TOTEM, BALCÃO e PICKUP. | Sistema/Cliente | P1 | Permite validar comportamento multicanal e métricas. | Canal é validado em enumeração e registrado no pedido. | R03 | Todos |
| RF10 | Processar pagamento exclusivamente por mock com aprovado, recusado ou timeout. | Cliente/Sistema | P0 | Permite testar decisão e falhas sem transação financeira real. | Mock não recebe credencial de cartão; pedido só é confirmado após aprovação; recusa/timeout não criam pedido confirmado. | R01, R08 | Todos |
| RF11 | Confirmar pedido aprovado com identificador e token de consulta. | Sistema/Cliente | P0 | Fecha a jornada e permite consulta protegida. | Resposta contém número, total, modalidade e token aleatório; consulta exige token correto. | R01, R05 | Todos |
| RF12 | Garantir idempotência por `Idempotency-Key`. | Sistema | P0 | Reenvios por timeout/conexão não devem criar pedidos duplicados. | Mesma chave+mesmo conteúdo reproduz resultado; mesma chave+conteúdo diferente retorna 409; somente um pedido confirmado. | R02, R08 | Todos |
| RF13 | Retornar erros de API estruturados e não expor detalhes internos. | Sistema | P0 | Clientes e operação precisam tratar falhas sem vazamento. | Corpo contém código e requestId; stack trace, segredo e dados sensíveis nunca aparecem. | R05, R09 | Todos |
| RF14 | Limitar volume de chamadas por origem para conter abuso acidental. | Sistema | P1 | Reduz impacto de repetição e sobrecarga no protótipo. | Excesso retorna 429 e `Retry-After`; janela e limite são configuráveis. | R09, R10 | Todos |
| RF15 | Consultar pedido confirmado mediante token de acesso do pedido. | Cliente | P1 | Acesso anônimo não deve expor pedido alheio. | Sem token ou token errado retorna 401/403; token correto acessa apenas o pedido correspondente. | R05 | APP, WEB, PICKUP |
| RF16 | Consultar prévia autoritativa de subtotal, descontos e total antes de confirmar. | Cliente/Sistema | P0 | O cliente precisa entender o valor final e o servidor deve ser fonte de verdade. | Endpoint de prévia calcula com catálogo da unidade e as mesmas regras do pedido; nenhuma chamada de pagamento ou persistência ocorre. | R03, R06, R07 | Todos |

### Regras de negócio

- `subtotal = soma(preço_atual_do_servidor × quantidade)`.
- Cupom ativo `BOASVINDAS10`: desconto de 10% do subtotal, arredondado para baixo em centavos.
- Código `VENCIDO`: retorna `COUPON_EXPIRED`; demais códigos desconhecidos retornam `COUPON_INVALID`.
- Fidelidade simulada: resgate fixo de 500 pontos reduz até 300 centavos; descontos nunca deixam total negativo.
- Cupom e fidelidade podem ser acumulados nesta demonstração, limitados ao subtotal. Não existe frete ou tarifa oculta.
- Só o resultado `APPROVED` do adaptador de pagamento autoriza persistir pedido `CONFIRMED`.
- Dados de pedido e chaves de idempotência tornam-se inacessíveis após 24 horas e são removidos pela rotina de limpeza em até 1 minuto; reiniciar o servidor remove todos os dados.

## Requisitos de qualidade

As metas abaixo são **planejadas** para o protótipo e devem ser medidas pelos scripts descritos. Elas não são resultados nem promessa de SLO de produção. A linha de base local serve para comparar mudanças no mesmo ambiente, não para extrapolar capacidade de franquias reais.

| ID | Atributo | Requisito mensurável / meta | Métrica | Validação | Risco mitigado |
|---|---|---|---|---|---|
| RQF01 | Desempenho | Leitura do cardápio p95 ≤ 250 ms em carga local de até 500 VUs. | p50/p95/p99, throughput, erro | Script de carga contra endpoint local, com aquecimento e fases. | R10 |
| RQF02 | Desempenho | Criação de pedido aprovado p95 ≤ 750 ms em carga local mista. | Duração por operação | Script de carga com dados sintéticos e chaves únicas. | R10, R01 |
| RQF03 | Disponibilidade | Endpoint de saúde e fluxo local disponíveis em ≥99,5% das sondagens de uma janela mensal de operação, excluída manutenção anunciada. | Sondas bem-sucedidas / total | APM/monitoramento em implantação futura; teste de contrato local apenas valida resposta. | R10 |
| RQF04 | Confiabilidade | 100 reenvios concorrentes da mesma chave e payload resultam em no máximo 1 pedido confirmado. | Pedidos únicos por chave | Teste de integração concorrente; replays podem responder conflito enquanto processamento está em andamento. | R02 |
| RQF05 | Integridade financeira | Diferença entre total calculado no servidor e detalhamento da confirmação = R$ 0,00 em todos os testes de preço/cupom. | Diferença em centavos | Testes unitários e contrato HTTP com casos de borda. | R03, R06 |
| RQF06 | Segurança e privacidade | 0 CPF, telefone, endereço, token de acesso ou payload de cliente em logs de aplicação. | Achados de padrões proibidos em logs sintéticos | Teste de captura de log; revisão manual de campos e logs. | R05 |
| RQF07 | Autorização | 100% das consultas de pedido sem token válido são negadas. | Tentativas inválidas aceitas | Testes de integração 401/403 e teste de isolamento entre pedidos. | R05 |
| RQF08 | Abuso | Após 60 requisições por IP por janela de 60 s, próxima requisição recebe HTTP 429 e `Retry-After`. | Chamadas permitidas/bloqueadas | Teste do limitador com relógio e limite injetáveis. | R09 |
| RQF09 | Usabilidade e acessibilidade mobile | Em 360×800 px não há rolagem horizontal; controles principais têm alvo mínimo de 44×44 px e nomes acessíveis. | Overflow, dimensões, labels/foco | E2E em viewport móvel e checagem automática DOM; validação manual com teclado/leitor de tela recomendada. | R11 |
| RQF10 | Experiência e completude | Jornada em rotas próprias: LP `/` para unidade, `/cardapio`, `/checkout` e `/comprovante`; sem cadastro ou campos de e-mail, senha, CPF, telefone ou endereço. Voltar/avançar mantém o pedido na sessão; o total aparece antes da confirmação. | URLs e etapas percorridas, campos exigidos, estado do carrinho e clareza do total | E2E valida as rotas, o caminho e a preservação do carrinho; avaliar conclusão e abandono por etapa com usuários antes de afirmar conversão. | R11 |
| RQF11 | Observabilidade | 100% das respostas HTTP têm `X-Request-Id`; log estruturado tem requestId, método, rota, status e duração, sem corpo da requisição. | Respostas e logs instrumentados | Teste HTTP e inspeção de logs. | R01, R08, R10 |
| RQF12 | Manutenibilidade/testabilidade | Cobertura de linhas ≥80% no domínio de pedido e desconto. | Cobertura nativa de linhas | `node --experimental-test-coverage --test`; relatório real arquivado. | R01, R02, R03, R06 |

### Justificativas e limites

- 250/750 ms são alvos de orçamento para respostas locais percebidas em uma jornada móvel, não números observados. O teste reportará percentis e erro; resultado acima da meta será documentado, não ocultado.
- 99,5% é uma meta acadêmica de disponibilidade moderada para um serviço de pedidos; não pode ser demonstrada por testes unitários nem pelo protótipo local sem histórico mensal.
- 500 VUs é um pico sintético para exercitar concorrência, não uma previsão de usuários reais. A execução pode ser reduzida se o host não suportar; a carga efetiva será registrada.
- 44×44 px é um alvo de toque adotado para facilitar interação em telas pequenas. Checagem de DOM não substitui avaliação com usuários e tecnologias assistivas.
- Cobertura mede execução de linhas, não qualidade ou suficiência dos testes. Gates de release também consideram cenários críticos, defeitos e segurança.

## Riscos do projeto

Escalas: probabilidade (P) e impacto (I) de 1 a 5; severidade = P×I. Prioridade: **Crítica** ≥20; **Alta** 12–19; **Média** 6–11; **Baixa** ≤5. Valores iniciais qualitativos para priorização, a revisar com dados de operação.

| ID | Risco / origem | Impacto | P | I | Severidade / prioridade | Requisito | Mitigação | Teste relacionado |
|---|---|---:|---:|---:|---|---|---|---|
| R01 | Pagamento aprovado sem pedido confirmado por falha entre adaptador e persistência. | Perda financeira e reclamação | 2 | 5 | 10 / Média | RF10–RF11 | Confirmar somente após aprovação; salvar resposta final por chave; monitorar divergência em produção. | CT007, CT009 |
| R02 | Reenvio cria pedido duplicado após perda de conexão. | Cobrança/produção duplicada | 3 | 5 | 15 / Alta | RF12 | Idempotência por chave e fingerprint; teste concorrente; persistência transacional durável em produção. | CT010 |
| R03 | Preço adulterado ou divergente entre canais. | Prejuízo e quebra de confiança | 3 | 5 | 15 / Alta | RF02, RF04 | Calcular no servidor a partir do catálogo da unidade; ignorar preço do cliente. | CT017, CT019 |
| R04 | Unidade ou produto indisponível recebe pedido. | Pedido não atendido | 3 | 4 | 12 / Alta | RF01–RF04 | Revalidar imediatamente antes do pagamento e responder erro estável. | CT002, CT012 |
| R05 | Exposição de dados pessoais ou pedido alheio. | Dano ao titular e risco regulatório | 2 | 5 | 10 / Média | RF13, RF15 | Minimização, token aleatório por pedido, logs sem corpo, TTL documentado, teste de autorização. | CT013, CT016 |
| R06 | Cupom vencido/inválido aplicado ou desconto calculado errado. | Perda financeira/insatisfação | 3 | 4 | 12 / Alta | RF05–RF06 | Regras no domínio, centavos inteiros, limites de desconto, casos de borda. | CT004–CT006, CT017 |
| R07 | Falha do serviço de fidelidade após seleção do benefício. | Benefício indevido ou abandono | 3 | 3 | 9 / Média | RF07 | Falha segura: não cobra nem confirma; mensagem para tentar sem benefício. | CT011 |
| R08 | Timeout de pagamento com resultado desconhecido e tentativa repetida. | Duplicidade ou pedido perdido | 3 | 5 | 15 / Alta | RF10, RF12 | Resposta de timeout idempotente; mesmo retry não chama mock novamente; reconciliação necessária em integração real. | CT009–CT010 |
| R09 | Requisições excessivas ou payload abusivo. | Degradação/indisponibilidade | 3 | 4 | 12 / Alta | RF13–RF14 | Limite por IP, tamanho máximo do corpo, validação e erros sem detalhes internos. | CT018 |
| R10 | Indisponibilidade durante pico/reflexo de serviço externo. | Vendas interrompidas | 3 | 4 | 12 / Alta | RF07, RF10 | Isolar adaptadores, timeout, teste de carga e SLO; fallback operacional a definir antes de produção. | CT015, CT011 |
| R11 | Interface ilegível ou difícil de operar no celular/totem. | Abandono e erro de pedido | 3 | 3 | 9 / Média | RNF mobile, RF03 | Layout mobile-first, resumo de preço persistente, labels, foco visível e alvos de toque. | CT014 |
| R12 | Perda de pedidos ao reiniciar ou subir outra instância. | Histórico e idempotência perdidos | 4 | 3 | 12 / Alta | RNF confiabilidade | Limitação explicitada; não usar em produção; trocar por armazenamento transacional compartilhado antes de liberar comercialmente. | CT020 |

### Leitura da matriz P×I

| P \ I | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| 5 | 5 B | 10 M | 15 A | 20 C | 25 C |
| 4 | 4 B | 8 M | **12 A (R12)** | 16 A | 20 C |
| 3 | 3 B | 6 M | **9 M (R07/R11)** | **12 A (R04/R06/R09/R10)** | **15 A (R02/R03/R08)** |
| 2 | 2 B | 4 B | 6 M | 8 M | **10 M (R01/R05)** |
| 1 | 1 B | 2 B | 3 B | 4 B | 5 B |

### Revisão de risco

As probabilidades são estimativas iniciais, não frequências observadas. Em produção, recalibrar com incidentes, tentativas de repetição, disponibilidade de integrações, diferenças de preço e telemetria de abandono; atribuir responsável operacional para cada risco alto.
