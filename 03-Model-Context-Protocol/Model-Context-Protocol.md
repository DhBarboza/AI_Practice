# Model Context Protocol (MCP): O Guia Definitivo

> **Resumo rápido:** O **Model Context Protocol (MCP)** é um padrão aberto criado pela Anthropic que padroniza como aplicações de Inteligência Artificial (LLMs) se conectam com segurança a fontes de dados, ferramentas e sistemas externos.

---

## 1. O que é o Model Context Protocol (MCP)?

O **Model Context Protocol (MCP)** é um protocolo de comunicação aberto (_open standard_) projetado para resolver um dos maiores gargalos da IA moderna: a **fragmentação das integrações**.

Antes do MCP, para que um modelo de IA pudesse ler um arquivo local, consultar um banco de dados PostgreSQL, interagir com o GitHub ou postar uma mensagem no Slack, era necessário desenvolver conectores específicos e proprietários para cada plataforma ou IDE. Se existissem $N$ modelos/aplicações de IA e $M$ ferramentas, seriam necessárias $N \times M$ integrações diferentes.

Com o MCP, adota-se uma arquitetura padronizada:

- Cada ferramenta/banco de dados cria **um único servidor MCP**.
- Cada aplicação ou cliente de IA implementa **um único cliente MCP**.
- O modelo de IA pode se conectar a qualquer ferramenta compatível instantaneamente.

---

## 2. Para Pessoas Menos Técnicas: A Analogia do "USB-C da IA" 🔌

Para entender o MCP sem precisar de jargões técnicos, imagine o seguinte cenário do mundo real:

### A Analogia dos Carregadores de Celular

- **Antigamente:** Se você tinha um celular antigo, cada marca tinha seu próprio cabo exclusivo (um pino fino para Nokia, outro conector para Sony Ericsson, outro para iPhone, etc.). Se você trocasse de celular, todos os seus cabos e acessórios ficavam inúteis.
- **Hoje:** O padrão **USB-C** virou a regra universal. O mesmo cabo USB-C serve para carregar o celular, ligar um monitor, conectar um teclado, transferir fotos da câmera ou plugar um fone de ouvido.

> **O MCP é o USB-C das IAs.**  
> Ele é a "tomada universal" que permite que qualquer assistente de IA se conecte a qualquer sistema (seus e-mails, suas planilhas, seu banco de dados ou seu sistema interno) sem precisar de adaptações complexas.

---

### Exemplo do Cotidiano: O Assistente de Escritório

Imagine que você pede para sua IA:

> _"Analise o relatório financeiro em PDF salvo na minha pasta de Downloads, cruze com o faturamento no nosso banco de dados de vendas e mande um resumo no canal #financeiro do Slack."_

- **Sem MCP:** A IA diria: _"Eu não tenho acesso aos seus arquivos locais, não sei consultar seu banco de dados e não posso enviar mensagens no Slack por aqui. Por favor, copie e cole tudo manualmente."_
- **Com MCP:** A IA usa:
  1. O **MCP de Sistema de Arquivos** para ler o PDF no seu computador.
  2. O **MCP do Banco de Dados** para consultar os dados consolidados de vendas.
  3. O **MCP do Slack** para formatar e postar a mensagem no canal desejado.

Tudo acontece de forma transparente, controlada e segura para o usuário.

---

## 3. Para Pessoas Técnicas: Arquitetura, Primitivas e Protocolo 🛠️

Para desenvolvedores e arquitetos de software, o MCP é um protocolo cliente-servidor estruturado sobre JSON-RPC 2.0.

### 3.1. Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                        MCP HOST                              │
│  (ex.: IDE Antigravity, Claude Desktop, Cursor, App Custom)  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                      LLM Core                        │   │
│   └──────────────────────────┬───────────────────────────┘   │
│                              │                               │
│   ┌──────────────────────────▼───────────────────────────┐   │
│   │                     MCP Client                       │   │
│   └───────────────┬──────────────────────┬───────────────┘   │
└───────────────────┼──────────────────────┼───────────────────┘
                    │ (stdio / SSE)        │ (stdio / SSE)
        ┌───────────▼──────────┐       ┌───▼──────────────────┐
        │  MCP Server: SQLite  │       │  MCP Server: GitHub  │
        └───────────┬──────────┘       └───┬──────────────────┘
                    ▼                      ▼
             Banco Local (.db)        API do GitHub
