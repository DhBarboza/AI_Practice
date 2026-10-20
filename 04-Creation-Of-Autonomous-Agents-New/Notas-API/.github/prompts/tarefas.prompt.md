---
agent: "agent"
description: "Decompõe uma especificação e seu plano em tarefas pequenas, ordenadas e testáveis."
argument-hint: "Informe o número ou o caminho da spec"
---

Gere a lista de tarefas da feature indicada:

${input:spec:Informe o número ou o caminho da spec}

Regras:

- Localize a especificação e o `plan.md` correspondente. Leia ambos antes de gerar as tarefas.
- Se o número corresponder a mais de uma feature, ou se não for possível localizar a spec e o plano correspondentes, pergunte antes de prosseguir.
- Crie `tasks.md` na mesma pasta da especificação.
- Ordene as tarefas pelas dependências; declare explicitamente as dependências de cada tarefa ou indique "Nenhuma".
- Numere cada tarefa. Cada item deve começar com `-[ ]` para permitir marcar o progresso (por exemplo: `1. -[ ] ...`).
- Mantenha cada tarefa pequena o suficiente para caber em um único commit.
- Dê a cada tarefa um critério claro de conclusão, como o teste específico que deve passar.
- Não implemente nada; produza somente `tasks.md`.
