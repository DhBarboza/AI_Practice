import { AIService } from './services/aiService.js';
import { TranslationService } from './services/translationService.js';
import { View } from './views/view.js';
import { FormController } from './controllers/formController.js';

(async function main() {
    const aiService = new AIService();
    const translationService = new TranslationService();
    const view = new View();

    view.setYear();

    // 1. Verifica requisitos (sem tentar baixar nada)
    const errors = await aiService.checkRequirements();

    if (errors) {
        // Caso especial: modelo de IA precisa ser baixado — exige clique do usuário
        if (errors.includes('__DOWNLOADABLE__')) {
            view.elements.output.innerHTML = `
                ⚠️ O modelo de IA precisa ser baixado antes de ser usado.<br/><br/>
                <button id="download-btn">⬇️ Baixar modelo agora</button>
            `;
            view.elements.button.disabled = true;

            document.getElementById('download-btn').addEventListener('click', async () => {
                const btn = document.getElementById('download-btn');
                btn.disabled = true;
                try {
                    const success = await aiService.downloadModel((percent) => {
                        view.elements.output.innerHTML = `⏳ Baixando modelo de IA: ${percent}%`;
                    });
                    if (success) {
                        window.location.reload();
                    } else {
                        view.elements.output.innerHTML = '❌ Download concluído mas modelo ainda não disponível. Recarregue a página.';
                    }
                } catch (error) {
                    console.error('Error downloading model:', error);
                    view.elements.output.innerHTML = `❌ Erro ao baixar o modelo: ${error.message}`;
                    btn.disabled = false;
                }
            });
            return;
        }

        // Outros erros normais
        view.showError(errors);
        return;
    }

    // 2. Inicializa serviços de tradução
    try {
        await translationService.initialize();
    } catch (error) {
        // Caso especial: tradutor precisa ser baixado — exige clique do usuário
        if (error.message === '__TRANSLATION_DOWNLOADABLE__') {
            view.elements.output.innerHTML = `
                ⚠️ O modelo de tradução precisa ser baixado antes de ser usado.<br/><br/>
                <button id="download-translation-btn">⬇️ Baixar tradutor agora</button>
            `;
            view.elements.button.disabled = true;

            document.getElementById('download-translation-btn').addEventListener('click', async () => {
                const btn = document.getElementById('download-translation-btn');
                btn.disabled = true;
                try {
                    await translationService.downloadAndInitialize((percent) => {
                        view.elements.output.innerHTML = `⏳ Baixando modelo de tradução: ${percent}%`;
                    });
                    window.location.reload();
                } catch (err) {
                    console.error('Error downloading translator:', err);
                    view.elements.output.innerHTML = `❌ Erro ao baixar o tradutor: ${err.message}`;
                    btn.disabled = false;
                }
            });
            return;
        }

        console.error('Error initializing translation:', error);
        view.showError([error.message]);
        return;
    }

    // 3. Tudo ok — inicializa parâmetros e listeners
    const params = await aiService.getParams();
    view.initializeParameters(params);

    const controller = new FormController(aiService, translationService, view);
    controller.setupEventListeners();

    console.log('Application initialized successfully');
})();