```

1. **Host (Hospedeiro):** A aplicação de IA onde o usuário interage (ex: IDEs, Claude Desktop, ferramentas CLI, dashboards).
2. **Client (Cliente):** O componente dentro do Host que gerencia o ciclo de vida e a conexão 1:1 com os servidores MCP.
3. **Server (Servidor):** Um processo independente (local ou remoto) que expõe capacidades específicas seguindo a especificação MCP.

---

### 3.2. Mecanismos de Transporte (_Transports_)

O MCP suporta dois métodos principais de comunicação:

1. **`stdio` (Standard Input / Output):**
   - Utilizado para servidores executados localmente na mesma máquina.
   - O Host inicia o servidor como um subprocesso e troca mensagens JSON-RPC através de `stdin` e `stdout`.
   - **Vantagens:** Extremamente rápido, seguro por padrão (isolado na máquina local) e sem necessidade de expor portas de rede.

2. **`SSE` (Server-Sent Events via HTTP / WebSockets):**
   - Utilizado para servidores MCP remotos ou distribuídos na nuvem.
   - O cliente recebe streams de eventos do servidor e envia mensagens de volta via requisições HTTP POST.
   - **Vantagens:** Ideal para arquiteturas corporativas centralizadas, microsserviços e integrações SaaS.

---

### 3.3. As 4 Primitivas Principais do MCP

| Primitiva                   | Direção                        | Descrição Técnica                                                                                                                                            | Exemplo                                                                                            |
| :-------------------------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Resources** _(Recursos)_  | Servidor $\rightarrow$ Cliente | Dados passivos e contextuais (somente leitura) que podem ser anexados ao contexto do modelo (similar a arquivos em um sistema de arquivos ou respostas GET). | Ler o schema de uma tabela SQL, visualizar logs do servidor, inspecionar um arquivo markdown.      |
| **Tools** _(Ferramentas)_   | Modelo $\rightarrow$ Servidor  | Funções executáveis com efeitos colaterais (_side effects_) que o LLM pode invocar via Tool/Function Calling com validação via JSON Schema.                  | `execute_query(sql)`, `create_github_issue(title, body)`, `send_slack_message(channel, text)`.     |
| **Prompts** _(Templates)_   | Servidor $\rightarrow$ Cliente | Modelos de prompts pré-configurados e parametrizados fornecidos pelo servidor para orientar interações complexas.                                            | Um prompt `debug-logs` pré-formatado com parâmetros de data e severidade.                          |
| **Sampling** _(Amostragem)_ | Servidor $\rightarrow$ Host    | Permite que o servidor MCP requisite uma inferência de LLM de volta para o Host (capacidade de sub-agentes aninhados).                                       | Um servidor de análise estática pede para o modelo resumir uma vulnerabilidade antes de responder. |

---

### 3.4. Exemplo de Definição de Tool no Servidor MCP (Python)

Usando a biblioteca oficial FastMCP (`mcp` em Python):

```python
from mcp.server.fastmcp import FastMCP

# Criação do servidor MCP
mcp = FastMCP("Calculadora & Utilitários de Banco")

# Expondo uma ferramenta (Tool) com schema automático
@mcp.tool()
def consultar_saldo_cliente(cliente_id: int) -> dict:
    """Busca o saldo atualizado e status financeiro de um cliente."""
    # Lógica de conexão com banco ou API
    return {
        "cliente_id": cliente_id,
        "saldo": 15420.50,
        "moeda": "BRL",
        "status": "ativo"
    }

# Expondo um recurso (Resource)
@mcp.resource("config://app-settings")
def obter_configuracoes() -> str:
    """Retorna as configurações atuais do sistema."""
    return "ambiente=producao\nversao=1.4.2"

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

## 4. Comparativo: Sem MCP vs. Com MCP

