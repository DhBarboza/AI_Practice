- API´s, IA Generativa e Prompt Engineering

### Wrappers:

Softwares que fazem interface e facilitam a comunicação entre sistemas já existentes. Ex: Automatizar a criação de relatório no Excel com apenas um clique

Uma parte muito sensível em softwares criados por IA são as camadas de segurança:
• Garantir que usuários malicíoso não consigam injetar prompts
• Durrubar o Software
• Esgotar créditos
• Obter informações sensíveis (LGPD)

Aí a Engenharia de Software Tradicional resolve:

1. Arquitetura de sistemas
2. Escalabilidade
3. Monitoramento e ingestão de dados

esses itens não devem ser ignorados.
Além das práticas de Redução erros, alucinação, custo continuo também é fundamental

Os maiores desafios são a criação de um prompt matador que traga boas respostas para o usuário e evite ao máximo os erros de redundancia, loops e repetição que sejam ECONOMICAMENTE VIÁVEIS.

Se sua empresa depende do serviço de uma Big Tech, sua empresa pode quebrar de uma para outra devido as mudanças de preços, ou interrupção do serviço.

estratégia é sempre otimizar o processo

### Applied AI Engineer

#### O estado atual do mercado, o que está chegando e quanto já pagam:

Internacional: $196.000,00 a $250.000,00

#### O que o mercado está exigindo de um programador nessa área:

está sendo muito relevante, não basta apenas chamar API´s em modelo, o mercado mudou e exige que construa workflows, integrações e confiabilidade

#### Por que network presencial em eventos de startups virou "atalho" pra encontrar gente com ideia sem implementação:

Onde se encontra as melhores oportunidades de Founding Engineer

#### O que é ser **Founding Engineer** e como funciona equity:

Founding Engineer (ou engenheiro fundador) é o termo usado para o primeiro(s) engenheiro(s) a entrar em uma startup em estágio inicial. Diferente de contratar um desenvolvedor sênior para uma posição tradicional, o founding engineer se torna sócio da empresa e tem responsabilidades muito mais amplas.

### Pojeto 01 - API Fastify

Criação de uma API utilizando Fastify

### LangChain

O **LangChain** é um framework de código aberto (open-source) projetado para facilitar a criação de aplicações que utilizam Modelos de Linguagem de Grande Porte (LLMs). Ele atua como uma camada de orquestração, permitindo que desenvolvedores conectem LLMs a fontes externas de dados, APIs e outros sistemas de computação.

Os principais pilares e conceitos do LangChain incluem:

1. **Chains (Cadeias):** Permitem sequenciar múltiplas chamadas ou componentes. Por exemplo, pegar a resposta de uma LLM e usá-la como entrada para outra tarefa, criando fluxos de trabalho complexos.
2. **Model I/O (Entrada/Saída de Modelos):** Padroniza a interface para interagir com diferentes provedores de LLM (OpenAI, Google Gemini, Anthropic, Ollama, etc.), facilitando a alternância entre modelos.
3. **Retrieval (RAG - Geração Aumentada de Recuperação):** Facilita a integração com carregadores de documentos, processadores de texto e bancos de dados vetoriais (_Vector Stores_), permitindo que a IA consulte informações privadas ou bases de dados externas antes de formular uma resposta.
4. **Memory (Memória):** Permite persistir o contexto e o histórico de conversas passadas em aplicações de chat e assistentes virtuais.
5. **Agents (Agentes):** Capacitam a LLM a tomar decisões dinâmicas sobre quais ações executar e quais ferramentas (como buscas na web, execução de código, ou consultas a bancos de dados) utilizar para resolver problemas complexos.

### Projeto 02

[LangChain example](./02-LangChain-Intro)

Criação de uma aplicação API que utiliza LangChain, o exemplo conta com a criação de funções para a manipulação de textos e indentificação d aintenção do usuário

### Projeto 03 - Medical Appointment

[Medical Appointment](./03-Medical-Appointment)

Projeto que utiliza o LangChain e tem uam estrutura para triagem e seleção de pacientes para especialidades médicas

Os nós `AI_Practice/02-APIs_LLMs/03-Medical-Appointment/src/graph/nodes` executam ações de acordo com a intenção

