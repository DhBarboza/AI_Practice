# Agente autonomo

Aqui apendemos a criar agentes autonomos utilizando ferramentas como Github Copilot entre outros.

Um agente de código é uma entidade que planeja e executa tarefas completas enquanto uma skill/habilidade/ferramenta é a capacidade especifica que um agente utiliza para realizar uam ação individual.

# Projeto - 1

## O AGENTE DE CÓDIGO POR DENTRO (GITHUB COPILOT)

- Abrir pelo cabeçalho ao lado direito da barra de pesquisa

### Prompt:

Crie o esqueleto de um projeto Node.js chamado 'notas-api':

- git inicilizado
- package,json com "type": "module"
- dependencias: zod; dev: typescript, tsx, @types/node
- tsconfig.json com target ES2022, module e moduleResolution NodeNext, strict, esModuleInterop, skipLibCheck e forceConsistencCasingFilenames true, outDir dist, rootDir src, include ["src"]
- scripts npm dev: dev = "tsx scr/index.ts", cli = "tsx src/cle.tsx"; test = "node --import tsx --test/"src/\*_/_.test.ts"; typecheck = "tsc --noEmit"
- .gitignore cobrindo node_modules, .env, .env.\*, dist
  Não crie nenhum arquivo em src/ ainda. Ao final rode npm run typecheck para confirmar que está tudo válido

## CONTEXT ENGINEERING E O CONTRATO DE PERMISSÕES

- Decide o que ocupa a janela de contexto
- Prompt engineering: Contruir uma boa instrução
- Context engineering: Gerenciar todo o espaço de tarbalho do Agent
- Context: é um orçamento, cada token irrelevante diluí a atenção do modelo, e esse fenomeno se chama Context rot
- Regra: Curar e não acumular
- A memória permanente do projeto fica em um arquivo dentro da pasta .github/copilot/intructions.md. Fica injetado nas conversas do repositório e é o equivalente do memory story

### Criar instruções

- Agent interface > Customizations > Instructions

#### Prompt

Crie o arquivo `.github/copilot-instructions.md` na raiz de `04-Creation-Of-Autonomous-Agents-New/Notas-API`.

Esse arquivo contém as instruções do projeto injetadas em todas as conversas do GitHub Copilot. O conteúdo deve ser curto, factual e objetivo, com no máximo 40 linhas.

Organize o conteúdo nas seguintes seções:

- Stack: Node.js 24 LTS, TypeScript com ESM e `strict`, Zod na fronteira de entrada (HTTP/CLI) e testes com `node:test` via `tsx`. Não utilizar framework HTTP; o uso direto de `node:http` é intencional.
- Comandos: documente os comandos `dev` (API em `localhost:3000`), `cli`, `test` e `typecheck`. Extraia os comandos reais do `package.json`, apresentando uma linha por comando.
- Estrutura: `src/domain` (tipos e schemas Zod, sem I/O), `src/store` (persistência em memória por meio de uma interface), `src/service` (regras de negócio), `src/http`, `src/cli.ts` e `specs/` (desenvolvimento orientado a especificações).
- Convenções: respeitar o fluxo entre as camadas (`http/cli → service → store`), sem atalhos; validar entradas externas com Zod; implementar erros de domínio como classes e traduzi-los na camada de entrada; toda nova lógica deve ter testes; manter `typecheck` e `test` sempre passando; nunca versionar segredos nem ler arquivos `.env`.
- Fluxo de trabalho: seguir a sequência `/especificar → /planejar → /tarefas → /implementar`, com revisão humana entre cada fase. Todos os artefatos gerados devem ficar em `specs/`.

Restrições: não incluir um manual de estilo, explicações genéricas ou documentação redundante. Priorize instruções que orientem diretamente o comportamento do Copilot durante o desenvolvimento.

### Instruções por contexto

Também podemos criar as instruções para um determinado contexto o anterior são regras gerais do projeto, porém pode se criar regras que valem apenas para uma parte do repositório, criar instruction com escopo

#### Prompt

## applyTo: "src/service/\*\*"

Regras da camada `service`:

- Priorizar funções puras sempre que possível.
- Nunca importar módulos de `src/http`.

### Permissões

- Instruir ou Bloquear
- Regras que o Harness irá aplicar
- `Ctrl + ,` -> Abrir as "Settings" -> "Search:Terminal Auto Approve" -> Edit in settings.json -> "chat.tools.terminal.autoApprove"

```json
[
  "chat.tools.terminal.autoApprove": {
    // Allowlist: executa sem pop-up
    "npm run": true,
    "npm test": true,
    "node": true,
    "/^git (status|diff|add|commit)\\b/": true,

    // Denylist: exige confirmação via pop-up
    "rm -rf": false,
    "sudo": false,
    "/^git push\\b.*--force/": false,
    "cat .env": false,
    },
]
```

## SPEC-DRIVEN DEVELOPMENT DO ZERO (SDD)

Como elaborar boas instruções para os agents, especificação bem escrita antes da execução.

### Fases:

- Constituition: Quais são os princípios que o agent deve seguir
- Specify: "Q quê" e "Por quê"
- Plan: Como o Agent deve fazer aquilo
- Tasks: Tarefas pequenas
- Implement: Onde ele vai implementar tudo

Cada fase gera um arquivo em .dist no git e o contexto sobrevive a sessão

Critérios de Aceite (EARS):

- Quando acontecer "tal" evento o sistema deve retornar "tal" resposta

### Prompts:

### 1 - Constituition:

```md
Crie um arquivo NOVO em specs/constitution.md com o conteúdo que vou ditar.
Não altere nenhum arquivo existente.

# Constitution - Notas API

Princípios não-negociáveis que toda spec, plano, tarefa e cóidgo seguem.

1. Camadas explícitas. Dependências fluem http/cli -> service -> store. Domínio não faz IO.
2. Validações na fronteira. Toda entrada externa é validada com zod antes de virar domínio.
3. Erros são de domínio. Falhas previsíveis viram classes de erro, traduzidas em status/saída na borda.
4. Teste é parte da tarefa. Nenhuma lógica nova entra sem teste. typecheck e test sempre verdes.
5. Segurança por padrão. Sem segredos no repo. Ações destrutivas passam por guardrails (deny list + pre-commit), não pela confiança no modelo.
6. Spec antes de código. Mudanças relevantes passam por spec -> plan -> task -> implement, com revisão humana entre as fase.
7. Pequeno e recersível. Cada tarefa cabe em um commit

## Stack obrigatória

Node 24, Typescript ESM strict, zod, node:test via tsx, node:http
```

#### 2 - Specify:

