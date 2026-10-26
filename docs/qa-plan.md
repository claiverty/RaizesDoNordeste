# Plano de QA

## Objetivo e escopo

Validar que a jornada de realização do pedido recalcula preço no servidor, aplica regras de desconto, não confirma cobrança recusada/indeterminada, evita duplicidade por chave, protege consulta do pedido e permanece utilizável em viewport móvel. O plano cobre API e interface demonstrativa, mocks, dados em memória, documentação e CI local.

- **Dentro do escopo:** regras de domínio; API HTTP; unidade/cardápio/carrinho/cupom/fidelidade/pagamento; idempotência; autorização por token do pedido; validação e rate limit; interface responsiva; testes e evidências sintéticas; métricas de latência local.
- **Fora do escopo:** gateway real, segurança ofensiva, pentest, auditoria LGPD formal, persistência/alta disponibilidade de produção, integração com POS/ERP, validação com consumidores reais e garantia de SLO mensal.

## Estratégia e gates

1. **Gate de código:** sintaxe válida; testes unitários e de integração passam; cobertura de domínio ≥80% como meta.
2. **Gate de fluxo crítico:** CT001/CT007 e CT010 não falham; recusa/timeout nunca criam pedido confirmado; nenhum preço é aceito do cliente.
3. **Gate de segurança/privacidade:** acesso sem token é negado; corpo excedente e entrada inválida são bloqueados; logs de teste sem dados pessoais/tokens.
4. **Gate de interface:** fluxo básico navegável por teclado e em viewport 360×800 sem overflow horizontal; labels presentes e controles principais com alvo de toque de 44 px.
5. **Gate de performance:** executar carga e comparar com RQF01/RQF02; discrepância vira bloqueio de release ou restrição explicitamente aprovada. Não inferir capacidade de produção a partir de localhost.
6. **Gate de conformidade:** requisitos críticos rastreados a testes e evidências; limitações, falhas e estados não executados listados no relatório.

Release demonstrativo é **NO-GO** se houver falha em pedido/preço/idempotência, defeito blocker/critical aberto, vazamento de dado/segredo, consulta não autorizada ou pagamento real habilitado. Para uso comercial, é NO-GO até persistência durável, integração de pagamento homologada, autenticação/segredos/TLS e avaliação de privacidade estarem implementadas e validadas.

## Ambientes e ferramentas

| Ambiente | Uso | Dados |
|---|---|---|
| Local de desenvolvimento | API e interface em `localhost` | Catálogo fixo e pedidos sintéticos voláteis |
| Testes automatizados | `node:test`, processos HTTP locais e Playwright (se dependência instalada) | Fixtures determinísticas; sem PII real |
| Carga local | Gerador reprodutível contra servidor local | Produtos e identificadores sintéticos |
| CI | GitHub Actions, Node 24 | Sem segredos e sem gateway |

## Entrada, saída e bloqueios

- **Entrada:** plano e requisitos aprovados pelo próprio escopo; runtime Node 24 disponível; configuração limpa; mocks determinísticos.
- **Saída:** testes críticos executados ou marcados BLOCKED/NOT_EXECUTED com causa; regressão aprovada; riscos e limitações atualizados; evidências apontadas; relatório final refletindo execução real.
- **Bloqueio imediato:** pagamento real ou credenciais presentes; dados pessoais reais em fixtures/logs; falha de integridade/idempotência; aplicação confirma pedido com preço não validado.

## Regressão e evidências

Executar testes unitários e API em cada alteração; E2E após alterações de jornada; carga após mudança de serialização/regras ou antes de release candidata. Saídas serão salvas em `evidencias/{unit,integration,e2e,performance,security,mobile,metrics}` somente quando geradas. Evidência deve indicar data, comando, versão, ambiente e status; nunca guardar tokens de pedido de clientes reais.

## RACI

| Atividade | QA Engineer | Software Engineer | Product/Franquia | Segurança/Privacidade |
|---|---|---|---|---|
| Requisitos e critérios de aceitação | R | C | A | C |
| Arquitetura e implementação | C | R/A | C | C |
| Plano e automação de testes | R/A | R | C | C |
| Aprovação de regra de negócio | C | C | R/A | C |
| Avaliação de privacidade e risco | C | R | C | A |
| Decisão de release | R | R | A | C |

R=responsável pela execução; A=accountable/aprovador; C=consultado. Em equipe pequena, uma pessoa pode exercer mais de um papel; a tabela descreve responsabilidades, não pessoas designadas.

## Cronograma de validação

Estimativa de calendário para uma equipe pequena (1 QA + 1 engenharia), não é apontamento do tempo desta execução:

| Etapa | Atividade | Estimativa | Critério de saída |
|---|---|---:|---|
| 1 | Contexto, requisitos, risco e arquitetura | 1 dia útil | IDs e critérios ligados aos fluxos críticos |
| 2 | Domínio e API | 2 dias úteis | Testes unitários/integração críticos verdes |
| 3 | Interface e E2E/mobile | 1 dia útil | CT001 e CT014 executados ou limitação registrada |
| 4 | Performance, segurança e LGPD | 1 dia útil | Scripts e checks executados; resultados reais anexados |
| 5 | Rastreabilidade, UAT e conformidade | 0,5 dia útil + agenda de participantes | Status, métricas, limitações e decisão consistentes; UAT registrado |

## Modelo de registro de defeito

Copie o modelo abaixo para cada defeito reproduzível. Se não foi reproduzido, usar status **OPEN / NEEDS_REPRODUCTION**, não afirmar causa.

```markdown
## BUG-XXX — [título curto]

- Ambiente/versão:
- Data/hora:
- Severidade: Blocker | Critical | Major | Minor | Trivial
- Prioridade: P0 | P1 | P2
- Status: Open | In progress | Fixed | Retest | Closed | Deferred
- Requisito relacionado:
- Caso de teste:
- Pré-condições:
- Dados sintéticos usados:
- Passos para reproduzir:
  1.
- Resultado atual:
- Resultado esperado:
- Evidências (log/screenshot/trace sanitizado):
- Frequência/reprodutibilidade:
- Responsável:
- Observações/limitações:
```

Não anexar dados reais, tokens de acesso ou informações de cartão. Evidência deve preservar requestId quando útil e remover campos identificadores.
