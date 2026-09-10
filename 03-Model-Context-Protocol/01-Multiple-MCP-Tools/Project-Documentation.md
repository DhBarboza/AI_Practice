# Documentação do Projeto: Multiple MCP Tools Agent

> **Projeto:** `01-Multiple-MCP-Tools`  
> **Objetivo:** Agente autônomo de análise e processamento de dados integrando LangGraph, múltiplos servidores MCP (Model Context Protocol) e ferramentas customizadas, servido via Fastify e containerizado com Docker.

---

## 1. Visão Geral do Projeto

Este projeto implementa um **Agente de IA Autônomo para Análise e Processamento de Dados**. Ele recebe dados brutos (como arquivos CSV) e perguntas analíticas em linguagem natural, executa um fluxo orquestrado por grafos de estado e interage diretamente com o ambiente por meio de ferramentas e protocolos abertos:

1. **Extração de Intenção:** Separa o objetivo analítico dos dados brutos embutidos no prompt do usuário via saída estruturada (*Structured Outputs*).
2. **Conversão de Formatos:** Converte arquivos CSV para JSON estruturado através de uma ferramenta LangChain customizada.
3. **Persistência de Dados:** Insere os dados estruturados no banco MongoDB utilizando o servidor oficial de MCP do MongoDB.
4. **Execução de Consultas Analíticas:** Consulta o banco de dados via MCP para responder à pergunta analítica solicitada pelo usuário.
5. **Geração de Relatórios:** Salva o relatório analítico final no disco local (`./reports/`) utilizando o servidor MCP de Sistema de Arquivos (*Filesystem*).

A aplicação inteira é exposta por uma API HTTP construída com **Fastify**.

---

## 2. Diagrama de Arquitetura e Fluxo

```mermaid
flowchart TD
    User([Usuário / Requisição HTTP]) -->|POST /chat| Fastify[Fastify Server (server.ts)]
    Fastify --> Graph[LangGraph Pipeline (graph.ts)]
    
    subgraph Pipeline [LangGraph Pipeline]
        START((START)) --> IntentNode[Nó 1: intentParser]
        IntentNode -->|Structured Output (Zod)| IntentCheck{Houve erro?}
        IntentCheck -->|Sim| END1((END - Erro))
        IntentCheck -->|Não| AgentNode[Nó 2: agentNode]
        
        subgraph AgentTools [Ferramentas Disponíveis]
            T1[csv_to_json<br/>LangChain Tool]
            T2[Filesystem MCP<br/>@modelcontextprotocol/server-filesystem]
            T3[MongoDB MCP<br/>mongodb-mcp-server]
        end
        
        AgentNode <-->|Tool Calling Loop| AgentTools
        AgentNode --> END2((END - Resposta Final))
    end
    
    AgentTools <--> Mongo[(MongoDB Container :27017)]
    AgentTools <--> Disk[(Disco Local: ./reports)]
    Graph --> Fastify
    Fastify --> Response([Resposta Final para o Usuário])
```

---

## 3. Conhecimentos Necessários para o Desenvolvimento

Para desenvolver um projeto com essa arquitetura do zero, é fundamental dominar 6 pilares:

