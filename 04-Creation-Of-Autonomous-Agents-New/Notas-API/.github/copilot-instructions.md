# Instruções do projeto

## Stack
- Node.js 24 LTS; TypeScript com ESM e `strict`.
- Zod para validar entradas HTTP/CLI; testes com `node:test` via `tsx`.
- Não usar framework HTTP: o uso direto de `node:http` é intencional.

## Comandos
- `npm run dev` (`tsx src/index.ts`) — API em `localhost:3000`.
- `npm run cli` (`tsx src/cli.tsx`).
- `npm test` (`node --import tsx --test "src/**/*.test.ts"`).
- `npm run typecheck` (`tsc --noEmit`).

## Estrutura
- `src/domain`: tipos e schemas Zod, sem I/O.
- `src/store`: persistência em memória por meio de uma interface.
- `src/service`: regras de negócio.
- `src/http`: camada HTTP.
- `src/cli.ts`: entrada da CLI.
- `specs/`: desenvolvimento orientado a especificações.

## Convenções
- Respeitar o fluxo `http/cli → service → store`, sem atalhos.
- Validar entradas externas com Zod.
- Implementar erros de domínio como classes e traduzi-los na camada de entrada.
- Cobrir toda nova lógica com testes; manter `typecheck` e `test` sempre passando.
- Nunca versionar segredos nem ler arquivos `.env`.

## Fluxo de trabalho
- Seguir `/especificar → /planejar → /tarefas → /implementar`, com revisão humana entre cada fase.
- Manter todos os artefatos gerados em `specs/`.
