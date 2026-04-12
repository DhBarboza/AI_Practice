export class AIService {
    constructor() {
        this.session = null;
        this.abortController = null;
        this.supportsMultimodal = false;
    }

    async checkRequirements() {
        const errors = [];

        const isChrome = !!window.chrome;
        if (!isChrome) {
            errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary (versão recente).");
        }

        if (!('LanguageModel' in self)) {
            errors.push("⚠️ As APIs nativas de IA não estão ativas.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)");
            errors.push("Depois reinicie o Chrome e tente novamente.");
            return errors;
        }

        // Check Translator availability
        if ('Translator' in self) {
            const translatorAvailability = await Translator.availability({
                sourceLanguage: 'en',
                targetLanguage: 'pt'
            });
            console.log('Translator Availability:', translatorAvailability);

            if (translatorAvailability === 'no') {
                errors.push("⚠️ Tradução de inglês para português não está disponível.");
            }
        } else {
            errors.push("⚠️ A API de Tradução não está ativa.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Translation API (chrome://flags/#translation-api)");
        }

        // Check Language Detection API
        if (!('LanguageDetector' in self)) {
            errors.push("⚠️ A API de Detecção de Idioma não está ativa.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Language Detection API (chrome://flags/#language-detector-api)");
        }

        if (errors.length > 0) {
            return errors;
        }

        const availability = await LanguageModel.availability({ languages: ["en"] });
        console.log('Language Model Availability:', availability);

        if (availability === 'available') {
            // Verifica se o modelo suporta multimodal (imagem e áudio)
            await this._checkMultimodalSupport();
            return null;
        }

        if (availability === 'unavailable') {
            errors.push(`⚠️ O seu dispositivo não suporta modelos de linguagem nativos de IA.`);
        }

        if (availability === 'downloading') {
            errors.push(`⚠️ O modelo de linguagem de IA está sendo baixado. Aguarde alguns minutos e recarregue a página.`);
        }

        if (availability === 'downloadable') {
            errors.push(`__DOWNLOADABLE__`);
        }

        return errors.length > 0 ? errors : null;
    }

    async _checkMultimodalSupport() {
        try {
            const availability = await LanguageModel.availability({
                expectedInputs: [
                    { type: "image" },
                    { type: "audio" },
                ]
            });
            this.supportsMultimodal = availability === 'available';
            console.log('Multimodal support:', this.supportsMultimodal, '(availability:', availability, ')');
        } catch (e) {
            this.supportsMultimodal = false;
            console.warn('Multimodal not supported on this device:', e.message);
        }
    }

    // Deve ser chamado APENAS a partir de um evento de clique do usuário
    async downloadModel(onProgress) {
        const session = await LanguageModel.create({
            expectedInputLanguages: ["en"],
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    const percent = ((e.loaded / e.total) * 100).toFixed(0);
                    console.log(`Downloaded ${percent}%`);
                    if (onProgress) onProgress(percent);
                });
            }
        });
        await session.prompt('Hello');
        session.destroy();

        const newAvailability = await LanguageModel.availability({ languages: ["en"] });
        return newAvailability === 'available';
    }

    async getParams() {
        const params = await LanguageModel.params();
        console.log('Language Model Params:', params);
        return params;
    }

    async* createSession(question, temperature, topK, file = null) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        if (this.session) {
            this.session.destroy();
        }

        // Monta opções dinamicamente com base no suporte do dispositivo
        const sessionOptions = {
            temperature,
            topK,
            initialPrompts: [
                {
                    role: 'system',
                    content: [{
                        type: "text",
                        value: `You are an AI assistant that responds clearly and objectively.
                        Always respond in plain text format instead of markdown.`
                    }]
                },
            ],
        };

        if (this.supportsMultimodal) {
            sessionOptions.expectedInputs = [
                { type: "text", languages: ["en"] },
                { type: "audio" },
                { type: "image" },
            ];
            sessionOptions.expectedOutputs = [{ type: "text", languages: ["en"] }];
        }

        this.session = await LanguageModel.create(sessionOptions);

        // Monta o conteúdo da mensagem
        const contentArray = [{ type: "text", value: question }];

        if (file && this.supportsMultimodal) {
            const fileType = file.type.split('/')[0];
            if (fileType === 'image' || fileType === 'audio') {
                const blob = new Blob([await file.arrayBuffer()], { type: file.type });
                contentArray.push({ type: fileType, value: blob });
                console.log(`Adding ${fileType} to prompt:`, file.name);
            }
        } else if (file && !this.supportsMultimodal) {
            console.warn('Arquivo anexado, mas multimodal não é suportado neste dispositivo — arquivo ignorado.');
        }

        const responseStream = await this.session.promptStreaming(
            [{ role: 'user', content: contentArray }],
            { signal: this.abortController.signal }
        );

        for await (const chunk of responseStream) {
            if (this.abortController.signal.aborted) break;
            yield chunk;
        }
    }

    abort() {
        this.abortController?.abort();
    }

    isAborted() {
        return this.abortController?.signal.aborted;
    }
}