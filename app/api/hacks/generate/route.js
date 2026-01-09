import { handleApiRequest, readJsonBody } from '@/lib/server/http';
import { generateHacks } from '@/lib/server/ollamaService';
import { ValidationError } from '@/lib/server/errors';

/**
 * Gera "Hacks Proibidos" - atalhos mentais que funcionam na prática.
 */
export async function POST(request) {
    const body = await readJsonBody(request);
    const { language } = body ?? {};
    const count = body?.count ?? 5;

    return handleApiRequest('/api/hacks/generate', async () => {
        if (!Number.isInteger(count) || count < 1 || count > 20) {
            throw new ValidationError('O campo count deve ser um inteiro entre 1 e 20.', 'count', count);
        }
        const hacks = await generateHacks(language, count);
        return { hacks, language, count: hacks.length };
    });
}