O graph `AI_Practice/02-APIs_LLMs/03-Medical-Appointment/src/graph/graph.ts` é responsável por gerenciar o fluxo de execução dos nós

O graph `AI_Practice/02-APIs_LLMs/03-Medical-Appointment/src/graph/factory.ts` é responsável por criar o graph

O server `AI_Practice/02-APIs_LLMs/03-Medical-Appointment/src/server.ts` é responsável por criar o servidor

#### Prompts

`02-APIs_LLMs/03-Medical-Appointment/src/prompts` Pastas que aloca os Prompts que serão executados no projeto
`02-APIs_LLMs/03-Medical-Appointment/src/prompts/v1/identifyIntent.ts`:

- Possue o System Prompt, que é o que enviamos antes de receber o Prompt do cliente
- Schema, monitora a saída (return), garantindo que a resposta venha em JSON, e que as chaves (keys) sejam exatamente aquelas definidas no Schema
- Na estrutura do prompt: Setar as regras e exemplos, instruções adicionais e alguns exemplos

`02-APIs_LLMs/03-Medical-Appointment/src/services`: Serviço responsável por executar as funções de regras de negócio, exemplo: CRUD, Cálculos, etc.

`02-APIs_LLMs/03-Medical-Appointment/src/config.ts`: Configurações do projeto, onde eu determo o modelo (LLM), Chaves de API e etc

### Projeto 04 - Song Highlights

Recomendador de músicas baseado nas nossas preferências `02-APIs_LLMs/04-Song-Highlights`

Para executar deve se rodar o npm run docker:up

Conecta com o LangGraph Studio: npm run langgraph:serve

`02-APIs_LLMs/04-Song-Highlights/src/graph/graph.ts` Esse arquivo define o grafo de conversação do seu chatbot usando LangGraph — basicamente o "fluxograma" que controla o que acontece a cada mensagem do usuário.

`02-APIs_LLMs/04-Song-Highlights/src/graph/nodes/chatNode.ts` Esse arquivo define o nó de chat do grafo — a etapa que efetivamente monta o prompt, chama o LLM (via OpenRouterService.generateStructured) e devolve a resposta pra conversa, decidindo também se preferências devem ser salvas e se a conversa já acumulou mensagens suficientes pra precisar de um resumo.

`02-APIs_LLMs/04-Song-Highlights/src/services/memoryService.ts` Esse código define uma factory function (`createMemoryService`) que inicializa a camada de memória persistente de um agente LangGraph usando PostgreSQL: ele lê a URI do banco a partir da configuração da aplicação, cria uma instância de `PostgresStore` (para armazenamento de memória de longo prazo, tipo dados semânticos entre threads) e uma instância de `PostgresSaver` (para checkpointing, ou seja, salvar o estado/histórico de execução do grafo entre interações), executa o `setup()` de ambos para garantir que as tabelas necessárias existam no banco, loga uma mensagem de confirmação no console e retorna um objeto `MemoryService` contendo as duas instâncias prontas para uso pelo resto da aplicação.

### Projeto 05 - Safeguard Prompt Injection

#### Prompt injection

O **Prompt Injection** (Injeção de Prompt) é uma vulnerabilidade de segurança que ocorre quando um usuário insere instruções maliciosas ou manipuladoras nas entradas fornecidas a um modelo de linguagem (LLM). Isso faz com que a IA ignore suas diretrizes originais (System Prompts) e execute ações não autorizadas, como contornar restrições de segurança, revelar informações confidenciais ou gerar respostas indesejadas.

[MCP - File System](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem)

A pasta `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/nodes/` reúne os **nodes do grafo LangGraph** desse projeto — cada arquivo representa uma etapa (ou uma decisão de roteamento) dentro do fluxo de processamento de uma mensagem do usuário.

No caso desse projeto específico, a pasta implementa um **pipeline de proteção contra prompt injection**, dividido em responsabilidades bem separadas:

- **`guardrailsCheckNode.ts`** — analisa a mensagem recebida antes de qualquer resposta, checando se ela é segura ou contém tentativa de injection.
- **`edgeConditions.ts`** — não é um node de processamento em si, mas a lógica de **roteamento condicional** que decide, com base no resultado da checagem, se o fluxo segue para o chat normal ou para o bloqueio.
- **`chatNode.ts`** — o node que efetivamente chama o LLM e gera a resposta, executado apenas quando a mensagem passa pela checagem.
- **`blockedNode.ts`** — gera a resposta de recusa quando a mensagem é considerada insegura.

