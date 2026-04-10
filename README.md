# AI_Practice

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

### Projeto 03

Executando um modelo de inteligência artificial, diretamente do navegador

File:

- [Web AI 01](./03-Web_AI-01/index.html)
