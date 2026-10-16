# notas-api

Esqueleto de uma API para gerenciamento de notas, desenvolvido em Node.js e TypeScript. A estrutura inicial inclui validação de dados com Zod e comandos para desenvolvimento, CLI, testes e verificação de tipos.

> **Estado atual:** este repositório ainda é apenas uma base inicial. Não há servidor HTTP, endpoints ou funcionalidades de notas implementados.

## Tecnologias

- Node.js com módulos ES (`"type": "module"`)
- TypeScript, configurado em modo estrito e com saída prevista em `dist/`
- [Zod](https://zod.dev/) para validação de dados
- [tsx](https://tsx.is/) para executar arquivos TypeScript durante o desenvolvimento

## Pré-requisitos

- Node.js e npm instalados

## Instalação

Na raiz do projeto, instale as dependências a partir do arquivo de lock:

```bash
npm ci
```

## Executar em desenvolvimento

```bash
npm run dev
```

Esse comando executa `src/index.ts`. No estado atual, o arquivo é apenas um módulo vazio; portanto, o comando termina sem iniciar um servidor ou exibir saída.

## Outros comandos

| Comando | Descrição | Estado atual |
| --- | --- | --- |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos (`tsc --noEmit`). | Disponível |
| `npm test` | Executa os testes com o runner nativo do Node.js e `tsx`. | Ainda não há testes em `src/`. |
| `npm run cli` | Executa `src/cli.tsx` com `tsx`. | Ainda não está pronto: `src/cli.tsx` não foi criado. |

## Estrutura

```text
.
├── src/
│   └── index.ts
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```
