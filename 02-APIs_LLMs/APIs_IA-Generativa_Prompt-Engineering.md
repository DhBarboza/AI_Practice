## API´s, IA Generativa e Prompt Engineering

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
