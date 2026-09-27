## Descrição geral do projeto

Este projeto é um exemplo prático de criação de um servidor MCP (Model Context Protocol) em TypeScript, com foco em ensinar como expor ferramentas, recursos e prompts para agentes de IA dentro do ambiente do VS Code/Copilot Chat. O nome do projeto no código é `@erickwendel/ciphersuite-mcp`, e a ideia central é oferecer uma funcionalidade útil para o agente: criptografar e descriptografar mensagens usando AES-256-CBC, com uma senha (passphrase) fornecida pelo usuário.

Em termos simples, o projeto funciona como um mini servidor de capacidades para IA. Em vez de a IA apenas responder textualmente, ela pode chamar ferramentas do MCP que executam ações reais no sistema, como:

- criptografar mensagens sensíveis;
- descriptografar mensagens usando a mesma chave;
- ler metadados do algoritmo e do formato da mensagem;
- usar prompts prontos para orientar o comportamento do agente.

Isso é exatamente o que o MCP permite: um agente não precisa “saber” a lógica do algoritmo internamente; ele apenas invoca a ferramenta adequada, recebe o resultado e continua a interação com o usuário.

Dessa forma, o projeto não é só um “script de criptografia”. Ele é um estudo completo de como construir um MCP funcional, registrar capacidades, integrar ao VS Code e testar tudo via cliente MCP e MCP Inspector.

## O que o projeto ensina

Este laboratório demonstra as partes principais de um servidor MCP:

1. Definição de tools
    - `encrypt_message`
    - `decrypt_message`

2. Definição de resources
    - `encryption://info`

3. Definição de prompts
    - `encrypt_message_prompt`
    - `decrypt_message_prompt`

4. Integração com stdio transport
    - o servidor roda no padrão de comunicação do MCP, via entrada/saída padrão (`stdio`);

5. Testes automatizados
    - usa o cliente MCP para chamar ferramentas e verificar comportamento real;

6. Inspeção do servidor
    - permite visualizar e testar o MCP em interface web via `@modelcontextprotocol/inspector`;

7. Configuração no editor
    - o arquivo `.vscode/mcp.json` registra o servidor para uso no VS Code.

Em outras palavras, o projeto funciona como um “template de MCP do zero”, mostrando todos os blocos necessários para um servidor que possa ser consumido por Copilot ou por qualquer cliente compatível.

## Visão geral da arquitetura

A arquitetura é simples, mas muito didática:

- `src/index.ts` inicializa o servidor e conecta via `StdioServerTransport`.
- `src/mcp.ts` registra todas as ferramentas, recursos e prompts.
- `src/service.ts` contém a lógica real de criptografia e descriptografia.
- `tests/helpers.ts` monta um cliente de teste que conecta ao servidor em stdio.
- `tests/mcp.test.ts` valida que o MCP funciona corretamente.
- `.vscode/mcp.json` conecta esse servidor ao VS Code.
- `package.json` define scripts de execução, dependências e configuração do projeto.
- `README.md` documenta a utilização do projeto.

## Estrutura de pastas e arquivos

### Pasta raiz

#### `.vscode/`

Responsabilidade:

- armazenar a configuração para integrar o MCP ao editor VS Code.

Arquivo: `.vscode/mcp.json`

- Esse arquivo informa ao editor que existe um servidor MCP chamado `ciphersuite-mcp`.
- O comando executado é:
    - `node --experimental-strip-types src/index.ts`
- Isso permite que o Copilot chat descubra o servidor e passe a usar as ferramentas disponíveis sem precisar de um processo externo manual.
- A partir da pasta do projeto, o editor pode carregar esse servidor e disponibilizar seus tools, resources e prompts para o agente.

#### `src/`

Responsabilidade: manter a lógica principal do servidor MCP.

##### `src/index.ts`

Responsabilidade:

- ponto de entrada do servidor.

O que faz:

- importa `server` de `./mcp.ts`;
- cria um `StdioServerTransport`;
- conecta o servidor ao transporte do MCP via `server.connect(transport)`;
- imprime uma mensagem de log no stderr para indicar que o MCP está ativo.

Esse arquivo é essencial porque o MCP, em geral, não roda como uma aplicação web comum: ele se comunica via entrada/saída padrão, então esse script funciona como uma interface de runtime para o protocolo.

