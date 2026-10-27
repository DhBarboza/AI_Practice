# Constituição do OpsPilot

## Princípios fundamentais

1. **Segurança nas fronteiras:** valide entradas e saídas externas com Zod; nunca leia ou exponha `.env` ou secrets.
2. **Domínio previsível:** prefira funções puras para a lógica de domínio e mantenha efeitos colaterais nas fronteiras.
3. **Arquitetura em camadas:** organize o código em Model, Service e Controller; represente falhas de negócio com erros de domínio e traduza-os na borda.
4. **Qualidade verificável:** toda lógica nova deve nascer com testes `node:test` executados via `tsx`; `npm run typecheck` e `npm test` devem permanecer verdes.
5. **Especificações versionadas:** funcionalidades seguem o Spec Kit e suas specs, planos e tarefas em `specs/` são versionados junto ao código.

## Plataforma e stack

- Node.js 24 LTS.
- TypeScript ESM com `strict: true`.
- Express e MySQL.
- LangChain/LangGraph sobre OpenRouter.

## Governança

Esta constituição é a fonte de princípios permanentes. Mudanças nela devem preservar a segurança, os testes e o fluxo de especificação; documente as specs de funcionalidades em `specs/`.
