const aiContext = {
    session: null,
    abortController: null,
    isGenerating: false,
};

const elements = {
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temp-value'),
    topKValue: document.getElementById('topk-value'),
    topK: document.getElementById('topK'),
    form: document.getElementById('question-form'),
    questionInput: document.getElementById('question'),
    output: document.getElementById('output'),
    button: document.getElementById('ask-button'),
    year: document.getElementById('year'),
}

async function setupEventListeners() {

    // Update display values for range inputs
    elements.temperature.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });

    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });

    elements.form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (aiContext.isGenerating) {
            toggleSendOrStopButton(false)
            return;
        }

        onSubmitQuestion();
    });
}

async function onSubmitQuestion() {
    const questionInput = elements.questionInput;
    const output = elements.output;
    const question = questionInput.value;

    if (!question.trim()) {
        return;
    }

    // Get parameters from form
    const temperature = parseFloat(elements.temperature.value);
    const topK = parseInt(elements.topK.value);
    console.log('Using parameters:', { temperature, topK });

    // Change button to stop mode
    toggleSendOrStopButton(true)

    output.textContent = 'Processing your question...';
    const aiResponseChunks = await askAI(question, temperature, topK);
    output.textContent = '';

    for await (const chunk of aiResponseChunks) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        console.log('Received chunk:', chunk);
        output.textContent += chunk;
    }

   toggleSendOrStopButton(false);
}

function toggleSendOrStopButton(isGenerating) {
    if (isGenerating) {
        // Switch to stop mode
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Parar';
        elements.button.classList.add('stop-button');
    } else {
        // Switch to send mode
        aiContext.abortController?.abort();
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Enviar';
        elements.button.classList.remove('stop-button');
    }
}

async function* askAI(question, temperature, topK) {
    aiContext.abortController?.abort();
    aiContext.abortController = new AbortController();

    // Destroy previous session and create new one with updated parameters
    if (aiContext.session) {
        aiContext.session.destroy();
    }

    const session = await LanguageModel.create({
        expectedInputLanguages: ["pt"],
        temperature: temperature,
        topK: topK,
        initialPrompts: [
            {
                role: 'system', content: `
                Você é um assistente de IA que responde de forma clara e objetiva.
                Responda sempre em formato de texto ao invés de markdown`

            },
        ],
    });

    const responseStream = await session.promptStreaming(
        [
            {
                role: 'user',
                content: question,
            },
        ],
        {
            signal: aiContext.abortController.signal,
        }
    );

    for await (const chunk of responseStream) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        yield chunk;
    }
}

// Verifica requisitos SEM tentar baixar o modelo
async function checkRequirements() {
    const errors = [];
    const returnResults = () => errors.length ? errors : null;

    const isChrome = !!window.chrome;
    if (!isChrome)
        errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary (versão recente).");

    if (!('LanguageModel' in self)) {
        errors.push("⚠️ As APIs nativas de IA não estão ativas.");
        errors.push("Ative a seguinte flag em chrome://flags/:");
        errors.push("- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)");
        errors.push("Depois reinicie o Chrome e tente novamente.");
        return returnResults();
    }

    const availability = await LanguageModel.availability({ languages: ["pt"] });
    console.log('Language Model Availability:', availability);

    if (availability === 'available') {
        return returnResults();
    }

    if (availability === 'unavailable') {
        errors.push(`⚠️ O seu dispositivo não suporta modelos de linguagem nativos de IA.`);
    }

    if (availability === 'downloading') {
        errors.push(`⚠️ O modelo de linguagem de IA já está sendo baixado. Por favor, aguarde alguns minutos e recarregue a página.`);
    }

    // Caso especial: precisa de gesto do usuário para baixar
    if (availability === 'downloadable') {
        errors.push(`__DOWNLOADABLE__`);
    }

    return returnResults();
}

// Faz o download do modelo — deve ser chamada APENAS a partir de um evento de clique
async function downloadModel() {
    elements.output.innerHTML = '⏳ Iniciando download do modelo...';

    const session = await LanguageModel.create({
        expectedInputLanguages: ["pt"],
        monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
                const percent = ((e.loaded / e.total) * 100).toFixed(0);
                console.log(`Downloaded ${percent}%`);
                elements.output.innerHTML = `⏳ Baixando modelo: ${percent}%`;
            });
        }
    });

    await session.prompt('Olá');
    session.destroy();

    // Recarrega a página para reinicializar com o modelo disponível
    window.location.reload();
}

(async function main() {
    elements.year.textContent = new Date().getFullYear();

    const reqErrors = await checkRequirements();

    if (reqErrors) {
        // Caso especial: modelo disponível para download, mas precisa de gesto do usuário
        if (reqErrors.includes('__DOWNLOADABLE__')) {
            elements.output.innerHTML = `
                ⚠️ O modelo de IA precisa ser baixado antes de ser usado.<br/><br/>
                <button id="download-btn">⬇️ Baixar modelo agora</button>
            `;
            elements.button.disabled = true;

            document.getElementById('download-btn').addEventListener('click', async () => {
                document.getElementById('download-btn').disabled = true;
                try {
                    await downloadModel();
                } catch (error) {
                    console.error('Error downloading model:', error);
                    elements.output.innerHTML = `❌ Erro ao baixar o modelo: ${error.message}`;
                    document.getElementById('download-btn').disabled = false;
                }
            });
            return;
        }

        // Outros erros (Chrome não suportado, flags desativadas, etc.)
        elements.output.innerHTML = reqErrors.join('<br/>');
        elements.button.disabled = true;
        return;
    }

    const params = await LanguageModel.params();
    console.log('Language Model Params:', params);

    elements.topK.max = params.maxTopK;
    elements.topK.min = 1;
    elements.topK.value = params.defaultTopK;
    elements.topKValue.textContent = params.defaultTopK;

    elements.temperatureValue.textContent = params.defaultTemperature;
    elements.temperature.max = params.maxTemperature;
    elements.temperature.min = 0;
    elements.temperature.value = params.defaultTemperature;

    return setupEventListeners();
})();