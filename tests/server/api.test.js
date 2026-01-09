/**
 * Testes dos endpoints da API (porte de tests/test_endpoints.py)
 *
 * @jest-environment node
 */

import { GET as healthGet } from '@/app/api/health/route';
import { POST as explainPost } from '@/app/api/explain/route';

const REAL_FETCH = global.fetch;

const jsonRequest = (payload) => new Request('http://localhost/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
});

describe('GET /api/health', () => {
    test('retorna status healthy', async () => {
        const response = await healthGet();

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('healthy');
        expect(data.service).toBe('linguas-ia-backend');
        expect(data.version).toBe('1.0.0');
    });
});

describe('POST /api/explain', () => {
    afterEach(() => {
        delete process.env.OLLAMA_API_KEY;
        global.fetch = REAL_FETCH;
        jest.restoreAllMocks();
    });

    test('texto vazio retorna erro de validação 400', async () => {
        const response = await explainPost(jsonRequest({ text: '', language: 'en' }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('não pode estar vazio');
        expect(data.field).toBe('text');
    });

    test('idioma não suportado retorna erro de validação 400', async () => {
        const response = await explainPost(jsonRequest({ text: 'hello', language: 'xx' }));

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('não é suportado');
    });

    test('sem chave de API retorna 500 com mensagem de configuração', async () => {
        const response = await explainPost(jsonRequest({ text: 'hello', language: 'en' }));

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toContain('OLLAMA_API_KEY');
    });

    test('com API mockada retorna a explicação', async () => {
        process.env.OLLAMA_API_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ message: { role: 'assistant', content: 'Explicação de hello' }, done: true }),
        });

        const response = await explainPost(jsonRequest({ text: 'hello', language: 'en' }));

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({
            explanation: 'Explicação de hello',
            text: 'hello',
            language: 'en',
        });
    });
});
