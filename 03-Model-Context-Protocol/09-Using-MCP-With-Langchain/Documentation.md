# Documentação — Using MCP With LangChain

## Visão geral

Esta pasta contém dois projetos Node.js que demonstram partes diferentes de uma integração de ferramentas com IA:

1. **`01-multiple-mcp-tools-z/`** — um agente construído com LangChain e LangGraph, exposto por uma API HTTP Fastify. Ele se conecta a ferramentas MCP de clientes e de sistema de arquivos e usa um modelo acessado pelo OpenRouter.
2. **`nodejs-fastify-mongodb-crud-z/`** — uma API CRUD de clientes feita com Fastify e MongoDB. Ela demonstra autenticação JWT, tokens de serviço, autorização baseada em papéis (RBAC) e limitação de requisições.

Os projetos são executáveis separadamente. O primeiro configura um cliente MCP para o pacote externo `@erickwendel/ew-customers-mcp` e exige um `SERVICE_TOKEN`; a API do segundo projeto fornece um endpoint para emitir esse tipo de token e uma API de clientes que pode ser usada por um adaptador MCP. A implementação do servidor MCP de clientes não está neste repositório: ela é obtida pelo pacote npm configurado no primeiro projeto.

## Arquitetura e fluxo

### Agente com múltiplas ferramentas MCP

1. `src/index.ts` cria o servidor HTTP e envia uma pergunta de demonstração para `POST /chat`.
2. `src/server.ts` valida o corpo da requisição e encaminha a pergunta ao grafo.
3. `src/graph/factory.ts` instancia o serviço de modelo e monta o grafo definido em `src/graph/graph.ts`.
4. O nó `agent` obtém o prompt, chama `OpenRouterService` e devolve a resposta.
5. Quando o serviço do modelo precisa de ferramentas, `src/services/mcpService.ts` as descobre usando os adaptadores MCP. `src/tools/customersTool.ts` inicia o adaptador externo de clientes por `stdio`; `src/tools/fsTool.ts` inicia o servidor MCP de sistema de arquivos restrito à pasta `data/`.
6. `src/services/openRouterService.ts` conecta o agente ao endpoint compatível com OpenAI do OpenRouter e registra eventos do modelo e das ferramentas no console.

O estado do grafo aceita mensagens e campos opcionais para resposta, intenção, arquivo e erro. No fluxo atual, a resposta final é preenchida pelo nó do agente; os campos de intenção e arquivo estão disponíveis no esquema, mas não são usados para roteamento neste fluxo.

### API CRUD de clientes

1. `src/index.js` configura Fastify, plugins de JWT e rate limit, registra as rotas de autenticação e conecta ao MongoDB.
2. `src/auth.js` permite acesso público apenas às rotas de saúde e autenticação, verifica tokens nas demais rotas e implementa emissão de JWT e service token.
3. As rotas de clientes de `src/index.js` consultam a coleção MongoDB configurada em `src/config.js`. Operações de leitura são acessíveis aos papéis suportados; criação, atualização e exclusão exigem o papel administrativo.
4. `config/seed.js` popula a coleção com os dados exportados por `config/users.js`. Os testes reinicializam esse conjunto antes de cada caso.
5. `test/api.test.js` testa autenticação, autorização, limite de requisições e operações CRUD usando a injeção de requisições do Fastify.

Os service tokens emitidos pela API são guardados em memória pelo processo e deixam de ser válidos quando o processo reinicia. Os usuários, senhas e segredos presentes no código e no README são valores de demonstração: não devem ser tratados como configuração apropriada para produção.

## Estrutura e responsabilidades

### `01-multiple-mcp-tools-z/`

Projeto TypeScript/ESM do agente MCP.

