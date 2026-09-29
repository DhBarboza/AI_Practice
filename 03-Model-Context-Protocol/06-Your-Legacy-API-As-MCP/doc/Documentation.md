Este projeto demonstra como transformar uma API REST existente de clientes em um servidor MCP. A API original continua responsável pelo CRUD e pelo acesso ao MongoDB; o projeto `customers-mcp` funciona como um adaptador que expõe essas operações para agentes compatíveis com o Model Context Protocol, como o GitHub Copilot.

### Fluxo principal

1. O VS Code inicia `customers-mcp/src/index.ts` usando transporte `stdio`.
2. `customers-mcp/src/mcp/server.ts` cria o servidor MCP e registra as tools, o resource e o prompt.
3. Cada tool chama `CustomerService`, que concentra a lógica de aplicação.
4. `CustomerService` usa `CustomerHttpClient` para fazer requisições HTTP à API em `http://localhost:9999/v1`.
5. A API Fastify recebe as requisições, executa operações no MongoDB e devolve os resultados ao servidor MCP.
6. O servidor MCP retorna ao agente conteúdo textual e, quando definido, conteúdo estruturado validado por schemas Zod.

Assim, o agente pode listar, consultar, criar, atualizar e remover clientes sem conhecer diretamente os detalhes HTTP ou do banco de dados.

### Estrutura do projeto

#### `customers-mcp/`

Servidor MCP escrito em TypeScript. É a camada de integração com o agente de IA.

- `package.json`: define o pacote, dependências do SDK MCP e do Zod, versão mínima do Node.js e scripts para iniciar, testar e abrir o MCP Inspector.
- `package-lock.json`: fixa as versões instaladas das dependências.
- `tsconfig.json`: configura o TypeScript em modo estrito, com módulos ES, resolução via bundler e suporte aos imports com extensão `.ts`.
- `README.md`: explica as capacidades do servidor, configuração no VS Code, execução do Inspector, testes e organização do código.
- `.vscode/mcp.json`: configura o nome do servidor MCP e o comando usado pelo VS Code para iniciá-lo.
- `node_modules/`: dependências instaladas localmente; é uma pasta gerada, não contém a lógica do projeto.

##### `customers-mcp/src/`

- `index.ts`: ponto de entrada. Cria `StdioServerTransport`, conecta o servidor MCP ao transporte padrão e trata erros fatais de inicialização.
- `domain/customer.ts`: define os modelos `Customer`, `CustomerQuery`, `CustomerUpdate` e `CustomerMutation`, além dos schemas Zod usados para validar entradas e saídas das tools.
- `application/customerService.ts`: camada de aplicação. Encaminha operações para o cliente HTTP e implementa a busca por ID, nome ou telefone.
- `infrastructure/customerHttpClient.ts`: integra o MCP à API REST por meio de `fetch`. Implementa as chamadas GET, POST, PUT e DELETE para clientes.
- `mcp/server.ts`: composição do servidor MCP. Instancia `McpServer`, define a URL base da API e registra todas as tools, o resource e o prompt.
- `mcp/tools/listCustomers.ts`: registra `list_customers`, que retorna todos os clientes.
- `mcp/tools/getCustomer.ts`: registra `get_customer`, que encontra um cliente por `_id`, nome ou telefone.
- `mcp/tools/createCustomer.ts`: registra `create_customer`, validando nome e telefone e encaminhando a criação para a API.
- `mcp/tools/updateCustomer.ts`: registra `update_customer`, que altera nome e telefone de um cliente pelo `_id`.
- `mcp/tools/deleteCustomer.ts`: registra `delete_customer`, que remove um cliente pelo `_id`.
- `mcp/resources/apiInfo.ts`: registra o resource `customers://api-info`, que descreve a URL base, endpoints e formato dos clientes da API encapsulada.
- `mcp/prompts/findCustomer.ts`: registra `find_customer_prompt`, um prompt reutilizável que orienta o agente a localizar um cliente usando as tools disponíveis.

##### `customers-mcp/tests/`

Testes de integração do servidor MCP, usando um cliente MCP real conectado ao processo via `stdio`.

- `helpers.ts`: cria e conecta um cliente de teste ao servidor iniciado por `src/index.ts`.
- `resources/apiInfo.test.ts`: verifica se o resource `customers://api-info` está publicado com a descrição esperada.
- `tools/customers.test.ts`: testa listagem, criação, atualização e remoção de clientes por meio das tools MCP.
- `prompts/`: pasta reservada para testes de prompts; atualmente não contém testes relevantes.

#### `nodejs-fastify-mongodb-crud/`

API REST legada que fornece a implementação real do CRUD e persiste os dados no MongoDB.

- `package.json`: define Fastify e MongoDB como dependências e scripts para iniciar a API, executar testes e controlar a infraestrutura Docker.
- `package-lock.json`: registra as versões exatas das dependências da API.
- `README.md`: documenta instalação, execução, testes e endpoints REST.
- `Dockerfile`: cria a imagem Node.js da API, instala dependências e define o comando de inicialização.
- `docker-compose.yml`: sobe dois serviços: a API na porta `9999` e o MongoDB na porta `27017`, configurando a conexão entre eles.
- `LICENSE`: licença do projeto da API.
- `.github/`: arquivos de automação e integração do repositório.
- `.vscode/`: configurações locais do VS Code para a API.
- `node_modules/`: dependências instaladas localmente.

##### `nodejs-fastify-mongodb-crud/src/`

- `index.js`: cria o servidor Fastify e implementa `GET /v1/health`, além dos endpoints CRUD em `/v1/customers`. Também valida IDs MongoDB, configura CORS e fecha a conexão com o banco ao encerrar.
- `config.js`: monta a configuração do MongoDB a partir das variáveis `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` e `DB_NAME`.
- `db.js`: cria o `MongoClient`, seleciona o banco e expõe a coleção `customers` para a aplicação.

##### `nodejs-fastify-mongodb-crud/config/`

- `seed.js`: limpa a coleção e insere os clientes iniciais; é usado para preparar dados dos testes.
- `users.js`: contém a lista de clientes usada pelo seed.

##### `nodejs-fastify-mongodb-crud/test/`

- `api.test.js`: testes de integração da API Fastify. Verifica criação, listagem ordenada por nome, consulta por ID, atualização, remoção e respostas para IDs inválidos ou clientes inexistentes.

### Operação

Para executar o exemplo completo, primeiro suba o MongoDB e a API:

```bash
cd 03-Model-Context-Protocol/06-Your-Legacy-API-As-MCP/nodejs-fastify-mongodb-crud
npm install
npm run docker:infra:up
```

Em outro terminal, inicie o servidor MCP:

```bash
cd 03-Model-Context-Protocol/06-Your-Legacy-API-As-MCP/customers-mcp
npm install
npm start
```

No uso normal pelo VS Code, o arquivo `.vscode/mcp.json` inicia o servidor MCP automaticamente. Para validar a integração, `npm test` executa os testes MCP e `npm run mcp:inspect` abre o MCP Inspector. Os testes da API são executados no diretório `nodejs-fastify-mongodb-crud` com `npm test` e dependem do MongoDB disponível.

### Resumo

O valor didático do projeto está na separação de responsabilidades: a API legada não precisa ser reescrita, pois o servidor MCP traduz as intenções do agente em chamadas REST. O domínio define os contratos, a aplicação coordena as operações, a infraestrutura acessa a API e a camada MCP publica essas operações como ferramentas compreensíveis por agentes de IA.
