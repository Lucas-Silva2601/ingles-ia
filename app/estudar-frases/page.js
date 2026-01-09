'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { embaralharPalavras, normalizarFrase, separarFraseETraducao } from '@/utils/textUtils';
import { getPhraseExplanation } from '@/lib/api';
import confetti from 'canvas-confetti';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { STUDY_CONFIG_KEY, } from '@/app/estudar-frases-config/page';
export function EstudarFrasesPage() {
    const router = useRouter();
    // Recupera configurações salvas pela página de configuração (sessionStorage)
    const [config, setConfig] = useState(null);
    const [configLoaded, setConfigLoaded] = useState(false);
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STUDY_CONFIG_KEY);
            if (raw) {
                setConfig(JSON.parse(raw));
            }
        }
        catch {
            // sessionStorage indisponível ou conteúdo inválido
        }
        setConfigLoaded(true);
    }, []);
    // Se não houver configurações, redireciona para a página de configuração
    useEffect(() => {
        if (configLoaded && !config) {
            router.replace('/estudar-frases-config');
        }
    }, [configLoaded, config, router]);
    const { voice, rate, setRate, speak, } = useTextToSpeech({ preferredLang: config?.language });
    const [sentences, setSentences] = useState([]);
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [currentPhrase, setCurrentPhrase] = useState(''); // Apenas a frase em si
    const [currentTranslation, setCurrentTranslation] = useState(''); // Tradução
    const [pieces, setPieces] = useState([]);
    const [selectedPieces, setSelectedPieces] = useState([]);
    const [isCorrect, setIsCorrect] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    // Inicializa frases quando a página carrega
    useEffect(() => {
        if (config && config.sentences && config.sentences.length > 0) {
            setSentences(config.sentences);
            setCurrentPhraseIndex(0);
        }
    }, [config]);
    // Atualiza frase atual quando o índice muda
    useEffect(() => {
        if (sentences.length > 0 && currentPhraseIndex < sentences.length) {
            const fraseCompleta = sentences[currentPhraseIndex];
            // Separa frase e tradução
            const { frase, traducao } = separarFraseETraducao(fraseCompleta);
            // Valida que a frase tem pelo menos 2 palavras e contém letras
            if (frase && frase.trim().split(/\s+/).length >= 2 && /[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(frase)) {
                setCurrentPhrase(frase.trim());
                setCurrentTranslation(traducao);
            }
            else {
                // Se a frase não é válida, pula para a próxima
                console.warn('Frase inválida encontrada:', fraseCompleta);
                if (currentPhraseIndex < sentences.length - 1) {
                    setCurrentPhraseIndex(currentPhraseIndex + 1);
                }
            }
        }
    }, [sentences, currentPhraseIndex]);
    // Embaralha palavras quando a frase muda
    useEffect(() => {
        if (currentPhrase && currentPhrase.trim()) {
            const words = embaralharPalavras(currentPhrase);
            // Valida que temos pelo menos 2 palavras
            if (words.length >= 2) {
                // Cria IDs únicos para cada palavra baseados no texto e posição
                const newPieces = words.map((word, index) => ({
                    id: `${word}-${index}-${Date.now()}`, // ID único
                    text: word,
                    used: false,
                }));
                setPieces(newPieces);
                setSelectedPieces([]);
                setIsCorrect(null);
                setHasInteracted(false);
                setShowExplanation(false);
                setExplanation(null);
            }
            else {
                console.warn('Frase não gerou palavras suficientes:', currentPhrase, 'Palavras:', words);
                // Se não tem palavras suficientes, tenta pular para próxima frase
                if (currentPhraseIndex < sentences.length - 1) {
                    setCurrentPhraseIndex(currentPhraseIndex + 1);
                }
            }
        }
    }, [currentPhrase, currentPhraseIndex, sentences.length]);
    // Reproduz frase automaticamente ao carregar (usar hook de TTS)
    useEffect(() => {
        if (currentPhrase && voice) {
            const timer = setTimeout(() => {
                speak(currentPhrase);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPhrase, voice, speak]);
    // Função para tocar som de acerto
    const playSuccessSound = () => {
        try {
            const audio = new Audio('/assets/audio/positive_beeps.mp3');
            audio.volume = 0.7;
            audio.play().catch((error) => {
                console.error('Erro ao tocar som de sucesso:', error);
            });
        }
        catch (error) {
            console.error('Erro ao carregar som de sucesso:', error);
        }
    };
    // Função para tocar som de erro
    const playErrorSound = () => {
        try {
            const audio = new Audio('/assets/audio/negative_beeps.mp3');
            audio.volume = 0.7;
            audio.play().catch((error) => {
                console.error('Erro ao tocar som de erro:', error);
            });
        }
        catch (error) {
            console.error('Erro ao carregar som de erro:', error);
        }
    };
    const handlePieceClick = (piece) => {
        setHasInteracted(true);
        // Verifica se a palavra já está selecionada - se sim, remove (toggle)
        const isAlreadySelected = selectedPieces.some((p) => p.id === piece.id);
        if (isAlreadySelected) {
            // Remove a palavra se já estiver selecionada
            setSelectedPieces((prev) => prev.filter((p) => p.id !== piece.id));
        }
        else {
            // Adiciona a palavra se não estiver selecionada
            setSelectedPieces((prev) => [...prev, piece]);
        }
        // Permite continuar manipulando mesmo após acertar
        if (isCorrect === true) {
            setIsCorrect(null);
        }
        else {
            setIsCorrect(null);
        }
    };
    const handleRemovePiece = (pieceToRemove, event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedPieces((prev) => prev.filter((p) => p.id !== pieceToRemove.id));
        setIsCorrect(null);
    };
    // Validação automática quando todas as palavras são selecionadas
    useEffect(() => {
        if (pieces.length > 0 &&
            selectedPieces.length === pieces.length &&
            isCorrect === null &&
            !showExplanation &&
            currentPhrase &&
            selectedPieces.length > 0) {
            // Pequeno delay para melhor UX
            const timer = setTimeout(() => {
                const selectedText = selectedPieces.map((p) => p.text).join(' ');
                const normalizedSelected = normalizarFrase(selectedText);
                const normalizedOriginal = normalizarFrase(currentPhrase);
                const correct = normalizedSelected === normalizedOriginal;
                setIsCorrect(correct);
                setHasInteracted(true);
                // Toca som baseado no resultado
                if (correct) {
                    playSuccessSound();
                    // Dispara confetes
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#22c55e', '#38bdf8', '#a855f7', '#f59e0b'],
                    });
                }
                else {
                    playErrorSound();
                }
            }, 300);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPieces, pieces.length, isCorrect, showExplanation, currentPhrase]);
    const handleGetExplanation = async () => {
        if (!config)
            return;
        // Determina se é uma palavra única ou frase completa
        const selectedText = selectedPieces.map((p) => p.text).join(' ').trim();
        const isSingleWord = selectedPieces.length === 1;
        if (!selectedText)
            return;
        setLoadingExplanation(true);
        setShowExplanation(true);
        try {
            const result = await getPhraseExplanation({
                phrase: selectedText,
                language: config.language,
                isSingleWord, // Passa flag indicando se é palavra única
            });
            // Se for palavra única, usa estrutura diferente
            if (isSingleWord) {
                setExplanation({
                    translation: result.translation, // Significado da palavra
                    examples: result.examples, // 3 frases de exemplo
                });
            }
            else {
                // Para frases completas, usa a tradução da API de frases se disponível
                const finalTranslation = currentTranslation || result.translation;
                setExplanation({
                    translation: finalTranslation,
                    examples: result.examples,
                });
            }
        }
        catch (error) {
            console.error('Erro ao buscar explicação:', error);
            setExplanation({
                translation: isSingleWord
                    ? 'Erro ao carregar significado'
                    : currentTranslation || 'Erro ao carregar tradução',
                examples: ['Erro ao carregar exemplos'],
            });
        }
        finally {
            setLoadingExplanation(false);
        }
    };
    const handleSRS = (minutes) => {
        console.log(`Agendando revisão da frase "${currentPhrase}" em ${minutes} minutos`);
        // TODO: Implementar lógica real de SRS
        nextPhrase();
    };
    const nextPhrase = () => {
        if (sentences.length > 0) {
            const nextIndex = (currentPhraseIndex + 1) % sentences.length;
            setCurrentPhraseIndex(nextIndex);
            setIsCorrect(null);
            setShowExplanation(false);
            setExplanation(null);
            setHasInteracted(false);
        }
    };
    if (!config) {
        return null; // Será redirecionado
    }
    // Ícones SVG inline
    const SpeakerIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>);
    const RobotIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="16" r="1"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>);
    return (<section className="page page-estudar-frases-pratica">
      <div className="estudar-frases-layout">
        <div className="estudar-frases-card">
        {/* Área de frase montada (cinza grande) */}
        <div className={`phrase-display-area ${selectedPieces.length > 0 ? 'has-selected' : ''}`}>
          {selectedPieces.length > 0 ? (<>
              <div className="selected-phrase-text">
                {selectedPieces.map((piece, index) => (<button key={`${piece.id}-${index}`} type="button" className="selected-word-in-phrase" onClick={(e) => handleRemovePiece(piece, e)} onMouseDown={(e) => e.preventDefault()} title="Clique para remover">
                    {piece.text}
                  </button>))}
              </div>
              {/* Mostra tradução quando houver explicação ou quando acertar */}
              {(showExplanation || isCorrect === true) && currentTranslation && (<div className="phrase-translation">
                  {currentTranslation}
                </div>)}
            </>) : (<div className="phrase-placeholder">
              Clique nas palavras abaixo para montar a frase
            </div>)}
          {isCorrect === true && (<div className="correct-indicator">✓ Correto!</div>)}
        </div>

        {/* Palavras embaralhadas (caixinhas azuis) - sempre visíveis e sempre interativas */}
        <div className="word-boxes-container">
          {pieces.map((piece) => {
            const isSelected = selectedPieces.some((sp) => sp.id === piece.id);
            return (<button key={piece.id} type="button" className={`word-box-button ${isSelected ? 'selected' : ''}`} onClick={() => handlePieceClick(piece)}>
                {piece.text}
              </button>);
        })}
        </div>

        {/* Controle de velocidade */}
        <label className="field" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          <span>Velocidade: {rate.toFixed(1)}x</span>
          <input type="range" min={0.7} max={1.3} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))}/>
        </label>

        {/* Botões de ação */}
        <div className="action-buttons-row">
          <button type="button" className="action-button action-button-speaker" onClick={() => currentPhrase && speak(currentPhrase)}>
            <SpeakerIcon />
            Repetir Frase
          </button>
          <button type="button" className="action-button action-button-ai" onClick={handleGetExplanation} disabled={selectedPieces.length === 0 || loadingExplanation}>
            <RobotIcon />
            {loadingExplanation ? 'Carregando...' : 'Explicação por IA'}
          </button>
        </div>

          {/* Botões SRS (só aparecem após interação) */}
          {hasInteracted && (<div className="srs-buttons-container">
              <button type="button" className="srs-button srs-button-easy" onClick={() => handleSRS(5)}>
                Fácil (5MIN)
              </button>
              <button type="button" className="srs-button srs-button-medium" onClick={() => handleSRS(3)}>
                Médio (3MIN)
              </button>
              <button type="button" className="srs-button srs-button-hard" onClick={() => handleSRS(2)}>
                Difícil (2MIN)
              </button>
            </div>)}
        </div>

        {/* Painel lateral de explicação da IA (lado direito) */}
        {showExplanation && explanation && (<aside className="estudar-frases-explanation-panel">
            <div className="explanation-modal-card">
              <h3>Explicação da IA</h3>

              {/* Tradução e definição */}
              <div className="explanation-translation">
                <strong>TRADUÇÃO E DEFINIÇÃO</strong>
                <span>{explanation.translation}</span>
              </div>

              {/* Exemplos */}
              <div className="explanation-examples">
                <strong>Exemplos</strong>
                <ul>
                  {explanation.examples.map((example, index) => {
                // Formato esperado: "Frase no idioma selecionado : (tradução em português)"
                const match = example.match(/^(.+?)\s*:\s*\((.+?)\)\s*$/);
                if (match) {
                    let fraseOriginal = match[1].trim();
                    let traducao = match[2].trim();
                    // Garante estrutura: "frase no idioma.(tradução em português.)"
                    if (!fraseOriginal.endsWith('.')) {
                        fraseOriginal = `${fraseOriginal}.`;
                    }
                    if (!traducao.endsWith('.')) {
                        traducao = `${traducao}.`;
                    }
                    return (<li key={index}>
                          <span className="example-phrase">{fraseOriginal}</span>{' '}
                          <span className="example-translation">
                            ({traducao})
                          </span>
                        </li>);
                }
                // Fallback caso venha em outro formato
                return <li key={index}>{example}</li>;
            })}
                </ul>
              </div>

              <button type="button" className="close-explanation-button" onClick={() => setShowExplanation(false)}>
                Fechar
              </button>
            </div>
          </aside>)}
      </div>
    </section>);
}
export default EstudarFrasesPage;