| Aspecto                   | Abordagem Tradicional (Sem MCP)                                      | Abordagem Padronizada (Com MCP)                                                           |
| :------------------------ | :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Acoplamento**           | Alto: código customizado para cada modelo/API.                       | Baixo: desacoplamento total via protocolo universal.                                      |
| **Manutenção**            | Cada nova ferramenta exige reescrever integrações para cada cliente. | Escreve-se o servidor MCP uma única vez e todos os clientes compatíveis usam.             |
| **Segurança e Auditoria** | Cada script gerencia credenciais de forma arbitrária.                | O Host/Cliente controla o acesso e permissões explícitas para cada chamada de ferramenta. |
| **Ecossistema**           | Silos fechados de plugins específicos por plataforma.                | Ecossistema aberto e compartilhado entre diversas ferramentas e IDEs.                     |

---

## 5. Qual é a Diferença entre API e MCP? ⚖️

Uma das dúvidas mais frequentes na engenharia de IA é:

> _"Se o mundo do software já é construído sobre APIs há décadas, por que inventar o MCP? O MCP veio para substituir as APIs?"_

A resposta curta e direta é: **Não, o MCP não substitui as APIs. Ele é um adaptador universal e semântico construído SOBRE as APIs, projetado especificamente para ser consumido por IAs e agentes autônomos.**

---

### 5.1. Duas Grandes Analogias para Entender de Vez 💡

#### 🍽️ Analogia 1: O Restaurante Estrangeiro (A Cozinha vs. O Garçom Poliglota)

- **A API é a Cozinha do Restaurante:**
  - Toda cozinha profissional (API do Jira, GitHub, Slack, SAP) é incrível, mas tem regras internas complexas: onde fica cada ingrediente, como ligar o fogão industrial, ordem dos pedidos e senhas de acesso.
  - Para que um cliente comum coma na cozinha, um desenvolvedor humano precisa estudar o manual daquela cozinha, vestir o avental e cozinhar manualmente o prato (escrevendo código, tratando headers HTTP e montando payloads).
- **O MCP é o Garçom Poliglota com o Cardápio Padronizado:**
  - O servidor MCP é o garçom. Ele conhece a cozinha por dentro (a API) e entrega para a IA um cardápio universal e padronizado na língua que a IA entende (_JSON Schema_ com nomes e descrições claras das funções).
  - A IA diz: _"Quero criar um chamado para corrigir o bug X no Jira"_.
  - O garçom (MCP) anota o pedido, vai até a cozinha (API), prepara toda a requisição técnica com os cabeçalhos certos, executa e traz de volta apenas o prato pronto para a IA.

---

#### 🔌 Analogia 2: O Dispositivo Eletrônico com Fios Soltos vs. O Padrão USB Plug-and-Play

- **API Tradicional:** É como comprar uma placa de circuito eletrônico com 20 fios soltos. Cada fabricante usa uma voltagem diferente (5V, 12V, 24V), conectores diferentes e exige que você monte um circuito na placa de ensaio (_breadboard_) para fazê-la funcionar.
- **MCP:** É o padrão **USB Plug-and-Play**. Quando você pluga um pendrive ou mouse USB no computador, o sistema operacional não precisa que você reprograme o driver: o protocolo USB já informa na hora: _"Sou um dispositivo de armazenamento com 64GB e funções de leitura/escrita"_. O MCP faz exatamente isso para o cérebro da IA.

---

### 5.2. Comparativo Prático: "Criar uma Tarefa no Jira"

