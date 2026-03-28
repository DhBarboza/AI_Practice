import tf from "@tensorflow/tfjs-node";

async function trainModel(inputXs, outputYs) {
    const model = tf.sequential()

    // Primeira camada de rede:
    // Camada de entrada:
    // Entrada de 7 posições (idade normalizada + 3 cores + 3 localizações)

    // Adicionar a primeira camada
    // 80 neuronios
    // Quanto mais neuronios, mais complexidade a rede pode aprender, e mais processamento ela vai usar

    // O processo de "ativação" (ReLU) usa um filtro deixando somente os dados relevantes
    // Realização de cálculos e categorização do dado que a rede realiza
    model.add(tf.layers.dense({inputShape: [7], units: 80, activation: "relu" }))

    // Segunda camada
    // Camada de saída:
    // 3 neurônios, devido eu ter três classificações (premium, medium, basic)
    // Activation: SoftMax que normaliza a saída em probabilidades
    // Oque ele vai fazer: Vai aprender com o histórico de erros e acertos 
    model.add(tf.layers.dense({units: 3, activation: "softmax"}))

    // Preparar o modelo e compila-lo. Dizer qual processo a rede vai utilizar para aprender em cima desses padrões
    // Compilar o modelo
    // Optimizer Adam (Adptive Moment Estimation)
    // Treinador pessoal moderno para redes neurais: Ajusta os pesos de forma eficiente e inteligente
    // Loos: Ele compara o modelo que acha (os scores de cada categoria) com a resposta certa

    // A categoria Premium vai ser sempre [1, 0, 0]

    // Quanto mais distante da previsão do modelo da resposta correta
    // maior o erro (loss)

    // Exemplo clássico: Classificação de imagens, recomendação, categorização de usuários
    // Qualquer coisa em que a resposta certa é "apenas uma entre várias possíveis"
    model.compile({optimizer: "adam", loss: "categoricalCrossentropy", metrics: ["accuracy"]})

    // Etapa de Treinamento.
    // Usar os dados de histórico gerados

    // verbose: desabilita o log interno (e usa só callback)
    // epochs: quantidade de vezes que vai executar no dataset
    // shuffle: embaralha os dados, para evitar redundância é padrões sememlhantes, melhorando o trabalho da rede
    await model.fit(
        inputXs,
        outputYs,
        {
            verbose: 0,
            epochs: 100,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, log) => console.log(
                    `Epoch: ${epoch}: loss=${log.loss}`
                )
            }
        }
    )

    return model
}

async function predict(model, person) {
    // Transformar o Array para tensor:
    const tfInput = tf.tensor2d(person)

    // Fazer a predição (output será um vetor de 3 probabilidades)
    const pred = model.predict(tfInput)
    const predArray = await pred.array()
    return predArray[0].map((prob, index)=> ({prob, index}))
}
// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0], // Erick
    [0, 0, 1, 0, 0, 1, 0], // Ana
    [1, 0, 0, 1, 0, 0, 1], // Carlos
];

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
    [1, 0, 0], // premium - Erick
    [0, 1, 0], // medium - Ana
    [0, 0, 1], // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado);
const outputYs = tf.tensor2d(tensorLabels);

// Quanto mais dados, melhor!
// Assim o algoritmo consegue entender melhor os padrões complexos dos dados
const model = await trainModel(inputXs, outputYs)

const person = {nome: "zé", idade: 28, cor: "verde", localizacao: "Curitiba"}
// Normalizando a idade da nova pessoa usando o mesmo padrão de treino
// Exemplo: idade_min = 25, idade_max = 40, então (28 -25) / (40 - 25) = 0.2

const personTensorNormalized = [
    [
        0.2, // idade normalizada 
        0,  // cor azul
        0,  // cor vermelho
        1,  // cor verde
        0,  // localização São Paulo
        0,  // localização Rio
        1   // localização Curitiba
    ]
]

const predictions = await predict(model, personTensorNormalized)
const results = predictions.sort((a,b) => b.prob - a.prob).map(p=> `${labelsNomes[p.index]} (${(p.prob * 100).toFixed(2)}%)`).join("\n")

console.log(results)