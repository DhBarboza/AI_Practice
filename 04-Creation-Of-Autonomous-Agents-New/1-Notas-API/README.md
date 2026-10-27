# notas-api

API para gerenciamento de tarefas em Node.js + TypeScript, com HTTP e CLI para criar, listar, concluir e remover tarefas.

## Funcionalidades

- Criar tarefa com título
- Listar tarefas com filtro `all`, `open` ou `done`
- Concluir tarefa por ID
- Remover tarefa por ID
- Validação de entradas com Zod
- Persistência em memória por processo

## Tecnologias

- Node.js com módulos ES (`"type": "module"`)
- TypeScript em modo estrito
- [Zod](https://zod.dev/) para validação da API e CLI
- [node:http](https://nodejs.org/api/http.html) para o servidor HTTP
- [tsx](https://tsx.is/) para execução em desenvolvimento

## Instalação

```bash
npm install
```

## Executar a API

```bash
npm run dev
```

A API fica em `http://localhost:3000`.

## Endpoints HTTP

- `GET /health` - saúde da aplicação
- `POST /tasks` - cria uma tarefa
  - body: `{ "title": "Estudar TypeScript" }`
- `GET /tasks?status=all|open|done` - lista tarefas
- `GET /tasks/:id` - busca uma tarefa por ID
- `PATCH /tasks/:id/complete` - conclui a tarefa
- `DELETE /tasks/:id` - remove a tarefa

## CLI

```bash
npm run cli -- create "Estudar TypeScript"
npm run cli -- list all
npm run cli -- list open
npm run cli -- list done
npm run cli -- complete <task-id>
npm run cli -- remove <task-id>
```

## Testes

```bash
npm test
npm run typecheck
```