Veja o contraste real entre interagir diretamente com uma API vs. utilizar o MCP:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CENÁRIO: Criar uma Issue com Prioridade Alta                     │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│           COM API PURA (Tradicional)      │                 COM MCP (Moderno)          │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ 1. O programador estuda a documentação    │ 1. O servidor MCP do Jira já está plugado. │
│    da Atlassian REST API v3.              │                                            │
│                                           │ 2. A IA executa "tools/list" e descobre:   │
│ 2. Cria autenticação Basic Base64 ou OAuth│    "jira_create_issue(project, summary,    │
│    e lida com expiração de token.         │    priority, description)"                 │
│                                           │                                            │
│ 3. Monta um JSON complexo e aninhado:     │ 3. A IA invoca a ferramenta diretamente:   │
│    { "fields": {                          │    jira_create_issue(                      │
│        "project": {"key": "PROJ"},        │      project="PROJ",                       │
│        "issuetype": {"id": "10001"},      │      summary="Corrigir timeout no login",  │
│        "summary": "Corrigir timeout...",  │      priority="High"                       │
│        "priority": {"name": "High"}       │    )                                       │
│      }                                    │                                            │
│    }                                      │ 4. O MCP cuida da autenticação, formatação │
│                                           │    do JSON, headers e requisição HTTP.     │
│ 4. Dispara POST via cURL/Axios/Requests.  │                                            │
│                                           │ 5. A IA recebe a confirmação e o link      │
│ 5. Trata manualmente erros 400, 401, 429. │    direto da issue criada.                 │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

### 5.3. As 5 Diferenças Estruturais Fundamentais

| Dimensão                             | API Tradicional (REST / GraphQL / gRPC)                                                       | MCP (Model Context Protocol)                                                                                                         |
| :----------------------------------- | :-------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **1. Destinatário Principal**        | **Programadores de software** (código determinístico escrito por humanos).                    | **Modelos de Linguagem e Agentes Autônomos** (inferência e raciocínio probabilístico).                                               |
| **2. Descoberta (_Introspection_)**  | **Estática/Externa.** Requer leitura de Swagger/OpenAPI ou documentações manuais.             | **Dinâmica em Tempo Real.** A IA inspeciona em runtime quais ferramentas e recursos estão ativos no momento.                         |
| **3. Interface e Semântica**         | **Heterogênea.** Cada API tem rotas (`/v1/users`, `/graphql`), verbos e formatos arbitrários. | **Padronizada.** Todas as capacidades seguem as primitivas de _Tools_, _Resources_ e _Prompts_ sobre JSON-RPC.                       |
| **4. Consciência de Contexto**       | Retorna payloads brutos que podem sobrecarregar e estourar a janela de contexto da IA.        | Modela as respostas de forma limpa e otimizada para o consumo de tokens pelo LLM.                                                    |
| **5. Segurança e Human-in-the-Loop** | Chaves e permissões costumam ficar salvas estaticamente em arquivos de ambiente.              | O **MCP Host** media cada chamada, permitindo que o usuário aprove ou negue ações sensíveis (ex: deletar tabelas ou enviar e-mails). |

---

### 5.4. Como a Cadeia Completa Funciona Junta

O MCP não concorre com a API — ele é a **ponte final** que permite ao cérebro da IA alcançar a API:

```
[ Usuário ]
    │
    ▼ (Linguagem Natural: "Liste os servidores com alta carga")
[ Aplicação Host (Antigravity / Claude Desktop) ]
    │
    ▼ (Prompt + Definições de Tools)
[ Modelo LLM ] ── (Decide invocar a tool "get_system_metrics") ──┐
                                                                 │ (JSON-RPC)
                                                                 ▼
                                                        [ MCP Server Grafana ]
                                                                 │
                                                                 ▼ (HTTP REST + API Key)
                                                        [ API do Grafana ]
                                                                 │
                                                                 ▼
                                                        [ Servidores / Métricas ]
```

Essa separação clara de responsabilidades garante que qualquer sistema legado com uma API existente possa se tornar acessível para IAs modernas em minutos, bastando criar um servidor MCP intermediário.

---

## 6. Principais Casos de Uso e Servidores Populares

- 🗄️ **Bancos de Dados:** PostgreSQL, SQLite, MySQL, Neo4j, Redis, Snowflake.
- 💻 **Desenvolvimento & DevOps:** Git/GitHub/GitLab, Docker, Kubernetes, Sentry, Grafana.
- 📁 **Sistemas de Arquivos & Conhecimento:** Local Filesystem, Google Drive, Notion, Confluence, Slack.
- 🌐 **Web & Pesquisa:** Brave Search, Puppeteer/Playwright (automação de navegador), Fetch/cURL.

---

## 7. Conclusão

O **Model Context Protocol (MCP)** representa a transição da Inteligência Artificial de um modelo conversacional isolado (_chatbot_) para um ecossistema de **agentes inteligentes conectados e integrados ao mundo real**, com padrões abertos de engenharia, interoperabilidade e segurança.

