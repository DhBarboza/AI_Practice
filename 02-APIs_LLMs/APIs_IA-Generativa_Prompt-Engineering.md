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
