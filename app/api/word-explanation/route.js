import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { explainWord } from '@/lib/server/ollamaService';
import { ValidationError } from '@/lib/server/errors';

/**
 * Explica uma palavra ou frase: retorna tradução/significado e exemplos de uso.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { phrase, language } = body ?? {};
    const isSingleWord = Boolean(body?.isSingleWord);

    return handleApiRequest('/api/word-explanation', async () => {
        if (typeof phrase !== 'string' || phrase.trim().length === 0) {
            throw new ValidationError('A palavra ou frase não pode estar vazia.', 'phrase', phrase);
        }
        const result = await explainWord(phrase, language, isSingleWord);
        return { translation: result.translation, examples: result.examples };
    });
}
