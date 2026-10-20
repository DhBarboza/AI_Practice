---
agent: "agent"
description: "Cria a especificação do que e por que de uma feature, sem código."
argument-hint: "Descreva a feature a especificar"
---

Escreva uma especificação para a feature descrita a seguir:

${input:feature:Descreva a feature}

Regras:

- Leia [specs/constitution.md](../../specs/constitution.md) e respeite todos os princípios.
- Não escreva código nem tome decisões de implementação.
- Crie `specs/<NNN>-<slug>-spec.md`, usando o próximo número livre.
- Organize a especificação nestas seções:
  1. Contexto/problema.
  2. User stories no formato: "Com <papel>, quero <objetivo>, para <benefício>".
  3. Requisitos funcionais numerados (`RF-1`, `RF-2`...).
  4. Critérios de aceite em EARS, no formato: "Quando <evento>, o sistema deve <resposta>".
  5. Fora de escopo.
  6. Questões em aberto.
- Se algo estiver ambíguo, pergunte antes de finalizar a especificação.
