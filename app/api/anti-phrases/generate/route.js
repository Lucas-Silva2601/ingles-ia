import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { generateAntiPhrases } from '@/lib/server/ollamaService';
import { ValidationError } from '@/lib/server/errors';

/**
 * Gera Anti-Frases (o que NÃO dizer) usando IA.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { language } = body ?? {};
    const count = body?.count ?? 10;

    return handleApiRequest('/api/anti-phrases/generate', async () => {
        if (!Number.isInteger(count) || count < 1 || count > 50) {
            throw new ValidationError('O campo count deve ser um inteiro entre 1 e 50.', 'count', count);
        }
        const antiPhrases = await generateAntiPhrases(language, count);
        return { anti_phrases: antiPhrases, language, count: antiPhrases.length };
    });
}
