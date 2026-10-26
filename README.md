# Raízes do Nordeste — Projeto de Qualidade de Software

Protótipo acadêmico/profissional para validar a feature **Realização de Pedido** em uma rede de franquias alimentícias. O projeto prioriza regras de negócio testáveis, rastreabilidade e evidências verificáveis. Catálogo, fidelidade e pagamento são demonstrativos; pagamento não é real.

## Executar localmente

Requisitos: Node.js 24 ou superior.

```powershell
npm install
npm run dev
```

Abra `http://127.0.0.1:5173`. O comando inicia a API Node em `http://127.0.0.1:3000` e o Vite para a interface React com HMR. A unidade Recife Centro aceita pedidos; Natal Norte está indisponível para exercitar o cenário de falha.

Para executar o build de produção local servido pelo Node:

```powershell
npm start
```

Esse comando verifica os tipos, compila a SPA e inicia o servidor em `http://127.0.0.1:3000`. `HOST` e `PORT` podem ser definidos para o servidor de build.

## Telas da jornada

| Rota | Tela |
|---|---|
| `/` | Landing page e escolha da unidade |
| `/cardapio` | Cardápio e carrinho |
| `/checkout` | Modalidade, resumo e pagamento simulado |
| `/comprovante` | Confirmação e número do pedido |

As telas usam o mesmo estado durante a sessão; voltar pelo navegador preserva unidade e itens do carrinho. No checkout web, o canal de origem é enviado automaticamente como `WEB`; a seleção de canal é informação de integração/teste, não uma escolha do cliente.

## Testes e validações

```powershell
npm test
npm run test:coverage
npm run lint
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes de API/domínio usam `node:test`; `npm run check` também executa o verificador estrito do TypeScript. Playwright e axe-core são dependências de desenvolvimento para E2E móvel e checagens automáticas de acessibilidade. `npm run test:e2e` compila a SPA antes de abrir o servidor. O relatório HTML do Playwright fica em `playwright-report/` e os resultados temporários em `test-results/`.

## Teste de carga

O comando abaixo inicia um servidor local isolado, desliga seus logs de request e eleva o rate limit somente para o teste. Ele encerra o processo ao final:

```powershell
npm run load:local -- --vus 500 --warmup 5 --duration 30 --ramp-down 5
```

O gerador mistura leitura de cardápio com criação de pedidos sintéticos e reporta p50/p95/p99, erro, throughput, duração e resultados por operação. `npm run load` permite apontar para um servidor já iniciado; `npm run load:local` é preferível para reproduzir a validação isolada. O teste é local; não executar contra serviço de produção. É possível ajustar `--vus`, `--duration`, `--warmup`, `--ramp-down` e `--error-threshold`. Código de saída diferente de zero indica erro acima do limite ou p95 fora das metas definidas.

## API resumida

| Método | Caminho | Uso |
|---|---|---|
| GET | `/api/v1/health` | Saúde do processo |
| GET | `/api/v1/units` | Unidades e estado |
| GET | `/api/v1/units/:id/menu` | Cardápio e preço por unidade |
| POST | `/api/v1/orders/quote` | Prévia autoritativa de valores |
| POST | `/api/v1/orders` | Criação com header obrigatório `Idempotency-Key` |
| GET | `/api/v1/orders/:id` | Consulta com `Authorization: Bearer <accessToken>` |

Consulte [a arquitetura](docs/arquitetura.md) para detalhes do fluxo e dos limites do protótipo.

## Arquitetura e limites

Node.js 24, API JavaScript ESM com HTTP nativo, interface React + TypeScript estrito compilada por Vite, `node:test`, Playwright e axe-core em desenvolvimento. Dados e idempotência residem em memória e desaparecem ao reiniciar o processo; o protótipo não atende requisitos de produção, alta disponibilidade, reconciliação financeira ou escala horizontal.

## Resultados atuais

Na validação da versão atual em 26/10/2026: lint, tipos, build, 22/22 testes unitários/de integração, 5/5 E2E e `npm audit` passaram; a auditoria reportou zero vulnerabilidades. A carga local de 500 VUs teve 0% de erro e p95 de pedido de 149,67 ms na sustentação. A decisão é **GO WITH RESTRICTIONS para demonstração** e **NO-GO para uso comercial**. Os resultados estão no [relatório final](docs/relatorio-final-conformidade.md).

## Documentação

- [Plano de execução](docs/00-plano-de-execucao.md)
- [Projeto, requisitos e riscos](docs/01-projeto.md)
- [Arquitetura](docs/arquitetura.md)
- [Plano de QA e registro de defeitos](docs/qa-plan.md)
- [Plano e casos de teste](docs/test-plan.md)
- [Matriz de rastreabilidade](docs/matriz-rastreabilidade.md)
- [Métricas e SLOs](docs/metricas.md)
- [Privacidade e segurança](docs/lgpd.md)
- [Relatório final](docs/relatorio-final-conformidade.md)

## Evidências

Logs, dados de carga e screenshots em `evidencias/` foram gerados pelas execuções locais documentadas no [relatório final](docs/relatorio-final-conformidade.md).

## CI

O workflow em `.github/workflows/quality.yml` executa auditoria de dependências, ESLint, verificações de sintaxe, testes, cobertura e E2E móvel em pushes e pull requests. Ele ainda não foi executado em um repositório remoto.

## Uso de IA

A IA foi utilizada para auxiliar na implementação de algumas funcionalidades do projeto.
# RaizesDoNordeste
