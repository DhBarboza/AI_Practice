# Agente autonomo

Aqui apendemos a criar agentes autonomos utilizando ferramentas como Github Copilot entre outros.

Um agente de código é uma entidade que planeja e executa tarefas completas enquanto uma skill/habilidade/ferramenta é a capacidade especifica que um agente utiliza para realizar uam ação individual.

# Projeto - 1

## O AGENTE DE CÓDIGO POR DENTRO (GITHUB COPILOT)

- Abrir pelo cabeçalho ao lado direito da barra de pesquisa

### Prompt:

Crie o esqueleto de um projeto Node.js chamado 'notas-api':

- git inicilizado
- package,json com "type": "module"
- dependencias: zod; dev: typescript, tsx, @types/node
- tsconfig.json com target ES2022, module e moduleResolution NodeNext, strict, esModuleInterop, skipLibCheck e forceConsistencCasingFilenames true, outDir dist, rootDir src, include ["src"]
- scripts npm dev: dev = "tsx scr/index.ts", cli = "tsx src/cle.tsx"; test = "node --import tsx --test/"src/\*_/_.test.ts"; typecheck = "tsc --noEmit"
- .gitignore cobrindo node_modules, .env, .env.\*, dist
  Não crie nenhum arquivo em src/ ainda. Ao final rode npm run typecheck para confirmar que está tudo válido