Essa organização segue o padrão de projetos LangGraph: separar cada responsabilidade em seu próprio arquivo/função (nodes) e manter a lógica de decisão de fluxo (edges/conditions) isolada, o que facilita testar, reordenar e visualizar o grafo (inclusive no LangGraph Studio) sem misturar regra de negócio com lógica de roteamento.

- `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/nodes/blockedNode.ts`: Node responsável por gerar a mensagem de recusa exibida ao usuário quando o guardrail identifica uma requisição insegura. Lê o resultado da checagem armazenado em `state.guardrailCheck`, monta um bloco opcional de análise em markdown e formata as permissões do usuário, então utiliza um `PromptTemplate` para renderizar a mensagem final de bloqueio (motivo, análise, role e permissões) e a retorna como uma `AIMessage` adicionada ao histórico do grafo.

- `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/nodes/chatNode.ts`: Node principal de conversação, responsável por gerar a resposta do assistente através do `OpenRouterService`. Aplica um fallback de usuário default e desativa guardrails quando executado isoladamente via LangSmith Studio (sem `state.user` definido), monta o system prompt de forma segura usando `PromptTemplate.format()` — evitando concatenação/`replace()` direto, que seria vulnerável a prompt injection — envia a mensagem do usuário ao LLM e trata falhas retornando uma mensagem de erro genérica em vez de propagar exceções ao grafo.

- `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/nodes/edgeConditions.ts`: Define a lógica de roteamento condicional executada após o node de guardrails, decidindo se o fluxo segue para `chat` ou `blocked`. A rota é `chat` quando os guardrails estão desabilitados, quando não há resultado de checagem disponível, ou quando a checagem indica que a mensagem é segura (`safe: true`); caso contrário, a rota é `blocked`.

- `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/nodes/guardrailsCheckNode.ts`: Node responsável por analisar a mensagem do usuário em busca de tentativas de prompt injection antes que ela alcance o LLM principal. Monta o system prompt com `PromptTemplate.format()` (pelo mesmo motivo de segurança do `chatNode`), concatena-o com a mensagem do usuário e delega a análise ao `OpenRouterService.checkGuardRails()`, retornando o resultado no estado do grafo; em caso de falha na chamada, adota uma postura fail-safe, marcando a requisição como insegura (`safe: false`) para bloquear por padrão em vez de arriscar deixar passar uma injection.

## Pra que serve a pasta `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/`

Essa pasta concentra a **definição e montagem do grafo LangGraph** do projeto, incluindo o schema de estado compartilhado entre os nodes, a construção/composição do grafo (ligando nodes e edges) e uma camada de factory para instanciá-lo. É o "coração" do fluxo — a subpasta `nodes/` contém as peças individuais, enquanto os arquivos aqui na raiz definem o formato do estado e como essas peças se conectam.

## `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/factory.ts`

Módulo de fachada (factory) que expõe funções simples para obter uma instância do grafo compilado, encapsulando a chamada a `buildChatGraph()`. Oferece duas formas equivalentes de uso — `buildGraph()` (assíncrona) e `graph()` (síncrona) — provavelmente para atender diferentes formas de consumo, como integração com o LangGraph Studio/CLI, que costuma esperar uma função exportada retornando o grafo.

## `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/graph.ts`

Arquivo central que monta e conecta o grafo de estados usando `StateGraph`, definindo a topologia completa do fluxo de proteção contra prompt injection. Instancia o `OpenRouterService` compartilhado pelos nodes, registra os três nodes (`guardrails_check`, `chat`, `blocked`), define `guardrails_check` como ponto de entrada (`START`), aplica a aresta condicional via `routeAfterGuardrails` para decidir entre `chat` e `blocked`, e finaliza o fluxo (`END`) em ambos os caminhos; ao final, compila o grafo (`workflow.compile()`) pronto para execução.

## `02-APIs_LLMs/05-Safeguard-Prompt-Injection/src/graph/state.ts`

