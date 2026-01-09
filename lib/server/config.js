/**
 * Configurações do Backend
 * Centraliza todas as configurações do sistema (porte de config/settings.py).
 * As variáveis de ambiente são lidas em tempo de acesso via process.env,
 * pois o Next.js carrega o .env automaticamente.
 */

const intFromEnv = (name, fallback) => {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isNaN(value) ? fallback : value;
};

export const settings = {
    // API Ollama Cloud (API nativa — também funciona com Ollama local)
    get ollamaApiKey() {
        return process.env.OLLAMA_API_KEY || '';
    },
    get ollamaBaseUrl() {
        return process.env.OLLAMA_BASE_URL || 'https://ollama.com';
    },

    // API Configuration
    get apiDefaultModel() {
        return process.env.API_DEFAULT_MODEL || 'gemma4:31b-cloud';
    },
    get apiMaxTokensExplanation() {
        return intFromEnv('API_MAX_TOKENS_EXPLANATION', 200);
    },
    get apiMaxTokensSentences() {
        return intFromEnv('API_MAX_TOKENS_SENTENCES', 4000);
    },
    get apiTimeout() {
        return intFromEnv('API_TIMEOUT', 30000); // em milissegundos
    },

    // Validation
    get maxTextLength() {
        return intFromEnv('MAX_TEXT_LENGTH', 10000);
    },
    get minTextLength() {
        return intFromEnv('MIN_TEXT_LENGTH', 1);
    },
    get allowedLanguages() {
        const raw = process.env.ALLOWED_LANGUAGES;
        if (!raw) {
            return ['en', 'es', 'it', 'fr', 'de', 'nl', 'pl', 'ru', 'id', 'pt-BR', 'ja'];
        }
        return raw.split(',').map((lang) => lang.trim()).filter(Boolean);
    },

    // Nomes dos idiomas (para prompts)
    languageNames: {
        en: 'inglês',
        es: 'espanhol',
        it: 'italiano',
        fr: 'francês',
        de: 'alemão',
        nl: 'holandês',
        pl: 'polonês',
        ru: 'russo',
        id: 'indonésio',
        'pt-BR': 'português',
        ja: 'japonês',
    },
};
