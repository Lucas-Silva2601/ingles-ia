/**
 * Serviço de API Ollama Cloud
 * Centraliza todas as chamadas à API do Ollama (nativa /api/chat).
 *
 * Funciona tanto com o Ollama Cloud (https://ollama.com) quanto com um
 * Ollama local (ex.: http://localhost:11434) — é só mudar OLLAMA_BASE_URL.
 * Usa o fetch nativo do Node.js 18+.
 */

import { settings } from '@/lib/server/config';
import {
    ApiError,
    ApiAuthenticationError,
    ApiRateLimitError,
    ApiServerError,
    ApiNetworkError,
    ConfigurationError,
    logError,
} from '@/lib/server/errors';
import { validateApiParams, validateLanguage } from '@/lib/server/validators';
import { processSentencesResponse } from '@/lib/server/textUtils';

/** Amostra `count` itens aleatórios de uma lista, sem repetição e sem mutar o original */
function sample(array, count) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
}

/** Inteiro aleatório entre min e max (inclusive) */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Extrai a mensagem de erro de uma resposta de erro da API */
function extractErrorMessage(errorData, fallback) {
    // O Ollama retorna erros como { error: "mensagem" } (string)
    if (typeof errorData?.error === 'string' && errorData.error) {
        return errorData.error;
    }
    return errorData?.error?.message || fallback;
}

/** Cache simples de respostas de API */
export class ApiCache {
    constructor(maxSize = 50, ttlSeconds = 300) {
        this.cache = {};
        this.maxSize = maxSize;
        this.ttlSeconds = ttlSeconds;
    }

    _generateKey(prompt, language, model, maxTokens) {
        // Gera chave para o cache
        return JSON.stringify({ prompt, language, model, max_tokens: maxTokens });
    }

    get(prompt, language, model, maxTokens) {
        // Obtém resposta do cache se válida
        const key = this._generateKey(prompt, language, model, maxTokens);
        const cached = this.cache[key];

        if (!cached) {
            return null;
        }

        // Verifica se expirou
        if (Date.now() - cached.timestamp > this.ttlSeconds * 1000) {
            delete this.cache[key];
            return null;
        }

        return cached.data;
    }

    set(prompt, language, model, maxTokens, data) {
        // Adiciona resposta ao cache
        const key = this._generateKey(prompt, language, model, maxTokens);

        // Remove item mais antigo se cache está cheio
        if (Object.keys(this.cache).length >= this.maxSize) {
            const firstKey = Object.keys(this.cache)[0];
            delete this.cache[firstKey];
        }

        this.cache[key] = {
            data,
            timestamp: Date.now(),
        };
    }

    clear() {
        // Limpa cache
        this.cache = {};
    }
}

// Instância global do cache (desabilitado por padrão)
export let apiCache = null;

export function enableApiCache(maxSize = 50, ttlSeconds = 300) {
    // Habilita cache de API
    apiCache = new ApiCache(maxSize, ttlSeconds);
}

export function disableApiCache() {
    // Desabilita cache de API
    apiCache = null;
}

/**
 * Chama a API do Ollama com um prompt e opções.
 *
 * Lança ConfigurationError se a configuração não estiver disponível,
 * ApiError se houver erro na API.
 */