# Projeto 01 - Multiplas ferramentas de MCP

`03-Model-Context-Protocol/01-Multiple-MCP-Tools`

## `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/index.ts`:

Esse código define o entrypoint do módulo `01-Multiple-MCP-Tools`, responsável por subir um servidor Fastify (via `createServer()`) na porta 3000 e, em seguida, disparar um teste automático contra o próprio endpoint `/chat`.

Primeiro ele lê um CSV de vendas do disco (`sales-complete.csv`) com `readFileSync` e monta um `question` em linguagem natural, interpolando o conteúdo bruto do CSV diretamente dentro do texto — pedindo ao LLM para calcular a receita total a partir dos dados.

Em seguida, usa `app.inject()`, recurso nativo do Fastify para simular uma requisição HTTP sem round-trip de rede real, enviando um `POST /chat` com `{ question }` no payload. Ao receber a resposta, loga o status code e o corpo, e encerra o processo com `process.exit`.

Em uma frase: é um script que sobe o servidor de chat e, na mesma execução, já valida o endpoint `/chat` enviando um CSV de vendas embutido num prompt de linguagem natural, testando se o LLM consegue calcular a receita total a partir do dado bruto.

## System Prompts:

### `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/prompts/v1/identifyIntent.ts`:

Esse arquivo define a lógica de extração de intenção da primeira versão (`v1`) de um assistente que usa múltiplas MCP tools. Ele tem duas partes principais:

**1. `IntentSchema` (schema Zod)**

Define a estrutura de saída que um modelo de linguagem deve produzir ao analisar a mensagem do usuário. Tem 4 campos:

- **`intent`** (string): descrição limpa, em linguagem natural, do que o usuário quer fazer — sem misturar dados CSV/JSON aqui.
- **`fileContent`** (string ou null): o bloco bruto de dados (CSV ou JSON) que veio embutido na mensagem, copiado exatamente como está. Se não houver dado nenhum, fica `null`.
- **`fileName`** (string ou null): um nome de arquivo inferido (ex: "sales", "report"), deduzido a partir do contexto da pergunta.
- **`fileType`** (enum: `'csv' | 'json' | 'unknown'`): tipo de arquivo inferido com base no conteúdo ou nome.

O `IntentData` logo abaixo é só o tipo TypeScript derivado automaticamente desse schema Zod (`z.infer`), pra usar com segurança de tipos no resto do código.

**2. `getSystemPrompt()`**

Uma função simples que retorna uma string fixa — o system prompt que será enviado ao modelo. Ele instrui o modelo a:

- Atuar como um "assistente de extração de intenção"
- Separar a instrução em linguagem natural do bloco de dados bruto (CSV/JSON) que porventura esteja misturado na mesma mensagem
- Preencher `fileContent` e `fileName` como `null` quando não há dado nenhum

**Por que isso existe:** provavelmente esse schema é usado com uma chamada estruturada (tool call / structured output) de um LLM para, a partir de uma mensagem de usuário que mistura pedido + dados colados, separar automaticamente "o que fazer" de "com quais dados fazer" — provavelmente para depois rotear isso a diferentes MCP tools (uma pra CSV, outra pra JSON, etc.), daí o nome da pasta `01-Multiple-MCP-Tools`.

### `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/prompts/v1/agentNode.ts`:

Esse arquivo define dois geradores de prompt, `getUserPrompt` e `getSystemPrompt`, usados para instruir um agente de IA que processa arquivos e os persiste em um banco MongoDB.

`getUserPrompt` recebe `intent`, `fileName` e `fileContent` e monta a mensagem do usuário em texto formatado, expondo os três dados de forma estruturada para o modelo — com `fileName` caindo para `'N/A'` caso não seja informado.

