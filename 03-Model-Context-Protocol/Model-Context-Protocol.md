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

## CONSTRUINDO UMA TOOL CUSTOMIZADA NO LANGCHAIN

### `03-Model-Context-Protocol/01-Multiple-MCP-Tools/src/tools`

#### `csvToJSONTool.ts`:

Esse arquivo define uma tool customizada para o LangChain que realiza a conversão de conteúdo CSV para JSON e permite a operação de "upsert" (inserção ou atualização) em coleções do MongoDB, sem usar o servidor MCP. A função `getCSVTOJSONTool` retorna um objeto `BaseTool` configurado para ser usado diretamente no pipeline do agente. O campo `name` é definido como `'csv_to_json'` e a propriedade `description` contém uma descrição detalhada da funcionalidade: "Convert CSV content to JSON and perform upsert operation in a MongoDB collection. The upsert operation uses the 'id' column from the CSV as the unique identifier. If a document with the same 'id' already exists, it will be updated; otherwise, a new document will be inserted.". O método `func` é a implementação principal da tool, recebendo `fileContent` (string contendo os dados em CSV) e um `tools` array (que inclui as ferramentas necessárias do LangChain, como `fs_read` e `mongo_db` - embora neste exemplo específico o arquivo `mongodbTool.ts` forneça a configuração do servidor MCP em vez de uma tool LangChain direta). Dentro de `func`, o conteúdo CSV é primeiramente parseado e convertido para um array de objetos JSON usando `parseCSVtoJSON` (função local que identifica colunas pelo cabeçalho e mapeia cada linha como um objeto). Em seguida, a tool executa uma operação de "upsert" no MongoDB: para cada objeto JSON resultante, o método `db.collection(collectionName).updateOne({ id: item.id }, { $set: item }, { upsert: true })` é chamado. Isso garante que, se um documento com o mesmo campo `'id'` já existir na coleção especificada (por exemplo, `students`), seus campos sejam atualizados com os valores do item atual; caso contrário, um novo documento é criado. A função retorna uma mensagem informativa confirmando a operação e o número de registros processados.

## Site com Opções de MCP:

> https://github.com/modelcontextprotocol/servers

## ORQUESTRAÇÃO AUTÔNOMA COM LANGCHAIN.JS E MCP PARA GERENCIAMENTO DE SISTEMA DE ARQUIVOS

### MCP:

File System `https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem`

### `src/tools/fsTool.ts`:

Esse arquivo define uma factory function chamada `getFSTool` que retorna a configuração de um servidor MCP (Model Context Protocol) para acesso ao sistema de arquivos, ao invés de uma tool direta do LangChain. A função não recebe parâmetros e retorna um objeto cuja chave `filesystem` identifica esse servidor MCP específico dentro do conjunto de servidores disponíveis para o agente. A propriedade `transport` é definida como `'stdio'` (tipado como `const` para garantir o literal type esperado pela integração MCP), indicando que a comunicação com o servidor ocorre via streams padrão de entrada/saída (stdin/stdout) do processo, em vez de HTTP ou outro transporte. O campo `command` especifica `"npx"` como o executável utilizado para iniciar o servidor, e o array `args` contém os argumentos passados a esse comando: a flag `-y` (que confirma automaticamente a instalação do pacote sem prompt interativo), o nome do pacote `"@modelcontextprotocol/server-filesystem"` (o servidor MCP oficial de acesso a arquivos) e, por fim, `` `${process.cwd()}` ``, que injeta dinamicamente o diretório de trabalho atual do processo Node.js como o diretório raiz ao qual o servidor de filesystem terá acesso. Na prática, ao ser invocada, essa função sobe um subprocesso via `npx` que expõe operações de leitura/escrita de arquivos (como listar diretórios, ler e gravar arquivos) restritas ao diretório onde a aplicação está rodando, permitindo que o agente LangChain/LangGraph interaja com o sistema de arquivos local através do protocolo MCP.