export async function callOllamaApi(prompt, {
    systemMessage = null,
    language = 'en',
    temperature = 0.5,
    maxTokens = null,
    model = null,
    timeout = null,
    useCache = false,
} = {}) {
    // Validação fail-fast
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt é obrigatório e deve ser uma string');
    }

    // Obtém configurações
    const apiKey = settings.ollamaApiKey;
    const baseUrl = (settings.ollamaBaseUrl || '').replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/api/chat`;
    const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);

    // O Ollama local não exige chave; o cloud (ollama.com) exige
    if (!apiKey && !isLocal) {
        throw new ConfigurationError(
            'Configuração da API não disponível. Defina OLLAMA_API_KEY no .env (ou aponte OLLAMA_BASE_URL para um Ollama local).',
            { has_api_key: false, base_url: baseUrl }
        );
    }

    // Determina modelo e max_tokens
    const defaultModel = model || settings.apiDefaultModel;
    const defaultMaxTokens = maxTokens || settings.apiMaxTokensExplanation;
    const defaultTimeoutMs = timeout || settings.apiTimeout;
    const defaultTimeoutSeconds = defaultTimeoutMs / 1000;

    // Verifica cache se habilitado
    if (useCache && apiCache && !systemMessage) {
        const cached = apiCache.get(prompt, language, defaultModel, defaultMaxTokens);
        if (cached) {
            console.debug(`Resposta obtida do cache: ${prompt.slice(0, 50)}...`);
            return cached;
        }
    }

    // Constrói mensagens
    const messages = [];
    if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    console.debug(`Chamando API Ollama: model=${defaultModel}, language=${language}, num_predict=${defaultMaxTokens}`);

    // Prepara requisição (API nativa do Ollama)
    const payload = {
        model: defaultModel,
        messages,
        stream: false,
        options: {
            temperature,
            num_predict: defaultMaxTokens,
        },
    };

    const headers = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    // Faz a requisição (fetch nativo)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), defaultTimeoutMs);
    let response;
    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } catch (error) {
        clearTimeout(timer);
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            logError(error, { type: 'api_timeout', timeout: defaultTimeoutSeconds });
            throw new ApiNetworkError(
                `Timeout: Requisição excedeu o tempo limite (${defaultTimeoutSeconds}s)`,
                { timeout: defaultTimeoutSeconds }
            );
        }
        logError(error, { type: 'api_network_error' });
        throw new ApiNetworkError(
            'Erro de conexão com a API. Verifique sua internet.',
            { original_error: String(error?.message || error) }
        );
    }
    clearTimeout(timer);

    console.debug(`Resposta recebida da API: status=${response.status}`);

    // Lê o corpo para tratamento de erros (quando aplicável)
    let errorData = {};
    if (!response.ok) {
        try {
            errorData = await response.json();
        } catch {
            errorData = {};
        }
    }

    if (response.status === 401 || response.status === 403) {
        throw new ApiAuthenticationError(
            `Erro de autenticação (${response.status}): ${extractErrorMessage(errorData, 'Erro desconhecido')}`,
            { status_code: response.status, error_data: errorData }
        );
    }

    if (response.status === 429) {
        throw new ApiRateLimitError(
            `Limite de requisições excedido: ${extractErrorMessage(errorData, 'Erro desconhecido')}`,
            { status_code: response.status, error_data: errorData }
        );
    }

    if (response.status >= 500) {
        throw new ApiServerError(
            `Erro no servidor da API (${response.status}): ${extractErrorMessage(errorData, 'Erro desconhecido')}`,
            response.status,
            { error_data: errorData }
        );
    }

    if (!response.ok) {
        throw new ApiError(
            `Erro na API (${response.status}): ${extractErrorMessage(errorData, '')}`,
            response.status,
            { error_data: errorData }
        );
    }

    const data = await response.json();

    if (!data.message || typeof data.message.content !== 'string') {
        throw new ApiError('Resposta da API em formato inesperado', 500, { data });
    }

    const content = data.message.content;

    if (!content) {
        throw new ApiError('Resposta vazia da IA', 500, { data });
    }

    // Salva no cache se habilitado
    if (useCache && apiCache && !systemMessage) {
        apiCache.set(prompt, language, defaultModel, defaultMaxTokens, content);
    }

    return content;
}

/** Explica uma palavra ou frase usando a IA do Ollama. */
export async function explainWithAI(text, language = 'en') {
    // Valida parâmetros
    validateApiParams(text, language);

    const languageName = settings.languageNames[language] || 'inglês';
    const cleanTextValue = text.replace(/>/g, '').replace(/</g, '').trim();

    const prompt = `Explique a palavra ou frase: "${cleanTextValue}".

Siga EXATAMENTE esta estrutura:

Significado:

"${cleanTextValue}" significa "[significado em português]".

Como a frase pode ser usada:

[explicação de como usar em diferentes contextos]

Exemplo de frases:

- [frase em ${languageName}] "tradução em português"
- [frase 2 em ${languageName}] "tradução em português"
- [frase 3 em ${languageName}] "tradução em português"