Define o schema do estado compartilhado entre todos os nodes do grafo (`SafeguardStateAnnotation`), usando Zod integrado ao LangGraph via `withLangGraph`. O estado inclui: `messages` (histórico de mensagens, com metadados especiais do LangGraph para lidar com merge/append automático), `user` (dados do usuário autenticado), `guardrailCheck` (resultado da checagem de segurança, nulável e com default `null`) e `guardrailsEnabled` (flag booleana que liga/desliga a proteção); também exporta o tipo `GraphState` inferido a partir desse schema, usado como tipagem em todos os nodes.

### Projeto 06 - Conhecendo o Template, Arquitetura e Definição do projeto

## `02-APIs_LLMs/06-Rag-Neo4j-Students`

Nesse projeto utilziamos a IA para gerar query para o nosso banco de dados para responder perguntas e cruzar informações

## Documentação dos scripts configurados no `package.json`:

#### `npm start`

```
node --env-file .env src/index.ts
```

Executa a aplicação em modo normal, carregando as variáveis de ambiente do arquivo `.env`. Uso típico: rodar a aplicação em produção ou em um teste manual simples, sem hot-reload.

#### `npm run dev`

```
node --watch --inspect --env-file .env src/index.ts
```

Executa a aplicação em modo de desenvolvimento:

- `--watch`: reinicia o processo automaticamente sempre que um arquivo for alterado.
- `--inspect`: abre a porta de debug do Node (padrão `9229`), permitindo conectar um debugger (VS Code, Chrome DevTools etc.).
- `--env-file .env`: carrega as variáveis de ambiente.

#### `npm test`

```
node --env-file .env --test tests/**/*.test.ts
```

Roda a suíte de testes usando o test runner nativo do Node (`--test`), carregando as variáveis de ambiente. Executa todos os arquivos `*.test.ts` dentro de `tests/`.

#### `npm run seed`

```
node --env-file .env --watch data/seed.ts
```

Executa o script de seed (popular o banco de dados com dados iniciais/mock), com `--watch` para re-executar automaticamente a cada alteração no arquivo `data/seed.ts`.

#### `npm run test:dev`

```
node --inspect --env-file .env --test --watch tests/**/*.test.ts
```

Igual ao `npm test`, mas em modo desenvolvimento:

- `--inspect`: permite debugar os testes.
- `--watch`: reexecuta os testes automaticamente ao salvar qualquer arquivo.

#### `npm run test:e2e:dev`

```
node --inspect --env-file .env --test --watch tests/**/*e2e.test.ts
```

Mesma ideia do `test:dev`, mas restrito aos testes end-to-end (arquivos `*e2e.test.ts`). Útil para desenvolver/depurar testes de integração completos com watch e debug ativos.

#### `npm run test:e2e`

```
node --inspect --env-file .env --test tests/**/*e2e.test.ts
```

Executa apenas os testes end-to-end uma única vez (sem `--watch`), com debug habilitado.

#### `npm run langgraph:serve`

```
npx @langchain/langgraph-cli dev
```

Sobe o servidor de desenvolvimento do LangGraph CLI, usado para servir/testar grafos (agentes) construídos com LangGraph localmente.

#### `npm run docker:infra:up`

```
docker compose up -d --wait
```

Sobe a infraestrutura definida no `docker-compose.yml` (ex.: Neo4j) em background (`-d`), aguardando (`--wait`) até os containers ficarem saudáveis antes de retornar o comando.

#### `npm run docker:infra:down`

```
docker compose down
```

Para e remove os containers da infraestrutura (mas mantém volumes/dados).

#### `npm run docker:infra:cleanup`

```
docker compose down --volumes --remove-orphans && rm -rf storage
```

Faz uma limpeza completa:

- Para os containers, remove volumes (**apaga os dados persistidos**, ex.: banco Neo4j) e containers órfãos.
- Remove também a pasta local `storage`.

⚠️ Use com cuidado — esse comando apaga dados.

#### `npm run docker:infra:logs`

```
docker compose logs -f
```

Exibe os logs dos containers em tempo real (`-f` = follow), útil para acompanhar o Neo4j ou outros serviços subindo/rodando.

## CYPHER GENERATOR: GERANDO QUERIES NEO4J COM JSON PROMPTS E STRUCTURED OUTPUTS

