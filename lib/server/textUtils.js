/**
 * Utilitários de Processamento de Texto
 * Funções para processar e formatar textos (porte de src/utils/text_utils.py)
 */

import { ApiError } from '@/lib/server/errors';

// Palavras em português que não devem aparecer nas frases geradas.
// Apenas palavras que são CLARAMENTE em português e não aparecem em outros idiomas.
const PORTUGUESE_WORDS = [
    'eu', 'sou', 'um', 'uma', 'que', 'de', 'em', 'para',
    'com', 'por', 'não', 'são', 'estão', 'fala', 'naturais', 'autênticas',
    'aqui', 'en', 'frases', 'nativo', 'trabalhe', 'gere', 'lista', 'formato', 'exemplo',
    'me', 'ajudar', 'modernas', 'mais', 'expressões', 'úteis', 'projeto', 'gírias',
    'agora', 'difíceis', 'idiomáticas', 'esse', 'pode', 'ciência',
    'você', 'ser', 'está', 'foi', 'fui', 'tem', 'têm', 'ter', 'fazer', 'fez',
    'feito', 'dizer', 'disse', 'dito', 'ver', 'viu', 'visto', 'ir', 'ido',
    'vir', 'veio', 'vindo', 'dar', 'deu', 'dado',
];

// Palavras que indicam que a linha é uma explicação/instrução, não uma frase
const EXPLANATION_WORDS = [
    'trabalhe', 'gere', 'nativo', 'frases', 'lista', 'formato',
    'exemplo', 'regras', 'estritas', 'apenas', 'siga', 'crie', 'faça',
    'pode', 'ciência', 'agora', 'difíceis', 'estão', 'idiomáticas',
    'modernas', 'expressões', 'úteis', 'gírias', 'projeto',
];

/**
 * Limpa texto removendo caracteres especiais perigosos.
 */
export function cleanText(text) {
    if (!text) {
        return '';
    }
    // Remove tags HTML básicas
    let result = text.replace(/<[^>]+>/g, '');
    // Remove caracteres de controle
    result = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    return result.trim();
}

/**
 * Processa resposta da IA com frases geradas e retorna array limpo.
 * Retorna lista de frases válidas no formato "frase : (tradução)".
 * Lança ApiError se nenhuma frase válida for encontrada.
 */
