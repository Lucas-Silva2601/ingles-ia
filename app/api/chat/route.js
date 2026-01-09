import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { chatResponse } from '@/lib/server/ollamaService';
import { ValidationError } from '@/lib/server/errors';

/**
 * Chat/Roleplay com IA: envia mensagem e recebe resposta fluida
 * para prática de conversação.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { message, language } = body ?? {};
    const history = Array.isArray(body?.history) ? body.history : [];

    return handleApiRequest('/api/chat', async () => {
        if (typeof message !== 'string' || message.trim().length === 0) {
            throw new ValidationError('A mensagem não pode estar vazia.', 'message', message);
        }
        const responseText = await chatResponse(message, language, history);
        return { response: responseText };
    });
}