Forneça 3 exemplos de frases em ${languageName}. Responda em português.`;

    const systemMessage = `Você é um professor de ${languageName} experiente e paciente, especializado em explicar palavras e frases de forma clara e didática.`;

    return callOllamaApi(prompt, {
        systemMessage,
        language,
        temperature: 0.5,
        maxTokens: settings.apiMaxTokensExplanation,
        useCache: true,
    });
}

/** Gera frases usando a IA. Retorna lista no formato "frase : (tradução)". */
export async function generateSentences(language) {
    // Valida idioma
    validateLanguage(language);

    // Mapa de códigos para nomes de idiomas
    const langNames = {
        en: 'inglês (English)',
        es: 'espanhol (Spanish)',
        fr: 'francês (French)',
        de: 'alemão (German)',
        it: 'italiano (Italian)',
        'pt-BR': 'português brasileiro',
        'pt-PT': 'português de Portugal',
        ja: 'japonês (Japanese)',
        ko: 'coreano (Korean)',
        'zh-CN': 'chinês simplificado (Chinese)',
        ru: 'russo (Russian)',
        ar: 'árabe (Arabic)',
        hi: 'hindi (Hindi)',
        nl: 'holandês (Dutch)',
        pl: 'polonês (Polish)',
        tr: 'turco (Turkish)',
        sv: 'sueco (Swedish)',
        da: 'dinamarquês (Danish)',
        no: 'norueguês (Norwegian)',
        fi: 'finlandês (Finnish)',
        el: 'grego (Greek)',
        he: 'hebraico (Hebrew)',
        th: 'tailandês (Thai)',
        vi: 'vietnamita (Vietnamese)',
        id: 'indonésio (Indonesian)',
        ms: 'malaio (Malay)',
        cs: 'tcheco (Czech)',
        hu: 'húngaro (Hungarian)',
        ro: 'romeno (Romanian)',
        uk: 'ucraniano (Ukrainian)',
    };
    const langName = langNames[language] || language;

    // Temas variados para garantir frases diferentes a cada vez
    const themes = [
        'trabalho e escritório', 'família e relacionamentos', 'restaurantes e comida',
        'viagens e turismo', 'compras e lojas', 'saúde e médico', 'tecnologia e internet',
        'esportes e lazer', 'clima e natureza', 'casa e moradia', 'transporte e trânsito',
        'escola e educação', 'festas e celebrações', 'dinheiro e banco', 'emergências',
        'hobbies e passatempos', 'sentimentos e emoções', 'rotina diária', 'amizades',
        'entrevista de emprego', 'aeroporto e voos', 'hotel e hospedagem', 'supermercado',
        'negócios e reuniões', 'redes sociais', 'filmes e séries', 'música e arte',
    ];

    // Seleciona temas aleatórios para variar as frases
    const selectedThemes = sample(themes, Math.min(6, themes.length));
    const themesText = selectedThemes.join(', ');

    // Seed aleatória para variar ainda mais
    const randomSeed = randomInt(1000, 9999);

    const prompt = `Você é um nativo fluente do idioma ${langName}.

ATENÇÃO: Gere TODAS as 130 frases NO IDIOMA ${langName.toUpperCase()}, NÃO em inglês ou português.

TEMAS: ${themesText}
SEED: ${randomSeed}

DISTRIBUIÇÃO OBRIGATÓRIA:
- 40 frases FÁCEIS (A1-A2): verbos básicos, presente simples, vocabulário comum
- 50 frases MÉDIAS (B1-B2): expressões idiomáticas, tempos verbais variados
- 40 frases DIFÍCEIS (C1-C2): expressões sofisticadas, gírias, linguagem nativa avançada

FORMATO OBRIGATÓRIO - MUITO IMPORTANTE:
Cada linha DEVE ter EXATAMENTE este formato:
frase em ${langName} : (tradução em português);

EXEMPLOS CORRETOS (adapte para o idioma ${langName}):
Se for italiano: "Ho bisogno di aiuto : (Eu preciso de ajuda);"
Se for espanhol: "Necesito ayuda : (Eu preciso de ajuda);"
Se for francês: "J'ai besoin d'aide : (Eu preciso de ajuda);"
Se for alemão: "Ich brauche Hilfe : (Eu preciso de ajuda);"
Se for inglês: "I need some help : (Eu preciso de ajuda);"

REGRAS CRÍTICAS - LEIA COM MUITA ATENÇÃO:
- TODAS as frases DEVEM ser no idioma ${langName}, NÃO em inglês (a menos que o idioma seja inglês)
- A tradução entre parênteses DEVE ser em português brasileiro
- NÃO use números, horários, datas ou valores monetários nas frases
- NÃO use abreviações como AM, PM, Dr., Mr., etc.
- NÃO use frases incompletas ou com palavras cortadas
- CADA frase deve ser COMPLETA e fazer sentido sozinha
- Inclua expressões idiomáticas úteis do idioma ${langName}
- Inclua gírias modernas que nativos do idioma ${langName} realmente usam
- NÃO repita frases de livros didáticos básicos
- MISTURE os níveis aleatoriamente (não agrupe por dificuldade)
- Separe cada frase com ponto e vírgula (;)

