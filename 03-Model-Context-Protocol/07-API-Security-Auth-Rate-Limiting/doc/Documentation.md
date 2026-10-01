# API segura de clientes e servidor MCP

## Visão geral

Este diretório reúne dois projetos que demonstram como proteger uma API e disponibilizar suas operações a um agente por meio do Model Context Protocol (MCP):

- `nodejs-fastify-mongodb-crud-z/` é a API REST de clientes. Foi construída com Node.js, Fastify e MongoDB, e implementa autenticação, autorização por papéis (RBAC), emissão de tokens de serviço e limitação de requisições.
- `customers-mcp/` é um servidor MCP em TypeScript que expõe as operações da API como ferramentas, uma descrição da API como recurso e um prompt de busca.
- `doc/` contém esta documentação.

O MCP não acessa o banco diretamente: ele faz chamadas HTTP para a API em `http://localhost:9999/v1`, enviando um token de serviço como `Authorization: Bearer ...`. Assim, a API continua sendo responsável pela autenticação, autorização, validação dos IDs, persistência e rate limiting.

## Arquitetura e fluxo

```text
Agente MCP (por exemplo, Copilot)
	| stdio / MCP
	v
customers-mcp/src/mcp (tools, resource e prompt)
	| CustomerService
	v
CustomerHttpClient -- HTTP + Bearer token --> Fastify API
						  | autenticação JWT ou token de serviço
						  | RBAC e rate limit
						  v
					       MongoDB
```

1. A API inicializa Fastify, registra os plugins JWT e rate limit, configura as rotas de autenticação e abre a conexão com o MongoDB.
2. Um usuário pode obter um JWT em `/v1/auth/login`. Para o cliente MCP, o fluxo usa `/v1/auth/service-token`, que exige credenciais e o segredo administrativo configurado na API.
3. O processo MCP recebe o token pela variável de ambiente `SERVICE_TOKEN`. Cada ferramenta chama o serviço de aplicação, que delega as operações HTTP ao cliente de infraestrutura.
4. A API valida o token em cada rota protegida e aplica o papel exigido. As operações CRUD permitidas consultam ou alteram a coleção `customers` no MongoDB.

## API REST

### Rotas

| Método e rota                 | Acesso                                            | Comportamento                                                                     |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /v1/health`              | Público                                           | Retorna o nome e a versão da API.                                                 |
| `POST /v1/auth/login`         | Público                                           | Valida usuário e senha e retorna um JWT.                                          |
| `POST /v1/auth/service-token` | Público, com credenciais e segredo administrativo | Emite UUID de serviço e papel do usuário.                                         |
| `GET /v1/customers`           | Usuário autenticado                               | Lista clientes ordenados pelo nome.                                               |
| `GET /v1/customers/:id`       | Usuário autenticado                               | Consulta cliente por ObjectId; retorna 400 para ID inválido e 404 se não existir. |
| `POST /v1/customers`          | `admin`                                           | Cria cliente com `name` e `phone`.                                                |
| `PUT /v1/customers/:id`       | `admin`                                           | Atualiza `name` e `phone` do cliente.                                             |
| `DELETE /v1/customers/:id`    | `admin`                                           | Remove cliente pelo ObjectId.                                                     |

Os papéis previstos são `admin` (leitura e escrita) e `member` (somente leitura). A API usa JWT assinado para login de usuário. Os tokens de serviço são UUIDs mantidos em um `Map` na memória do processo; não são JWTs e deixam de ser reconhecidos quando a API reinicia. O plugin `@fastify/rate-limit` é configurado com 90 requisições por minuto e usa o valor do cabeçalho `Authorization` como chave quando presente, recorrendo ao IP caso contrário.

### Dados e autenticação

O formato básico do cliente é `{ _id, name, phone }`, sendo `_id` gerado pelo MongoDB. As contas e segredos de demonstração aparecem no código-fonte, não em um armazenamento seguro de credenciais. Portanto, são apenas dados de exemplo: não devem ser reutilizados em produção. O segredo JWT, o segredo administrativo e as senhas precisam ser movidos para variáveis de ambiente ou um gerenciador de segredos antes de qualquer uso real.

## Servidor MCP

O servidor MCP funciona por transporte `stdio`, o modo esperado por clientes MCP locais. As ferramentas registradas são:

| Ferramenta        | Finalidade                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `list_customers`  | Retorna todos os clientes.                                                                             |
| `get_customer`    | Procura por `_id`; sem ID, procura o primeiro cliente cujos campos informados coincidam por substring. |
| `create_customer` | Cria cliente a partir de nome e telefone.                                                              |
| `update_customer` | Atualiza nome e/ou telefone pelo `_id`.                                                                |
| `delete_customer` | Exclui pelo `_id`.                                                                                     |

Erros HTTP 401, 403 e 429 são convertidos em erros de domínio próprios; as ferramentas capturam falhas e devolvem `isError` e uma mensagem em `structuredContent`. O recurso `customers://api-info` descreve o endereço base e os endpoints. O prompt `find_customer_prompt` orienta o agente a usar `get_customer` ou `list_customers` para localizar um cliente.