### `src/index.ts`:

Esse arquivo é um script de teste ou inicialização que sobe um servidor Fastify e testa manualmente o endpoint `/chat` com dados de um CSV, sem precisar fazer uma requisição HTTP real: a importação `readFileSync` do módulo `fs` é usada para ler arquivos de forma síncrona, `createServer` é importado de um módulo local `./server.ts` (provavelmente a factory que monta e configura a instância do Fastify com rotas e plugins), e a chamada `await createServer()` instancia essa aplicação de forma assíncrona, possivelmente porque registra plugins ou tools MCP que precisam ser inicializados antes do servidor ficar pronto; em seguida `app.listen({ port: 3000, host: '0.0.0.0' })` sobe o servidor escutando na porta 3000 em todas as interfaces de rede, permitindo acesso externo ou de containers, e um `console.log` confirma a URL onde está rodando; o código então lê um arquivo CSV do disco, havendo uma linha comentada apontando para `./data/sales.csv` e a linha ativa lendo `./data/sales-complete.csv`, sugerindo alternância entre um dataset menor de testes e um mais completo, com o conteúdo bruto atribuído a `salesData`; a variável `question` monta o prompt enviado ao endpoint de chat, havendo também uma versão comentada pedindo o ranking dos 5 produtos mais vendidos, enquanto a versão ativa pergunta qual é a receita total a partir dos dados, interpolando o CSV inteiro como texto dentro do prompt; e por fim `app.inject(...)` simula internamente uma requisição `POST` para `/chat` com esse payload, sem abrir conexão de rede real, tratando a resposta bem sucedida no `.then()` (logando status code e corpo, e encerrando com `process.exit(0)`) e falhas no `.catch()` (logando o erro e encerrando com `process.exit(1)`), configurando um padrão típico de smoke test que roda uma vez, valida o comportamento do endpoint e finaliza o processo.

# Projeto 2 - Google Trends API

## USANDO SERVICES COMO TOOLS - GOOGLE TRENDS API COM LANGCHAIN.JS

### Serviço para trabalhar com as API´s do Google:

> SerpApi: `https://serpapi.com/`

Este projeto consiste em um agente autônomo desenvolvido com **LangGraph**, **LangChain** e **Fastify**, projetado para atuar como um copiloto estratégico para criadores de conteúdo (como canais do YouTube). A aplicação implementa o padrão de _Service as a Tool_, integrando a API do **Google Trends** via **SerpApi** para consultar dados reais de volume de busca, tópicos em alta (_rising topics_) e interesse temporal de termos específicos. Sua arquitetura organiza o fluxo em um grafo de estados composto por nós especializados: o nó _researcher_ extrai e valida as palavras-chave relevantes da pergunta do usuário para consultar as tendências de mercado, enquanto o nó _responder_ sintetiza esses dados analíticos com modelos de linguagem via **OpenRouter**, entregando sugestões contextualizadas, ideias de títulos de alto engajamento e justificativas baseadas em dados de busca reais através de um endpoint HTTP `/chat`.

# Projeto 3 - Development Instructions Agents

Este projeto explora a padronização e especialização de agentes autônomos de IA através de arquivos declarativos de instruções (_agent instructions_ ou `.agent.md`), integrando o **Model Context Protocol (MCP)** diretamente ao fluxo de desenvolvimento e garantia de qualidade de software. Em vez de depender de um único assistente genérico, a arquitetura divide as responsabilidades em personas especializadas com regras, modelos e ferramentas sob medida: um desenvolvedor focado em TypeScript/Node.js, TDD, SOLID e injeção de dependências (`developer`), um planejador de testes E2E para explorar interfaces e mapear fluxos (`playwright-test-planner`), um gerador de testes automatizados baseado em planos de execução (`playwright-test-generator`) e um agente de autocorreção especializado em diagnosticar e reparar testes com falha (`playwright-test-healer`). Ao acoplar servidores MCP dedicados (como o `playwright-test`) diretamente na definição de cada agente, o projeto demonstra como estruturar ecossistemas multiagente colaborativos e confiáveis, onde cada modelo opera com limites claros, ferramentas nativas de browser/código e fluxos determinísticos de validação.

