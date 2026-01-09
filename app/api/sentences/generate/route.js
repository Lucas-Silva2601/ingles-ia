import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { generateSentences } from '@/lib/server/ollamaService';

/**
 * Gera frases para estudo usando IA.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { language } = body ?? {};

    return handleApiRequest('/api/sentences/generate', async () => {
        const sentences = await generateSentences(language);
        return { sentences, language, count: sentences.length };
    });
}