## Como executar

### API e MongoDB

Pré-requisitos descritos pelo projeto: Node.js 20 ou superior e Docker com Docker Compose. A partir de `nodejs-fastify-mongodb-crud-z/`:

```bash
npm ci
npm run infra:up:db
npm start
```

A API escuta na porta 9999 por padrão. `npm run infra:up` inicia os serviços definidos no Compose; `npm run infra:down` remove os contêineres e volumes. A API também aceita `PORT`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` conforme a implementação.

### MCP

O MCP requer a versão Node indicada no próprio `package.json` (Node `v24.14.0`). A partir de `customers-mcp/`, instale as dependências com `npm ci`, configure `SERVICE_TOKEN` no ambiente do processo e execute `npm start`. O token deve ser obtido da API em execução. A configuração de desenvolvimento do VS Code está em `.vscode/mcp.json`; confira as observações abaixo antes de usá-la.

Scripts MCP disponíveis: `npm start` inicia o servidor; `npm run dev` reinicia em alterações e habilita o inspector do Node; `npm test` executa os testes; `npm run test:unit` e `npm run test:e2e` oferecem recortes, embora a organização atual dos testes não corresponda integralmente a esses padrões; `npm run mcp:inspect` inicia o MCP Inspector.

## Estrutura de diretórios e arquivos

### `customers-mcp/`

Servidor MCP TypeScript que encapsula a API de clientes.

- `.github/agents/`: instruções de agentes do GitHub Copilot.
- `.github/agents/developer.agent.md`: define missão, escopo, princípios, segurança e fluxo de trabalho para um agente desenvolvedor.
- `.vscode/`: configurações específicas do VS Code.
- `.vscode/mcp.json`: registra o servidor MCP para o VS Code e define `SERVICE_TOKEN` no ambiente configurado.
- `src/`: implementação do servidor e suas camadas.
- `src/index.ts`: ponto de entrada. Verifica se `SERVICE_TOKEN` existe, conecta o `McpServer` ao transporte stdio e escreve mensagens operacionais em `stderr`.
- `src/application/`: lógica da aplicação e coordenação dos casos de uso.
- `src/application/customer-service.ts`: delega CRUD ao cliente HTTP e implementa a busca por ID ou correspondência parcial em nome/telefone.
- `src/domain/`: tipos, esquemas e erros do domínio de clientes.
- `src/domain/customer.ts`: define tipos e schemas Zod de cliente, busca, atualização e resultado de mutação, usados para validar e descrever entradas/saídas MCP.
- `src/domain/errors.ts`: classes de erro específicas para respostas HTTP 401, 403 e 429.
- `src/infrastructure/`: integração com serviços externos.
- `src/infrastructure/customer-http-client.ts`: faz chamadas `fetch` para a API, envia o Bearer token e traduz respostas de erro em exceções.
- `src/mcp/`: adaptação da aplicação para o protocolo MCP.
- `src/mcp/server.ts`: instancia o servidor MCP, constrói o serviço e registra ferramentas, recurso e prompt. Define o endereço base `http://localhost:9999/v1`.
- `src/mcp/tools/`: ferramentas MCP que o agente pode invocar.
- `src/mcp/tools/list-customers.ts`: registra a listagem.
- `src/mcp/tools/get-customer.ts`: registra busca de cliente.
- `src/mcp/tools/create-customer.ts`: registra criação de cliente.
- `src/mcp/tools/update-customer.ts`: registra atualização de cliente.
- `src/mcp/tools/delete-customer.ts`: registra exclusão de cliente.
- `src/mcp/resources/`: recursos de leitura oferecidos pelo servidor.
- `src/mcp/resources/api-info.ts`: registra `customers://api-info` com descrição textual da API.
- `src/mcp/prompts/`: prompts MCP reutilizáveis.
- `src/mcp/prompts/findCustomer.ts`: registra `find_customer_prompt`, com critérios de busca e indicação das ferramentas adequadas.
- `tests/`: testes do servidor MCP e suas integrações.
- `tests/helpers.ts`: obtém token na API e cria cliente MCP de teste via stdio.
- `tests/tools/`: testes das ferramentas.
- `tests/tools/customers.test.ts`: exercita listar, criar, buscar, atualizar e excluir clientes, além de erros de token e rate limit.
- `tests/resources/`: testes de recursos MCP.
- `tests/resources/api-info.test.ts`: verifica que o recurso `customers://api-info` pode ser listado e lido.
- `tests/prompts/`: código auxiliar relacionado aos testes de prompts.
- `tests/prompts/findCustomer.ts`: contém o registro do prompt usado na aplicação; apesar de estar sob `tests/`, não é um arquivo de teste com sufixo `.test.ts`.
- `package.json`: metadados, scripts, dependências e versão Node requerida pelo MCP.
- `package-lock.json`: fixa as versões resolvidas das dependências npm.
- `tsconfig.json`: configura TypeScript estrito sem emissão de JavaScript, com suporte a imports `.ts` e módulos ES.
- `README.md`: README presente no projeto; seu conteúdo descreve outro servidor MCP, de criptografia AES, e não corresponde ao servidor de clientes atual.
- `getServiceToken.sh`: exemplo de chamadas `curl` para obter token de serviço e chamar a API. Contém credenciais de demonstração em texto claro.
- `refs.txt`: aponta para a documentação do MCP Inspector.

