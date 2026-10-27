---
agent: "agent"
description: "Implementa tarefas pendentes de uma feature, uma por vez, com testes."
argument-hint: "Informe o número ou o caminho da feature"
---

Implemente as tarefas pendentes de `tasks.md` da feature indicada:

${input:feature:Informe o número ou o caminho da feature}

Regras:

- Localize e leia `tasks.md`, o `plan.md` correspondente, as instructions aplicáveis e `specs/constitution.md`.
- Se a feature ou seus artefatos não puderem ser identificados, pergunte antes de prosseguir.
- Escolha a próxima tarefa `- [ ]` cujas dependências já estejam concluídas. Implemente uma tarefa por vez, seguindo o plano e as convenções do projeto.
- Escreva ou atualize os testes da tarefa e execute `npm run test` e `npm run typecheck`.
- Só altere a tarefa para `- [x]` quando ambos os comandos passarem; se algum falhar, não a marque como concluída e informe o resultado.
- Nunca desative testes ou verificações de tipos para fazê-los passar.
- Se a especificação estiver incorreta ou insuficiente para implementar com segurança, pare e explique o problema.
- Pare ao concluir uma fatia coesa e solicite revisão humana antes de continuar.