export function processSentencesResponse(response, language) {
    if (!response) {
        throw new ApiError('Resposta vazia da IA', 500, { language });
    }

    let text = response;

    // Remove possíveis explicações ou textos antes das frases
    const startPatterns = [
        /([A-Za-z][^:]+:\s*\([^)]+\))/, // Com parênteses
        /([A-Za-z][^:]+:\s*[A-Za-z])/, // Sem parênteses, mas com texto após os dois pontos
    ];

    let startIndex = -1;
    for (const pattern of startPatterns) {
        const match = pattern.exec(text);
        if (match) {
            startIndex = text.indexOf(match[1]);
            break;
        }
    }
    if (startIndex > 0) {
        text = text.slice(startIndex);
    }

    // Divide por ponto e vírgula primeiro, depois por quebra de linha
    let lines = [];
    if (text.includes(';')) {
        // Divide por ponto e vírgula, mas mantém o formato
        lines = text.split(';').map((line) => line.trim()).filter(Boolean);
    } else if (text.includes('\n')) {
        // Divide por quebra de linha
        lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    } else {
        // Tenta encontrar padrões de frases no texto
        const pattern = /([A-Za-zÀ-ÿ][^:]+:\s*\([^)]+\))/g;
        const matches = [...text.matchAll(pattern)].map((match) => match[1]);
        if (matches.length > 0) {
            lines = matches.map((match) => match.trim()).filter(Boolean);
        } else {
            // Último recurso: tenta encontrar qualquer padrão com dois pontos
            const pattern2 = /([A-Za-zÀ-ÿ][^:]+:\s*.+)/g;
            const matches2 = [...text.matchAll(pattern2)].map((match) => match[1]);
            if (matches2.length > 0) {
                lines = matches2.map((match) => match.trim()).filter(Boolean);
            } else {
                lines = text.trim() ? [text.trim()] : [];
            }
        }
    }

    // Filtra e valida frases
    const validSentences = [];

    for (let line of lines) {
        line = line.trim();

        if (!line || line.length < 5) {
            continue;
        }

        if (!line.includes(':')) {
            continue;
        }

        const lineLower = line.toLowerCase();
        if (EXPLANATION_WORDS.some((word) => lineLower.startsWith(word))) {
            continue;
        }

        if (line.length < 10) {
            continue;
        }

        // Tenta extrair frase e tradução
        let match = /^([^:]+):\s*(.+)$/.exec(line);
        if (!match) {
            match = /^(.+?)\s*:\s*(.+)$/.exec(line);
        }

        if (match) {
            let sentence = match[1].trim();
            let translation = match[2].trim();

            // Remove parênteses da tradução
            translation = translation.replace(/^\(|\)$/g, '').trim();
            translation = translation.replace(/[.;,]$/g, '').trim();

            // Remove pontuação final da frase
            sentence = sentence.replace(/[.;,]$/g, '').trim();

            // Remove números seguidos de ponto no início (ex: "41. I am..." -> "I am...")
            sentence = sentence.replace(/^\d+\.\s*/g, '').trim();

            // Remove classificações de nível (B1-B2, A1-A2, etc)
            sentence = sentence.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\s*/gi, '').trim();

            // Remove palavras de classificação de dificuldade
            sentence = sentence.replace(/\b(Fáceis|Médias|Difíceis|Fases|Fase)\b/gi, '').trim();

            // Remove complementos após vírgulas que foram adicionados pela IA
            // Ex: "I need milk, it's important" -> "I need milk"
            // Ex: "Je veux manger, c'est délicieux" -> "Je veux manger"
            const complementPattern = /,\s+(it'?s|it is|that'?s|that is|this is|they are|they'?re|which is|which are|who is|who are|c'est|ce sont|il est|elle est|ils sont|elles sont|es|está|son|sono|ist|sind).+$/i;
            sentence = sentence.replace(complementPattern, '').trim();

            // Remove múltiplas frases separadas por ponto (pega apenas a primeira frase completa)
            // Ex: "First sentence. Second sentence" -> "First sentence"
            if (sentence.includes('.')) {
                const parts = sentence.split('.');
                // Reconstitui a primeira frase que deve ter pelo menos 2 palavras
                const firstSentenceParts = [];
                for (let part of parts) {
                    part = part.trim();
                    if (!part) {
                        continue;
                    }
                    firstSentenceParts.push(part);
                    // Se já temos uma frase com pelo menos 2 palavras, para
                    if (firstSentenceParts.join(' ').split(/\s+/).length >= 2) {
                        break;
                    }
                }
                if (firstSentenceParts.length > 0) {
                    sentence = firstSentenceParts.join(' ').trim();
                }
            }

            if (!sentence || sentence.length === 0) {
                continue;
            }

            // Verifica se não começa com palavras em português (apenas primeira palavra)
            const sentenceWords = sentence.toLowerCase().split(/\s+/);
            if (!sentenceWords.length) {
                continue;
            }

            const isCommonAcrossLanguages = (word) => ['a', 'o', 'e', 'as', 'os'].includes(word);

            // Remove pontuação da primeira palavra para comparação
            const firstWordClean = sentenceWords[0].replace('.,!?;:()', '').trim();

            // Apenas rejeita se a primeira palavra for claramente em português
            // e não for uma palavra comum em outros idiomas também
            if (PORTUGUESE_WORDS.includes(firstWordClean) && !isCommonAcrossLanguages(firstWordClean)) {
                continue;
            }

            // Conta quantas palavras em português existem na frase.
            // Se mais de 50% das palavras são em português (threshold mais permissivo),
            // provavelmente é uma explicação.
            const portugueseCount = sentenceWords.filter((word) => {
                const cleaned = word.replace('.,!?;:()', '').trim();
                return PORTUGUESE_WORDS.includes(cleaned) && !isCommonAcrossLanguages(cleaned);
            }).length;

            // Apenas rejeita se mais da metade das palavras forem em português
            // e se houver pelo menos 3 palavras em português (para evitar falsos positivos)
            if (sentenceWords.length > 0 && portugueseCount >= 3 && portugueseCount > sentenceWords.length * 0.5) {
                continue;
            }

            // Valida que tem pelo menos 2 palavras.
            // Aceita mesmo se a tradução estiver vazia ou incompleta (pode ser processada depois)
            const words = sentence.split(/\s+/);
            if (words.length >= 2) {
                if (translation.length > 0) {
                    validSentences.push(`${sentence} : (${translation})`);
                } else {
                    // Se não tem tradução, adiciona uma tradução genérica
                    validSentences.push(`${sentence} : (tradução)`);
                }
            }
        }
    }

    // Valida formato final - mais permissivo
    const finalSentences = [];
    for (const sentence of validSentences) {
        // Tenta formato padrão primeiro
        let match = /^([^:]+):\s*\(([^)]+)\)$/.exec(sentence);
        if (match) {
            const sentenceText = match[1].trim();
            const words = sentenceText.split(/\s+/);
            if (words.length >= 2) {
                finalSentences.push(sentence);
            }
        } else {
            // Tenta formato alternativo sem parênteses na tradução
            match = /^([^:]+):\s*(.+)$/.exec(sentence);
            if (match) {
                const sentenceText = match[1].trim();
                const translationText = match[2].trim();
                const words = sentenceText.split(/\s+/);
                if (words.length >= 2 && translationText.length > 0) {
                    // Adiciona parênteses se não tiver
                    if (!translationText.startsWith('(')) {
                        finalSentences.push(`${sentenceText} : (${translationText})`);
                    } else {
                        finalSentences.push(sentence);
                    }
                }
            }
        }
    }

    if (finalSentences.length === 0) {
        // Log para debug - mostra uma amostra da resposta
        const sampleResponse = response.length > 500 ? response.slice(0, 500) : response;
        console.warn(
            `Nenhuma frase válida encontrada. ` +
            `Total de linhas processadas: ${lines.length}, ` +
            `Frases válidas antes da validação final: ${validSentences.length}, ` +
            `Amostra da resposta: ${sampleResponse}`
        );
        throw new ApiError('Nenhuma frase válida foi gerada. Tente novamente.', 500, {
            language,
            response_length: response.length,
            lines_processed: lines.length,
            valid_before_final_check: validSentences.length,
        });
    }

    // Limita a 100 frases
    return finalSentences.slice(0, 100);
}