PROIBIÇÕES ABSOLUTAS - NUNCA FAÇA ISSO:
❌ NÃO adicione texto ANTES das frases (ex: "Fáceis:", "Aqui estão as frases:", "Lista:", etc.)
❌ NÃO adicione texto DEPOIS das frases (ex: explicações, complementos, contexto adicional)
❌ NÃO adicione palavras como "Fáceis", "Médias", "Difíceis" antes das frases
❌ NÃO adicione classificações de nível (A1-A2, B1-B2, etc.) antes das frases
❌ NÃO adicione números sequenciais antes das frases (1., 2., etc.)
❌ NÃO adicione complementos, explicações ou contexto adicional na própria frase
❌ NÃO inclua mais de uma frase por linha (ex: "Frase um. Frase dois : (tradução)")
❌ NÃO adicione vírgulas ou texto extra após a frase principal (ex: "I need milk, it's important : (tradução)")

REGRA DE OURO:
Cada linha deve conter SOMENTE: [frase no idioma] : (tradução em português);

Comece DIRETO com a primeira frase, sem introdução ou explicação.

VERIFICAÇÃO OBRIGATÓRIA ANTES DE INCLUIR CADA FRASE:
1. A frase está GRAMATICALMENTE CORRETA no idioma ${langName}?
2. A frase tem TODOS os verbos necessários? (não pode faltar "é", "está", "ser", etc.)
3. A frase faz SENTIDO COMPLETO sozinha?
4. A frase NÃO está cortada ou incompleta?
5. A linha contém APENAS a frase e a tradução, sem complementos ou explicações extras?

EXEMPLOS DE FRASES INCORRETAS (NÃO GERAR ASSIM):
- "Fáceis: I need some milk : (Eu preciso de leite);" ❌ (tem texto extra antes)
- "I need some milk, it's important : (Eu preciso de leite);" ❌ (tem complemento)
- "1. I need some milk : (Eu preciso de leite);" ❌ (tem número sequencial)
- "A1-A2: I need some milk : (Eu preciso de leite);" ❌ (tem classificação)
- "La mia squadra preferita la Juventus : (Minha equipe favorita Juventus);" ❌ (falta verbo)

EXEMPLOS DE FRASES CORRETAS:
- "I need some milk : (Eu preciso de leite);" ✓
- "La mia squadra preferita è la Juventus : (Minha equipe favorita é a Juventus);" ✓
- "Je veux manger une pizza : (Eu quero comer uma pizza);" ✓

Gere 130 frases ÚNICAS, GRAMATICALMENTE CORRETAS e COMPLETAS no idioma ${langName}.
Lembre-se: cada linha = APENAS frase : (tradução); sem complementos ou texto extra.`;

    const systemMessage = `Você é um nativo da língua ${language} que gera frases autênticas e naturais para aprendizado.`;

    const response = await callOllamaApi(prompt, {
        systemMessage,
        language,
        temperature: 0.8,
        maxTokens: settings.apiMaxTokensSentences,
        useCache: false, // Não usar cache para geração de frases
    });

    // Processa a resposta e retorna array de frases válidas
    return processSentencesResponse(response, language);
}

/** Gera Anti-Frases usando a IA (o que NÃO dizer em um idioma). */
export async function generateAntiPhrases(language, count = 10) {
    // Valida idioma
    validateLanguage(language);

    // Mapeia idiomas para nomes completos (expandido para todos os idiomas)
    const langNames = {
        en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão',
        it: 'italiano', 'pt-BR': 'português do Brasil', 'pt-PT': 'português de Portugal',
        ja: 'japonês', ko: 'coreano', 'zh-CN': 'chinês', ru: 'russo',
        ar: 'árabe', hi: 'hindi', nl: 'holandês', pl: 'polonês',
        tr: 'turco', sv: 'sueco', da: 'dinamarquês', no: 'norueguês',
        fi: 'finlandês', el: 'grego', he: 'hebraico', th: 'tailandês',
        vi: 'vietnamita', id: 'indonésio', ms: 'malaio', cs: 'tcheco',
        hu: 'húngaro', ro: 'romeno', uk: 'ucraniano',
    };
    const langName = langNames[language] || language;

    // Temas/situações variados para garantir variedade
    const situations = [
        'restaurantes e comida', 'trabalho e escritório', 'família e relacionamentos',
        'viagens e hotéis', 'compras e lojas', 'saúde e médico', 'tecnologia',
        'esportes', 'educação e escola', 'transporte', 'emergências', 'hobbies',
        'sentimentos e emoções', 'amizades', 'aeroporto', 'supermercado',
        'negócios', 'redes sociais', 'entretenimento', 'animais de estimação',
        'clima', 'casa e moradia', 'dinheiro e banco', 'festas',
    ];

    // Seleciona situações aleatórias
    const selectedSituations = sample(situations, Math.min(8, situations.length));
    const situationsText = selectedSituations.join(', ');

    // Seed aleatória para variar ainda mais
    const randomSeed = randomInt(1000, 9999);

    // Tipos de erros variados
    const errorTypes = [
        'falsos cognatos relacionados a comida', 'falsos cognatos de corpo/partes do corpo',
        'falsos cognatos de ações/verbos', 'falsos cognatos de objetos/casa',
        'duplo sentido em cumprimentos', 'duplo sentido em expressões de interesse',
        'linguagem muito formal/arcaica', 'gírias antigas que soam estranhas',
        'traduções literais incorretas', 'palavras que parecem inofensivas mas são ofensivas',
    ];
    const selectedErrorTypes = sample(errorTypes, Math.min(5, errorTypes.length));
    const errorTypesText = selectedErrorTypes.join(', ');

    const systemMessage = `Você é um "Salvador Cultural" nativo e bem-humorado da língua ${langName}.