##### `src/mcp.ts`

Responsabilidade:

- registrar todas as capacidades do servidor: tools, resources e prompts.

O que faz:

- cria um `McpServer` com nome e versão;
- registra a tool `encrypt_message`;
- registra a tool `decrypt_message`;
- registra o recurso `encryption://info`;
- registra o prompt `encrypt_message_prompt`;
- e, no README do projeto, aparece também o prompt `decrypt_message_prompt` (embora a leitura do código mostre claramente a parte de encrypt e o processo de descriptografia, a estrutura do MCP foi montada para permitir ambos os casos).

Dentro da tool `encrypt_message`:

- recebe `message` e `encryptionKey`;
- chama `encrypt(message, encryptionKey)`;
- devolve `structuredContent` com a mensagem cifrada;
- em caso de erro, retorna um objeto com `isError: true` e mensagem detalhada.

Dentro da tool `decrypt_message`:

- recebe `encryptedMessage` e `encryptionKey`;
- chama `decrypt(encryptedMessage, encryptionKey)`;
- valida e retorna o texto original.

O recurso `encryption://info` funciona como um “manual” do protocolo: ele explica o algoritmo, a derivação da chave, o formato de saída e regras de uso.

Os prompts servem para guiar o agente com instruções predefinidas para realizar ações concretas, como “criptografar uma mensagem a partir deste texto e chave”.

##### `src/service.ts`

Responsabilidade:

- implementar a lógica real de criptografia e descriptografia.

O que faz:

- Usa `node:crypto` para operar a biblioteca de criptografia da Node.js;
- deriva a chave usando `scryptSync(passphrase, SALT, 32)`;
- gera um IV aleatório (`randomBytes(16)`) para cada encriptação;
- usa `createCipheriv('aes-256-cbc', ...)` para cifrar mensagens;
- usa `createDecipheriv('aes-256-cbc', ...)` para decifrar.

A saída segue o formato:

```text
<iv-em-hex>:<ciphertext-em-hex>
```

Isso é importante porque, para descriptografar, o servidor precisa do IV original junto com o texto cifrado. O IV é gerado a cada operação, por isso a mesma mensagem com a mesma senha gera resultados diferentes a cada vez.

Esse arquivo é a camada de domínio da aplicação: ele encapsula a lógica de criptografia e deixa o MCP apenas como uma interface para expor essa capacidade ao agente.

#### `tests/`

Responsabilidade: validar o comportamento real do servidor MCP.

##### `tests/helpers.ts`

Responsabilidade:

- preparar um cliente de teste que conecta ao servidor em stdio.

O que faz:

- cria um `StdioClientTransport` com o comando:
    - `node --experimental-strip-types src/index.ts`
- instancia um `Client` do SDK do MCP;
- conecta ao servidor;
- retorna esse cliente para os testes.

Esse helper é essencial para simular o uso real do MCP sem precisar abrir manualmente o editor ou a interface do Copilot.

##### `tests/mcp.test.ts`

Responsabilidade:

- garantir que as funcionalidades do MCP funcionem corretamente.

O que testa:

- `encrypt_message` cria uma mensagem cifrada válida;
- `decrypt_message` retorna o texto original;
- `encryption://info` aparece na listagem de resources;
- `encrypt_message_prompt` retorna o texto do prompt esperado.

Cada teste usa o cliente MCP para chamar as ferramentas como um agente real faria. Isso é o mais importante: o projeto valida o comportamento do servidor como um cliente externo, não apenas funções isoladas.

#### `README.md`

Responsabilidade:

- documentação do projeto.

O que contém:

- descrição do que o MCP oferece;
- listagem de capabilities;
- instruções de instalação;
- configuração do VS Code;
- uso em Copilot Chat;
- comando para abrir o MCP Inspector;
- lista de scripts disponíveis;
- estrutura do projeto.

Esse arquivo serve como guia para qualquer pessoa que queira reutilizar o exemplo ou adaptá-lo para outro cenário.

#### `package.json`

Responsabilidade:

- configurar o projeto Node.js e definir scripts de execução.

Principais pontos:

- `type: "module"` para usar ES modules;
- dependências:
    - `@modelcontextprotocol/sdk` para o protocolo MCP;
    - `zod` para validação de schemas;
    - `@types/node` para suporte de tipos do Node.js;
