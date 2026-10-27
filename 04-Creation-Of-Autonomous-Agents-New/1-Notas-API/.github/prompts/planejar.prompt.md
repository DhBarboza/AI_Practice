---
agent: "agent"
description: "Gera o plano técnico de uma feature a partir de uma especificação existente."
argument-hint: "Informe o número ou o caminho da spec"
---

Gere o plano técnico (como) da feature indicada:

${input:spec:Informe o número ou o caminho da spec}

Regras:

- Leia a especificação indicada e [specs/constitution.md](../../specs/constitution.md).
- Se o número corresponder a mais de uma spec, ou não for possível identificar a spec, pergunte antes de prosseguir.
- Crie `plan.md` na mesma pasta da especificação.
- Organize o plano nestas seções:
  1. Arquitetura: camadas e arquivos a criar ou alterar, respeitando `http/cli → service → store`; o domínio não faz I/O.
  2. Modelo de dados: tipos e schemas Zod.
  3. Contratos: rotas HTTP e/ou comandos de CLI, com entradas e saídas.
  4. Decisões e trade-offs.
  5. Estratégia de testes com `node:test`.
  6. Riscos e pontos que precisam de decisão humana.
- Não implemente nada: produza somente o plano técnico.
