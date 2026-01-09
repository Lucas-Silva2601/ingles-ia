// Camada de acesso à API. Os endpoints ficam nas Route Handlers do próprio
// Next.js (app/api/*), então usamos URLs relativas — sem proxy e sem CORS.

async function handleResponse(response) {
    if (!response.ok) {
        let data = null;
        try {
            data = await response.json();
        } catch {
            // ignore
        }
        throw new Error(data?.error || data?.message || `Erro na API (${response.status}): ${response.statusText}`);
    }
    return (await response.json());
}

export async function explainText(payload) {
    const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function generateSentences(payload) {
    const response = await fetch('/api/sentences/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function generateAntiPhrases(payload) {
    const response = await fetch('/api/anti-phrases/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 10, ...payload }),
    });
    return handleResponse(response);
}

export async function generateHacks(payload) {
    const response = await fetch('/api/hacks/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 5, ...payload }),
    });
    return handleResponse(response);
}

export async function sendChatMessage(payload) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

/**
 * Busca explicação de palavra/frase na API real
 */
export async function getPhraseExplanation(payload) {
    const response = await fetch('/api/word-explanation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}