```md
crie o arquivo .github/prompts/especificar.prompt.md

---

mode: agent
description: Cria a especificação (o QUE e por quê) de uma feature, sem
código.

---

Escreva uma ESPECIFICAÇÃO para a feature descrita a seguir:

Regras:

- Leia specs/constitution.md e respeite todos os princípios.
- NÃO escreva código nem decisões de implementação
- Crie specs/<NNN> -< slug>spec.md (próximo número livre) com:

1. Contexto/problema.
2. User Stories ("Com <papel>, quero <Objetivo>, para <benefício>").
3. Requisitos funcionais numerados (RF-1 ... ).
4. Critérios de aceite em EARS ("Quando <evento>, o sistema deve <resposta>". 4. Fora de escopo. 6. Questões em aberto) (verifique se a numeração que passei para os tópicos está correta).

- Se algo estivar ambíguo, PERGUNTE antes de finalizar.
```

#### 3 - Planejamento:

```md
Crie em `04-Creation-Of-Autonomous-Agents-New/Notas-API/.github/prompts` o arquivo "planejar.prompt.md"

---

mode: agent
description: Gera o plano técnico (COMO) a partir de uma spec existente.

---

Gera o PLANO TÉCNICO da feature indicada (o texto após o comando é o
número ou o caminho)

- leia a spec.md da feature e a specs/constitution.md
- crie plan.md na mesma pasta da spec, contendo:

1. Arquitetura - camadas/arquivos criados ou alterados (http/cli -> service -> store).
2. Modelo de dados - tipos e schemads zod.
3. Constratos - rotas HTTP e/ou comandos de CLI, com entrada/saída.
4. Decisões e trade-offs.
5. Estratégia de testes (node:test).

- Não implemente nada ainda. Aponte riscos e pontos que precisão de decisão humana
```

#### 4 - Tarefas

```md
Crie em `04-Creation-Of-Autonomous-Agents-New/Notas-API/.github/prompts` o arquivo "tarefas.prompt.md"

---

mode: agent
description: Qubra o plano em tarefas pequenas, ordenadas e testáveis.

---

Gere o tasks.md da feature indicada( o texto após o comando é o número ou caminho).

- Leia spec.md e plan.md da feature.
- Lista numerada em cada tarefa:
- é pequena o suficiente para um único commit;
- tem critério claro de "pronto" (ex: teste X passa);
- declara dependências, quando houver;
- começa com "-[ ]" para marcarmos o progresso.
- Ordene por dependência. Não implemente nada.
```

#### 5 - Implementação

```md
Crie em `04-Creation-Of-Autonomous-Agents-New/Notas-API/.github/prompts` o arquivo "implementar.prompt.md"

---

mode: agent
description: Implemente as tarefas pendentes uma a uma, com testes.

---

Implemente as tarefas de tasks.md da feature indicada (texto após o comando).

uma tarefa por vez:

1. Escolha a próxima "- [ ]" cujas dependências já estão prontas.
2. Implemente seguindo o plan.md, as instructions e a constitution.
3. Escreva/atualize testes e rode npm run test e npm run typecheck.
4. Só marque " - [x]" quando estiver verde.
5. Pare ao concluir uma fatia coesa e peça revisão.

Nunca desative testes/tipos para "passar". Se a spec estiver errada, pare e avise.
```

### Criação (SDD)