### `src/prompts/v1/cypherGenerator.ts`

Esse código monta os prompts (system + user) enviados a uma IA para transformar uma pergunta em linguagem natural numa query Cypher (Neo4j).

- `CypherQuerySchema`: define o formato esperado da resposta da IA — um objeto com o campo `query`.
- `getSystemPrompt`: gera as instruções para a IA — papel dela, schema do banco, regras de como escrever a query corretamente e exemplos prontos (pergunta → query).
- `getUserPromptTemplate`: só repassa a pergunta do usuário como está.

Não executa a query nem chama a IA — apenas prepara os prompts.

### `src/graph/nodes/cypherGeneratorNode.ts`

Esse código implementa um **node de um grafo (LangGraph-style)** responsável por gerar a query Cypher usando o LLM, dentro de um fluxo que pode ter múltiplas etapas (multi-step).

- `getCurrentStepQuestion(state)`: verifica se o fluxo está em modo multi-step (várias sub-perguntas processadas em sequência). Se estiver, retorna a sub-pergunta atual e o número do passo; caso contrário, retorna `null`.

- `createCypherGeneratorNode(llmClient, neo4jService)`: factory que recebe os serviços (LLM e Neo4j) e retorna a função do node, que:
  1. Determina qual pergunta usar — a sub-pergunta da etapa atual (multi-step) ou a pergunta principal (`state.question`).
  2. Busca o schema atual do banco via `neo4jService.getSchema()`.
  3. Monta o system prompt e o user prompt usando as funções do módulo `cypherGenerator` (o código explicado antes), passando também o contexto fixo `SALES_CONTEXT`.
  4. Chama o LLM (`llmClient.generateStructured`) pedindo uma resposta estruturada validada pelo `CypherQuerySchema`.
  5. Se der erro, retorna um `error` no estado.
  6. Se der certo, retorna a query gerada (`query`); se estiver em modo multi-step, também acumula a query na lista `subQueries`.
  7. Qualquer exceção não tratada é capturada no `catch`, logada e retornada como `error` no estado.

Em resumo: é o node que decide qual pergunta processar, monta os prompts, chama o LLM para gerar a query Cypher e atualiza o estado do grafo com o resultado ou com o erro.

### `src/prompts/v1/salesContext.ts`

Esse código define uma **constante de contexto de negócio** (`SALES_CONTEXT`), usada como parte do prompt enviado ao LLM (vista no `createCypherGeneratorNode`, passada para `getSystemPrompt`).

É um texto fixo em markdown com regras de negócio do domínio "academia online de vendas", que ajudam o modelo a gerar queries Cypher corretas:

- Progresso só existe para cursos efetivamente comprados (`status="paid"`)
- Cada par aluno-curso tem no máximo uma compra e um registro de progresso
- Queries de receita devem filtrar `status = "paid"`
- Compras com `status="refunded"` devem ser excluídas dos cálculos de receita
- Progresso é um percentual de 0 a 100

Não contém lógica — é apenas dado estático (conhecimento de domínio) injetado no prompt para evitar que o LLM gere queries semanticamente erradas (ex.: contar receita de compras reembolsadas).

## CYPHER EXECUTOR: VALIDANDO E EXECUTANDO QUERIES NO NEO4J

### `src/graph/nodes/cypherExecutorNode.ts`

Executa queries Cypher no Neo4j dentro de um grafo LangGraph, com validação, retry automático de correção e suporte a fluxos multi-etapa (múltiplas subperguntas encadeadas).

1. **Valida e executa** a query (`executeQuery`): checa sintaxe via `validateQuery`, roda a query, e trata erros/ausência de resultados.
2. **Se a query falhar:** tenta correção automática (até `config.maxCorrectionAttempts` vezes); esgotadas as tentativas, retorna erro final.
3. **Se o fluxo for multi-step:** acumula o resultado da etapa atual em `subResults`, avança `currentStep` e verifica se ainda há próximas etapas (`hasMoreSteps`).
4. **Se não houver resultados:** retorna `dbResults: []` com mensagem de erro.
5. **Se tudo der certo:** atualiza `dbResults` no estado do grafo e limpa a flag `needsCorrection`.