| Caminho | Responsabilidade |
|---|---|
| `.env.example` | Modelo das variáveis de ambiente. Inclui chaves de observabilidade LangSmith, chave do OpenRouter e token de serviço; contém marcadores de exemplo, não credenciais utilizáveis. |
| `.gitignore` | Exclui dependências instaladas, arquivos compilados, `.env`, logs, saídas/coverage e dados locais da API LangGraph. |
| `data/` | Pasta disponibilizada como raiz permitida para a ferramenta MCP de sistema de arquivos. |
| `data/users.json` | Arquivo de exemplo/dados para uso pela ferramenta de arquivos; o prompt de demonstração pede gravação neste caminho. |
| `getServiceToken.sh` | Chama o endpoint de emissão de token da API de clientes e grava/atualiza `SERVICE_TOKEN` em `.env`. Depende de `curl` e `jq`; o comando `sed -i ''` é específico do macOS. |
| `langgraph.json` | Configura o CLI LangGraph, associa o nome do grafo ao export `graph` de `src/graph/factory.ts` e indica `.env` como arquivo de variáveis. |
| `package.json` | Metadados, scripts de execução e dependências do agente, de LangChain/LangGraph, adaptadores MCP, Fastify e integração OpenAI compatível. Declara Node.js `>=24.10.0`. |
| `package-lock.json` | Fixa a árvore de versões npm para instalações reproduzíveis com `npm ci`. |
| `src/` | Código do servidor, do agente, do grafo e das integrações externas. |
| `src/index.ts` | Ponto de entrada: inicializa o servidor na porta 3000, envia uma solicitação de demonstração a `/chat` e encerra o processo depois da resposta. |
| `src/server.ts` | Cria o Fastify, registra `POST /chat`, exige uma propriedade `question` com pelo menos 10 caracteres e chama `graph.invoke`. |
| `src/config.ts` | Define o tipo e os parâmetros do modelo: chave, cabeçalhos OpenRouter, modelo, estratégia do provedor, temperatura e limite de tokens. Espera `OPENROUTER_API_KEY` no ambiente. |
| `src/graph/` | Componentes que descrevem e montam o fluxo LangGraph. |
| `src/graph/factory.ts` | Cria o `OpenRouterService` e constrói o grafo; exporta a função usada pelo CLI LangGraph. |
| `src/graph/graph.ts` | Declara o nó `agent`, o início e as transições para o fim ou para repetição em caso de erro. |
| `src/graph/state.ts` | Define com Zod o esquema e o tipo do estado do grafo, incluindo mensagens, resposta e campos opcionais de arquivo, intenção e erro. |
| `src/graph/nodes/` | Implementações das etapas executáveis do grafo. |
| `src/graph/nodes/agentNode.ts` | Implementa o nó do agente: lê a última pergunta, carrega o prompt, chama o modelo/agente e devolve a resposta ou uma mensagem de erro. |
| `src/prompts/` | Prompts de sistema versionados por revisão. |
| `src/prompts/v1/` | Primeira versão dos prompts do agente. |
| `src/prompts/v1/agentNode.ts` | Instrui o agente sobre perguntas gerais, operações de clientes, uso das ferramentas, idioma e tratamento de falhas. |
| `src/services/` | Integrações com o modelo e com as ferramentas MCP. |
| `src/services/mcpService.ts` | Configura `MultiServerMCPClient`, combina os servidores MCP registrados e obtém as ferramentas disponibilizadas. Também registra eventos e erros de conexão. |
| `src/services/openRouterService.ts` | Configura o cliente `ChatOpenAI` apontando para OpenRouter, carrega/cacheia as ferramentas MCP e invoca um agente LangChain com callbacks de log. |
| `src/tools/` | Configuração individual dos servidores MCP externos. |
| `src/tools/customersTool.ts` | Configura o servidor MCP externo de clientes como processo `stdio`, repassando `SERVICE_TOKEN`; falha explicitamente se o token não estiver definido. |
| `src/tools/fsTool.ts` | Configura o servidor MCP oficial de sistema de arquivos com `process.cwd()/data` como raiz permitida. |
| `tsconfig.json` | Configuração TypeScript estrita, sem emissão de JavaScript, compatível com imports que incluem extensão `.ts`. |

Os scripts declarados em `package.json` incluem `start` e `dev` (com carregamento de `.env`), `langgraph:serve` e comandos Docker para infraestrutura. Nesta pasta não há um arquivo Compose correspondente aos scripts `docker:infra:*`; verifique a infraestrutura antes de usá-los.

### `nodejs-fastify-mongodb-crud-z/`

Projeto JavaScript/ESM da API CRUD, com MongoDB como persistência.