Sua missão é ajudar estudantes a evitar vergonhas sociais, falsos amigos e frases com duplo sentido acidental.
Você conhece perfeitamente os erros que estudantes de ${langName} costumam cometer ao tentar traduzir diretamente do português.
Você é direto, claro e educado, sempre com um toque de humor para tornar o aprendizado leve.`;

    const prompt = `Gere EXATAMENTE ${count} exemplos de "Anti-Frases" no idioma ${langName}.

TEMAS/SITUAÇÕES PARA FOCAR: ${situationsText}
TIPOS DE ERROS PARA INCLUIR: ${errorTypesText}
SEED ALEATÓRIA: ${randomSeed}

REGRAS DE CONTEÚDO (IMPORTANTE - VARIAR SEMPRE):
1. Falsos Cognatos perigosos: Palavras que parecem com português mas têm significado totalmente diferente ou ofensivo.
   - FOQUE em diferentes categorias: corpo, comida, ações, objetos, emoções
   - NÃO repita os mesmos falsos cognatos que já foram ensinados antes
2. Duplo sentido acidental: Frases que em português são inocentes mas em ${langName} têm conotação sexual/romântica/desrespeitosa.
   - Variar contextos: cumprimentos, convites, elogios, pedidos
3. Linguagem arcaica: Expressões que soam como se você fosse do século passado ou de um filme antigo.
   - Incluir expressões que nativos modernos NUNCA usariam

REGRAS DE VARIEDADE OBRIGATÓRIAS:
- Cada anti-frase deve ser DIFERENTE e ÚNICA
- NÃO repita palavras ou frases similares
- Use diferentes contextos e situações
- Varie entre diferentes tipos de erros
- Use vocabulário e expressões variados
- MISTURE severidade (algumas "high", outras "medium")

REGRAS DE FORMATO:
- Você DEVE retornar APENAS um JSON válido, sem texto antes ou depois.
- O JSON deve ser um array de objetos, cada um com esta estrutura exata:
  {
    "wrong_phrase": "frase errada que o estudante diria",
    "native_meaning": "o que isso REALMENTE significa para um nativo (explique o problema)",
    "severity": "high" ou "medium" (high = ofensivo/perigoso, medium = ridículo/arcaico),
    "correct_phrase": "a forma correta e natural de dizer",
    "correct_translation": "tradução correta em português"
  }

EXEMPLOS DE SEVERITY:
- "high": Frases que podem ofender, causar mal-entendidos sérios, ou ter conotação sexual explícita
- "medium": Frases ridículas, arcaicas, ou que soam estranhas mas não ofensivas

