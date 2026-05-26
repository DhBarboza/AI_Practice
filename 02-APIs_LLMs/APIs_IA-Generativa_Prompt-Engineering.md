## API´s, IA Generativa e Prompt Engineering

### Wrappers:

Softwares que fazem interface e facilitam a comunicação entre sistemas já existentes. Ex: Automatizar a criação de relatório no Excel com apenas um clique

Uma parte muito sensível em softwares criados por IA são as camadas de segurança:
• Garantir que usuários malicíoso não consigam injetar prompts
• Durrubar o Software
• Esgotar créditos
• Obter informações sensíveis (LGPD)

Aí a Engenharia de Software Tradicional resolve:

1. Arquitetura de sistemas
2. Escalabilidade
3. Monitoramento e ingestão de dados

esses itens não devem ser ignorados.
Além das práticas de Redução erros, alucinação, custo continuo também é fundamental

Os maiores desafios são a criação de um prompt matador que traga boas respostas para o usuário e evite ao máximo os erros de redundancia, loops e repetição que sejam ECONOMICAMENTE VIÁVEIS.

Se sua empresa depende do serviço de uma Big Tech, sua empresa pode quebrar de uma para outra devido as mudanças de preços, ou interrupção do serviço.

estratégia é sempre otimizar o processo

### Applied AI Engineer

#### O estado atual do mercado, o que está chegando e quanto já pagam:

Internacional: $196.000,00 a $250.000,00

#### O que o mercado está exigindo de um programador nessa área:

está sendo muito relevante, não basta apenas chamar API´s em modelo, o mercado mudou e exige que construa workflows, integrações e confiabilidade

#### Por que network presencial em eventos de startups virou "atalho" pra encontrar gente com ideia sem implementação:

Onde se encontra as melhores oportunidades de Founding Engineer

#### O que é ser **Founding Engineer** e como funciona equity:

Founding Engineer (ou engenheiro fundador) é o termo usado para o primeiro(s) engenheiro(s) a entrar em uma startup em estágio inicial. Diferente de contratar um desenvolvedor sênior para uma posição tradicional, o founding engineer se torna sócio da empresa e tem responsabilidades muito mais amplas.

### Pojeto 01 - API Fastify

Criação de uma API utilizando Fastify

### LangChain

O **LangChain** é um framework de código aberto (open-source) projetado para facilitar a criação de aplicações que utilizam Modelos de Linguagem de Grande Porte (LLMs). Ele atua como uma camada de orquestração, permitindo que desenvolvedores conectem LLMs a fontes externas de dados, APIs e outros sistemas de computação.

Os principais pilares e conceitos do LangChain incluem:

1. **Chains (Cadeias):** Permitem sequenciar múltiplas chamadas ou componentes. Por exemplo, pegar a resposta de uma LLM e usá-la como entrada para outra tarefa, criando fluxos de trabalho complexos.
2. **Model I/O (Entrada/Saída de Modelos):** Padroniza a interface para interagir com diferentes provedores de LLM (OpenAI, Google Gemini, Anthropic, Ollama, etc.), facilitando a alternância entre modelos.
3. **Retrieval (RAG - Geração Aumentada de Recuperação):** Facilita a integração com carregadores de documentos, processadores de texto e bancos de dados vetoriais (_Vector Stores_), permitindo que a IA consulte informações privadas ou bases de dados externas antes de formular uma resposta.
4. **Memory (Memória):** Permite persistir o contexto e o histórico de conversas passadas em aplicações de chat e assistentes virtuais.
5. **Agents (Agentes):** Capacitam a LLM a tomar decisões dinâmicas sobre quais ações executar e quais ferramentas (como buscas na web, execução de código, ou consultas a bancos de dados) utilizar para resolver problemas complexos.