- scripts:
    - `start`: inicia o servidor;
    - `dev`: inicia em modo watch;
    - `test`: executa os testes com `node --test`;
    - `mcp:inspect`: abre o MCP Inspector;
    - `test:dev`: modo watch com depuração.

Esse arquivo faz o projeto funcionar tanto em ambiente de desenvolvimento quanto em uso integrado com o editor e com ferramentas de inspeção.

#### `package-lock.json`

Responsabilidade:

- bloquear as versões exatas das dependências instaladas.

O que faz:

- garante reprodutibilidade do ambiente;
- evita que outra instalação em outra máquina use versões diferentes e quebre o MCP.

#### `node_modules/`

Responsabilidade:

- conter as bibliotecas instaladas do Node.js.

O que é:

- diretório gerado automaticamente pelo npm;
- na prática, ele guarda as dependências do projeto, como `@modelcontextprotocol/sdk` e `zod`.

Normalmente não é editado manualmente e não é parte da lógica da aplicação em si.

#### `refs.txt`

Responsabilidade:

- armazenar referências úteis para estudo e consulta.

O que faz:

- aponta para documentação relevante do MCP e do inspector.

No projeto, ele contém uma referência importante à documentação oficial do Model Context Protocol: `https://modelcontextprotocol.io/docs/tools/inspector`.

## Como o projeto funciona na prática

O fluxo de uso real é o seguinte:

1. O VS Code carrega o servidor informado em `.vscode/mcp.json`.
2. O Copilot Chat identifica as ferramentas e recursos expostos pelo MCP.
3. O usuário pede algo como:
    - “Criptografe a mensagem 'Olá' com a chave 'minha-chave'”
4. O agente chama a tool `encrypt_message` no MCP.
5. O servidor executa `encrypt()` em `src/service.ts`.
6. O retorno vem em `structuredContent`, com a mensagem cifrada.
7. Se for necessário, o agente também pode usar `decrypt_message` ou consultar o recurso `encryption://info`.

Esse processo mostra a principal ideia do MCP: entregar capacidades computacionais ao modelo, sem que ele precise implementar a lógica diretamente.

## Por que esse projeto é importante

Este exemplo é importante porque demonstra o “padrão essencial” de um servidor MCP:

- entrada e saída padronizadas;
- ferramentas que fazem ações reais;
- recursos que fornecem contexto;
- prompts reutilizáveis;
- client de teste para validar a funcionalidade;
- integração direta com o editor.

Ele serve como base para criar MCPs mais complexos no futuro, como servidores para:

- consulta de bancos de dados;
- integração com APIs externas;
- acesso a arquivos e documentos;
- gestão de tarefas de desenvolvimento;
- automações de CI/CD;
- agentes de negócio específicos.

## Conclusão

O projeto da pasta `05-Creating-Your-Own-MCP` é um excelente exemplo didático de construção de um MCP do zero. Ele combina teoria e prática em um único fluxo: define um servidor, expõe capacidades, conecta esse servidor ao VS Code, valida o comportamento em testes automatizados e mostra como o agente pode interagir com ele de forma natural.

A grande lição desse projeto é que um MCP não é apenas um “plugin de IA”. Ele é uma interface de capacidades: um conjunto de ferramentas e dados que um modelo pode invocar para executar tarefas reais, com contexto e segurança, em um ambiente controlado.

Esse mesmo padrão pode ser expandido para qualquer aplicação, desde um serviço simples de criptografia até sistemas completos de integração, automação e agentes especialistas.

---

## Resumo de responsabilidades por arquivo e pasta

- `.vscode/mcp.json` — integra o servidor ao VS Code
- `src/index.ts` — inicia o servidor MCP
- `src/mcp.ts` — registra tools, resources e prompts
- `src/service.ts` — implementa a criptografia AES-256-CBC
- `tests/helpers.ts` — monta cliente MCP para testes
- `tests/mcp.test.ts` — valida a funcionalidade do servidor
- `README.md` — documentação do projeto
- `package.json` — configura dependências e scripts
- `package-lock.json` — fixa versões do ambiente
- `node_modules/` — dependências instaladas
- `refs.txt` — referências úteis de documentação

Esse conjunto completo transforma o projeto em um laboratório funcional para aprender a criar, testar e integrar um MCP do zero.
