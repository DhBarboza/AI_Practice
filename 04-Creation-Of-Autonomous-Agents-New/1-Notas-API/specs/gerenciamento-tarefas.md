# Especificação: gerenciamento de tarefas

## Objetivo
Permitir que o sistema registre tarefas com título, liste por status (`all`, `open`, `done`), conclua e remova tarefas por ID usando HTTP e CLI.

## Requisitos

1. Criar tarefa com título obrigatório.
2. Listar todas as tarefas ou apenas as abertas/concluídas.
3. Consultar tarefa por ID.
4. Marcar tarefa como concluída.
5. Remover tarefa por ID.
6. Validar entradas da borda com Zod.
7. Manter a lógica de domínio fora da camada HTTP/CLI.

## Contratos

### HTTP
- `POST /tasks` com `{ "title": "..." }`
- `GET /tasks?status=all|open|done`
- `GET /tasks/:id`
- `PATCH /tasks/:id/complete`
- `DELETE /tasks/:id`

### CLI
- `npm run cli -- create "titulo"`
- `npm run cli -- list all|open|done`
- `npm run cli -- complete <task-id>`
- `npm run cli -- remove <task-id>`

## Critérios de aceitação
- Todas as operações respondem em JSON, com status HTTP apropriado.
- Tarefas concluídas ficam com `status: "done"`.
- Tarefas inválidas retornam 400.
- Tarefas inexistentes retornam 404.
- O fluxo CLI usa a API HTTP em `http://localhost:3000` por padrão.