Gere ${count} anti-frases ÚNICAS e VARIADAS, focando em erros COMUNS que estudantes de ${langName} realmente cometem.
IMPORTANTE: Cada geração deve trazer anti-frases DIFERENTES das anteriores. Use a seed e temas para garantir variedade.
Retorne APENAS o JSON array, sem explicações adicionais.`;

    try {
        const response = await callOllamaApi(prompt, {
            systemMessage,
            language,
            temperature: 0.9, // Temperatura mais alta para maior variedade
            maxTokens: 16000,
            useCache: false,
        });

        // Tenta extrair JSON da resposta (pode vir com markdown ou texto extra)
        let responseClean = response.trim();

        // Remove code blocks markdown se houver
        const jsonMatch = /```(?:json)?\s*(\[.*?\])\s*```/s.exec(responseClean);
        if (jsonMatch) {
            responseClean = jsonMatch[1];
        } else {
            // Tenta encontrar array JSON diretamente
            const arrayMatch = /\[.*?\]/s.exec(responseClean);
            if (arrayMatch) {
                responseClean = arrayMatch[0];
            }
        }

        // Parse do JSON
        let antiPhrasesList;
        try {
            antiPhrasesList = JSON.parse(responseClean);
        } catch (error) {
            console.error(`Erro ao fazer parse do JSON de anti-frases: ${error.message}. Resposta recebida: ${responseClean.slice(0, 500)}`);
            throw new ApiError('Erro ao processar resposta da IA', 500, {
                error: String(error.message),
                raw_response_preview: responseClean.slice(0, 200),
            });
        }

        // Valida que é uma lista
        if (!Array.isArray(antiPhrasesList)) {
            throw new ApiError('Resposta da IA não é um array', 500, {
                received_type: typeof antiPhrasesList,
            });
        }

        // Valida cada item
        const validatedList = [];
        for (const item of antiPhrasesList) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                continue;
            }
            // Garante que tem todos os campos necessários
            const requiredKeys = ['wrong_phrase', 'native_meaning', 'severity', 'correct_phrase', 'correct_translation'];
            if (requiredKeys.every((key) => key in item)) {
                // Valida severity
                if (!['high', 'medium'].includes(item.severity)) {
                    item.severity = 'medium'; // fallback
                }
                validatedList.push(item);
            }
        }

        if (validatedList.length < count) {
            console.warn(`IA retornou apenas ${validatedList.length} anti-frases válidas de ${count} solicitadas`);
        }

        return validatedList.slice(0, count);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error(`Erro inesperado ao gerar anti-frases: ${error}`);
        throw new ApiError('Erro ao gerar anti-frases', 500, { error: String(error) });
    }
}

/** Explica uma palavra ou frase com tradução e exemplos. */
export async function explainWord(phrase, language = 'en', isSingleWord = false) {
    const langNames = {
        en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão',
        it: 'italiano', 'pt-BR': 'português', ja: 'japonês', ko: 'coreano',
    };
    const langName = langNames[language] || language;

    let prompt;
    if (isSingleWord) {
        prompt = `Explique a palavra "${phrase}" em ${langName}.

Responda EXATAMENTE neste formato JSON:
{
  "translation": "significado/tradução em português da palavra",
  "examples": [
    "Frase em ${langName} usando a palavra. : (Tradução da frase em português.)",
    "Outra frase em ${langName} usando a palavra. : (Tradução da frase em português.)",
    "Mais uma frase em ${langName} usando a palavra. : (Tradução da frase em português.)"
  ]
}

REGRAS OBRIGATÓRIAS:
- A tradução deve explicar o significado da palavra em português
- Os exemplos DEVEM ser frases no idioma ${langName}, NÃO em português
- Formato de cada exemplo: "frase em ${langName} : (tradução em português)"
- Responda APENAS o JSON, sem explicações`;
    } else {
        prompt = `Explique a frase "${phrase}" em ${langName}.

Responda EXATAMENTE neste formato JSON:
{
  "translation": "tradução completa da frase em português",
  "examples": [
    "Frase de exemplo em ${langName}. : (Tradução em português.)",
    "Outra frase de exemplo em ${langName}. : (Tradução em português.)",
    "Mais uma frase de exemplo em ${langName}. : (Tradução em português.)"
  ]
}

REGRAS OBRIGATÓRIAS:
- A tradução deve ser em português
- Os exemplos DEVEM ser frases no idioma ${langName}, NÃO em português
- Formato de cada exemplo: "frase em ${langName} : (tradução em português)"
- Responda APENAS o JSON, sem explicações`;
    }

    try {
        const response = await callOllamaApi(prompt, {
            systemMessage: 'Você é um professor de idiomas especializado em explicar palavras e frases de forma clara e com exemplos práticos.',
            language,
            temperature: 0.5,
            maxTokens: 500,
            useCache: false,
        });

        // Tenta parsear JSON
        let responseClean = response.trim();
        const jsonMatch = /\{.*\}/s.exec(responseClean);
        if (jsonMatch) {
            responseClean = jsonMatch[0];
        }

        try {
            const result = JSON.parse(responseClean);
            return {
                translation: result.translation ?? `Significado de ${phrase}`,
                examples: (result.examples ?? []).slice(0, 3),
            };
        } catch (error) {
            console.error(`Erro ao parsear explicação: ${responseClean.slice(0, 200)}`);
            return {
                translation: `Significado de '${phrase}'`,
                examples: [`Exemplo com '${phrase}'.`],
            };
        }
    } catch (error) {
        console.error(`Erro ao explicar palavra: ${error}`);
        return {
            translation: `Significado de '${phrase}'`,
            examples: [],
        };
    }
}

/** Gera resposta de chat fluida para roleplay. */
export async function chatResponse(message, language = 'en', history = null) {
    const langNames = {
        en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão',
        it: 'italiano', 'pt-BR': 'português', ja: 'japonês', ko: 'coreano',
    };
    const langName = langNames[language] || language;

    const systemMessage = `Você é um assistente de conversação amigável para praticar ${langName}.

