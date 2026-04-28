# AI Practice

Artificial Intelligence in Practice

### Código fonte e materiais do módulo

[AI Engineer](https://github.com/unipds-engenharia-de-ia-aplicada)

## Fundamentos de IA e LLMs

### Materiais:

- [Fundamentos](./Files/Fundamentos%20de%20IA%20e%20LLMs.pdf)
- [Leituras - Guias de IA](./Files/Guia%20de%20Leitura%20-%20Fundamentos%20de%20IA.pdf)
- [Techhable Machine](https://teachablemachine.withgoogle.com/)
- [Dogs data set images](https://www.kaggle.com/datasets/gpiosenka/70-dog-breedsimage-data-set)
- [TensorFlow.js](https://www.tensorflow.org/js?hl=pt-br)

### Exemplo 01:

- [Understend Neural Networks](./00-Undestand_Neural_Networks/index.js)

Criando sua primeira rede neural do zero para categorizar pessoas usando TensorFlow.Js (Tensores) e treinado o modelo, adicionando cammadas de redes neurais, retornando camadas categorizando todas as informações e validando a categoria de cada umd eles

### Projeto 01:

Sistema de recomendação de produtos (e-commerce)

Files:

- [Exemplo - Ecommerce Recomendation System](./01-Ex-Product_Recommendation_System/)

### Projeto 02:

Vencendo games com aprendizado de máquina, reconhecimento de padrões e objetos.
Transforma imagens em vetores. e transforma os dados do modelo gerado em dados de coordenadas para executar ação d eclick na tela.

Como funciona:
Ele tira print da tela, envia esse frame para o modelo, o modelo identifica as coordenadas de onde estão os objetos, e executa a ação dentro das coordenadas

Files:

- [Duck Hunt](./02-DuckHunt_JS/)

### Fundamentos de LLMs (large language model)

É um modelo treinado com uma grande quantidade de texto para gerar/interpretar linguagem humana

#### Como funcionam

Afinal, como LLm´s pensam:

1- Tokenização:

- Os Textos são quebrados em tokens
- O modelo não trabalha com textos, mas sim com modelos (modelagem) númericos
- Os textos, ou conjuntos de palavras representam tokens

2 - Embeddings

- Representam palavras como vetores,
- O significado de uma plavra para um modelo depende do contexto em que ela costuma aparecer;
- Se duas palavras aparecem em contextos parecidos seus embeddings constuman ter pontuações próximas;
- Uma palavra não possuí um significado isoladamente, ela é difinida por quem ela anda, e são relacionados semânticamente;
- Embeddings capturam similaridade e relacionamento;
- Eles funcionam prevendo plavras que estão faltando, e prever quais palavras costumam aparecer perto
- A posição desses vetores é moldada pelo contexto semântico: palavras que aparecem em contextos parecidos, ficam próximas;

Ex: Rei - Homen + Mulher = Rainha \*rei e rainha aparecem em contextos muito parecidos(coroa, trono, monarquia...)

- mas diferem na dimensão/"direção" associada a masculino vs feminino;

EMBEDDINCS: COLOCAM PALAVRAS/TOKENS NO ESPAÇO NUMÉRICO COM SEMÂNTICA

3 - Transformer processa o contexto

- Após converter os tokens em representações numéricas
- Calcula quais as partes mais importantes para prever o próximo token
- Atention: QUAIS PARTES DO CONTEXTO SÃO MAIS RELEVANTES. (É o cerebro da LLM)
- Analisa todos os tokens de uma vez (paralelo) permitir relações diretas entre Tokens distantes via attention

Text0 -> Tokens -> Vetores

- SELF-Atention: Cada token pode olhar para os tokens da mesma frase e decidir o que importa e dar peso diferentes para cada um deles
  Ex: "A Maria contou para a Ana que ela foi promovida." Quem for promovida a "Maria" ou a "Ana"?
  Ex: "O gato sentou no tapete porque estava cansado" Quem estava cansado, o gato ou o tapete?

    Isso que o attention faz, seta um peso maior para o protagonista da frase elevante o nível de acertividade. No caso acima o modelo aprendeu que estar cansado é um termo mais próximo de animais do que de tapetes

- MULTI-HEAD ATTENTION: VÁRIAS ATENÇÕES EM PARALELO
  concordância gramatical (sintaxe);
  referência ("ela" aponta para quem?);
  relação entre tópico e detalhes;
  padrões de código (abrir/fechar
  chaves, chamadas, imports).

**Resumo:**
EMBEDDINGS: COLOCAM PALAVRAS/TOKENS NO ESPAÇO NUMÉRICO COM SEMÂNTICA
TRANSFORMER: PEGA ESSES VETORES E CRIA VERSÕES CONTEXTUALIZADAS DELES

4 - Probabilidades do próximo token:
O CÉU É:
" azul" - probabilidade em 0,55
" nublado" - probabilidade em 0,18
" claro" - probabilidade em 0,10
" bonito" - probabilidade em 0,07

Parâmetros para gerar um token é o

- Temperature
- Topk:
- TopP:

Temperature: controla o grau de aleatoriedade na seleção de tokens.
Prompt: "O céu é"
Temperature baixa (exe: 0.2) — bem previsível

1. O céu é azul.
2. O céu é azul hoje.
3. O céu é azul e limpo,

Prompt: "O céu é"
Temperature média (ex.: 0.7) — equilibrada

1. O céu é azul com algumas nuvens.
2. O céu é claro nesta manhã.
3. O céu é nublado hoje.

Prompt: "O céu é"
Temperature alta (ex.: 1,2) — mais
variada/criativa

1. O céu é um véu cinza sobre a cidade.
2. O céu é uma aquarela mudando a cada minuto.
3. O céu é dramático, carregado de chuva e luz.

TopK: elenca a possibilidades mais viáveis
TopP: Nível de confiança
CÓDIGO TÉCNICO 0.2 - 0.4 Precisão
TAREFAS COMUNS 0.7 - 1.0 Balanceia criatividade
ESCREVENDO TEXTOS > 1.0 Palavras mais variadas

5 - Definição do próximo token (sampling)

- O CUSTO E O TEMPO CRESCEM COM A QUANTIDADE DE TOKENS
- quanto maior o prompt (mais tokens de entrada), mais trabalho para começar;
- quanto maior o prompt (mais tokens de entrada), mais trabalho para começar; quanto maior a resposta (mais tokens gerados), mais iterações e mais custo;
- quanto maior o prompt (mais tokens de entrada), mais trabalho para começar; quanto maior a resposta (mais tokens gerados), mais iterações e mais custo; e quanto maior a "janela de contexto", mais memória o sistema precisa manter durante a geração.
- CALCULAR PROBABILIDADES DO PRÓXIMO TOKEN DADO O CONTEXTO

### embutir modelos de IA nativamente nos navegadores

Usando modelo do Gemini no navegador

### Projeto 03, 04, 05

Executando um modelo de inteligência artificial, diretamente do navegador

File:

- [Web AI 01](./03-Web_AI-01/index.html)
- [Web AI 02](./04-Web_IA-02/index.html)
- [Web AI 03](./05-Web_IA-03_Multimodal/index.html)

### Engenharia de Prompts

- Para prompts mais exatos é necessário refinar o que você quer
- Detalhar o máximo possível para obter o resultado esperado com apenas um Prompt

Estrutura ideal para prompts

1. Contexto da Tarefa: **Usuário** Vocé vai atuar como um coach de carreira IA chamodo Joe criado pela empresa AdAstra Carreiras. Seu objetivo é dar conselhos de carreira aos usuários do site Ad-Astra que podem ficar confusos se você não agir no personagem.

2. Contexto de Tom: Você deve manter um tom amigável de atendimento ao cliente.

3. Dados de antecedentes, documentos e imagens: Aqui está o documento de orientação de carreiro que você deve consultar ao responder ao usuário: <guia>{DOCUMENT}</guia>

4. Descrição detalhada da terafa e regras: Aqui estão algumas regras importantes para a interação:

- Sempre fique no personagem, como Joe, um IA da AdAstrta.
- Se não souber responder, diga: "Desculpe, não entendi isso. - Pode repetir a pergunta?"
- Caso algo seja irrelevante, diga: "Desculpe,
  eu sou Joe e dou conselhos de carreira. Você tem conselhos de carreira
  com a quál eu possa ajudar?" Jene tem uma pergunta de carreira.

5. Exemplos: Aqui está um exemplo de como responder em uma interação padrão:
   <exemplo>
   Usuário: Oi Joe, como você foi criado e o que você faz?
   Joe: óló! Meu nome é Joe e fui criado pela AdAstra Carreiras para dar conselhos
   de carreira. Em que posso ajudar hoje? </exemplo>

6. Histórico da conversa: Aqui está o histórico da conversa entre o usuário e você. Pode estar vazia se náo houver histórico: <histórico> {HISTÓRICO} </histórico>

7. Descrição ou pedido imediato: Aqui está a pergunta do usuário: <pergunta> {PERGUNTA} </pergunta>

8. Pensar passo a passo / respirar fundo: Como você responde à pergunta do usuário?

9. Formatação de Saída: Coloque sua resposta em <resposta></resposta> tags.

10. Resposta pré-preenchida (se houver): Coloque sua resposta em <resposta></resposta> tags.
    <resposta> [RESPOSTA AQUI] </resposta>

O que mais faz a IA alucinar:

- Falta de Contexto: Pedir algo como: "Crie um plano de carreira para mim" sem dizer qual é a sua área de interesse, seus objetivos, suas habilidades, etc.
- Ambiguidade: Deixar o modelo chutar entre duas ou mais interpretações "Quero a descrição do projeto" e não informo qual projeto, qual público, qual objetivo, etc.

#### JSON Prompt

- A ideia é utilizar formatos de dados estruturados ao invés de JSON simples

1. Menos Ambiguidade (Menos Alucinação): Transformar texto em uma especificação
2. Mais previsível para integrar com código: força o modelo a retornar algo que seu código valida
3. Escalabilidade (Prompts varam "config"): Tratar o prompt como configuração versionável
4. JSON reduz:

- você reduz retrabalho ("responde de novo, agora no formato certo")
- reduz mensagens de correção ("não era isso, eu quis tal coisa")
- e evita respostas longas/erradas que queimam tokens,

##### Como estrutura um Prompt com JSON:

1. META: nome/versão do prompt, idioma, objetivo
2. ROLE: o "papel" (ex,: especialista, revisor, tutor)
3. CONTEXT: dados que o modelo precisa saber
4. TASK: o que exatamente fazer
5. CONSTRAINTS: limites e regras (não inventar, não extrapolar, etc.)
6. OUTPUT: formato de saída e validação

Exemplo:

```json
{
    "meta": {
        "name": "gerador-de-resumos-v2",
        "version": "2.0",
        "language": "pt-br"
    },
    "role": "Você é um editor de notícias especializado em resumir textos longos de forma clara e objetiva.",
    "context": "Você receberá um artigo de notícias e deverá extrair os pontos principais.",
    "task": "Resuma o artigo fornecido em no máximo 3 frases.",
    "constraints": [
        "Não inclua opiniões pessoais.",
        "Mantenha o tom neutro.",
        "Foque nos fatos mais importantes."
    ],
    "output": {
        "format": "json",
        "schema": {
            "summary": "string",
            "word_count": "integer"
        }
    }
}
```

Como isso pode ajudar a reduzir alucinações?

- não tem dados suficientes,
- ou tem liberdade demais,
- ou está tentando "agradar" e preencher lacunas,

Exemplos de keyword

- "do not invent": true
- "if_missing_data": "say_you_dont_know"
- "cite_source_fields": ["context,source"]
- "allowed_assumptions": [ ]

Marque incertezas:

```json
{
    "constraints": {
        "uncertainty_policy": "Se não tiver certeza diga 'não tenho dados suficientes' e peça o campo faltante"
    }
}
```

#### TOON (Token Oriented Object Notation)

Um formato de serialização para representar o mesmo formato mental do JSON, porém com menos pontuações
Token-efficient

O que o TOON pode ajudar:

- O JSON possuí um custo fixo de sintaxe e possui muita repetição de estrutura
- O TOON corta o escesso de simbolos aspas, símbolos e chaves

```json
[
    {
        "name": "Recriando o Player de Vídeo da Netflix",
        "url": "https://ew.academy/recriando-a-netflix?utm_source=ne04j-vector-demo"
    },
    {
        "name": "Criando seu Próprio App Zoom com WebRTC e WebSockets",
        "url": "https://ew.academy/zoom?utm_source=ne04j-vector-demo"
    },
    {
        "name": "Recriando o App Clubhouse",
        "url": "https://ew.academy/recriando-o-clubhouse?utm_source=ne04j-vector-demo"
    },
    {
        "name": "Reimaginando o Multi-Upload de Arquivos do Google Drive",
        "url": "https://ew.academy/recriando-o-google-drive?utm_source=ne04j-vector-demo"
    },
    {
        "name": "Reimaginando um Rádio Musical Online Usando Spotify como Exemplo",
        "url": "https://ew.academy/recriando-o-spotify?utm_source=ne04j-vector-demo"
    }
]
```

```toon
[10] {name,url}:
  Formação JavaScript Expert,"https://ew.academy/javascript—expert?utm_source=ne04j—vector—demo"
  Método Testes Automatizados em JavaScript, "https://ew.academy/metodo—tajs?
  utm_sou rce=ne04j —vecto r—demo"
  Mastering Node.js Streams,"https://ew.academy/nodejsstreams?utm_source=ne04j—vector—demo"
  Recriando o Player de Vídeo da Netflix, "https://ew.academy/recriando-a-netflix?
  utm_sou rce=ne04j -vecto r-demo"
  Criando seu Próprio App Zoom com WebRTC e WebSockets,"https://ew.academy/zoom?
  utm_sou rce=ne04j -vecto r-demo"
  Recriando o App Clubhouse, "https://ew.academy/recriando—club—house?
  utm_sou rce=ne04j —vecto r—demo"
  Reimaginando o Multi—Upload de Arquivos do Google Drive, "https://ew.academy/
  rec riando—google-d rive?utm_sou rce=ne04j —vecto r-demo"
  Reimaginando um Rádio Musical Online Usando Spotify como Exemplo, "https://ew.academy/
  rce=ne04j -vector-demo"
  Machine Learning em Navegadores, "https://ew.academy/machine-learning?
  utm_sou rce=ne04j —vecto r-demo"
  Reimaginando o Processamento de Vídeos do Maior Site do Mundo, "https://ew.academy/
  reimaginando-o-processamento-de-videos-do-maio r-s -vecto r-demo"
```

Tokenizer Open IA, comparar custo
[tokenizer](https://platform.openai.com/tokenizer)

##### Quando JSON pode ser melhor? Dados tabulares

```json
{
    "cols": ["id", "name", "role"],
    "rows": [
        [1, "Alice", "admin"],
        [2, "Bob", "user"]
    ]
}
```

### Aonde Vibe-Coding falha:

O que faz um Software quebrar:

- Lógica
- Segurança
- Estado
- Permissionamento
- Dados

IA Acelera muito, mais o output deve ser tratado com seriedade

Atalhos perigosos:

- autenticação falha
- validação inexistente
- permissões abertas

Padrões Ruins:

- auto acoplamento
- duplicação de código
- gambiarra pra funcionar

#### Em um editor, você encaixa isso em um processo com:

- Code review
- Linters
- Testes automátizados
- CI/CD
- Auditoria de Dependências
- Observabilidade
- Logs DC

Prompt to Apps tende a esconde o essencial, limits e contratos, o que salva seu projeto:

- Contrato de API
- Regras de Autorização
- Validação consistente
- Limites de acesso ao Banco
- Migrações ou versões de Schema
- Testes Automátizados

Defina regras e restrições como:

- Nunca acessar banco direto do frontend
- Toda rota exige autorização customizada
- Toda entrada do usuário é validada (schema)
- Sem secrets ou acesso direto ao banco de dados no client
- Sem concatenar SQL
- Sem permissões amplas por padrão

CONFIAR E CONFERIR, SEMPRE:

- Revisão
- Testes
- Políticas
- Escopo
- Segurança
- Observabilidade

### Agentes de IA

UM AGENTE DE IA RESOLVE ISSO CRIANDO
UM CICLO CONTROLADO:

- Objetivo (o que o usuário quer)
- Plano (como chegar lá)
- Ações (rodar ferramentas, buscar mais contexto)
- Observações (ver resultados: logs/testes/erros)
- Iteração (corrigir e repetir)
- Entrega final (com evidências e relatório final)

1. Planejamento: Quebrar em etapas pequenas
   O QUE UM BOM ACENTE FAZ:
    - cria um plano com passos aplicáveis
    - define o que é "pronto" (critérios de aceite)
    - escolhe a ordem de execução
2. Seleção de ferramentas: "Qual Action resolve isso"
   Exemplo:
   "PRECISO SABER A ESTRUTURA DO REPOSITÓRIO" <-> FERRAMENTA DE BUSCA DE ARQUIVOS NO DIRETÓRIO LOCAL
   "PRECISO ENTENDER API ATUALIZADA" <-> FERRAMENTA DE DOCUMENTAÇÃO
   "PRECISO GARANTIR PADRÃO" <-> FERRAMENTA PARA RODAR SCRIPTS DE LINTER E FORMATAÇÃO
3. Observação e Iteração: "O feedback a verdade"

- Planner: só planeja, não edita nada
- Implementer: edita código e toda testes
- Reviewer: lê diff e aponta riscos
- ZQA: valida contrato e fluxo ponta a ponta
- Docs Agent: escreve READM E/changelog
- Ops Agent: consulta observabilidade e sugere mitigação

### Spec Driven Development

O que uma spec boa tem (pra dev)

- Contexto: onde isso roda, stack, constraints
- Requisitos: o que deve existir
- Não-requisitos: o que não faz parte (evita feature creep)
- Critérios de aceite: como validar que terminou
- Contrato: shape de API, formatos de resposta
- Plano de teste: como verificar

### Fluxo simples de utilização de IA:

1. Primeiro a especificação:

- define contrato da API
- define interface de usuário mínima
- define validação

2. Agentes com papéis:

- Backend implementa API
- Frontend implementa Ul
- QA valida e gera checklist

3. Integração:

- rodar testes e validar

### MCPS (Model Context Protocol)

- É um protocolo para conectar LLMs a outras ferramentas (arquivos, bancos, API´s, etc)
- Reconhecido como um USB-C para aplicaçãoes de IA

Tools: Ações que o modelo pode desparar

Resources: Dados para contexto

```json
{
    "contents": [
        {
            "uri": "erickwendel://about",
            "mimeType": "application/json",
            "text": "{\"name\": \"Erick Wendel\", \"bio\": \"Developer Advocate, Microsoft MVP, and content creator focused... \"}"
        }
    ]
}
```

Lista de Prompts: Templates de Prompts para ajudar o client final a retornar resultado

Obs: A LLM não vê o servidor MCP, ele enxerga uma lisat de ferramentas

Exemplos:

1. MCP "filesystem":
   tool: read_file(path)
   tool: list_dir(path)

2. MCP "github":
   tool: diff()
   tool: status()

3. MCP "database":
   tools: select_query(sql)

#### Como as LLMs defidem qual MCP chamar:

- Na prática eles percorem pelo parâmetro mais fiel ao que é pedido via prompt
- Pela descrição da "tool"
- formato dos parâmetros

### Playwright Tests

File:

- [Playwright Testes](./06-Playwright_Tests/)
- MCP para automatizar a criação de testes em códigos JavaScript

### Playwright Navegação

File:

- [Playwright Navigate](./07-Playwright_NavegacaoWeb/)
- MCP para automatizar a navegação entre páginas e preenchimento de formulários e outros afins

### Ferramenta para baixar MCPs OpenSource e testar

- Tome

### Context7

[Site](https://context7.com/)

- Um biblioteca MCP utilizada para consultar documentações atualizadas e gerar aplicações do zero com base na documentação

Sem o Context7:

- cola blocos enormes de docs no prompt
- manda links e pede "use isso"
- reexplica o setup inteiro a cada tentativa

Com o Context7:

- Manda a intenção ("crie um CRUD em Node,js, integre o Prisma + Postgres e use context7")
- o agent chama Context7, traz trechos curtos e precisos
- e só então gera o código com base na doc atual

Resultado:

- Menos token no Prompt
- Menos tentativas e correções

### Usar Telemetria como fonte de dados:

File:

- [Grafana MCP](./exemplo-09-grafana-mcp/)

- OpenTelemetry
- Observabilidade

### Como montar seu próprio agente para executar localmente:

- CPU(s)
- Energia
- Refrigeração
- Manutenção
- Observabilidade
- Escalonamento
- Engenharia de distribuição

#### MODELOS FECHADOS (API):

Por que ainda faz sentido, especialmente em escala:

- Velocidade
- Custo
- Contexto
- Segurança
- Qualidade
- Atualização
- Treinamento
- Disponibilidade

### Ollama

Ferramenta para executar modelos de IA localmente

Site:
[Ollama](https://ollama.com/)

Exemplos de contextos de uso:

- Provas de conceito
- Automações locais
- Scripts de produtividade
- Protótipos de criação de agentes de IA
- Estudos de modelos e quantização

> Não recomendado para produção

#### vLLM

Ferramenta para operacionalizar a possibilidade de múltiplos clientes
para concorrência, baixa latência e velocidade na resposta

- Context Windows: Quantos tokens cabem na memória do modelo (Prompt + Histórico + Ferramentas + Resposta Esperada )
- Prompt Tokens: Tokens consumidos pela entrada (input)
- Completion Tokens: Tokens gerados na saída (output)

- Mixture of Experts (MoE): Vários modelos trabalhando juntos
- Quantização: Reduzir o tamanho do modelo trocando a forma como os pesos são representados. Reduzir a precisão numérica usada para armazenar (e às vezes calcular) os pesos
