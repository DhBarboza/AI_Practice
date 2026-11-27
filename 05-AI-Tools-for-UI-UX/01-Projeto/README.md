# AI Discovery & Refinement Pipeline

Pipeline de Engenharia de Prompt aplicado às fases de **Product Discovery** e **Refinamento Técnico de Software / UI-UX**, integrando modelos de linguagem de larga escala (**Google Gemini via Google AI Studio**) para transformar insumos de pesquisa não estruturados em especificações técnicas, diagramas declarativos e contratos de dados prontos para handoff de engenharia.

---

## 📌 Visão Geral da Arquitetura

O projeto estrutura um ciclo de vida reprodutível baseado em prompts encadeados (_prompt chaining_) e restrições de formato (JSON Schema, Mermaid.js), garantindo conformidade com privacidade de dados e determinismo nos entregáveis técnicos.

```
[Insumos Brutos de Pesquisa / UX]
                │
                ▼
   [01. Sanitização / LGPD] (Remoção de PII)
                │
                ▼
   [02. Discovery & Síntese] (Mapeamento de Dores / Oportunidades)
                │
                ▼
   [03. Refinamento de Escopo] (Regras de Negócio & Edge Cases)
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
[04. User Stories (JSON)]      [05. User Flow (Mermaid.js)]
```

---

## 🔄 Fluxo do Pipeline

O pipeline consome os artefatos contidos no diretório `/prompts`, seguindo uma execução sequencial:

1. **Higienização de Dados (`Data Sanitization / LGPD`):**
   Processamento inicial dos registros de entrevistas de usuários e dados de produto. O prompt aplica regras determinísticas para anonimização e mascaramento de PII (_Personally Identifiable Information_), prevenindo vazamento de dados sensíveis antes de qualquer submissão aos modelos.

2. **Síntese de Discovery (`Product Discovery Synthesis`):**
   Consumo dos dados sanitizados para identificação de dores centrais, mapeamento de personas, levantamento de _jobs-to-be-done_ (JTBD) e matrizes de oportunidade, gerando documentação técnica padronizada em Markdown.

3. **Refinamento Técnico e Escopo (`Technical Refinement`):**
   Decomposição dos problemas identificados em regras de negócio, restrições arquiteturais, dependências de sistema e critérios de aceite no formato BDD (_Behavior-Driven Development_ / Gherkin).

4. **Geração Estruturada de Backlog (`User Stories JSON`):**
   Extração do backlog refinado em formato `JSON` estruturado com tipagem explícita (título, descrição, prioridade, critérios de aceite, complexidade estimada), viabilizando consumo programático e integração contínua com ferramentas de issue tracking (Jira, GitHub Projects, Linear).

5. **Mapeamento Declarativo de Telas e Navegação (`Mermaid.js Workflow`):**
   Conversão dos fluxos de navegação e transições de tela em sintaxe de diagramação declarativa Mermaid.js (grafos direcionados e diagramas de estado), facilitando o alinhamento visual com squads de frontend e product design.

---

## 🛠️ Stack Tecnológico

| Componente           | Tecnologia                       | Finalidade Técnica                                                                    |
| :------------------- | :------------------------------- | :------------------------------------------------------------------------------------ |
| **LLM Core**         | Google Gemini (Google AI Studio) | Motor de inferência, síntese de contexto amplo e geração contextual                   |
| **Técnicas de IA**   | Prompt Engineering               | Few-shot prompting, chain-of-thought, role definition e output constraint enforcement |
| **Privacidade**      | Data Sanitization (LGPD/GDPR)    | Mascaramento de dados e conformidade com requisitos regulatórios                      |
| **Formato de Saída** | JSON / JSON Schema               | Saídas estruturadas e tipadas para handoff e parsing automatizado                     |
| **Documentação**     | Markdown                         | Estruturação de relatórios técnicos de descoberta e especificações                    |
| **Diagramação**      | Mermaid.js                       | Modelagem visual declarativa de fluxos e arquitetura de navegação                     |

---

## 🚀 Como Utilizar

### 1. Clonagem do Repositório

```bash
git clone https://github.com/DhBarboza/AI_Practice.git
cd AI_Practice/05-AI-Tools-for-UI-UX/01-Projeto
```

### 2. Estrutura de Diretórios

```text
01-Projeto/
├── prompts/                 # Templates padronizados de prompts para execução no LLM
│   ├── 01-sanitizacao-lgpd.md
│   ├── 02-discovery-sintese.md
│   ├── 03-refinamento-tecnico.md
│   ├── 04-user-stories-json.md
│   └── 05-fluxograma-mermaid.md
├── inputs/                  # Dados brutos de teste e entrevistas (exemplos)
└── outputs/                 # Artefatos gerados (JSON, Markdown, .mmd)
```

### 3. Execução no Motor LLM

1. Acesse o **[Google AI Studio](https://aistudio.google.com/)** (ou utilize sua instância da API do Google Gemini / motor LLM de preferência).
2. Configure os parâmetros de inferência recomendados:
    - **Model:** `Gemini 1.5 Pro` ou versão equivalente com suporte a janelas longas de contexto.
    - **Temperature:** `0.2` a `0.4` (valores baixos para garantir consistência nas estruturas JSON e conformidade com os prompts de higienização).
3. Abra sequencialmente os arquivos localizados no diretório `/prompts`:
    - Copie as instruções do prompt como **System Instructions** ou como prompt inicial.
    - Forneça o contexto bruto de entrada quando solicitado pela instrução.
4. Colete os artefatos gerados:
    - Valide a saída JSON com linter ou schema validator antes de importar no sistema de backlog.
    - Renderize o código Mermaid.js em visualizadores compatíveis (Markdown previewers, Figma plugins ou mermaid.live).
