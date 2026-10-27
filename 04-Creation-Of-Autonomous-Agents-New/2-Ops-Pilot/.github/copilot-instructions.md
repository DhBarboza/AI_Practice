# Diretrizes do OpsPilot

## Contexto e arquitetura

OpsPilot é um copiloto de plantão para gerenciar alertas e incidentes de produção. A API usa LangChain/LangGraph com OpenRouter.

- Use Node.js 24 LTS, TypeScript ESM e `strict: true`.
- Organize a aplicação em Model, Service e Controller.
- Mantenha a lógica de domínio em funções puras sempre que possível; isole efeitos colaterais, como HTTP e banco, nas bordas.
- Modele erros de domínio como classes e traduza-os na borda HTTP ou CLI.

## Validação, segurança e testes

- Valide entradas e saídas externas com Zod, incluindo as fronteiras HTTP, CLI e agente.
- Crie testes com `node:test` via `tsx` para toda lógica nova.
- Nunca leia ou exponha `.env` ou outros secrets; nunca inclua secrets em alterações ou specs.
- Execute `npm run typecheck` e `npm test` e mantenha ambos passando.

## Comandos

Os comandos são definidos em [package.json](../package.json):

- `npm run dev`
- `npm run arena`
- `npm run bench`
- `npm run test`
- `npm run typecheck`

Consulte o `package.json` antes de usar ou documentar comandos para evitar divergência.

## Desenvolvimento guiado por especificações

Use o fluxo do Spec Kit para funcionalidades: crie a constituição uma vez; para cada funcionalidade, execute e revise cada etapa antes de avançar:

1. `/speckit-specify`
2. `/speckit-plan`
3. `/speckit-tasks`
4. `/speckit-implement`
5. `/speckit-converge` até a convergência ser confirmada.

Mantenha specs, planos e tarefas de funcionalidades em `specs/` e versionados com o código. Consulte `.specify/memory/constitution.md` como fonte das regras permanentes do projeto. Correções de bugs podem seguir o fluxo de bugfix do Spec Kit sem exigir uma nova spec de funcionalidade.