| Caminho | Responsabilidade |
|---|---|
| `.github/` | Configurações de automação do GitHub. |
| `.github/workflows/` | Workflows de integração contínua. |
| `.github/workflows/run_tests.yaml` | Workflow de GitHub Actions que instala Node.js, sobe o MongoDB pelo Compose, instala dependências e executa `npm test` em pushes na branch `main` que correspondam aos filtros declarados. |
| `.vscode/` | Configurações específicas do editor VS Code. |
| `.vscode/launch.json` | Configuração de depuração Node que inicia o script `test:debug` do npm. |
| `.vscode/settings.json` | Preferências locais do workspace; define o nível de zoom do editor. |
| `config/` | Dados e rotinas auxiliares de configuração da aplicação. |
| `config/seed.js` | Limpa a coleção e insere os clientes iniciais; exporta `runSeed` para os testes e executa a carga inicial fora do ambiente de teste. |
| `config/users.js` | Lista os registros fictícios inseridos pelo seed. |
| `data/` | Dados JSON auxiliares. |
| `data/users.json` | Exemplo de registros de clientes com identificadores MongoDB. Não é importado pela API nem pelo seed nos arquivos deste projeto; a carga usada pela aplicação vem de `config/users.js`. |
| `Dockerfile` | Define uma imagem Node Alpine, instala dependências e inicia a aplicação como usuário `node`. |
| `docker-compose.yml` | Define os serviços da API e do MongoDB para desenvolvimento local, incluindo portas, variáveis de conexão e volume de dependências. |
| `LICENSE` | Texto da licença MIT do projeto. |
| `package.json` | Metadados, scripts para iniciar/desenvolver, testar e operar a infraestrutura, além das dependências Fastify, MongoDB, JWT e rate limit. Requer Node.js `>=20`. |
| `package-lock.json` | Fixa as versões das dependências npm para instalações reproduzíveis. |
| `README.md` | Guia de pré-requisitos, instalação, execução, autenticação e exemplos dos endpoints. Os usuários e segredos apresentados são de demonstração. |
| `src/` | Implementação da API e de suas integrações. |
| `src/auth.js` | Define os usuários e segredos de demonstração, opções de rate limit, hook de autenticação, endpoints de login/emissão de service token e verificação de papel. |
| `src/config.js` | Obtém parâmetros de conexão MongoDB do ambiente, define banco/coleção padrão e o limite de requisições por minuto. |
| `src/db.js` | Cria o `MongoClient`, seleciona o banco e a coleção de clientes e disponibiliza a conexão para a aplicação. |
| `src/index.js` | Ponto de entrada e registro das rotas: saúde, listagem, consulta por ID, criação, atualização e remoção de clientes. Registra plugins, hooks CORS e fechamento da conexão MongoDB. |
| `test/` | Testes automatizados da API. |
| `test/api.test.js` | Testes de integração com Fastify e MongoDB para login, service tokens, rate limiting, RBAC, health check e operações CRUD; executa o seed antes dos testes. |

O Compose usa valores adequados apenas ao ambiente de demonstração local. O fluxo documentado de desenvolvimento é iniciar o MongoDB, instalar dependências e iniciar a API; os testes também dependem de um MongoDB acessível.

## Tecnologias e execução

### Agente MCP

- **Tecnologias:** Node.js, TypeScript, Fastify, LangChain, LangGraph, adaptadores MCP e OpenRouter.
- **Configuração:** copie `.env.example` para `.env` e forneça as credenciais apropriadas sem versionar o arquivo. `OPENROUTER_API_KEY` é necessário para o modelo; `SERVICE_TOKEN` é necessário para carregar a ferramenta MCP de clientes. As variáveis LangSmith são usadas para tracing quando configurado.
- **Execução:** instale com `npm ci` e use `npm start` ou `npm run dev`. O `start` usa o carregador `--env-file` do Node.js. A API HTTP é iniciada na porta 3000, e o ponto de entrada também faz uma chamada de demonstração e termina após processá-la.
- **Endpoint:** `POST /chat`, corpo JSON com `question` de no mínimo 10 caracteres.
- **Compatibilidade:** siga a versão mínima Node.js declarada em `package.json`; o `node_version: "20"` do `langgraph.json` não coincide com esse requisito.

### API CRUD

- **Tecnologias:** Node.js, Fastify, MongoDB, `@fastify/jwt` e `@fastify/rate-limit`.
- **Execução local:** use `npm ci`, inicie o MongoDB com `docker compose up -d mongodb` e inicie a API com `npm start`. O Compose completo sobe também a API. A API escuta na porta 9999 por padrão.
- **Testes:** com o MongoDB disponível, execute `npm test`. O runner nativo do Node coleta cobertura e usa `NODE_ENV=test`.
- **Rotas principais:** `GET /v1/health`; `POST /v1/auth/login`; `POST /v1/auth/service-token`; `GET /v1/customers`; `GET /v1/customers/:id`; `POST /v1/customers`; `PUT /v1/customers/:id`; `DELETE /v1/customers/:id`.
- **Autorização:** leituras de clientes estão disponíveis aos papéis de leitura e administração; mutações exigem o papel `admin`. Rotas protegidas esperam o token no cabeçalho `Authorization`.

## Observações operacionais

- Não coloque chaves reais, tokens ou senhas em `.env.example`, documentação pública, scripts versionados ou logs.
- Os dados de autenticação e segredo de administrador no exemplo da API estão definidos no código para fins demonstrativos; substitua-os por configuração segura e armazenamento adequado antes de qualquer uso real.
- Os service tokens são armazenados apenas em memória, portanto não são persistentes e não são compartilhados entre réplicas.
- O script `getServiceToken.sh` assume que a API responde em `localhost:9999` e requer atenção à compatibilidade da opção `sed -i` do macOS caso seja executado em Linux.
- `nodejs-fastify-mongodb-crud-z/data/users.json` é um arquivo auxiliar sem referência no código encontrado; a fonte de seed efetiva é `config/users.js`.