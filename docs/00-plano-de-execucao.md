# 00. Plano de execução

- **Projeto:** Raízes do Nordeste — Projeto de Qualidade de Software
- **Data do levantamento inicial:** 13/10/2026
- **Status:** implementação e validação local concluídas; CI remoto depende de conectar o projeto a um repositório remoto.

## Situação no levantamento inicial

O diretório de trabalho estava vazio no início da análise. Não havia código, arquivos de configuração, histórico Git, testes, documentação ou evidências para inspecionar. Portanto, não há funcionalidades existentes a preservar nem resultados anteriores a declarar.

| Área analisada | Situação encontrada |
|---|---|
| Tecnologias e estrutura | Nenhuma; diretório vazio. Node.js v24.13.0, npm 11.6.0, Python 3.14.3 e Git 2.52.0 estão disponíveis no ambiente. |
| Implementação e integrações | Não existentes. |
| Testes e CI | Não existentes. |
| Documentação e evidências | Não existentes. |
| Repositório | O trabalho pode ser versionado conforme a configuração do avaliador. |

## Lacunas em relação ao briefing

No levantamento inicial, faltavam a jornada executável, as regras de negócio, os critérios, os riscos e os artefatos de QA pedidos no briefing. O plano separou implementação, execução e registro dos resultados para não apresentar metas como evidências.

## Arquitetura proposta

Manter um monólito modular pequeno: **API Node.js 24 + JavaScript ESM**, com servidor HTTP nativo, e **interface React + TypeScript estrito**, compilada por Vite. Em produção local, o servidor entrega o build da SPA e a API na mesma origem; no desenvolvimento, Vite oferece HMR e encaminha `/api` para o servidor local. O pedido do usuário para usar React e TypeScript atualizou a escolha inicial de HTML/JavaScript nativos; a API, domínio e estratégia de QA foram preservados. O armazenamento em memória permanece explicitamente demonstrativo e reinicia junto com o processo.

```text
Navegador (APP/WEB/TOTEM demonstrativos)
        │ HTTPS em produção; HTTP local no ambiente de demonstração
        ▼
Servidor HTTP Node.js ── interface estática responsiva
        │ /api/v1
        ▼
Handlers e validação de entrada
        ▼
Casos de uso de pedido ── regras de domínio
        │                    ├── catálogo/unidade
        │                    ├── promoção e fidelidade simuladas
        │                    └── pagamento simulado
        ▼
Repositório em memória (adaptador substituível)
```

O fluxo crítico será criar pedido com `Idempotency-Key`, revalidar disponibilidade e preço no servidor, aplicar cupom/benefício segundo regras documentadas, simular o resultado de pagamento e só confirmar o pedido depois da aprovação. Os adaptadores de pagamento e fidelidade serão determinísticos em testes e nunca chamarão gateways reais. A demonstração não coletará endereço, CPF, telefone, e-mail ou credenciais reais. A interface permite nome curto opcional para chamada; os dados permanecem no processo por até 24 horas.

## Ferramentas e escolhas

| Necessidade | Escolha inicial | Motivo |
|---|---|---|
| API e servidor local | `node:http` | Runtime já disponível; reduz dependências e deixa claros os limites do protótipo. |
| Testes unitários e de integração | `node:test` e `node:assert/strict` | Executáveis sem instalar pacotes; suportam testes de domínio e HTTP real. |
| E2E e acessibilidade automática | Playwright + axe-core, dependências somente de desenvolvimento | Verifica jornada real no navegador móvel, overflow e regras WCAG automatizáveis. |
| Lint | ESLint flat config | Regra estática consistente no código, sem etapa de build artificial. |
| Interface | React, TypeScript estrito, Vite e CSS | Componentes e contratos tipados deixam o fluxo de interface testável e preparado para expansão sem alterar as regras da API. |
| Carga | Gerador Node.js concorrente com HTTP real, rampa, sustentação e redução | Executável sem binário externo e com métricas de percentis/erro/throughput. |
| CI | GitHub Actions para audit de dependências, lint, sintaxe, testes, cobertura e E2E, se conectado ao GitHub | Gate simples; não pressupõe integração externa configurada. |
| Segurança e acessibilidade | Testes automatizados próprios para contratos essenciais; checklist manual documentado | Não alegar auditoria abrangente a partir de verificações limitadas. |

## Artefatos previstos

- Implementação funcional de API e interface responsiva para unidade, cardápio, carrinho, cupom, modalidade, pagamento simulado e confirmação.
- Testes unitários, de integração HTTP e E2E do navegador quando a ferramenta disponível permitir execução; scripts independentes de carga e checagens de segurança.
- Documentação essencial em `docs/`: projeto, arquitetura, QA/testes, rastreabilidade, métricas, privacidade e relatório final.
- `README.md`, `.gitignore`, configuração de CI e `evidencias/` organizada por tipo; arquivos de evidência só serão preenchidos por execuções reais.

## Ordem de implementação

1. Registrar este plano antes de qualquer implementação.
2. Definir contexto, RFs/RNFs, critérios de aceitação, riscos, decisões arquiteturais, plano de QA/testes, LGPD e metas de qualidade.
3. Implementar domínio e API com validação, limites de entrada, idempotência, adaptadores simulados e interface mobile mínima.
4. Automatizar testes de domínio, integração e jornada; adicionar cenários de carga e segurança reproduzíveis sem afirmar resultados antecipados.
5. Executar os comandos disponíveis, corrigir falhas e salvar logs/relatórios reais em `evidencias/`.
6. Atualizar rastreabilidade, resultados e decisão de conformidade com base apenas nas execuções observadas; registrar bloqueios e limitações restantes.

## Critério de conclusão do plano

O projeto estará pronto para avaliação quando a jornada demonstrativa for reproduzível, os requisitos críticos tiverem teste e evidência vinculados, os testes executáveis estiverem verdes no ambiente utilizado, as limitações do armazenamento e dos mocks estiverem claras, e a decisão GO / GO WITH RESTRICTIONS / NO-GO estiver sustentada pelos resultados reais.
