# `MemoryService`

**Localização:** `02-APIs_LLMs/04-Song-Highlights/src/services/memoryService.ts`

## Descrição

Factory assíncrona responsável por inicializar e configurar a camada de persistência de memória do agente, utilizando PostgreSQL como backend tanto para checkpointing de estado quanto para armazenamento de longo prazo (store).

## Assinatura

```typescript
async function createMemoryService(): Promise<MemoryService>;
```

## Retorno

```typescript
type MemoryService = {
  checkpointer: PostgresSaver;
  store: PostgresStore;
};
```

| Campo          | Tipo            | Descrição                                                                                                                                            |
| -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkpointer` | `PostgresSaver` | Responsável por persistir o estado (checkpoints) das execuções do grafo LangGraph, permitindo retomar/rastrear conversas e execuções entre chamadas. |
| `store`        | `PostgresStore` | Responsável pelo armazenamento de memória de longo prazo (ex.: dados semânticos compartilhados entre threads/sessões).                               |

## Comportamento

1. Lê a string de conexão do banco (`dbUri`) a partir do módulo de configuração central (`config.memory.dbUri`).
2. Instancia `PostgresStore` e `PostgresSaver` a partir da mesma conexão, via `fromConnString`.
3. Executa `setup()` em ambas as instâncias, garantindo que as tabelas/estruturas necessárias existam no banco (idempotente — seguro para rodar em toda inicialização).
4. Loga uma mensagem de confirmação (`✅ Memória configurada: PostgreSQL`) indicando que a inicialização foi concluída.
5. Retorna o objeto `MemoryService` com as duas instâncias prontas para uso.

## Dependências

- `@langchain/langgraph-checkpoint-postgres`
- `@langchain/langgraph-checkpoint-postgres/store`
- Configuração externa via `config.ts` (`config.memory.dbUri`)

## Pré-requisitos

- Instância PostgreSQL acessível através da URI configurada.
- Permissões de escrita no banco para criação de tabelas (executadas pelo `setup()`).

## Exemplo de uso

```typescript
const { checkpointer, store } = await createMemoryService();
```