### `nodejs-fastify-mongodb-crud-z/`

API REST, persistência MongoDB, autenticação e testes de integração.

- `.github/`: automações do GitHub.
- `.github/workflows/run_tests.yaml`: workflow que instala Node, inicia MongoDB e executa `npm test` em pushes para `main` que correspondam aos filtros de caminho.
- `.vscode/`: configuração de desenvolvimento no VS Code.
- `.vscode/launch.json`: perfil para iniciar os testes com debugger do Node.
- `.vscode/settings.json`: preferências locais do editor, incluindo nível de zoom da janela.
- `config/`: dados usados para popular a base e apoiar testes.
- `config/seed.js`: conecta ao MongoDB, remove os documentos atuais da coleção e reinsere os dados de `users.js`; executa o seed automaticamente fora do ambiente de teste.
- `config/users.js`: lista de clientes usados como dados iniciais e esperados nos testes.
- `data/`: espaço para dados em arquivo.
- `data/users.json`: arquivo atualmente vazio; não é consumido pelo fluxo de seed observado, que usa `config/users.js`.
- `src/`: código da API.
- `src/index.js`: cria e configura o Fastify, registra plugins/rotas, implementa health check e CRUD, conecta a coleção MongoDB e inicia o servidor fora do ambiente de teste.
- `src/auth.js`: contas demonstrativas, segredos, rate limit, rota de login JWT, emissão/verificação de tokens de serviço e middleware de autorização por papel.
- `src/config.js`: configura URL/nome do banco, coleção `customers` e limite de 90 requisições por minuto, com variáveis de ambiente e defaults.
- `src/db.js`: cria o `MongoClient`, seleciona o banco e expõe a coleção de clientes à aplicação.
- `test/`: testes automatizados da API.
- `test/api.test.js`: testes de autenticação, tokens de serviço, RBAC, rate limit e operações CRUD; usa `fastify.inject` e seed antes dos casos.
- `Dockerfile`: imagem Node Alpine que instala dependências e executa o servidor como usuário não-root.
- `docker-compose.yml`: define serviço da API e MongoDB, suas portas, variáveis, volume e dependência de inicialização.
- `package.json`: scripts de execução, desenvolvimento, teste, infraestrutura e dependências Fastify/JWT/rate limit/MongoDB.
- `package-lock.json`: fixa as versões resolvidas das dependências npm.
- `README.md`: documentação original da API, instruções, endpoints e exemplos. Algumas credenciais e detalhes de rate limit divergem do código atual, conforme a seção seguinte.
- `LICENSE`: licença MIT.

### `doc/`

- `doc/Documentation.md`: este documento, com visão geral, fluxo arquitetural, responsabilidades dos arquivos e notas de consistência.

## Observações sobre o estado atual

Estas observações descrevem diferenças encontradas entre arquivos; não são alterações realizadas neste projeto:

- `src/auth.js` define os usuários de demonstração `douglashenrique`/`123123` (`admin`) e `fulanodetal`/`1234` (`member`). Porém, `README.md`, `customers-mcp/tests/helpers.ts` e testes em `test/api.test.js` usam `erickwendel` e `ananeri`. Os fluxos de login e os testes que pedem token usando essas últimas contas não correspondem às credenciais atuais em `auth.js`.
- O README da API menciona limite de 3 solicitações por minuto para emissão de token de serviço. A configuração efetiva em `src/config.js` é 90 por minuto, e o teste de rate limit usa esse valor. O rate limiter está registrado globalmente, portanto o código não limita apenas a emissão do token.
- `customers-mcp/.vscode/mcp.json` contém uma vírgula final após a propriedade `env`, que não é JSON estrito. Também contém um token de serviço literal; tokens e segredos não devem ser mantidos em arquivos compartilhados/versionados.
- `customers-mcp/src/index.ts` exige `SERVICE_TOKEN`, enquanto o endereço base da API está fixado em `customers-mcp/src/mcp/server.ts`. Os testes de integração também dependem da API e do MongoDB estarem disponíveis.
- O `README.md` de `customers-mcp/` pertence a um exemplo de criptografia, não documenta este servidor de clientes. Para comandos e estrutura do MCP, esta documentação foi baseada no código e no `package.json` atuais.
- `get_customer` aceita busca por substring e retorna apenas o primeiro resultado correspondente. A busca sem `_id` lista os clientes e filtra em memória no processo MCP.

## Testes

Para a API, `npm test` usa o test runner nativo do Node e requer MongoDB acessível. Para o MCP, `npm test` inicia os testes TypeScript com o Node e as verificações de ferramentas fazem chamadas reais à API para obter token e operar clientes. Antes de interpretar falhas nesses testes como defeitos nas operações, alinhe as contas de teste com as contas configuradas em `src/auth.js` e confira as versões Node exigidas pelos respectivos projetos.