`getSystemPrompt` define o comportamento do agente: declara as ferramentas disponíveis (`csv_to_json`, ferramentas de filesystem como `read_file`/`write_file`, e ferramentas de MongoDB) e impõe uma sequência obrigatória de seis passos (Step 0 a Step 5) — apagar as coleções do usuário, converter CSV em JSON se aplicável, opcionalmente salvar esse JSON em disco, inserir os registros no MongoDB, consultar o banco para responder à pergunta do `intent`, e por fim salvar a resposta como `.txt` em `./reports/`. O prompt reforça explicitamente que o agente não deve parar após a primeira chamada de tool e deve completar todas as etapas aplicáveis.

Em uma frase: são os prompts (system + user) que orquestram um agente para transformar um arquivo em JSON, persistir no MongoDB, responder uma pergunta analítica sobre os dados e salvar o resultado em um relatório de texto.

## PARSING INTELIGENTE: ORGANIZANDO A ENTRADA DO CLIENTE

### Nodes `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/graph/nodes`

#### `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/graph/nodes/intentNode.ts`:

Esse arquivo define um nó do grafo LangGraph responsável por identificar a intenção do usuário a partir da última mensagem enviada. A função `intentNode` recebe uma instância de `OpenRouterService` por injeção de dependência e retorna uma função assíncrona que o grafo executa a cada chamada. Dentro dela, o texto da última mensagem do estado (`state.messages.at(-1)!.text`) é extraído e enviado, junto com um system prompt vindo de `getSystemPrompt()`, para `openRouterService.generateStructured(...)`, que pede ao LLM uma resposta validada conforme o schema `IntentSchema`. O resultado esperado é um objeto `IntentData` contendo pelo menos `intent` (a intenção identificada, por exemplo "gerar relatório") e `fileType` (tipo de arquivo, como "csv" ou "pdf"). Se algum desses campos vier ausente, uma exceção é lançada e tratada no catch. Se os dados vierem corretos, o campo `fileName` é preenchido automaticamente com um valor padrão (`data.<fileType>`) quando não especificado, usando o operador `??=`. As informações extraídas são logadas no console para debug, e a função retorna um objeto parcial atualizando o estado do grafo com `intent`, `fileContent` (ou string vazia) e `fileName`. Se qualquer etapa falhar (erro de parsing, chamada à API, dado inválido), o catch captura a exceção, loga o erro e retorna uma mensagem amigável ao usuário via `AIMessage`, junto com o campo `error` preenchido, garantindo que o grafo não quebre mesmo quando o LLM falha em identificar a intenção corretamente.

## ORQUESTRAÇÃO AUTÔNOMA COM LANGCHAIN.JS E MCP NO MONGODB

Após identificar a intenção do usuario, devemos adicionar as ferramentas MCP´s para habilitar o modelo chama-las.

### Nodes `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/graph/nodes`

#### `agentNode.ts`:

Esse arquivo define um nó do grafo LangGraph responsável por gerar a resposta final do agente com base na intenção e nos dados já processados no estado. A função `agentNode` recebe uma instância de `OpenRouterService` por injeção de dependência e retorna uma função assíncrona executada pelo grafo. Dentro dela, é montado um prompt de usuário via `getUserPrompt(...)`, usando os campos `intent`, `fileName` e `fileContent` extraídos do `state` (com `!` indicando que já foram validados em etapas anteriores do grafo). Esse prompt, junto com o system prompt retornado por `getSystemPrompt()`, é enviado para `openRouterService.generateStructured(...)`, que consulta o LLM e retorna um `result` cujo campo `data` é tratado como string. Se a chamada for bem-sucedida, a função retorna um objeto parcial atualizando o estado com `error: undefined` e uma nova mensagem (`AIMessage`) contendo o conteúdo gerado pelo LLM. Se qualquer etapa falhar (erro na chamada à API, exceção durante o processamento), o catch captura o erro, loga no console e retorna uma mensagem amigável ao usuário via `AIMessage`, além de preencher o campo `error` com a mensagem da exceção (ou `'Unknown error'` caso não seja uma instância de `Error`), garantindo que o grafo continue funcionando mesmo quando a geração da resposta falha.

### Prompts `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/prompts/v1/`:

#### `agentNode.ts`:

