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