Um node que roda a query, decide entre sucesso / correção / progressão multi-step / falha, e sempre devolve o estado atualizado do grafo.

## CYPHER CORRECTION E ANALYTICAL RESPONSE: CORRIGINDO QUERIES E GERANDO RESPOSTAS ANALÍTICAS

### `src/prompts/v1/analyticalResponse.ts`

Esse código define o nó `analyticalResponseNode`, responsável por gerar a resposta final em linguagem natural do fluxo, usando o LLM (`OpenRouterService`) com saída estruturada (`AnalyticalResponseSchema`).

Ele decide entre três caminhos possíveis dependendo do estado do grafo: se houver um erro (`state.error`), chama `handleErrorResponse`, que pede ao LLM uma explicação amigável da falha; se não houver resultados (`dbResults` vazio), chama `handleNoResultsResponse`, que gera uma resposta de "nada encontrado"; e se houver resultados, chama `handleSuccessResponse`, que monta o prompt com os dados e pede ao LLM uma resposta analítica. Dentro desse último caso, se o fluxo for multi-step (várias subperguntas encadeadas com seus próprios resultados), ele usa um prompt de síntese que combina pergunta, query e resultado de cada etapa; caso contrário, usa o prompt padrão com a pergunta e os resultados únicos.

Em todos os cenários, o resultado final populado no estado é o mesmo formato: `messages` (com uma `AIMessage`), `answer` e `followUpQuestions` — ou seja, a função só decide _qual prompt construir_ de acordo com a situação, mas sempre converge para a mesma chamada ao LLM e o mesmo formato de saída.

### `src/graph/nodes/cypherCorrectionNode.ts`

Esse código define o nó `cypherCorrectionNode`, responsável por **corrigir automaticamente uma query Cypher inválida** usando o LLM, quando o executor detecta um erro de validação/execução.

Ele busca o schema atual do Neo4j (`neo4jService.getSchema`) para dar contexto ao modelo, monta o prompt de correção com a query original, o erro de validação (`state.validationError`) e a pergunta do usuário, e chama o LLM (`generateStructured`) pedindo uma saída estruturada conforme `CypherCorrectionSchema` (query corrigida + explicação).

Se o LLM falhar em gerar a correção, retorna erro no estado. Se der certo, atualiza `query` com a versão corrigida, preserva a query original em `originalQuery` (só na primeira tentativa), incrementa `correctionAttempts`, limpa `validationError` e desliga a flag `needsCorrection` — permitindo que o fluxo volte para o executor tentar rodar a query corrigida.

Em resumo: é o nó que fecha o ciclo "executar → falhar → corrigir → reexecutar", usando o LLM como "reparador" de queries Cypher com base no erro reportado e no schema real do banco.

### Projeto 07 MODELOS MULTIMODAIS (TEXTO, IMAGEM, ÁUDIO, VÍDEO)

O Projeto retrata modelos de linguagem que trabalham com outras formas de input além dos textos

#### `src/services/openrouterService.ts`

Esse código define a classe `OpenRouterService`, responsável por encapsular a comunicação com LLMs via **OpenRouter**, usando o cliente `ChatOpenAI` do LangChain configurado com a baseURL da OpenRouter.

No construtor, ele monta o cliente com a API key, o modelo principal (`config.models[0]`), temperatura, headers customizados (`HTTP-Referer`, `X-Title`) e, via `modelKwargs`, passa a lista completa de modelos e a configuração de `provider` — permitindo que a OpenRouter faça roteamento/fallback entre múltiplos modelos.

O método `generateWithDocument` monta uma chamada **multimodal**: envia um `SystemMessage` com o prompt de sistema e um `HumanMessage` contendo tanto texto (`userPrompt`) quanto um documento em base64 (tratado como `image_url` com prefixo `data:application/pdf;base64,...`, formato que a API aceita para enviar PDFs). Invoca o LLM com essas mensagens e retorna o nome do modelo que respondeu (via `response_metadata`) junto com o conteúdo textual da resposta.

Em uma frase: é um serviço que abstrai o LangChain + OpenRouter para permitir enviar um documento (PDF) junto com um prompt e receber uma resposta de texto do LLM, com suporte a múltiplos modelos/fallback configurados centralmente.
