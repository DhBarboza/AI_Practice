export class FormController {
    constructor(aiService, translationService, view) {
        this.aiService = aiService;
        this.translationService = translationService;
        this.view = view;
        this.isGenerating = false;
    }

    setupEventListeners() {
        this.view.onTemperatureChange((e) => {
            this.view.updateTemperatureDisplay(e.target.value);
        });

        this.view.onTopKChange((e) => {
            this.view.updateTopKDisplay(e.target.value);
        });

        this.view.onFileChange((event) => {
            this.view.handleFilePreview(event);
        });

        this.view.onFileButtonClick(() => {
            this.view.triggerFileInput();
        });

        this.view.onFormSubmit(async (event) => {
            event.preventDefault();

            if (this.isGenerating) {
                this.stopGeneration();
                return;
            }

            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        const question = this.view.getQuestionText();
        if (!question.trim()) return;

        const temperature = this.view.getTemperature();
        const topK = this.view.getTopK();
        const file = this.view.getFile();

        console.log('Using parameters:', { temperature, topK });

        // Avisa o usuário se ele anexou um arquivo mas o dispositivo não suporta multimodal
        if (file && !this.aiService.supportsMultimodal) {
            this.view.setOutput(
                '⚠️ Seu dispositivo não suporta análise de imagens ou áudio com o modelo local.\n\n' +
                'O arquivo anexado foi ignorado. Sua pergunta será respondida apenas com base no texto digitado.'
            );
            // Aguarda 3 segundos para o usuário ler o aviso antes de continuar
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        this.toggleButton(true);
        this.view.setOutput('Processando sua pergunta...');

        try {
            const aiResponseChunks = await this.aiService.createSession(
                question,
                temperature,
                topK,
                file
            );

            this.view.setOutput('');
            let fullResponse = '';

            for await (const chunk of aiResponseChunks) {
                if (this.aiService.isAborted()) break;
                console.log('Received chunk:', chunk);
                fullResponse += chunk;
                this.view.setOutput(fullResponse);
            }

            // Traduz a resposta completa para português
            if (fullResponse && !this.aiService.isAborted()) {
                this.view.setOutput('Traduzindo resposta...');
                const translatedResponse = await this.translationService.translateToPortuguese(fullResponse);
                this.view.setOutput(translatedResponse);
            }
        } catch (error) {
            console.error('Error during AI generation:', error);
            this.view.setOutput(`Erro: ${error.message}`);
        }

        this.toggleButton(false);
    }

    stopGeneration() {
        this.aiService.abort();
        this.toggleButton(false);
    }

    toggleButton(isGenerating) {
        this.isGenerating = isGenerating;
        if (isGenerating) {
            this.view.setButtonToStopMode();
        } else {
            this.view.setButtonToSendMode();
        }
    }
}