Esse arquivo define os prompts (usuário e sistema) usados pelo `agentNode` para orientar o LLM na etapa final de processamento de dados. A função `getUserPrompt` recebe um objeto com `intent`, `fileName` e `fileContent` e monta uma string de prompt interpolando esses valores em um template, exibindo `'N/A'` como fallback quando `fileName` não é informado (via `??`). Já `getSystemPrompt` retorna uma string fixa (sem parâmetros) que define o papel do agente como um "data processing agent" com acesso a três categorias de ferramentas: `csv_to_json` (conversão de CSV para JSON), ferramentas de filesystem (`read_file`, `write_file`, etc.) e ferramentas de MongoDB (inserção de documentos e execução de queries). O prompt especifica uma sequência obrigatória e ordenada de passos que o LLM deve seguir sempre que receber `intent`, `fileContent` e `fileName`: apagar todas as coleções de usuário no MongoDB (Step 0), converter o conteúdo para JSON caso seja CSV (Step 1), salvar o JSON em disco se a intenção mencionar exportação (Step 2), inserir os registros no MongoDB em uma coleção nomeada com base no `fileName` ou no contexto da intenção (Step 3), consultar o MongoDB para responder à pergunta analítica da intenção (Step 4) e salvar o relatório final como `.txt` dentro do diretório `./reports/` (Step 5). O prompt reforça explicitamente que, se o conteúdo já for JSON, o Step 1 deve ser pulado, e que o LLM não deve parar antes de completar todas as etapas aplicáveis, mesmo após a primeira chamada de ferramenta. O resultado final é retornado como string via `.trim()`, removendo espaços em branco extras das bordas do template literal.

### Services `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/services`

#### `mcpService.ts`:

Esse arquivo define o serviço responsável por gerenciar as ferramentas MCP (Model Context Protocol), responsáveis por conectar o agente LLM com sistemas externos. A função assíncrona `getMCPTools` cria uma instância de `MultiServerMCPClient`, que gerencia múltiplos servidores MCP simultaneamente. Nesse exemplo, estão configurados dois servidores: "MongoDB" (obtido pela função `getMongoDBTool`) e "filesystem" (obtido por `getFSTool`). O `MultiServerMCPClient` utiliza comunicação via `stdio` (entrada/saída padrão), o que significa que os servidores MCP rodam como processos filhos do agente e se comunicam trocando mensagens pela linha de comando. Um `onMessage` é configurado para logar todas as mensagens recebidas dos servidores no console do sistema, facilitando o debug. Após instanciar o cliente, a função chama `await client.getTools()`, que faz a requisição de descoberta ao servidor MCP (implementando o protocolo padrão) e retorna a lista de ferramentas disponíveis, já convertidas para o formato esperado pelo LangChain. Por fim, a função retorna um array contendo todas as ferramentas do cliente MCP, somadas à ferramenta `csv_to_json` obtida pela função `getCSVTOJSONTool`, consolidando assim o conjunto de ferramentas disponíveis para o agente.

### Tools (MCP´s) `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/tools`

> [Mongo DB MCP](https://github.com/mongodb-js/mongodb-mcp-server)

#### `mongodbTool.ts`:

Esse arquivo define a configuração de conexão com o servidor MCP (Model Context Protocol) do MongoDB, usado para expor as ferramentas de banco de dados que o agente LLM pode chamar (como inserção de documentos e execução de queries, mencionadas no system prompt anterior). A função `getMongoDBTool` não recebe parâmetros e retorna um objeto de configuração identificado pela chave `"MongoDB"`, especificando que o transporte de comunicação é via `stdio` (entrada/saída padrão, tipado como constante literal). Essa configuração define como o processo do servidor MCP deve ser iniciado: o comando `npx` executa o pacote `mongodb-mcp-server@latest` (sempre baixando a versão mais recente, graças à flag `-y` que confirma a instalação automaticamente). Por fim, o objeto `env` define a variável de ambiente `MDB_MCP_CONNECTION_STRING`, contendo a string de conexão usada pelo servidor para acessar o MongoDB local (`mongodb://localhost:27017/dataprocessing`), apontando especificamente para o banco `dataprocessing`. O comentário no topo do arquivo referencia o repositório oficial do `mongodb-mcp-server` no GitHub, servindo como documentação da origem e do funcionamento esperado dessa integração.