REGRAS:
1. Responda SEMPRE no idioma ${langName} (código: ${language})
2. Mantenha respostas CURTAS (1-2 frases no máximo)
3. Seja natural e conversacional
4. Faça perguntas para manter a conversa fluindo
5. Se o usuário falar sobre um tópico, continue nesse tópico
6. Não repita a mesma resposta várias vezes
7. Adapte-se ao contexto da conversa

Exemplos de boas respostas em ${langName}:
- Se o usuário falar de café, pergunte qual tipo ele prefere
- Se falar de animais, pergunte se ele tem pets
- Se cumprimentar, cumprimente de volta e pergunte como está o dia`;

    // Nota: o histórico é aceito por compatibilidade — a chamada usa apenas
    // a mensagem atual + system message (mesmo comportamento do backend original).

    try {
        const response = await callOllamaApi(message, {
            systemMessage,
            language,
            temperature: 0.7,
            maxTokens: 150,
            useCache: false,
        });

        return response.trim();
    } catch (error) {
        console.error(`Erro no chat: ${error}`);
        // Fallback responses
        if (language === 'pt-BR') {
            return 'Desculpe, não entendi. Pode repetir?';
        }
        if (language === 'es') {
            return 'Lo siento, no entendí. ¿Puedes repetir?';
        }
        return "Sorry, I didn't understand. Can you repeat that?";
    }
}

/** Gera "Hacks Proibidos" - atalhos mentais que funcionam na prática. */
export async function generateHacks(language = 'en', count = 5) {
    const langNames = {
        en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão',
        it: 'italiano', 'pt-BR': 'português brasileiro', 'pt-PT': 'português de Portugal',
        ja: 'japonês', ko: 'coreano', 'zh-CN': 'chinês', ru: 'russo',
        ar: 'árabe', hi: 'hindi', nl: 'holandês', pl: 'polonês',
        tr: 'turco', sv: 'sueco', da: 'dinamarquês', no: 'norueguês',
        fi: 'finlandês', el: 'grego', he: 'hebraico', th: 'tailandês',
        vi: 'vietnamita', id: 'indonésio', ms: 'malaio', cs: 'tcheco',
        hu: 'húngaro', ro: 'romeno', uk: 'ucraniano',
    };
    const langName = langNames[language] || language;

    // Temas/categorias variados para garantir variedade
    const hackCategories = [
        'verbos e ações', 'tempos verbais (passado/presente/futuro)', 'preposições',
        'artigos (definido/indefinido)', 'plural vs singular', 'gênero de palavras',
        'pronomes', 'advérbios', 'adjetivos', 'conjunções', 'ordem das palavras',
        'perguntas', 'negações', 'condicionais', 'imperativo', 'formas formais vs informais',
        'expressões idiomáticas', 'gírias', 'cumprimentos e despedidas', 'agradecimentos',
        'pedidos e comandos', 'opiniões', 'comparações', 'quantidades', 'cores',
        'números e contagem', 'tempo e datas', 'localizações', 'emoções e sentimentos',
    ];

    // Seleciona categorias aleatórias
    const selectedCategories = sample(hackCategories, Math.min(7, hackCategories.length));
    const categoriesText = selectedCategories.join(', ');

    // Seed aleatória para variar ainda mais
    const randomSeed = randomInt(1000, 9999);

    // Tipos de truques variados
    const trickTypes = [
        'atalhos emocionais (quando sentir X, use Y)', 'padrões de som e rima',
        'truques visuais de escrita', 'associações com português', 'memória de movimento corporal',
        'histórias ou narrativas', 'contrastes e opostos', 'regras de "sentir" vs "pensar"',
        'padrões de finalização de palavras', 'sequências de palavras comuns',
    ];
    const selectedTrickTypes = sample(trickTypes, Math.min(4, trickTypes.length));
    const trickTypesText = selectedTrickTypes.join(', ');

    const systemMessage = `Você é um "Hacker da Linguagem" - alguém que descobriu padrões ocultos no ${langName} que os livros didáticos não ensinam.

Sua missão é criar ATALHOS MENTAIS (heurísticas) que não são 100% científicos, mas funcionam em 80% dos casos e salvam a vida do aluno na conversação real.