Podemos criar do zero nossos frameworks de Spec assim como fizemos acima.
Mas também podemos usar, alguns prontos de mercado:

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [OpenSpec](https://openspec.dev/)

### Guardrails, permissões e revisão

- **Guardrails (limites de segurança):** regras que definem o que o agente pode ou não fazer, reduzindo ações inesperadas ou arriscadas.
- **Permissões:** conceda somente o acesso necessário para a tarefa (_least privilege_). Uma _deny list_ pode bloquear ações como acessar segredos ou apagar arquivos.
- **Revisão:** alterações importantes devem ser verificadas por uma pessoa antes de serem integradas ou publicadas; testes automatizados ajudam nessa validação.

**Exemplo:** um agente de documentação pode editar arquivos Markdown e executar verificações, mas não pode acessar credenciais nem publicar mudanças. Ele prepara a alteração, roda os testes disponíveis e solicita revisão humana antes do merge.

## RACIOCÍNIO E TOMADA DE DECISÃO EM AGENTES - OS TRÊS PADRÕES DE RACIOCÍNIO

- Re-Act (Reason + act):
    - Intercala chain of Thought (cadeia de pensamentos) -> Ação -> Observação -> Pensamento -> ...
    - Rastro de pensamento (Reasoning traces) -> Se transformam em registros de auditoria
    - Trace: Quando o agent erra, ele mostra em qual passo o agent errou
    - Cada decisão usa a informação mais recente disponível
    - Faz um passo por vez
    - Obrigatório ter um teto de interações.
    - Três fraquezas: decide um passo por vez . cada passo carrega o historico inteiro . risco de loop infinito.
- Plan and Execute:
    - Planner -> Passo 1 -> Passo 2 -> Passo 3 -> Replanner
    - Visão global · custo controlado · passos independentes podem paralelizar (U6)
    - A fraqueza: o plano envelhece - por isso o replanner é parte do padrão
- Reflection:
    - Gerador -> Critíco (Feedback -> Gerador) -> Aprovado? -> Fim [máximo 2 reflexões]
    - O crítico avalia contra critérios explícitos
    - A segunda tentativa é informada pelo diagnóstico
    - Sem critério de parada não converge - teto e aprovação explícita, sempre

### Os três padrões, lado a lado

| Padrão           | Força                                     | Fraqueza                                     | Quando usar                             |
| :--------------- | :---------------------------------------- | :------------------------------------------- | :-------------------------------------- |
| ReAct            | adapta a cada observação                  | um passo por vez; custo cresce com histórico | caminho desconhecido, ambiente dinâmico |
| Plan-and-Execute | visão global; executor barato; paraleliza | plano envelhece (exige replanner)            | muitos passos conhecidos; ordem importa |
| Reflection       | qualidade auditada                        | 2x+ custo; exige parada                      | resposta crítica, custo aceitável       |

I

TRACE: O registro do passo-a-passo do que o agente fez, guardado de forma estruturada.
ARENA: Um comando no terminal que vai rodar a mesma pergunta em duas estrategias e mostra os dois raciocínios lado a lado, com o custo de cada um.
BENCH: Uma bateria fixa de testes que mede acerto, números de chamadas e latência, para a comparação virar um número ao invés de uma opinião.

# Projeto 2

## CONFIGURANDO O SPEC KIT

Ferramenta de Spec, GitHub Spec Kit

### Prompt - 1:

```md
Crie o esqueleto de um projeto Node.js chamado ops-pilot:

- git inicializado; package.json com "type": "module"
- dependências: zod, @langchain/core, @langchain/openai,
  @langchain/langgraph, express, sequelize, mysql2 (não instale o dotenv,
  use a opção nativa do Node: --env-file)
- dev: typescript, tsx, @types/node, @types/express, @types/sequelize (caso
  exista)
- scripts: dev = "tsx src/index.ts"; arena = "tsx src/arena.ts";
  bench = "tsx src/bench.ts"; test = "node --import tsx --test \"src/\*_/_.test.ts\"";
  typecheck = "tsc --noEmit"
- .gitignore: node_modules, .env, .env.\*, dist
- .env.example com OPENROUTER_API_KEY= e OPENROUTER_MODEL=
- Não crie arquivos em src/ ainda (apenas um arquivo vazio para o typecheck) Execute npm run typecheck ao final
```

### Prompt - 2

```md
OpsPilot é um copiloto de plantão que gerencia alertas e incidentes de produção; a API é um agente LangChain/LangGraph sobre OpenRouter.

Stack:

- Node.js 24 LTS.
- TypeScript ESM com `strict: true`.
- `zod` na fronteira (HTTP/CLI) para validar entrada e saída.
- Testes com `node:test` via `tsx`.
- Express com MySQL como banco.

Comandos: pegue do @package.json

## Convenções

- Camadas padrão: MVC (Model, Service, Controller).
- Toda entrada externa é validada com zod.
- Erros de domínio são classes traduzidas na borda.
- Lógica nova nasce com teste.
- `npm run typecheck` e `npm test` sempre verdes.
- Nunca commitar secrets e nunca ler `.env`.
- Sempre utilizar funções puras.

## Fluxo

Seguir o fluxo do Spec Kit (GitHub Copilot). Specs devem ser versionadas.

Depois, criar o `.vscode/settings.json` com a seguinte allow/deny list (para o agente):

- allow: `npm run`, `npm run test`, `npx tsc`, `node`, `git status`, `git diff`, `git add`, `git commit`
- deny: `rm -rf`, `sudo`, `git push --force` e leitura de `.env` no terminal
- `git push` fica fora da allow list: aprovação manual.
```

```bash
specify init .
```

## CRIANDO A ESTRUTURA INICIAL DO PROJETO COM SPEC KIT

Vamos utilizar o OpenRouter como base para o projeto. O OpenRouter é gateway de LLMs que permite a integração com diferentes modelos de linguagem, como GPT-4, Claude e outros. Ele fornece uma interface unificada para enviar solicitações e receber respostas de vários LLMs.

[Site](https://openrouter.ai/)

### Definir o Spec

Como ele vai especificar o que vai fazer para atuar

#### 1 - Prompt

```md
Projeto em `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot`

/speckit.specify Núcleo de raciocínio do OpsPilot:

- Interface comum ReasoningStrategy: name + run(input) -> (answer, trace,
  metrics). trace = eventos tipados (thought | action | observation | plan |
  critique | answer; action carrega (tool, args)). metrics = (llmCalls,
  latencyMs).
- Fábrica única em src/agents/model.ts lendo OPENROUTER_API_KEY e
  OPENROUTER_MODEL (baseURL do OpenRouter), temperature 0.
- Ferramentas mock em src/agents/tools.ts sobre um store in-memory pré-
  populado (o seed primário: 5 serviços, 6 alertas variados - 3 firing, 3
  resolved (crie um script para rodar o seed e execute-o ao final desse
  prompt)): list_alerts(status), open_incident(title, service, severity),
  resolve_incident(id). Schemas zod, banco MySQL, utilizando Sequelize.
- Estratégia ReAct em src/agents/react.ts usando o agente ReAct pré-
  construído do LangGraph com essas tools, capturando o trace completo.
- Estratégia Plan-and-Execute em src/agents/plan-and-execute.ts como
  grafo: planner (saída estruturada: lista de passos), executor (um passo por
  vez com as tools), replanner (revisa o restante após cada passo; encerra
  quando não resta nada). Máximo de 8 passos.
- Toda estratégia respeita o limite de iterações e conta chamadas de LLM.
- Arena mínima em src/arena.ts: roda 1+ estratégias sobre o mesmo input e
  imprime traces e métricas (flags --strategies e --max-iterations).
- Testes: store e formatação de trace (determinísticos, sem rede).
```

#### Resultado esperado:

Criação das pastas:

- `specs/`
- `001-reasoning-core`
- `checklists`

Criação dos arquivos:

- `/specs/001-reasoning-core/checklists/requirements.md`
- `/specs/001-reasoning-core/spec.md`

### 2 - Prompt:

> Executar no Agent:

```md
/speckit.plan
```

#### Resultado esperado após executar `/speckit.plan`:

Criação das pastas:

- `specs/`
- `specs/001-reasoning-core/contracts/`

Criação dos arquivos:

- `specs/001-reasoning-core/checklists/requirements.md`
- `specs/001-reasoning-core/contracts/arena-cli.md`
- `specs/001-reasoning-core/contracts/reasoning-strategy.md`
- `specs/001-reasoning-core/contracts/tools.md`
- `specs/001-reasoning-core/data-model.md`
- `specs/001-reasoning-core/plan.md`
- `specs/001-reasoning-core/quickstart.md`
- `specs/001-reasoning-core/research.md`
- `specs/001-reasoning-core/spec.md`

### 3 - Prompt:

> Executar no Agent:

```md
/speckit.tasks
```

#### Resultado esperado após executar `/speckit.tasks`:

Criação do arquivo:

- `specs/001-reasoning-core/tasks.md`

## DEFININDO O PADRÃO REACT PARA O AGENTE

Para evitar que o Agent alucine e siga padrões de código mais consistentes

### 4 - Prompt:

````md
/speckit.implement

Utilize os seguintes exemplos para os códigos de seus respectivos arquivos:

```ts
// referência para a factory src/agents/model.ts
import { ChatOpenAI } from "@langchain/openai";

export function createModel() {
    return new ChatOpenAI({
        model: process.env.OPENROUTER_MODEL ?? "",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        configuration: { baseURL: "https://openrouter.ai/api/v1" },
        temperature: 0,
    });
}

// src/agents/tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { store } from "./ops-store.ts";

export const listAlerts = tool(
    async ({ status }) => JSON.stringify(store.listAlerts(status)),
    {
        name: "list_alerts",
        description:
            "Lista os alertas de monitoramento. Use quando o plantonista perguntar o que está disparando, o estado dos serviços ou 'como está o plantão'. status: firing | resolved | all",
        schema: z.object({
            status: z.enum(["firing", "resolved", "all"]).optional(),
        }),
    },
);

// src/agents/react.ts
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createModel } from "./model.ts";
import { opsTools } from "./tools.ts";
import { lastText, toTrace, countAiMessages } from "./helpers.ts";
import type { ReasoningStrategy } from "./types.ts";

export const reactStrategy: ReasoningStrategy = {
    name: "react",
    async run(input) {
        const started = Date.now();

        const agent = createReactAgent({
            llm: createModel(),
            tools: opsTools,
        });

        const result = await agent.invoke(
            { messages: [{ role: "user", content: input }] },
            { recursionLimit: 12 }, // guardrail: nada de loop infinito
        );

        return {
            answer: lastText(result.messages),
            trace: toTrace(result.messages),
            metrics: {
                llmCalls: countAiMessages(result.messages),
                latencyMs: Date.now() - started,
            },
        };
    },
};
```

```

```
````

#### Resultado esperado após executar `/speckit.implement`

**Arquivos novos:**

- `2-Ops-Pilot/example.ts`
- `2-Ops-Pilot/src/agents/database.test.ts`
- `2-Ops-Pilot/src/agents/helpers.ts`
- `2-Ops-Pilot/src/agents/model.test.ts`
- `2-Ops-Pilot/src/agents/seed.test.ts`
- `2-Ops-Pilot/src/agents/strategies.test.ts`
- `2-Ops-Pilot/src/agents/tools.test.ts`
- `2-Ops-Pilot/src/arena.test.ts`

**Arquivos modificados:**

- `2-Ops-Pilot/.gitignore`
- `2-Ops-Pilot/package.json`
- `2-Ops-Pilot/specs/001-reasoning-core/data-model.md`
- `2-Ops-Pilot/specs/001-reasoning-core/quickstart.md`
- `2-Ops-Pilot/specs/001-reasoning-core/tasks.md`
- `2-Ops-Pilot/src/agents/database.ts`
- `2-Ops-Pilot/src/agents/model.ts`
- `2-Ops-Pilot/src/agents/plan-and-execute.ts`
- `2-Ops-Pilot/src/agents/react.ts`
- `2-Ops-Pilot/src/agents/seed.ts`
- `2-Ops-Pilot/src/agents/store.test.ts`
- `2-Ops-Pilot/src/agents/store.ts`
- `2-Ops-Pilot/src/agents/trace.test.ts`
- `2-Ops-Pilot/src/agents/trace.ts`
- `2-Ops-Pilot/src/agents/types.ts`
- `2-Ops-Pilot/src/arena.ts`

## DEFININDO O PADRÃO PLAN-AND-EXECUTE PARA O AGENTE

### Prompt:

````md
/speckit.implement

Implementar o plan-execute para o nosso modelo do OpenRouter,
de acordo com os exemplos abaixo: o executor resolve com as tools e empurra o resultado para done;
o replanner decide se deve ajustar, seguir ou encerrar; teto total de 8 passos.

```ts
// implementar o plan-execute.ts seguindo o exemplo abaixo

// o estado de referencia
const PEState = Annotation.Root({
    input: Annotation<string>(),
    plan: Annotation<string>(),
    done: Annotation<[string, string][]>({
        reducer: (a, b) => a.concat(b),
        default: () => [],
    }),
    answer: Annotation<string>(),
});

// o planner - referencia
const planSchema = z.object({
    steps: z
        .array(z.string())
        .describe(
            "passos curtos, ordenados, executáveis com as ferramentas disponíveis",
        ),
});

async function planner(state: typeof PEState.State) {
    const plan = await createModel()
        .withStructuredOutput(planSchema)
        .invoke([
            ["system", PLANNER_PROMPT],
            ["user", state.input],
        ]);
    return { plan: plan.steps };
}
```

Execute o script de seed. Por enquanto, vamos usar apenas o arquivo .json com as seeds como base de dados, para que o modelo leia o que já existe ou adicione novos itens. Faça essa modificação para ajustar a execução em memória para os nossos testes.
````

#### Resultado:

**Arquivos novos:**

- `2-Ops-Pilot/src/agents/seed-data.json`

**Arquivos modificados:**

- `2-Ops-Pilot/specs/001-reasoning-core/contracts/arena-cli.md`
- `2-Ops-Pilot/specs/001-reasoning-core/data-model.md`
- `2-Ops-Pilot/specs/001-reasoning-core/plan.md`
- `2-Ops-Pilot/specs/001-reasoning-core/quickstart.md`
- `2-Ops-Pilot/specs/001-reasoning-core/research.md`
- `2-Ops-Pilot/specs/001-reasoning-core/spec.md`
- `2-Ops-Pilot/specs/001-reasoning-core/tasks.md`
- `2-Ops-Pilot/src/agents/plan-and-execute.ts`
- `2-Ops-Pilot/src/agents/seed-data.ts`
- `2-Ops-Pilot/src/agents/seed.test.ts`
- `2-Ops-Pilot/src/agents/seed.ts`
- `2-Ops-Pilot/src/agents/strategies.test.ts`

### Executar Script de Arena no terminal que averiguar se está tudo certo:

```bash
npm run arena - "quantos alertas criticos estao disparando" -- strategies react
```

```bash
npm run arena -- "abra três incidentes sev2 para os alertas do checkout, payments e catalog, nessa ordem, e resolva o primeiro" -strategies plan-execute
```

## CRÍTICAS E BENCH MARK COM PADRÃO REFLECTION

### 1. Prompt:

```md
/speckit.specify Camada Reflection: withReflection(strategy, opts) decora qualquer ReasoningStrategy: executa a base; um crítico (mesmo modelo, saída estruturada { approved, feedback }) avalia a resposta contra as observações do trace; se reprovar, regenera com o feedback no contexto; para em approved ou maxReflections (default 2). Evento "critique" no trace; métricas somam as chamadas extras. Arena: reflect:react e reflect:plan-and-execute.

Critérios de aceite:

- maxReflections = 0 se comporta igual à estratégia base.
- Aprovada de primeira: 1 execução base + 1 crítica, sem regeneração.
- Reprovação contínua: para em maxReflections e retorna a última resposta gerada.
- Um evento "critique" no trace por avaliação.
- Métricas incluem as chamadas do crítico e das regenerações.
- reflect:react e reflect:plan-and-execute aparecem e rodam na Arena.
```

#### Resultado:

**Arquivos novos:**

- `2-Ops-Pilot/specs/002-reflection-layer/spec.md`
- `2-Ops-Pilot/specs/002-reflection-layer/checklists/requirements.md`

### 2. Prompt:

```md
/speckit.plan 002-reflection-layer002-reflection-layer
```

#### Output:

**Arquivos novos:**

- `2-Ops-Pilot/specs/002-reflection-layer/contracts/reflection.md`
- `2-Ops-Pilot/specs/002-reflection-layer/contracts/arena-cli.md`
- `2-Ops-Pilot/specs/002-reflection-layer/data-model.md`
- `2-Ops-Pilot/specs/002-reflection-layer/plan.md`
- `2-Ops-Pilot/specs/002-reflection-layer/quickstart.md`
- `2-Ops-Pilot/specs/002-reflection-layer/research.md`

**Arquivos modificados:**

- `2-Ops-Pilot/specs/002-reflection-layer/spec.md`

### 3. Prompt:

```md
/speckit.tasks 002-reflection-layer002-reflection-layer
```

#### Resultado:

**Arquivos novos:**

- `2-Ops-Pilot/specs/002-reflection-layer/tasks.md`

### 4. Prompt

````md
/speckit.implement 002-reflection-layer

Ao executar o implement, leve em conta o exemplo abaixo como referência do padrão de reflection:

```ts
const verdictSchema = z.object({
    approved: z.boolean(),
    feedback: z
        .string()
        .describe(
            "se reprovado: o que corrigir, de forma específica e acionável",
        ),
});

async function critique(input: string, result: ReasoningResult) {
    return createModel()
        .withStructuredOutput(verdictSchema)
        .invoke([
            ["system", CRITIC_PROMPT], // avalie APENAS contra as observações do trace e do pedido
            [
                "user",
                `Pedido: ${input}\nObservações: ${observationsOf(result.trace)}\nResposta: ${result.answer}`,
            ],
        ]);
}
```
````

```

```

#### Output:

**Arquivos novos:**

- `2-Ops-Pilot/src/agents/reflection.ts`
- `2-Ops-Pilot/src/agents/reflection.test.ts`

**Arquivos modificados:**

- `2-Ops-Pilot/example.ts`
- `2-Ops-Pilot/specs/002-reflection-layer/contracts/reflection.md`
- `2-Ops-Pilot/specs/002-reflection-layer/data-model.md`
- `2-Ops-Pilot/specs/002-reflection-layer/quickstart.md`
- `2-Ops-Pilot/specs/002-reflection-layer/tasks.md`
- `2-Ops-Pilot/src/arena.test.ts`
- `2-Ops-Pilot/src/arena.ts`

### 5. Terminal

Executar no terminal dentro do projeto `AI_Practice/04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot`:

```bash
npm run arena -- "faça um resumo do estado da plantação com uma recomendação do que atacar primeiro" --strategies react,reflect:react
```

#### Output:

```md
Answer:
**Resumo do estado atual (alertas ativos – status _firing_)**

| Alerta    | Serviço      | Severidade   | Descrição                                         |
| --------- | ------------ | ------------ | ------------------------------------------------- |
| alert-001 | **Checkout** | **critical** | Taxa de erro no checkout elevada                  |
| alert-002 | **Payments** | warning      | Latência do provedor de pagamento acima do limite |
| alert-003 | **Ops API**  | warning      | Pressão de memória nos pods da API de operações   |

**O que atacar primeiro**

1. **Checkout (critical)** – Prioridade máxima.
    - É o único alerta com severidade _critical_ e afeta diretamente a conclusão de pedidos, ou seja, impacto imediato na receita e na experiência do cliente.
    - Ação sugerida: investigar logs de erro do serviço de checkout, verificar se há falhas de integração, aumento de tráfego ou problemas de dependência (ex.: banco de dados, filas) e, se necessário, abrir um incidente de severidade _critical_.

2. **Payments (warning)** – Segundo em prioridade.
    - Latência elevada pode causar timeouts e abandono de carrinho, mas ainda não está gerando erros críticos.
    - Ação sugerida: checar o provedor de pagamento, tempo de resposta das APIs e possíveis gargalos de rede.

3. **Ops API (warning)** – Terceiro.
    - Pressão de memória pode afetar a estabilidade da API interna, mas o impacto direto no usuário final é menor no momento.
    - Ação sugerida: revisar uso de memória dos pods, possíveis vazamentos e considerar escalonamento ou reinício controlado.

**Recomendação rápida:** comece pelo **Checkout**, pois é o único alerta crítico e tem impacto direto no faturamento. Após estabilizá-lo, siga para Payments e, por fim, Ops API.
Trace:
[01] THOUGHT: The agent selected an operational tool for the request.
[02] ACTION list*alerts({"status":"firing"})
[03] OBSERVATION list_alerts: [{"id":"alert-001","service":"Checkout","title":"Elevated checkout error rate","severity":"critical","status":"firing"},{"id":"alert-002","service":"Payments","title":"Payment provider latency above threshold","severity":"warning","status":"firing"},{"id":"alert-003","service":"Ops API","title":"API pod memory pressure","severity":"warning","status":"firing"}]
[04] ANSWER: \*\*Resumo do estado atual (alertas ativos – status \_firing*)\*\*

| Alerta    | Serviço      | Severidade   | Descrição                                         |
| --------- | ------------ | ------------ | ------------------------------------------------- |
| alert-001 | **Checkout** | **critical** | Taxa de erro no checkout elevada                  |
| alert-002 | **Payments** | warning      | Latência do provedor de pagamento acima do limite |
| alert-003 | **Ops API**  | warning      | Pressão de memória nos pods da API de operações   |

**O que atacar primeiro**

1. **Checkout (critical)** – Prioridade máxima.
    - É o único alerta com severidade _critical_ e afeta diretamente a conclusão de pedidos, ou seja, impacto imediato na receita e na experiência do cliente.
    - Ação sugerida: investigar logs de erro do serviço de checkout, verificar se há falhas de integração, aumento de tráfego ou problemas de dependência (ex.: banco de dados, filas) e, se necessário, abrir um incidente de severidade _critical_.

2. **Payments (warning)** – Segundo em prioridade.
    - Latência elevada pode causar timeouts e abandono de carrinho, mas ainda não está gerando erros críticos.
    - Ação sugerida: checar o provedor de pagamento, tempo de resposta das APIs e possíveis gargalos de rede.

3. **Ops API (warning)** – Terceiro.
    - Pressão de memória pode afetar a estabilidade da API interna, mas o impacto direto no usuário final é menor no momento.
    - Ação sugerida: revisar uso de memória dos pods, possíveis vazamentos e considerar escalonamento ou reinício controlado.

**Recomendação rápida:** comece pelo **Checkout**, pois é o único alerta crítico e tem impacto direto no faturamento. Após estabilizá-lo, siga para Payments e, por fim, Ops API.
Metrics: {"llmCalls":2,"latencyMs":10240.426024}
```

### 6. Criar um comparativo (Benchmark)

#### Input:

```md
Crie src/bench.ts: 3 cenários x 2 estratégias (react, plan-and-execute), com acerto verificado no ESTADO do store após rodar, e tabela consolidada. Flags: `--scenario` e `--no-replanner`.

Cenários:

- C1 (direto): "quantos alertas críticos estão disparando?"
- C2 (estruturado): "abra três incidentes sev2 para checkout, payment e catalog, nessa mesma ordem, e resolva o primeiro"
- C3 (dinâmico): "dos alertas disparando, abra um incidente para o mais antigo e diga quantos sobraram"

Colunas da tabela: cenário, estratégia, acerto, llmCalls, latencyMs
```

#### Output:

```md
Implementado em `src/bench.ts`, com testes em `src/bench.test.ts`. O benchmark executa os três cenários com ReAct e Plan-and-Execute, verifica os resultados no store isolado de cada execução e imprime a tabela consolidada.

Uso: `npm run bench`, `npm run bench -- --scenario C1` ou `npm run bench -- --scenario C2,C3 --no-replanner`. O modo sem replanner executa o plano inicial em sequência; Sev2 corresponde a `high`, e `Catalog` é adicionado somente ao store do benchmark.

**Observação:** como os alertas não têm timestamp, C3 considera mais antigo o primeiro alerta disparando na ordem do seed. Não executei chamadas reais aos modelos; a validação foi offline.

Verificação: **34 testes passaram**, `npm run typecheck` passou.
```

### 7. Terminal

Executar no terminal dentro do projeto `AI_Practice/04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot`:

#### Input:

```bash
npm run bench
```

#### Ouput:

```bash
| cenário | estratégia       | acerto | llmCalls | latencyMs          |
|---------|------------------|--------|----------|--------------------|
| C1      | react            | sim    | 2        | 6449.893264        |
| C1      | plan-and-execute | sim    | 3        | 43323.374889       |
| C2      | react            | sim    | 7        | 22369.414619999996 |
| C2      | plan-and-execute | não    | 3        | 38626.793177       |
| C3      | react            | não    | 4        | 10527.590729000003 |
| C3      | plan-and-execute | não    | 3        | 21793.01640200001  |
```

Obs.: Cuidado ao executar o scrip de `benck`, usando modelos free batemos o limite de `request` diários

## UMA API QUE TAMBÉM É UM AGENTE

### 1. Prompt:

#### Input:

```md
/speckit.specify POST /chat em src/http/server.ts (ou o padrão do Express): body { message, strategy?, reflect? } validado com zod; default react. Respostas: 200 { answer, trace, metrics }; 400 body inválido (issues do zod); 422 estratégia desconhecida; 504 se estourar o timeout de 180s. Registry em src/agents/index.ts (nome -> estratégia); reflect aplica withReflection.

Critérios de aceite:

- Body válido sem strategy usa react.
- Body inválido retorna 400 com as issues do zod.
- strategy desconhecida retorna 422.
- Requisição que passa de 180s retorna 504.
- reflect: true aplica withReflection sobre a estratégia escolhida.
- Teste de integração com estratégia fake determinística, sem rede.
```

#### Output:

```md
**Arquivos novos:**

- `2-Ops-Pilot/specs/003-chat-http-api/checklists/requirements.md`
- `2-Ops-Pilot/specs/003-chat-http-api/spec.md`
```

### 2. Prompt:

#### Input:

```md
/speckit.plan 003-chat-http-api
```

#### Output:

```md
**Arquivos novos:**

- `2-Ops-Pilot/specs/003-chat-http-api/contracts/chat-http.md`
- `2-Ops-Pilot/specs/003-chat-http-api/data-model.md`
- `2-Ops-Pilot/specs/003-chat-http-api/plan.md`
- `2-Ops-Pilot/specs/003-chat-http-api/quickstart.md`
- `2-Ops-Pilot/specs/003-chat-http-api/research.md`
```

### 3. Prompt:

#### Input:

```md
/speckit.tasks 003-chat-http-api
```

#### Output:

```md
**Arquivos novos:**

- `2-Ops-Pilot/specs/003-chat-http-api/tasks.md`
```

### 4. Prompt

#### Input:

```md
    /speckit.implement 003-chat-http-api
```

#### Output:

```md
Implementação concluída; as 10 tarefas estão marcadas como feitas em `tasks.md`.

- Criei o registry de estratégias em `src/agents/index.ts` e o endpoint Express em `src/http/server.ts`, com validação Zod, `react` como padrão, reflexão opcional, respostas 400/422/500/504 e timeout de 180 segundos.
- Adicionei o comando `npm run http` e testes de integração com estratégias fake em `src/http/server.test.ts`.
- Atualizei o `.gitignore` para ignorar `.env.*` sem ignorar `.env.example`.

Validação: **40 testes passaram**, `npm run typecheck` passou e `git diff --check` não apontou problemas. O timeout encerra a espera HTTP, mas não cancela trabalho já iniciado pela estratégia.

**Arquivos novos:**

- `2-Ops-Pilot/src/agents/index.ts`
- `2-Ops-Pilot/src/http/server.test.ts`
- `2-Ops-Pilot/src/http/server.ts`

**Arquivos modificados:**

- `2-Ops-Pilot/package.json`
- `2-Ops-Pilot/specs/003-chat-http-api/contracts/chat-http.md`
- `2-Ops-Pilot/specs/003-chat-http-api/quickstart.md`
- `2-Ops-Pilot/specs/003-chat-http-api/tasks.md`
```

### Executar a API:

Na pasta do projeto, use **Node.js 24**:

```bash
npm install
cp .env.example .env
```

Configure no `.env` as variáveis necessárias para o provedor de modelo e, em seguida, escolha como executar:

```bash
npm run dev     # aplicação principal
npm run http    # API HTTP; padrão: http://localhost:3000
npm run arena   # Arena de estratégias
npm run bench   # benchmark
```

Para testar a API, com `npm run http` rodando, abra outro terminal e envie:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"quantos alertas críticos estão disparando?"}'
```

Os scripts disponíveis estão em `package.json`; use `.env.example` como referência para a configuração local.

#### Output:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"quantos alertas críticos estão disparando?"}'
{"answer":"Há **1 alerta crítico** disparando:\n\n- **Checkout**: Elevated checkout error rate (severity: critical)\n\nOs outros 2 alertas disparados são de severidade warning (Payments eOps API).","trace":[{"type":"thought","content":"The agent selected an operational tool for the request."},{"type":"action","tool":"list_alerts","args":{"status":"firing"}},{"type":"observation","tool":"list_alerts","content":"[{\"id\":\"alert-001\",\"service\":\"Checkout\",\"title\":\"Elevated checkout error rate\",\"severity\":\"critical\",\"status\":\"firing\"},{\"id\":\"alert-002\",\"service\":\"Payments\",\"title\":\"Payment provider latency above threshold\",\"severity\":\"warning\",\"status\":\"firing\"},{\"id\":\"alert-003\",\"service\":\"Ops API\",\"title\":\"API pod memory pressure\",\"severity\":\"warning\",\"status\":\"firing\"}]"},{"type":"answer","content":"Há **1 alerta crítico** disparando:\n\n- **Checkout**: Elevated checkout error rate (severity: critical)\n\nOs outros 2 alertas disparados são de severidade warning (Payments e Ops API)."}],"metrics":{"llmCalls":2,"latencyMs":5393.469161000001}
```

Outra chamada:

```bash
curl -s localhost:3000/chat -X POST \
  -H 'content-type: application/json' \
  -d '{"message":"abra um incidente sev2 para o catalog","strategy":"react","reflect":true}' \
  | jq '{answer, llmCalls: .metrics.llmCalls}'
```

## ESPECIFICANDO A INTEGRAÇÃO COM BANCO DE DADOS

### 1. Prompt - Specify

#### Input:

```md
Primeiro atualize a constitution do projeto, pois vamos utilizar o SQLite ao invés de um
banco de dados tradicional.

/speckit.specify Persistência real de operações:

- SqliteOpsStore (src/store/sqlite-ops-store.ts) implementa a interface OpsStore
  existente via node:sqlite (DatabaseSync); caminho em OPSPILOT_DB (default
  ./data/opspilot.db); ":memory:" nos testes
- 4 tabelas - services, alerts, incidents, runbooks - espelhando os tipos atuais do
  domínio (incidents ganha resolved_at e summary, anuláveis); DDL idempotente no
  construtor; CHECK em todo campo de domínio fechado (tier, severity, status)
- seed idempotente = cenário Mercadinho do mock (5 serviços, 6 alertas: 3 firing, 3
  resolved; runbooks de checkout/payments/auth)
- prepared statements em toda query; sem SQL concatenado
- tools novas: list_incidents(status open | resolved | all, default open) e
  consultar_runbook(service) - descrições pelas 6 regras
- composição injeta o SqliteOpsStore; mock in-memory fica para testes e para o bench
  (para que os cenários possam ser reproduzidos)
- data/ no .gitignore
- revisar descrições de src/agents/tools.ts pelas 6 regras (dívida do open_incident:
  quando usar; .describe() em todo campo; enums)
- testes ":memory:": seed, abrir/listar/resolver, filtros e CHECKs; testes das tools
  existentes passam a rodar sobre ":memory:"
```

#### Output:

**Criado:**

- 2-Ops-Pilot/specs/004-ops-persistence
- 2-Ops-Pilot/specs/004-ops-persistence/checklists
- 2-Ops-Pilot/specs/004-ops-persistence/checklists/requirements.md
- 2-Ops-Pilot/specs/004-ops-persistence/spec.md

### 2. Prompt - Plan:

#### Input:

```md
/speckit.plan 004-ops-persistence
```

#### Output:

```md
Criados:

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/contracts/ops-tools.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/data-model.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/plan.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/quickstart.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/research.md`

Modificados:

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/checklists/requirements.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/spec.md`
```

### 3. Prompt - Tasks:

#### Input:

```md
/speckit.tasks 004-ops-persistence
```

#### Output:

```md
**Criado:**

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/tasks.md`
```

### 4 Prompt - Implement:

#### Input:

````md
/speckit.implement

    ```ts
    // Referência para implementação do sqlite-ops-StorageEvent

    import { DatabaseSync } from "node:sqlite";
    import type { OpsStore, Incident, IncidentFilter } from "./ops-store.ts";

    export class SqliteOpsStore implements OpsStore {
        private _db: DatabaseSync;

        constructor(path = process.env.OPSPILOT_DB ?? "./data/opspilot.db") {
            this._db = new DatabaseSync(path);
            this._db.exec(`
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            service_id TEXT NOT NULL,
            severity TEXT NOT NULL CHECK (severity IN ('sev1', 'sev2', 'sev3')),
            status TEXT NOT NULL CHECK (status IN ('open', 'mitigated', 'resolved')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            summary TEXT
            -- + services, alerts, runbooks e o seed idempotente da Mercadinho
        );
        `);
        }

        listIncidents(filter: IncidentFilter): Incident[] {
            const where = filter === "all" ? "" : "WHERE status = ?";
            const stmt = this._db.prepare(
                `SELECT * FROM incidents ${where} ORDER BY created_at`,
            );
            return (filter === "all" ? stmt.all() : stmt.all(filter)) as Incident[];
        }

        // listAlerts(), openIncidents(), resolveIncident(), getRunbook(): mesmo padrão
        // prepared statement + retorno tipado
    }
    ```

```

```
````

#### Output:

```md
Ran terminal command: git status --short --untracked-files=all

Criados:

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/store/sqlite-ops-store.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/store/sqlite-ops-store.ts`

Modificados:

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/.gitignore`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/example.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/package-lock.json`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/package.json`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/004-ops-persistence/tasks.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/index.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/plan-and-execute.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/react.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/seed-data.json`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/seed-data.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/seed.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/seed.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/store.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/store.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/strategies.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/tools.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/tools.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/types.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/arena.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/arena.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/bench.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/bench.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/http/server.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/http/server.ts`
- `04-Creation-Of-Autonomous-Agents-New/Autonomous-Agent.md`

Removidos:

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/database.test.ts`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/src/agents/database.ts`
```

### How to test:

A API expõe **uma rota**, `POST /chat`. As operações — consultar alertas, abrir ou resolver incidentes e consultar runbooks — são solicitadas em linguagem natural; o agente escolhe a ferramenta. Não há endpoints REST separados como `/alerts` ou `/incidents`.

1. Inicie o servidor em um terminal:

```bash
npm run http
```

Ele usa a porta `3000` por padrão. Para respostas do agente, configure `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` no ambiente ou no `.env` — não envie essas credenciais no `curl`.

2. Em outro terminal, consulte alertas:

```bash
curl -i http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Liste os alertas que estão disparando"}'
```

Abra um incidente:

```bash
curl -sS http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Abra um incidente de severidade high para o serviço Checkout: falha no processamento de compras"}'
```

A resposta inclui `answer`, `trace` e `metrics`. Use o ID do incidente retornado para pedir a resolução:

```bash
curl -sS http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Resolva o incidente ID_DO_INCIDENTE"}'
```

Também pode pedir, por exemplo, “Liste os incidentes abertos” ou “Consulte o runbook do serviço Payments”. O servidor e o formato da requisição estão documentados em `server.ts` e `quickstart.md`.

## VALIDANDO DISPONIBILIDADE DE PROVEDORES EXTERNOS

### 1. Prompt - Specify:

#### Input:

```md
/speckit.specify Tool de status de provedores externos:

- Tool check_provider_status em src/agents/tools.ts: consulta a statuspage pública do
  provedor via API statuspage.io (sem chave):
  github -> https://www.githubstatus.com/api/v2/status.json
  cloudflare -> https://www.cloudflarestatus.com/api/v2/status.json
  Parâmetro provider (enum: github | cloudflare, default "github", .describe explicando).
  Descrição orientada a quando usar: suspeita de problema externo, "é o nosso ou do
  provedor?", dependência fora do ar.
- Resiliência: timeout de 5s via AbortSignal.timeout; falha de rede ou 5xx, UMA nova
  tentativa; resposta validada com zod
  ({ status: { indicator, description } }); qualquer falha final retorna string de erro legível
  como resultado da tool (erro é observação - nunca lançar exceção para fora da tool).
- Retorno compacto (indicador + descrição, uma linha), para não inflar o contexto.
- Teste: a função de fetch é injetável; testes cobrem sucesso, timeout e resposta inválida
  sem uso de rede (fake fetch).
```

#### Outputs:

```md
**Criados:**

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/checklists/requirements.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/spec.md`
```

### 2. Prompt - Plan:

#### Input:

```md
/speckit.plan 005-check-provider-status
```

#### Outputs:

```md
**Criados:**

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/contracts/check-provider-status.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/data-model.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/plan.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/quickstart.md`
- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/research.md`

**Modificados:**

- `04-Creation-Of-Autonomous-Agents-New/Autonomous-Agent.md`

Também continuam não rastreados desde a última consulta: `spec.md`, `requirements.md` e `Template.md`.
```

### 3. Prompt - Task:

#### Input:

```md
/speckit.task 005-check-provider-status
```

#### Outputs:

```md
**Criados:**

- `04-Creation-Of-Autonomous-Agents-New/2-Ops-Pilot/specs/005-check-provider-status/tasks.md`
```

### 4. Prompt - Implement:

#### Input:

````md
/speckit.implement 005-check-provider-status

```ts
// Referência para implementação do retorno de status da aplicação

const statusSchema = z.object({
    status: z.object({ indicator: z.string(), description: z.string() }),
});

const STATUS_URL = {
    github: "https://www.githubstatus.com/api/v2/status.json",
    cloudflare: "https://www.cloudflarestatus.com/api/v2/status.json",
} as const;

async function fetchProviderStatus(
    provider: keyof typeof STATUS_URL,
    doFetch: typeof fetch = fetch,
): Promise<string> {
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await doFetch(STATUS_URL[provider], {
                signal: AbortSignal.timeout(5000),
            });
            if (response.status >= 500)
                throw new Error(`upstream ${response.status}`);
            if (!response.ok) {
                return `status page de ${provider} respondeu HTTP ${response.status}`;
            }
            const { status } = statusSchema.parse(await response.json());
            return `${provider} está ${status.indicator} - ${status.description}`;
        } catch (error) {
            if (attempt === 2) {
                return `não consegui consultar o status de ${provider} (${(error as Error).message}). Responda com base nos alertas internos e avise o plantonista da limitação`;
            }
        }
    }
    return "unreachable";
}
```
````

#### Outputs:

```md
**Criados:**

- `2-Ops-Pilot/src/agents/provider-status.test.ts`
- `2-Ops-Pilot/src/agents/provider-status.ts`

**Modificados:**

- `2-Ops-Pilot/.gitignore` — alteração staged
- `2-Ops-Pilot/specs/005-check-provider-status/tasks.md`
- `2-Ops-Pilot/src/agents/plan-and-execute.ts`
- `2-Ops-Pilot/src/agents/tools.test.ts`
- `2-Ops-Pilot/src/agents/tools.ts`
```

### Teste:

A tool não tem uma rota HTTP própria. Para testá-la com `curl`, inicie o servidor com `npm run http` e peça ao agente para verificar o provedor pelo endpoint `/chat` (`server.ts`):

```bash
curl -sS http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Verifique o status público do GitHub usando check_provider_status e resuma o resultado."}'
```

Para Cloudflare:

```bash
curl -sS http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Use check_provider_status para verificar o Cloudflare e informe o indicador e a descrição."}'
```

A resposta deve ser JSON com `answer`, `trace` e `metrics`. Isso executa o agente e consulta o status público real; requer a configuração de modelo já usada pelo OpsPilot. Para testar sem modelo nem rede, rode os testes automatizados: `node --import tsx --test src/agents/provider-status.test.ts src/agents/tools.test.ts`.

Use o endpoint `POST /chat` pedindo ao agente para abrir o incidente. Informe um título, o nome exato de um serviço conhecido e a severidade (`critical`, `high`, `medium` ou `low`), conforme a tool em `tools.ts`.

Por exemplo:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Abra um incidente high para o serviço Checkout: falhas intermitentes no checkout."}'
```

A resposta JSON inclui o resultado da ação no `trace`. Para verificação, você pode pedir depois: “Liste os incidentes abertos.”

## DISPONIBILIZANDO NOSSO AGENTE VIA MCP

### 1. Prompt - Specify:

#### Input:

```md
/speckit.specify MCP server do OpsPilot: `src/mcp/server.ts` com `@modelcontextprotocol/sdk`, transport stdio, expondo `list_alerts`, `open_incident` e `resolve_incident`, reutilizando o mesmo `OpsStore` e os mesmos schemas zod das tools existentes (uma única fonte de verdade). Nome do server: `opspilot`. Script npm: `mcp = "tsx src/mcp/server.ts"` (se precisar de env, alterar o script e carregá-las antes). REGRA CRÍTICA: nenhum `console.log` no server; no stdio o stdout é o canal do protocolo, e o diagnóstico vai para o stderr. Teste: subir o server e validar a lista de tools.
```

#### Outputs:

```md
**Criados:**

- `2-Ops-Pilot/specs/006-mcp-server/spec.md`
- `2-Ops-Pilot/specs/006-mcp-server/checklists/requirements.md`
```

### 2. Prompt - Plan:

#### Input:

```md
/speckit.plan 004-ops-persistence
```

#### Outputs:

```md

```

### 3. Prompt - Task:

#### Input:

```md
/speckit.tasks 004-ops-persistence
```

#### Outputs:

```md

```

### 4. Prompt - Implement:

#### Input:

```md

```

#### Outputs:

```md

```
