# Privacidade e segurança do projeto

## Escopo

Esta análise descreve os dados usados pelo protótipo, as finalidades e os controles implementados. As hipóteses de tratamento e prazos precisam de validação jurídica antes de qualquer uso comercial.

## Dados do fluxo

| Dado pessoal / dado relacionado | Finalidade | Base/justificativa proposta | Armazenamento | Proteção | Retenção | Exclusão |
|---|---|---|---|---|---|---|
| Nome curto opcional | Chamar o cliente na retirada | Atender o pedido solicitado pelo cliente; necessidade e base devem ser confirmadas pela empresa antes de uso real. | Memória do processo; não em log | Validação de caracteres/tamanho, consulta protegida por token, loopback local | Expira logicamente em 24h; remoção física em até 1 min após o prazo; reinício elimina tudo | Expiração automática; em produção atender direitos do titular e obrigações de guarda aplicáveis |
| Conteúdo do pedido e canal | Preparar e confirmar os itens e medir operação por canal | Preparar e confirmar o pedido; conteúdo pode ser associado ao cliente quando combinado com nome ou token. | Memória do processo | Catálogo do servidor; sem conteúdo no log; acesso do pedido via token | Expira logicamente em 24h e limpeza física em até 1 min; prazo real deve considerar obrigações fiscais/consumeristas e necessidade documentada | Remover/anonimizar quando cessar finalidade e não houver obrigação de retenção |
| ID do pedido e token de acesso | Localizar pedido e permitir consulta pelo titular | Necessidade de acesso à confirmação solicitada | ID e token aleatórios em memória; token retornado uma vez na criação | 122 bits+ de aleatoriedade (UUID v4), comparação de token em tempo constante; token não vai ao log | Mesmo TTL do pedido; memória volátil | Expiração automática e descarte ao reiniciar |
| IP de origem | Rate limit de curto prazo e prevenção de abuso | Limitar abuso durante a sessão; necessidade, transparência e prazo devem ser definidos antes de uso real. | Chave temporária do rate limiter em memória; não é gravada em log | Janela fixa, sem persistência nem encaminhamento de proxy confiado | Janela configurada (padrão 60 s); limpeza de entradas antigas | Remoção automática após a janela |
| Request ID e métricas agregadas | Diagnóstico técnico sem conteúdo do pedido | Diagnosticar falhas sem identificar clientes; os logs atuais não incluem identificador de cliente. | Saída estruturada do processo | Sem corpo, nome, token, Authorization ou IP; rota de pedido normalizada | Retenção do stdout é do ambiente executor; deve ser definida antes de produção | Política do ambiente; protótipo não mantém arquivo de log próprio |
| Forma/resultado do pagamento mock | Demonstrar fluxo sem transação real | Executar a simulação; não representa dado financeiro real. | Memória; só método/status sintético | Não são aceitos número de cartão, CVV ou credenciais; transaction ID é `MOCK-*` | 24h junto ao pedido | Expiração automática e descarte ao reiniciar |

## Aplicação prática

- A tela informa que nome é opcional e pede para não inserir sobrenome, CPF, telefone ou endereço; nenhum campo de cartão existe.
- API rejeita campos fora do contrato, reduzindo coleta por mass assignment. Os testes usam valores sintéticos.
- O total e as regras do pedido não dependem de cadastro. Fidelidade é mock e não recebe identificador de pessoa.
- Consulta do pedido exige token de acesso aleatório. Logs omitem body, Authorization, token e IP.
- Cabeçalhos limitam framing, conteúdo e capabilities desnecessárias; localmente o serviço escuta em loopback. Em produção deve usar TLS, controle de acesso operacional, gestão de segredos, backups protegidos e política de incidentes.
- A interface não apresenta consentimento genérico para o processamento estritamente necessário ao pedido. Marketing futuro deve ter finalidade e base próprias, separadas e revogáveis quando o consentimento for a base adequada.

## Direitos, retenção e transparência

No protótipo, não há portal de direitos; reiniciar o processo remove os dados, e a expiração de 24h é uma regra de demonstração, não uma política legal de retenção comercial. Em produção, publicar aviso de privacidade com controlador/canais, finalidades, bases, compartilhamentos, prazos e direitos; implementar busca/atendimento do titular, correção, exclusão ou anonimização quando cabível e registro de operações. Pedidos fiscais ou registros legalmente exigidos podem precisar de prazo diferente, com acesso e finalidade restritos; confirmar com assessoria jurídica.

## Validações de privacidade

| Verificação | Critério | Caso |
|---|---|---|
| Minimização | Sem CPF, telefone, endereço, e-mail obrigatório ou dado de cartão | CT016 |
| Acesso | Token ausente/incorreto não devolve pedido | CT013 |
| Log | Nenhum nome, token, corpo ou Authorization em log sintético | CT016 |
| Retenção demonstrativa | Expiração de 24h e limpeza no processo | CT020 |
| Transparência | Microcopy explica dado opcional e simulação antes da ação | CT014, CT016 |

## Controles técnicos verificados

Os testes automatizados verificaram estes controles no protótipo. Isso não equivale a pentest nem certificação.

| Controle | Resultado | Validação |
|---|---|---|
| Campos desconhecidos, forma de pagamento e quantidades inválidas rejeitados | PASS | `test/domain.test.mjs`; `evidencias/integration/integration-run.txt` |
| Preço e total enviados pelo cliente não aceitos | PASS — o contrato estrito rejeita os campos; cálculo vem do catálogo | `test/api.test.mjs`, teste de prévia/pedido |
| Consulta de pedido sem token ou com token incorreto negada; leitura autorizada não devolve o token | PASS | `test/api.test.mjs`, teste de consulta protegida |
| JSON malformado, tipo de conteúdo incorreto e corpo acima de 32 KB tratados sem stack trace | PASS | `test/api.test.mjs`, teste de validação de corpo |
| Rate limit retorna 429 e `Retry-After` | PASS | `test/api.test.mjs`, teste de rate limit |
| Logs omitem nome de teste, corpo e Authorization | PASS | `test/api.test.mjs`, captura do logger em memória |
| Headers `nosniff`, CSP, frame denial, referrer policy e request ID presentes | PASS nos checks automatizados de headers | `test/api.test.mjs` |
| Erro interno de integração não revela mensagem/segredo da exceção | PASS | `test/api.test.mjs`, teste de indisponibilidade/exceção |
| Auditoria de dependências até severidade high | PASS — 0 vulnerabilidades reportadas | `npm-audit.txt` |

As evidências executáveis estão nos testes de API/domínio, no log de integração e no arquivo de auditoria de dependências. TLS, infraestrutura e integrações externas não foram avaliados.
