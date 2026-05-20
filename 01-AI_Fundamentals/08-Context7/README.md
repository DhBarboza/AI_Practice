# Demo Next.js + Better Auth + GitHub + SQLite

## Pré-requisitos

- Node.js 18+
- npm

## Variáveis de ambiente

Crie um arquivo `.env` com:

```
GITHUB_CLIENT_ID=seu_client_id
GITHUB_CLIENT_SECRET=seu_client_secret
```

## Instalação

```sh
npm install
npx tailwindcss init -p
```

## Migração do banco

```sh
npx @better-auth/cli migrate
```

## Rodando localmente

```sh
npm run dev
```

Acesse: http://localhost:3000

## Fluxo

- Clique em "Entrar com GitHub" para autenticar.
- Após login, verá seu email/nome e botão "Sair".
- Sessões e usuários são salvos em `better-auth.sqlite`.
