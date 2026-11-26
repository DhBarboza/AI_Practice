# Ferramentas de IA para Design (UI/UX)

## 🎯 Objetivos de Engenharia

- **Rubber Ducking Estruturado:** Utilizar o Google AI Studio para "estressar" requisitos, identificando falhas na lógica de negócio e _edge cases_ (casos de borda) esquecidos.
- **Diagramação Automatizada:** Converter especificações funcionais em fluxos lógicos visuais utilizando **Mermaid.js**.
- **Data Discovery:** Criar **Structured Prompts (JSON)** para sanitizar e analisar grandes volumes de feedback de utilizadores.
- **Engenharia de Prompt:** Dominar o controlo de _Temperature_ e _Safety Settings_ para garantir saídas determinísticas.

---

## 🛠️ Stack Tecnológica

- **Engine:** Google Gemini (1.5 Pro / Flash) via [Google AI Studio](https://aistudio.google.com/)
- **Notação:** [Mermaid.js](https://mermaid.js.org/) para diagramas de fluxo.
- **Padrão de Prompt:** JSON Prompts (Foco em _System Instructions_ e _Few-Shot_).

---

# Projeto - 1

[Pasta do Projeto-1](/05-AI-Tools-for-UI-UX/01-Projeto)

## REFINAMENTO DE REQUISITOS E EDGE CASES

Primeiro passo e desenhar o passo a passo da jornada do usuário.
Aqui, a IA atua como uma camada de **Refinamento Técnico** e **Redução de Variabilidade** antes de qualquer implementação de código.

### 1º Step:

Configurar o System Instructions

[System Instructions](/05-AI-Tools-for-UI-UX/01-Projeto/system-instructions.md)

### 2º Step:

Executar o prompt [briefing](/05-AI-Tools-for-UI-UX/01-Projeto/Briefing.md) no /chat

### 3º Step:

`Output` Salvo em [Refinamento](/05-AI-Tools-for-UI-UX/01-Projeto/Refinamento.md)

## DESIGN DE FLUXOS LÓGICOS E DIAGRAMAÇÃO

Ferramenta: Mermaid é uma ferramenta que permite criar diagramas e fluxogramas utilizando código de texto, sem precisar desenhar manualmente. Com uma sintaxe simples, é possível representar processos, arquiteturas de software, integrações entre sistemas, fluxos de dados, bancos de dados e cronogramas. É muito utilizada na documentação técnica e pode ser integrada ao GitHub, Azure DevOps, VS Code, Notion e arquivos Markdown, facilitando a criação, manutenção e versionamento de diagramas junto ao código dos projetos.

[Mermaid](https://mermaid.js.org/)

### Step:

Executar o prompt estuturado
[Diagram Generator](/05-AI-Tools-for-UI-UX/01-Projeto/Prompts/2-Diagram-Generator.md)

Resultado em `05-AI-Tools-for-UI-UX/01-Projeto/Prompts/2-Diagram/output.md`

O diagrama é focado na jornada do usuário

## REFINAMENTO DE UX WRITING E COMUNICAÇÃO TÉCNICA

### 1º Step

Alterar o System instructions para em perfil de [UX Writer](/01-Projeto/System-Instructions/2-UX-Writer.md)

### 2º Step

Executar o prompt [UX Writer](/01-Projeto/Prompts/3-UX/Ux-Writer.md)

### 3º Step

Analisar o retorno em `.json` das messagens de trataivas de acordo com o fluxograma
