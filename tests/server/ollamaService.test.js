/**
 * Testes do serviço Ollama
 *
 * @jest-environment node
 */

import {
    ApiCache,
    callOllamaApi,
    explainWithAI,
} from '@/lib/server/ollamaService';
import {
    ApiNetworkError,
    ApiServerError,
    ConfigurationError,
    ValidationError,
} from '@/lib/server/errors';

const REAL_FETCH = global.fetch;

// Resposta no formato da API nativa do Ollama: { message: { content } }
const ollamaSuccessResponse = (content) => ({
    ok: true,
    status: 200,
    json: async () => ({ model: 'gemma4:31b-cloud', message: { role: 'assistant', content }, done: true }),
});

describe('ApiCache', () => {
    test('retorna dado armazenado e expira após o TTL', async () => {
        const cache = new ApiCache(50, 0.01); // TTL de 10ms
        cache.set('prompt', 'en', 'model', 100, 'resposta');
        expect(cache.get('prompt', 'en', 'model', 100)).toBe('resposta');

        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(cache.get('prompt', 'en', 'model', 100)).toBeNull();
    });

    test('remove o item mais antigo quando o cache está cheio', () => {
        const cache = new ApiCache(1, 300);
        cache.set('prompt-1', 'en', 'model', 100, 'resposta-1');
        cache.set('prompt-2', 'en', 'model', 100, 'resposta-2');
        expect(cache.get('prompt-1', 'en', 'model', 100)).toBeNull();
        expect(cache.get('prompt-2', 'en', 'model', 100)).toBe('resposta-2');
    });
});

describe('callOllamaApi (Ollama Cloud)', () => {
    beforeEach(() => {
        process.env.OLLAMA_API_KEY = 'test-key';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete process.env.OLLAMA_API_KEY;
        global.fetch = REAL_FETCH;
        jest.restoreAllMocks();
    });

    test('chama a API com sucesso', async () => {
        global.fetch.mockResolvedValue(ollamaSuccessResponse('Resposta da IA'));

        const content = await callOllamaApi('prompt de teste');

        expect(content).toBe('Resposta da IA');
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('https://ollama.com/api/chat');
        expect(options.headers.Authorization).toBe('Bearer test-key');

        const payload = JSON.parse(options.body);
        expect(payload.model).toBe('gemma4:31b-cloud');
        expect(payload.stream).toBe(false);
        expect(payload.messages).toEqual([{ role: 'user', content: 'prompt de teste' }]);
        expect(payload.options.num_predict).toBe(200);
        expect(payload.options.temperature).toBe(0.5);
    });

    test('inclui mensagem de sistema quando informada', async () => {
        global.fetch.mockResolvedValue(ollamaSuccessResponse('ok'));

        await callOllamaApi('prompt', { systemMessage: 'Você é um professor' });

        const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(payload.messages).toEqual([
            { role: 'system', content: 'Você é um professor' },
            { role: 'user', content: 'prompt' },
        ]);
    });

    test('lança ApiError para resposta vazia', async () => {
        global.fetch.mockResolvedValue(ollamaSuccessResponse(''));

        await expect(callOllamaApi('prompt')).rejects.toThrow('Resposta vazia da IA');
    });

    test('lança ConfigurationError quando não há chave no cloud', async () => {
        delete process.env.OLLAMA_API_KEY;

        await expect(callOllamaApi('prompt')).rejects.toThrow(ConfigurationError);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('lança ApiServerError para erro 500 da API', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ error: 'internal server error' }),
        });

        await expect(callOllamaApi('prompt')).rejects.toThrow(ApiServerError);
    });

    test('lança ApiNetworkError em timeout', async () => {
        global.fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
        }));

        await expect(callOllamaApi('prompt', { timeout: 50 })).rejects.toThrow(ApiNetworkError);
    });

    test('prompt vazio lança erro de validação fail-fast', async () => {
        await expect(callOllamaApi('')).rejects.toThrow('Prompt é obrigatório');
    });
});

describe('callOllamaApi (Ollama local)', () => {
    beforeEach(() => {
        process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete process.env.OLLAMA_BASE_URL;
        global.fetch = REAL_FETCH;
        jest.restoreAllMocks();
    });

    test('funciona sem chave de API apontando para localhost', async () => {
        global.fetch.mockResolvedValue(ollamaSuccessResponse('resposta local'));

        const content = await callOllamaApi('prompt de teste');

        expect(content).toBe('resposta local');

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('http://localhost:11434/api/chat');
        // O Ollama local não recebe header de autorização
        expect(options.headers.Authorization).toBeUndefined();
    });
});

describe('explainWithAI', () => {
    beforeEach(() => {
        process.env.OLLAMA_API_KEY = 'test-key';
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete process.env.OLLAMA_API_KEY;
        global.fetch = REAL_FETCH;
        jest.restoreAllMocks();
    });

    test('explica com sucesso', async () => {
        global.fetch.mockResolvedValue(ollamaSuccessResponse('"hello" significa "olá".'));

        const result = await explainWithAI('hello', 'en');

        expect(result).toContain('hello');

        const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
        const lastMessage = payload.messages[payload.messages.length - 1];
        expect(lastMessage.content).toContain('"hello"');
        expect(payload.options.num_predict).toBe(200);
    });

    test('idioma inválido lança ValidationError', async () => {
        await expect(explainWithAI('hello', 'xx')).rejects.toThrow(ValidationError);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
