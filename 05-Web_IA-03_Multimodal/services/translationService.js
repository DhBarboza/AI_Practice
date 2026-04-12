export class TranslationService {
    constructor() {
        this.translator = null;
        this.languageDetector = null;
    }

    // Verifica se o Translator precisa ser baixado antes de inicializar
    async checkAvailability() {
        if (!('Translator' in self)) return 'unavailable';
        const availability = await Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: 'pt'
        });
        return availability; // 'available' | 'downloadable' | 'downloading' | 'no'
    }

    // Deve ser chamado APENAS a partir de um evento de clique do usuário
    // quando checkAvailability() retornar 'downloadable'
    async downloadAndInitialize(onProgress) {
        this.translator = await Translator.create({
            sourceLanguage: 'en',
            targetLanguage: 'pt',
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    const percent = ((e.loaded / e.total) * 100).toFixed(0);
                    console.log(`Translator downloaded ${percent}%`);
                    if (onProgress) onProgress(percent);
                });
            }
        });
        console.log('Translator downloaded and initialized');

        this.languageDetector = await LanguageDetector.create();
        console.log('Language Detector initialized');

        return true;
    }

    // Chamado normalmente quando o modelo já está disponível (availability === 'available')
    async initialize() {
        try {
            const availability = await this.checkAvailability();

            if (availability === 'downloadable' || availability === 'downloading') {
                // Não tenta baixar automaticamente — sinaliza para o chamador tratar
                throw new Error('__TRANSLATION_DOWNLOADABLE__');
            }

            if (availability === 'no' || availability === 'unavailable') {
                throw new Error('⚠️ Tradução não disponível neste dispositivo.');
            }

            this.translator = await Translator.create({
                sourceLanguage: 'en',
                targetLanguage: 'pt',
            });
            console.log('Translator initialized');

            this.languageDetector = await LanguageDetector.create();
            console.log('Language Detector initialized');

            return true;
        } catch (error) {
            console.error('Error initializing translation:', error);
            throw error; // repassa para o chamador tratar
        }
    }

    async translateToPortuguese(text) {
        if (!this.translator) {
            console.warn('Translator not available, returning original text');
            return text;
        }

        try {
            if (this.languageDetector) {
                const detectionResults = await this.languageDetector.detect(text);
                console.log('Detected languages:', detectionResults);

                if (detectionResults && detectionResults[0]?.detectedLanguage === 'pt') {
                    console.log('Text is already in Portuguese');
                    return text;
                }
            }

            const stream = this.translator.translateStreaming(text);
            let translated = '';
            for await (const chunk of stream) {
                translated = chunk;
            }
            console.log('Translated text:', translated);
            return translated;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    }
}