### A. Model Context Protocol (MCP) e Integração de Ferramentas
* **Conceito de MCP (Host, Client, Server):** Padrão aberto da Anthropic para conectar LLMs a ferramentas externas de forma padronizada via JSON-RPC 2.0.
* **Mecanismos de Transporte (`stdio`):** Execução de servidores MCP como subprocessos locais via `npx` comunicando-se por entrada/saída padrão.
* **Servidores MCP Utilizados:**
  * [`@modelcontextprotocol/server-filesystem`](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem): Manipulação de arquivos locais.
  * [`mongodb-mcp-server`](https://github.com/mongodb-js/mongodb-mcp-server): Operações e consultas no MongoDB.
* **Integração com LangChain:** Uso de `@langchain/mcp-adapters` (`MultiServerMCPClient`) para instanciar e conectar múltiplos servidores MCP no ciclo de execução do agente.
* **Ferramentas Customizadas:** Criação de ferramentas com a função `tool()` do `@langchain/core/tools` e esquemas Zod (ex: conversor CSV para JSON).

### B. Orquestração de Agentes com LangGraph e LangChain
* **Grafos de Estado (`StateGraph`):**
  * Modelagem de estados globais compartilhados (`GraphAnnotation` / `GraphState`) com anotações de mensagens (`MessagesZodMeta` e `withLangGraph`).
* **Nós e Arestas Condicionais:**
  * Separação de responsabilidades em nós dedicados: `intentNode` (análise de entrada) e `agentNode` (execução do agente com ferramentas).
  * Roteamento condicional (`addConditionalEdges`): desvio de fluxo direto para `END` em caso de falha de parsing.
* **Execução ReAct / Tool Calling (`createAgent`):**
  * Configuração de loops de decisão onde o modelo escolhe quais ferramentas acionar antes de entregar a resposta final.
* **Callbacks e Observabilidade:**
  * Monitoramento do raciocínio e da execução de ferramentas via handlers de eventos (`handleChatModelStart`, `handleLLMEnd`, `handleToolStart`, `handleToolEnd`).

### C. Engenharia de Prompts e Structured Outputs
* **Esquemas com Zod:**
  * Definição e validação estrita de esquemas de dados (`IntentSchema`) para extrair campos como `intent`, `fileContent`, `fileName` e `fileType`.
* **Saídas Estruturadas (`providerStrategy`):**
  * Forçar o modelo de linguagem a responder rigorosamente no formato do esquema Zod.
* **Sequenciamento Declarativo:**
  * System Prompts com fluxos passo a passo (Step 0 a Step 5) para guiar o agente na ordem correta de execução das ferramentas.

### D. TypeScript e Node.js Moderno (v24+)
* **Node.js 24+:**
  * Uso de ESModules nativos com resolução de extensões `.ts`.
  * Carregamento de variáveis de ambiente com a flag nativa `--env-file .env`.
* **TypeScript:**
  * Tipagem estática avançada, inferência de tipos via `z.infer<typeof Schema>` e uso de Generics.
* **APIs HTTP com Fastify:**
  * Criação de endpoints HTTP rápidos e com validação de payload via schema JSON.

### E. Provedores de IA e Roteamento de Modelos
* **OpenRouter / APIs compatíveis com OpenAI:**
  * Configuração do cliente `ChatOpenAI` apontando para o gateway da OpenRouter.
  * Configuração de estratégias de roteamento (ex: priorização por `throughput`, roteamento de fallback entre múltiplos modelos) e parâmetros de inferência (`temperature`, `maxTokens`).

### F. Infraestrutura e Banco de Dados (Docker)
* **Docker Compose:**
  * Orquestração de contêineres locais para o **MongoDB 8** e interface gráfica **Mongo Express**.
* **MongoDB:**
  * Conhecimento de coleções, inserção de documentos e consultas analíticas (as quais o agente executa através do MCP).

---

## 4. Estrutura de Arquivos do Projeto

```
01-Multiple-MCP-Tools/
├── data/                         # Arquivos de dados de exemplo (ex: CSVs de vendas)
├── reports/                      # Diretório onde o agente grava os relatórios gerados
├── src/
│   ├── graph/                    # Estrutura do Grafo de Estados (LangGraph)
│   │   ├── nodes/
│   │   │   ├── agentNode.ts      # Nó que executa o agente com acesso às ferramentas
│   │   │   └── intentNode.ts     # Nó que extrai intenção e dados brutos do prompt
│   │   ├── factory.ts            # Fábrica para instanciar o grafo compilado
│   │   ├── graph.ts              # Definição do StateGraph, nós e arestas condicionais
│   │   └── state.ts              # Definição do esquema de estado compartilhado (GraphState)
│   ├── prompts/
│   │   └── v1/
│   │       ├── agentNode.ts      # Prompts do agente executor (instruções Step 0-5)
│   │       └── identifyIntent.ts # Prompts e Schema Zod para extração de intenção
│   ├── services/
│   │   ├── mcpService.ts         # MultiServerMCPClient gerenciando servidores MCP
│   │   └── openRouterService.ts  # Cliente ChatOpenAI com callbacks e structured output
│   ├── tools/
│   │   ├── csvToJSONTool.ts      # Ferramenta customizada LangChain (csvtojson)
│   │   ├── fsTool.ts             # Configuração do MCP Filesystem (@modelcontextprotocol/server-filesystem)
│   │   └── mongodbTool.ts        # Configuração do MCP MongoDB (mongodb-mcp-server)
│   ├── config.ts                 # Configurações de modelo, chaves e estratégias OpenRouter
│   ├── index.ts                  # Ponto de entrada, inicialização do servidor e teste local
│   └── server.ts                 # Configuração do servidor HTTP Fastify e rota /chat
├── docker-compose.yaml           # Contêineres do MongoDB e Mongo Express
├── package.json                  # Dependências e scripts de execução
├── tsconfig.json                 # Configurações do compilador TypeScript
└── Project-Documentation.md      # Esta documentação
```

---

## 5. Roteiro Recomendado de Estudos

Para quem deseja reproduzir ou evoluir uma solução similar:

1. **Fundamentos de TypeScript & Node.js 24+:** ESM nativo, schemas com Zod, e Fastify.
2. **LangChain & LangGraph Básico:** Criação de nós (`StateGraph`), gerenciamento de mensagens (`HumanMessage`, `AIMessage`) e criação de ferramentas (`tool()`).
3. **Structured Outputs com LLMs:** Forçar respostas estruturadas com Zod via `providerStrategy`.
4. **Model Context Protocol (MCP):**
   * Leitura do protocolo oficial e execução de servidores locais via CLI (`npx`).
   * Configuração de clientes MCP em Node.js com `@langchain/mcp-adapters`.
5. **Orquestração Multi-Ferramentas:** Definição de system prompts sequenciais e tratamento de erros entre ferramentas.
6. **Infraestrutura com Docker:** Gerenciamento de serviços locais para serem operados pelas ferramentas do agente.