## ENTENDENDO AGENTS E INSTRUCTIONS

Explicar a estrutura do seu projeto para a IA, antes de executá-la:

> https://10xrules.ai/

Padrão para coloca na raiz do seu site e dizer o que tem no projeto (links, perguntas, etc):

> https://llmstxt.org/

Playwrigth - VS Code:

> https://playwright.dev/docs/test-agents
> npx playwright init-agents --loop=vscode

# Projeto 4 - Skills

## ENTENDENDO SKILLS

Skills são módulos de conhecimento e instruções que especializam um agente de IA para executar tarefas de um determinado domínio. Em vez de depender apenas do conhecimento geral do modelo, uma skill fornece contexto, padrões de trabalho, comandos, restrições e exemplos que orientam o agente durante a execução de uma atividade. Dessa forma, o agente pode carregar a orientação adequada somente quando a tarefa exigir aquela especialização.

Este projeto demonstra como descobrir, instalar e utilizar skills no ambiente de desenvolvimento. As skills são obtidas por meio do ecossistema [skills.sh](https://www.skills.sh/) e instaladas com o comando `npx skills add`. Depois da instalação, elas podem ser utilizadas pelo agente para interpretar solicitações relacionadas ao seu domínio, consultar referências e sugerir ou executar comandos padronizados.

### Estrutura do projeto

O diretório `03-Model-Context-Protocol/04-Skills` contém os seguintes elementos:

- `.agents/skills/`: skills instaladas localmente para uso pelo agente.
- `skills-lock.json`: registro das skills instaladas, suas origens, caminhos e hashes de integridade.
- `refs.txt`: links e referências para pesquisa sobre skills, agentes e boas práticas.
- `video.mp4`: vídeo de exemplo utilizado para demonstrar análise e processamento de mídia.
- `video_bw.mp4`: outra variação de vídeo para testes de transformação ou comparação.

### Skills instaladas

O projeto utiliza três skills principais:

- **find-skills**: pesquisa o catálogo do skills.sh para localizar skills por tema e apresenta seus comandos de instalação.
- **neo4j-cypher-guide**: fornece orientação para escrever consultas Cypher, incluindo padrões para subconsultas, sintaxe atual e recursos do Neo4j.
- **ffmpeg**: orienta o processamento de vídeo e áudio com FFmpeg, incluindo conversão de formatos, redimensionamento, compressão, extração de áudio, cortes e preparação de assets para projetos Remotion.

O arquivo `skills-lock.json` funciona como um inventário reproduzível. Ele registra, por exemplo, que a skill `ffmpeg` vem do repositório `digitalsamba/claude-code-video-toolkit`, enquanto `find-skills` vem de `vercel-labs/skills` e `neo4j-cypher-guide` vem de `tomasonjo/blogs`.

### Exemplo de instalação

Uma skill pode ser instalada informando o repositório e o nome da skill:

```bash
npx skills add https://github.com/digitalsamba/claude-code-video-toolkit --skill ffmpeg
```

Para instalar globalmente e disponibilizá-la em diferentes projetos, pode-se utilizar:

```bash
npx skills add digitalsamba/claude-code-video-toolkit@ffmpeg -g -y
```

Após a instalação, o agente consulta o arquivo `SKILL.md` da skill quando recebe uma solicitação compatível. A skill não substitui o programa executável: no caso do FFmpeg, o pacote `ffmpeg` também precisa estar instalado no sistema para que comandos como `ffmpeg` e `ffprobe` possam ser executados.

### Demonstração com FFmpeg

A skill de FFmpeg é utilizada neste projeto para analisar e preparar os vídeos de exemplo. O fluxo básico é:

1. Identificar o arquivo de entrada e o objetivo da transformação.
2. Consultar os metadados com `ffprobe`, verificando duração, resolução, codec, taxa de quadros e faixas de áudio.
3. Escolher o comando FFmpeg apropriado para converter, redimensionar, comprimir ou cortar o vídeo.
4. Validar o arquivo de saída com `ffprobe` e, quando necessário, extrair frames para uma inspeção visual.

Por exemplo, os metadados de `video.mp4` podem ser consultados com:

```bash
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```

Esse vídeo possui 10 segundos de duração, resolução Full HD de 1920x1080, proporção 16:9, 60 quadros por segundo e codificação H.264. Ele não possui faixa de áudio. A extração de frames permite observar que o conteúdo apresenta uma cena 3D estilizada de uma árvore sobre uma colina, com vegetação, pedras e uma abertura escura na base da árvore. A câmera realiza uma aproximação suave durante a cena.

Para gerar uma versão menor para a web, por exemplo, a skill recomenda combinar o codec H.264, um fator de qualidade CRF e `faststart`:

```bash
ffmpeg -i video.mp4 \
    -c:v libx264 -crf 23 -preset medium \
    -pix_fmt yuv420p -movflags +faststart \
    video-web.mp4
```

O projeto, portanto, funciona como um laboratório para compreender o ciclo completo de uma skill: descobrir uma capacidade, instalar suas instruções, registrar a dependência no lockfile, disponibilizar as ferramentas do sistema necessárias e aplicar a orientação a um arquivo real.

Site da versel que disponibiliza diversas Skills prontas para serem utilizadas:

> https://www.skills.sh/

Exemplo, ensina a IA a navegar pelo Browse:

> https://www.skills.sh/vercel-labs/agent-browser/agent-browser
> https://github.com/vercel-labs/agent-browser

Exemplo, procura por skills que podemos utilizar em nossos projetos:

> https://www.skills.sh/vercel-labs/skills/find-skills

```js
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

Neo4J:

```js
npx skills add https://github.com/tomasonjo/blogs --skill neo4j-cypher-guide
```

# Projeto 5 - Create MCP

## CRIANDO UM MCP DO ZERO: TESTES AUTOMATIZADOS VIA MCP CLIENT, DEFININDO TOOLS E INSPECIONANDO MCP SERVERS

Como gerar prompts, resources, visualização de infos do MCP e todos os processos para criação de um do Zero

> Utilizaresmos o modelcontextprotocol/sdk para criar os MCP´s

## Descrição geral do projeto

Este projeto é um exemplo prático de criação de um servidor MCP (Model Context Protocol) em TypeScript, com foco em ensinar como expor ferramentas, recursos e prompts para agentes de IA dentro do ambiente do VS Code/Copilot Chat. O nome do projeto no código é `@erickwendel/ciphersuite-mcp`, e a ideia central é oferecer uma funcionalidade útil para o agente: criptografar e descriptografar mensagens usando AES-256-CBC, com uma senha (passphrase) fornecida pelo usuário.

Em termos simples, o projeto funciona como um mini servidor de capacidades para IA. Em vez de a IA apenas responder textualmente, ela pode chamar ferramentas do MCP que executam ações reais no sistema, como:

- criptografar mensagens sensíveis;
- descriptografar mensagens usando a mesma chave;
- ler metadados do algoritmo e do formato da mensagem;
- usar prompts prontos para orientar o comportamento do agente.

Isso é exatamente o que o MCP permite: um agente não precisa “saber” a lógica do algoritmo internamente; ele apenas invoca a ferramenta adequada, recebe o resultado e continua a interação com o usuário.

Dessa forma, o projeto não é só um “script de criptografia”. Ele é um estudo completo de como construir um MCP funcional, registrar capacidades, integrar ao VS Code e testar tudo via cliente MCP e MCP Inspector.

## O que o projeto ensina

Este laboratório demonstra as partes principais de um servidor MCP:

1. Definição de tools
    - `encrypt_message`
    - `decrypt_message`

2. Definição de resources
    - `encryption://info`

3. Definição de prompts
    - `encrypt_message_prompt`
    - `decrypt_message_prompt`

4. Integração com stdio transport
    - o servidor roda no padrão de comunicação do MCP, via entrada/saída padrão (`stdio`);

5. Testes automatizados
    - usa o cliente MCP para chamar ferramentas e verificar comportamento real;

6. Inspeção do servidor
    - permite visualizar e testar o MCP em interface web via `@modelcontextprotocol/inspector`;

7. Configuração no editor
    - o arquivo `.vscode/mcp.json` registra o servidor para uso no VS Code.

Em outras palavras, o projeto funciona como um “template de MCP do zero”, mostrando todos os blocos necessários para um servidor que possa ser consumido por Copilot ou por qualquer cliente compatível.

## Visão geral da arquitetura

A arquitetura é simples, mas muito didática:

- `src/index.ts` inicializa o servidor e conecta via `StdioServerTransport`.
- `src/mcp.ts` registra todas as ferramentas, recursos e prompts.
- `src/service.ts` contém a lógica real de criptografia e descriptografia.
- `tests/helpers.ts` monta um cliente de teste que conecta ao servidor em stdio.
- `tests/mcp.test.ts` valida que o MCP funciona corretamente.
- `.vscode/mcp.json` conecta esse servidor ao VS Code.
- `package.json` define scripts de execução, dependências e configuração do projeto.
- `README.md` documenta a utilização do projeto.

## Estrutura de pastas e arquivos

### Pasta raiz

#### `.vscode/`

Responsabilidade:

- armazenar a configuração para integrar o MCP ao editor VS Code.

Arquivo: `.vscode/mcp.json`

- Esse arquivo informa ao editor que existe um servidor MCP chamado `ciphersuite-mcp`.
- O comando executado é:
    - `node --experimental-strip-types src/index.ts`
- Isso permite que o Copilot chat descubra o servidor e passe a usar as ferramentas disponíveis sem precisar de um processo externo manual.
- A partir da pasta do projeto, o editor pode carregar esse servidor e disponibilizar seus tools, resources e prompts para o agente.

#### `src/`

Responsabilidade: manter a lógica principal do servidor MCP.

##### `src/index.ts`

Responsabilidade:

- ponto de entrada do servidor.

O que faz:

- importa `server` de `./mcp.ts`;
- cria um `StdioServerTransport`;
- conecta o servidor ao transporte do MCP via `server.connect(transport)`;
- imprime uma mensagem de log no stderr para indicar que o MCP está ativo.

Esse arquivo é essencial porque o MCP, em geral, não roda como uma aplicação web comum: ele se comunica via entrada/saída padrão, então esse script funciona como uma interface de runtime para o protocolo.

##### `src/mcp.ts`

Responsabilidade:

- registrar todas as capacidades do servidor: tools, resources e prompts.

O que faz:

- cria um `McpServer` com nome e versão;
- registra a tool `encrypt_message`;
- registra a tool `decrypt_message`;
- registra o recurso `encryption://info`;
- registra o prompt `encrypt_message_prompt`;
- e, no README do projeto, aparece também o prompt `decrypt_message_prompt` (embora a leitura do código mostre claramente a parte de encrypt e o processo de descriptografia, a estrutura do MCP foi montada para permitir ambos os casos).

Dentro da tool `encrypt_message`:

- recebe `message` e `encryptionKey`;
- chama `encrypt(message, encryptionKey)`;
- devolve `structuredContent` com a mensagem cifrada;
- em caso de erro, retorna um objeto com `isError: true` e mensagem detalhada.

Dentro da tool `decrypt_message`:

- recebe `encryptedMessage` e `encryptionKey`;
- chama `decrypt(encryptedMessage, encryptionKey)`;
- valida e retorna o texto original.

O recurso `encryption://info` funciona como um “manual” do protocolo: ele explica o algoritmo, a derivação da chave, o formato de saída e regras de uso.

Os prompts servem para guiar o agente com instruções predefinidas para realizar ações concretas, como “criptografar uma mensagem a partir deste texto e chave”.

##### `src/service.ts`

Responsabilidade:

- implementar a lógica real de criptografia e descriptografia.

O que faz:

- Usa `node:crypto` para operar a biblioteca de criptografia da Node.js;
- deriva a chave usando `scryptSync(passphrase, SALT, 32)`;
- gera um IV aleatório (`randomBytes(16)`) para cada encriptação;
- usa `createCipheriv('aes-256-cbc', ...)` para cifrar mensagens;
- usa `createDecipheriv('aes-256-cbc', ...)` para decifrar.

A saída segue o formato:

```text
<iv-em-hex>:<ciphertext-em-hex>
```

Isso é importante porque, para descriptografar, o servidor precisa do IV original junto com o texto cifrado. O IV é gerado a cada operação, por isso a mesma mensagem com a mesma senha gera resultados diferentes a cada vez.

Esse arquivo é a camada de domínio da aplicação: ele encapsula a lógica de criptografia e deixa o MCP apenas como uma interface para expor essa capacidade ao agente.

#### `tests/`

Responsabilidade: validar o comportamento real do servidor MCP.

##### `tests/helpers.ts`

Responsabilidade:

- preparar um cliente de teste que conecta ao servidor em stdio.

O que faz:

- cria um `StdioClientTransport` com o comando:
    - `node --experimental-strip-types src/index.ts`
- instancia um `Client` do SDK do MCP;
- conecta ao servidor;
- retorna esse cliente para os testes.

Esse helper é essencial para simular o uso real do MCP sem precisar abrir manualmente o editor ou a interface do Copilot.

##### `tests/mcp.test.ts`

Responsabilidade:

- garantir que as funcionalidades do MCP funcionem corretamente.

O que testa:

- `encrypt_message` cria uma mensagem cifrada válida;
- `decrypt_message` retorna o texto original;
- `encryption://info` aparece na listagem de resources;
- `encrypt_message_prompt` retorna o texto do prompt esperado.

Cada teste usa o cliente MCP para chamar as ferramentas como um agente real faria. Isso é o mais importante: o projeto valida o comportamento do servidor como um cliente externo, não apenas funções isoladas.

#### `README.md`

Responsabilidade:

- documentação do projeto.

O que contém:

- descrição do que o MCP oferece;
- listagem de capabilities;
- instruções de instalação;
- configuração do VS Code;
- uso em Copilot Chat;
- comando para abrir o MCP Inspector;
- lista de scripts disponíveis;
- estrutura do projeto.

Esse arquivo serve como guia para qualquer pessoa que queira reutilizar o exemplo ou adaptá-lo para outro cenário.

#### `package.json`

Responsabilidade:

- configurar o projeto Node.js e definir scripts de execução.

Principais pontos:

- `type: "module"` para usar ES modules;
- dependências:
    - `@modelcontextprotocol/sdk` para o protocolo MCP;
    - `zod` para validação de schemas;
    - `@types/node` para suporte de tipos do Node.js;
- scripts:
    - `start`: inicia o servidor;
    - `dev`: inicia em modo watch;
    - `test`: executa os testes com `node --test`;
    - `mcp:inspect`: abre o MCP Inspector;
    - `test:dev`: modo watch com depuração.

Esse arquivo faz o projeto funcionar tanto em ambiente de desenvolvimento quanto em uso integrado com o editor e com ferramentas de inspeção.

#### `package-lock.json`

Responsabilidade:

- bloquear as versões exatas das dependências instaladas.

O que faz:

- garante reprodutibilidade do ambiente;
- evita que outra instalação em outra máquina use versões diferentes e quebre o MCP.

#### `node_modules/`

Responsabilidade:

- conter as bibliotecas instaladas do Node.js.

O que é:

- diretório gerado automaticamente pelo npm;
- na prática, ele guarda as dependências do projeto, como `@modelcontextprotocol/sdk` e `zod`.

Normalmente não é editado manualmente e não é parte da lógica da aplicação em si.

#### `refs.txt`

Responsabilidade:

- armazenar referências úteis para estudo e consulta.

O que faz:

- aponta para documentação relevante do MCP e do inspector.

No projeto, ele contém uma referência importante à documentação oficial do Model Context Protocol: `https://modelcontextprotocol.io/docs/tools/inspector`.

## Como o projeto funciona na prática

O fluxo de uso real é o seguinte:

1. O VS Code carrega o servidor informado em `.vscode/mcp.json`.
2. O Copilot Chat identifica as ferramentas e recursos expostos pelo MCP.
3. O usuário pede algo como:
    - “Criptografe a mensagem 'Olá' com a chave 'minha-chave'”
4. O agente chama a tool `encrypt_message` no MCP.
5. O servidor executa `encrypt()` em `src/service.ts`.
6. O retorno vem em `structuredContent`, com a mensagem cifrada.
7. Se for necessário, o agente também pode usar `decrypt_message` ou consultar o recurso `encryption://info`.

Esse processo mostra a principal ideia do MCP: entregar capacidades computacionais ao modelo, sem que ele precise implementar a lógica diretamente.

## Por que esse projeto é importante

Este exemplo é importante porque demonstra o “padrão essencial” de um servidor MCP:

- entrada e saída padronizadas;
- ferramentas que fazem ações reais;
- recursos que fornecem contexto;
- prompts reutilizáveis;
- client de teste para validar a funcionalidade;
- integração direta com o editor.

Ele serve como base para criar MCPs mais complexos no futuro, como servidores para:

- consulta de bancos de dados;
- integração com APIs externas;
- acesso a arquivos e documentos;
- gestão de tarefas de desenvolvimento;
- automações de CI/CD;
- agentes de negócio específicos.

## Conclusão

O projeto da pasta `05-Creating-Your-Own-MCP` é um excelente exemplo didático de construção de um MCP do zero. Ele combina teoria e prática em um único fluxo: define um servidor, expõe capacidades, conecta esse servidor ao VS Code, valida o comportamento em testes automatizados e mostra como o agente pode interagir com ele de forma natural.

A grande lição desse projeto é que um MCP não é apenas um “plugin de IA”. Ele é uma interface de capacidades: um conjunto de ferramentas e dados que um modelo pode invocar para executar tarefas reais, com contexto e segurança, em um ambiente controlado.

Esse mesmo padrão pode ser expandido para qualquer aplicação, desde um serviço simples de criptografia até sistemas completos de integração, automação e agentes especialistas.

---

## Resumo de responsabilidades por arquivo e pasta

- `.vscode/mcp.json` — integra o servidor ao VS Code
- `src/index.ts` — inicia o servidor MCP
- `src/mcp.ts` — registra tools, resources e prompts
- `src/service.ts` — implementa a criptografia AES-256-CBC
- `tests/helpers.ts` — monta cliente MCP para testes
- `tests/mcp.test.ts` — valida a funcionalidade do servidor
- `README.md` — documentação do projeto
- `package.json` — configura dependências e scripts
- `package-lock.json` — fixa versões do ambiente
- `node_modules/` — dependências instaladas
- `refs.txt` — referências úteis de documentação

Esse conjunto completo transforma o projeto em um laboratório funcional para aprender a criar, testar e integrar um MCP do zero.
