import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { explainWithAI } from '@/lib/server/ollamaService';

/**
 * Explica uma palavra ou frase usando IA.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { text, language } = body ?? {};

    return handleApiRequest('/api/explain', async () => {
        const explanation = await explainWithAI(text, language);
        return { explanation, text, language };
    });
}
