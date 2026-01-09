export function normalizarFrase(frase) {
    if (!frase || typeof frase !== 'string') {
        return '';
    }
    return frase
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*([.,!?;:])/g, '$1')
        .replace(/([.,!?;:])(?=\S)/g, '$1 ')
        .trim();
}
export function separarFraseETraducao(fraseCompleta) {
    if (!fraseCompleta || typeof fraseCompleta !== 'string') {
        return { frase: '', traducao: '' };
    }
    let value = fraseCompleta.trim();
    // Remove espaços extras e normaliza
    value = value.replace(/\s+/g, ' ').trim();
    // Remove números seguidos de ponto no início (ex: "41. frase : (tradução)" -> "frase : (tradução)")
    value = value.replace(/^\d+\.\s*/, '');
    // Remove classificações de nível no início ou meio (B1-B2, A1-A2, etc)
    value = value.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\s*/gi, '');
    // Remove palavras de classificação de dificuldade no início
    value = value.replace(/^(Fáceis|Médias|Difíceis|Fases|Fase)\s*/i, '');
    // Remove texto antes do primeiro ":" que possa ser classificação ou explicação
    // Ex: "Fáceis: frase : (tradução)" -> "frase : (tradução)"
    const explanationPrefixes = /^(Fáceis|Médias|Difíceis|Fases|Fase|Aqui|Lista|Frases|Exemplos|Seguem|Abaixo|Agora|Próxima|Seguinte)\s*:\s*/i;
    value = value.replace(explanationPrefixes, '').trim();
    // Tenta primeiro o formato padrão: "frase : (tradução)"
    let match = value.match(/^(.+?)\s*:\s*\(([^)]+)\)\s*$/);
    if (match) {
        let frase = match[1].trim();
        const traducao = match[2].trim();
        // Remove classificações que possam ter sobrado na frase
        frase = frase.replace(/\b(Fáceis|Médias|Difíceis|Fases|Fase)\b/gi, '').trim();
        frase = frase.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\b/gi, '').trim();
        frase = frase.replace(/^\d+\.\s*/, '').trim();
        // Remove complementos após vírgulas que podem ter sido adicionados pela IA
        // Ex: "I need milk, it's important" -> "I need milk"
        // Mas apenas se houver padrões típicos de complementos
        const complementPattern = /,\s+(it'?s|it is|that'?s|that is|this is|they are|they'?re|which is|which are|who is|who are).+$/i;
        frase = frase.replace(complementPattern, '').trim();
        // Remove múltiplas frases separadas por ponto (pega apenas a primeira)
        // Ex: "First sentence. Second sentence : (tradução)" -> "First sentence : (tradução)"
        if (frase.includes('.') && frase.split('.').length > 2) {
            const sentences = frase.split('.');
            // Pega a primeira frase completa (que deve ter pelo menos 3 palavras)
            let firstSentence = sentences[0].trim();
            for (let i = 1; i < sentences.length; i++) {
                const nextPart = sentences[i].trim();
                if (nextPart.split(/\s+/).length >= 3) {
                    break; // Encontrou uma segunda frase completa, para aqui
                }
                firstSentence += '. ' + nextPart;
            }
            frase = firstSentence.trim();
        }
        // Valida que a frase não está vazia e contém letras
        if (frase && /[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(frase)) {
            return { frase, traducao };
        }
    }
    // Tenta formato alternativo sem parênteses: "frase : tradução"
    match = value.match(/^(.+?)\s*:\s*(.+?)\s*$/);
    if (match) {
        let frase = match[1].trim();
        const traducao = match[2].trim();
        // Remove classificações que possam ter sobrado na frase
        frase = frase.replace(/\b(Fáceis|Médias|Difíceis|Fases|Fase)\b/gi, '').trim();
        frase = frase.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\b/gi, '').trim();
        frase = frase.replace(/^\d+\.\s*/, '').trim();
        // Remove complementos após vírgulas que podem ter sido adicionados pela IA
        const complementPattern = /,\s+(it'?s|it is|that'?s|that is|this is|they are|they'?re|which is|which are|who is|who are).+$/i;
        frase = frase.replace(complementPattern, '').trim();
        // Remove múltiplas frases separadas por ponto (pega apenas a primeira)
        if (frase.includes('.') && frase.split('.').length > 2) {
            const sentences = frase.split('.');
            let firstSentence = sentences[0].trim();
            for (let i = 1; i < sentences.length; i++) {
                const nextPart = sentences[i].trim();
                if (nextPart.split(/\s+/).length >= 3) {
                    break;
                }
                firstSentence += '. ' + nextPart;
            }
            frase = firstSentence.trim();
        }
        // Remove parênteses da tradução se houver
        const traducaoLimpa = traducao.replace(/^\(|\)$/g, '').trim();
        if (frase && /[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(frase)) {
            return { frase, traducao: traducaoLimpa };
        }
    }
    // Último recurso: divide por dois pontos
    const partes = value.split(':');
    if (partes.length >= 2) {
        let frase = partes[0].trim();
        const traducaoCompleta = partes.slice(1).join(':').trim();
        const traducao = traducaoCompleta.replace(/^\(|\)$/g, '').trim();
        // Remove classificações que possam ter sobrado na frase
        frase = frase.replace(/\b(Fáceis|Médias|Difíceis|Fases|Fase)\b/gi, '').trim();
        frase = frase.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\b/gi, '').trim();
        frase = frase.replace(/^\d+\.\s*/, '').trim();
        if (frase && /[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(frase)) {
            return { frase, traducao };
        }
    }
    // Se nada funcionou, retorna a string original como frase (sem tradução)
    // Remove possíveis traduções que possam estar misturadas
    let fraseLimpa = value.split(':')[0].trim().replace(/\([^)]*\)/g, '').trim();
    fraseLimpa = fraseLimpa.replace(/\b(Fáceis|Médias|Difíceis|Fases|Fase)\b/gi, '').trim();
    fraseLimpa = fraseLimpa.replace(/\b\(?[A-Z]\d+-[A-Z]?\d+\)?\b/gi, '').trim();
    fraseLimpa = fraseLimpa.replace(/^\d+\.\s*/, '').trim();
    if (fraseLimpa && /[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(fraseLimpa)) {
        return { frase: fraseLimpa, traducao: '' };
    }
    return { frase: '', traducao: '' };
}
export function embaralharPalavras(frase) {
    if (!frase || typeof frase !== 'string' || frase.trim() === '') {
        return [];
    }
    // A frase já deve vir separada da tradução pela função separarFraseETraducao
    // Apenas normaliza e separa as palavras
    let fraseNormalizada = frase.trim();
    // Remove números seguidos de ponto no início (ex: "41. I am..." -> "I am...")
    fraseNormalizada = fraseNormalizada.replace(/^\d+\.\s*/, '');
    // Remove espaços extras
    fraseNormalizada = fraseNormalizada.replace(/\s+/g, ' ').trim();
    // Lista de palavras que são claramente parte de explicações ou classificações
    const palavrasParaRemover = [
        // Palavras de explicação em português
        'trabalhe', 'gere', 'nativo', 'frases', 'lista', 'formato', 'exemplo',
        'regras', 'estritas', 'apenas', 'siga', 'crie', 'faça', 'pode', 'ciência',
        'agora', 'difíceis', 'estão', 'idiomáticas', 'modernas', 'expressões',
        'úteis', 'gírias', 'projeto', 'ajudar',
        // Classificações de dificuldade
        'fáceis', 'fácil', 'médias', 'média', 'difíceis', 'difícil',
        'fases', 'fase'
    ];
    // Remove classificações de nível (B1-B2, A1-A2, etc)
    fraseNormalizada = fraseNormalizada.replace(/\b[A-Z]\d+-[A-Z]?\d+\b/gi, '').trim();
    fraseNormalizada = fraseNormalizada.replace(/\b\([A-Z]\d+-[A-Z]?\d+\)\b/gi, '').trim();
    // Separa palavras simplesmente por espaços
    const tokens = fraseNormalizada.split(/\s+/);
    const palavras = [];
    for (const token of tokens) {
        let palavra = token.trim();
        if (palavra.length === 0)
            continue;
        // Remove apenas pontuação final (mantém contrações como "don't", "I'm", etc)
        palavra = palavra.replace(/[.,!?;:()]+$/, '');
        palavra = palavra.replace(/^[.,!?;:()]+/, '');
        if (palavra.length === 0)
            continue;
        // Remove números puros ou combinações de letras e números que são classificações
        if (/^\d+$/.test(palavra) || /^[A-Z]\d+$/i.test(palavra)) {
            continue;
        }
        // Verifica se contém pelo menos uma letra
        if (!/[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(palavra)) {
            continue;
        }
        // Remove palavras que são claramente parte de explicações ou classificações
        const palavraLower = palavra.toLowerCase();
        if (palavrasParaRemover.includes(palavraLower)) {
            continue;
        }
        palavras.push(palavra);
    }
    // Se não encontrou palavras, tenta método alternativo mais permissivo
    if (palavras.length === 0) {
        // Regex que captura qualquer palavra (incluindo contrações)
        const regex = /\b([a-zA-ZÀ-ÿ\u00C0-\u017F]+(?:'[a-zA-ZÀ-ÿ\u00C0-\u017F]+)?)\b/g;
        let match;
        while ((match = regex.exec(fraseNormalizada)) !== null) {
            const palavra = match[1].trim();
            const palavraLower = palavra.toLowerCase();
            // Pula números, classificações e palavras de explicação
            if (palavra.length > 0 &&
                !/^\d+$/.test(palavra) &&
                !/^[A-Z]\d+$/i.test(palavra) &&
                !palavrasParaRemover.includes(palavraLower)) {
                palavras.push(palavra);
            }
        }
    }
    // Embaralha as palavras
    for (let i = palavras.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [palavras[i], palavras[j]] = [palavras[j], palavras[i]];
    }
    return palavras;
}
export function formatarExplicacao(texto, formato = 'default') {
    if (!texto || typeof texto !== 'string') {
        return '';
    }
    let formatado = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const linhas = formatado.split('\n');
    const partesResultado = [];
    let dentroSecao = false;
    let dentroLista = false;
    linhas.forEach((linhaRaw) => {
        let linha = linhaRaw.trim();
        if (!linha)
            return;
        if (/^Significado:/i.test(linha)) {
            if (dentroSecao)
                partesResultado.push('</div>');
            if (dentroLista) {
                partesResultado.push('</ul>');
                dentroLista = false;
            }
            partesResultado.push('<h4 class="ai-section-title">Significado:</h4><div class="ai-section-content">');
            dentroSecao = true;
            return;
        }
        if (/^Como a frase pode ser usada:/i.test(linha)) {
            if (dentroSecao)
                partesResultado.push('</div>');
            if (dentroLista) {
                partesResultado.push('</ul>');
                dentroLista = false;
            }
            partesResultado.push('<h4 class="ai-section-title">Como a frase pode ser usada:</h4><div class="ai-section-content">');
            dentroSecao = true;
            return;
        }
        if (/^Exemplo de frases:/i.test(linha)) {
            if (dentroSecao)
                partesResultado.push('</div>');
            partesResultado.push('<h4 class="ai-section-title">Exemplo de frases:</h4><div class="ai-section-content"><ul class="ai-examples-list">');
            dentroSecao = true;
            dentroLista = true;
            return;
        }
        if (/^-\s+/.test(linha) && dentroSecao) {
            const exemplo = linha.replace(/^-\s+/, '');
            if (formato === 'frases') {
                const m = exemplo.match(/^(.+?)\s*\(([^)]+)\)/);
                if (m) {
                    partesResultado.push(`<li><span class="ai-example-en">${m[1].trim()}</span> <span class="ai-example-pt">(${m[2].trim()})</span></li>`);
                }
                else {
                    partesResultado.push(`<li>${exemplo}</li>`);
                }
            }
            else {
                const m = exemplo.match(/^(.+?)\s+"([^"]+)"/);
                if (m) {
                    partesResultado.push(`<li><span class="ai-example-en">${m[1]}</span> <span class="ai-example-pt">"${m[2]}"</span></li>`);
                }
                else {
                    partesResultado.push(`<li>${exemplo}</li>`);
                }
            }
            return;
        }
        if (dentroSecao) {
            if (dentroLista && !/^-\s+/.test(linha)) {
                partesResultado.push('</ul>');
                dentroLista = false;
            }
            partesResultado.push(`${linha}<br>`);
        }
        else {
            partesResultado.push(`${linha}<br>`);
        }
    });
    if (dentroLista) {
        partesResultado.push('</ul>');
    }
    if (dentroSecao) {
        partesResultado.push('</div>');
    }
    return partesResultado.join('');
}
/**
 * Processa o texto para síntese de voz, extraindo apenas o conteúdo entre < >
 * Se não houver marcadores < >, retorna o texto original completo
 * @param text - Texto de entrada
 * @returns Texto processado: conteúdo entre < > concatenado ou texto original se não houver marcadores
 */
export function processarTextoParaSintese(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    // Verifica se o texto contém os caracteres < e >
    if (!text.includes('<') || !text.includes('>')) {
        // Se não houver os marcadores, retorna o texto original completo
        return text;
    }
    // Regex para extrair todo o conteúdo entre < e >
    // Usa non-greedy (.*?) para capturar múltiplos pares
    const regex = /<([^>]+)>/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length === 0) {
        // Se não houver matches válidos, retorna o texto original
        return text;
    }
    // Concatena todo o conteúdo extraído
    const conteudoExtraido = matches
        .map((match) => match[1].trim())
        .filter(Boolean)
        .join(' ');
    return conteudoExtraido;
}