REGRAS IMPORTANTES:
1. NÃO explique gramática técnica (nada de "pretérito perfeito", "orações subordinadas", etc.)
2. Crie "Regras Inventadas" mas ÚTEIS - baseadas em sentimentos, emoções ou truques visuais
3. Use linguagem informal e divertida, como se estivesse contando um segredo
4. Cada hack deve ser um insight que faz o aluno pensar "Por que ninguém me ensinou isso antes?"
5. Os exemplos devem ser situações reais do dia a dia
6. CADA hack deve ser ÚNICO e DIFERENTE - não repita conceitos similares

Você DEVE retornar um JSON array válido com exatamente ${count} hacks.
Cada hack deve ter: hack_title, the_lie, how_it_works, examples (array com phrase e translation), why_it_works.
IMPORTANTE: Em examples, use "phrase" para a frase no idioma e "translation" para tradução em português.

RESPONDA APENAS COM O JSON, sem markdown ou explicações.`;

    const prompt = `Gere ${count} "Hacks Proibidos" ÚNICOS e VARIADOS para estudantes de ${langName}.

CATEGORIAS PARA FOCAR: ${categoriesText}
TIPOS DE TRUQUES PARA USAR: ${trickTypesText}
SEED ALEATÓRIA: ${randomSeed}

REGRAS DE VARIEDADE OBRIGATÓRIAS:
- Cada hack deve ser COMPLETAMENTE DIFERENTE dos outros
- NÃO repita os mesmos conceitos, palavras-chave ou exemplos similares
- Varie os tipos de truques (uns baseados em emoção, outros em som, outros visuais, etc.)
- Use diferentes categorias gramaticais/vocabulário
- Os exemplos devem usar palavras e frases DIFERENTES em cada hack
- Varie entre hacks para iniciantes e avançados

TIPOS DE TRUQUES PARA INSPIRAR (mas sempre VARIAR):
- Quando usar uma palavra vs outra (baseado em emoção, não gramática)
- Padrões de som que indicam significado
- Atalhos para conjugação sem decorar tabelas
- Truques de memória visual/emocional
- "Regras secretas" que nativos usam inconscientemente
- Associações com palavras em português
- Contraste entre situações formais e informais
- Padrões de construção de frases comuns

IMPORTANTE: Cada geração deve trazer hacks DIFERENTES das anteriores. Use a seed, categorias e tipos de truques para garantir máxima variedade.

Retorne APENAS o JSON array, sem explicações.`;

    try {
        const response = await callOllamaApi(prompt, {
            systemMessage,
            language,
            temperature: 0.9, // Temperatura mais alta para maior variedade
            maxTokens: 8000,
            useCache: false,
        });

        let responseClean = response.trim();

        // Remove code blocks markdown se houver
        const jsonMatch = /```(?:json)?\s*(\[.*?\])\s*```/s.exec(responseClean);
        if (jsonMatch) {
            responseClean = jsonMatch[1];
        } else {
            const arrayMatch = /\[.*\]/s.exec(responseClean);
            if (arrayMatch) {
                responseClean = arrayMatch[0];
            }
        }

        // Tenta corrigir JSON truncado ou mal formatado
        let hacksList = null;
        try {
            hacksList = JSON.parse(responseClean);
        } catch {
            // Tenta fechar o JSON truncado
            for (const fix of [']}', '}]', '"}]}', '"}}]', '"}]']) {
                try {
                    hacksList = JSON.parse(responseClean + fix);
                    console.warn(`JSON corrigido com: ${fix}`);
                    break;
                } catch {
                    continue;
                }
            }
        }

        if (hacksList === null) {
            console.error('Não foi possível parsear JSON de hacks');
            console.error(`Resposta recebida: ${responseClean.slice(0, 500)}...`);
            throw new ApiError('Erro ao processar resposta da IA', 500, { parse_error: 'JSON inválido' });
        }

        if (!Array.isArray(hacksList)) {
            throw new ApiError('Resposta da IA não é um array', 500, {
                received_type: typeof hacksList,
            });
        }

        // Valida cada item
        const validatedList = [];
        for (const item of hacksList) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                continue;
            }
            const requiredKeys = ['hack_title', 'the_lie', 'how_it_works', 'examples', 'why_it_works'];
            if (requiredKeys.every((key) => key in item)) {
                // Valida examples
                if (Array.isArray(item.examples) && item.examples.length > 0) {
                    validatedList.push(item);
                }
            }
        }

        if (validatedList.length < count) {
            console.warn(`IA retornou apenas ${validatedList.length} hacks válidos de ${count} solicitados`);
        }

        return validatedList.slice(0, count);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error(`Erro inesperado ao gerar hacks: ${error}`);
        throw new ApiError('Erro ao gerar hacks', 500, { error: String(error) });
    }
}
