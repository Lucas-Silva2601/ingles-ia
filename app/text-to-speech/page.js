'use client';
import { useMemo, useState, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { useApi } from '@/hooks/useApi';
import { getPhraseExplanation } from '@/lib/api';
import { processarTextoParaSintese } from '@/utils/textUtils';
import { useAppState } from '@/lib/AppStateContext';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
export function TextToSpeechPage() {
    const [text, setText] = useState('');
    const { language, setLanguage } = useAppState();
    const [explanation, setExplanation] = useState(null);
    const textareaRef = useRef(null);
    const { voices, voice, setVoice, rate, setRate, status, speak, loadingVoices, voicesError, } = useTextToSpeech({ preferredLang: language });
    const { call: explainTextCall, loading: explainLoading, error: explainError } = useApi(getPhraseExplanation);
    const wordCount = useMemo(() => {
        return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    }, [text]);
    const wordBoxes = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
    // Insere < no início do texto ou na posição do cursor
    const handleInicio = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = text.slice(0, start) + '<' + text.slice(end);
            setText(newText);
            // Reposiciona o cursor após o < inserido
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
            }, 0);
        }
        else {
            setText('<' + text);
        }
    };
    // Insere > no final do texto ou na posição do cursor
    const handleFim = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = text.slice(0, start) + '>' + text.slice(end);
            setText(newText);
            // Reposiciona o cursor após o > inserido
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
            }, 0);
        }
        else {
            setText(text + '>');
        }
    };
    // Reproduz apenas o texto entre < >
    const handleReproduzir = () => {
        const textoProcessado = processarTextoParaSintese(text);
        if (textoProcessado.trim()) {
            speak(textoProcessado);
        }
    };
    // Remove os caracteres < > do texto, mantendo o conteúdo
    const handleLimpar = () => {
        const textoLimpo = text.replace(/[<>]/g, '');
        setText(textoLimpo);
    };
    // Remove todo o texto
    const handleRemover = () => {
        setText('');
        setExplanation(null);
    };
    // Explica palavra ou frase selecionada com IA
    const handleExplicar = async () => {
        const textarea = textareaRef.current;
        let textoParaExplicar = text.trim();
        // Se houver seleção, usa o texto selecionado
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
            textoParaExplicar = text.slice(textarea.selectionStart, textarea.selectionEnd).trim();
        }
        else {
            // Se não houver seleção, tenta extrair o conteúdo entre < >
            const textoEntreTags = processarTextoParaSintese(text);
            if (textoEntreTags.trim() && textoEntreTags !== text) {
                textoParaExplicar = textoEntreTags;
            }
        }
        if (!textoParaExplicar)
            return;
        // Detecta se é uma palavra única (sem espaços) ou uma frase
        const palavras = textoParaExplicar.trim().split(/\s+/).filter(Boolean);
        const isSingleWord = palavras.length === 1;
        try {
            const result = await explainTextCall({
                phrase: textoParaExplicar,
                language,
                isSingleWord,
            });
            setExplanation(result);
        }
        catch (error) {
            console.error('Erro ao obter explicação:', error);
        }
    };
    return (<section className="page page-text-to-speech">
      <header className="page-header">
        <div>
          <h1>Text to Speech</h1>
          <p className="page-subtitle">
            Ouça o texto com diferentes vozes e peça à IA explicações rápidas.
          </p>
        </div>
      </header>

      <div className="tts-grid">
        <div className="tts-left">
          <label className="field">
            <span>Texto</span>
            <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite ou cole seu texto aqui..." rows={6}/>
            <span className="word-count" style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
            </span>
          </label>

          <div className="field-group">
            <label className="field">
              <span>Idioma</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">Inglês (en)</option>
                <option value="es">Espanhol (es)</option>
                <option value="fr">Francês (fr)</option>
                <option value="de">Alemão (de)</option>
                <option value="it">Italiano (it)</option>
                <option value="pt-BR">Português (pt-BR)</option>
                <option value="pt-PT">Português de Portugal (pt-PT)</option>
                <option value="ru">Russo (ru)</option>
                <option value="ja">Japonês (ja)</option>
                <option value="ko">Coreano (ko)</option>
                <option value="zh-CN">Chinês Simplificado (zh-CN)</option>
                <option value="zh-TW">Chinês Tradicional (zh-TW)</option>
                <option value="ar">Árabe (ar)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="nl">Holandês (nl)</option>
                <option value="pl">Polonês (pl)</option>
                <option value="tr">Turco (tr)</option>
                <option value="sv">Sueco (sv)</option>
                <option value="da">Dinamarquês (da)</option>
                <option value="no">Norueguês (no)</option>
                <option value="fi">Finlandês (fi)</option>
                <option value="el">Grego (el)</option>
                <option value="he">Hebraico (he)</option>
                <option value="th">Tailandês (th)</option>
                <option value="vi">Vietnamita (vi)</option>
                <option value="id">Indonésio (id)</option>
                <option value="ms">Malaio (ms)</option>
                <option value="cs">Tcheco (cs)</option>
                <option value="hu">Húngaro (hu)</option>
                <option value="ro">Romeno (ro)</option>
                <option value="uk">Ucraniano (uk)</option>
              </select>
            </label>

            <label className="field">
              <span>Voz</span>
              <select value={voice?.name || ''} onChange={(e) => {
            const selected = voices.find((v) => v.name === e.target.value);
            if (selected)
                setVoice(selected);
        }} disabled={loadingVoices || voices.length === 0}>
                {voices.length === 0 && (<option>Carregando vozes...</option>)}
                {voices.map((v) => (<option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>))}
              </select>
            </label>

            <label className="field">
              <span>Velocidade: {rate.toFixed(1)}x</span>
              <input type="range" min={0.5} max={1.5} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))}/>
            </label>
          </div>

          <div className="tts-actions-grid">
            <Button onClick={handleInicio} className="tts-btn-inicio" style={{ background: '#22c55e', color: '#0b1120' }}>
              Início
            </Button>
            <Button onClick={handleFim} className="tts-btn-fim" style={{ background: '#ef4444', color: '#ffffff' }}>
              Fim
            </Button>
            <Button onClick={handleReproduzir} disabled={!text.trim() || status === 'speaking'} className="tts-btn-reproduzir" style={{ background: '#38bdf8', color: '#0b1120' }}>
              {status === 'speaking' ? 'Reproduzindo...' : 'Reproduzir'}
            </Button>
            <Button onClick={handleRemover} className="tts-btn-remover" style={{ background: '#475569', color: '#ffffff' }}>
              Remover
            </Button>
            <Button onClick={handleLimpar} className="tts-btn-limpar" style={{ background: '#f97316', color: '#ffffff' }}>
              Limpar
            </Button>
            <Button onClick={handleExplicar} disabled={!text.trim() || explainLoading} className="tts-btn-explicar" style={{ background: '#a855f7', color: '#ffffff' }}>
              {explainLoading ? 'Consultando IA...' : 'Explicar com IA'}
            </Button>
          </div>

          {status === 'speaking' && (<div className="audio-visualizer">
              <span className="audio-bar"/>
              <span className="audio-bar"/>
              <span className="audio-bar"/>
              <span className="audio-bar"/>
            </div>)}

          {voicesError && <p className="error">{voicesError}</p>}
          {explainError && <p className="error">{explainError}</p>}
        </div>

        <div className="tts-right">
          <h2>Palavras</h2>
          <div className="word-grid">
            {wordBoxes.map((word, index) => (<button key={`${word}-${index}`} type="button" className="word-box word-box-clickable" onClick={() => speak(word)} title={`Clique para ouvir "${word}"`}>
                {word}
              </button>))}
          </div>

          <h2>Explicação da IA</h2>
          <div className="explanation-box">
            {explanation ? (<div className="ai-explanation">
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '0.5rem' }}>
                    Significado:
                  </strong>
                  <p style={{ color: '#cbd5e1', margin: 0 }}>
                    {explanation.translation}
                  </p>
                </div>
                {explanation.examples && explanation.examples.length > 0 && (<div>
                    <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '0.5rem' }}>
                      Exemplos de uso:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1' }}>
                      {explanation.examples.map((example, index) => {
                    // Parse formato "Frase : (Tradução)"
                    const match = example.match(/^(.+?)\s*:\s*\((.+?)\)\s*$/);
                    if (match) {
                        return (<li key={index} style={{ marginBottom: '0.5rem' }}>
                              <span style={{ color: '#38bdf8' }}>{match[1].trim()}</span>{' '}
                              <span style={{ color: '#94a3b8' }}>({match[2].trim()})</span>
                            </li>);
                    }
                    return (<li key={index} style={{ marginBottom: '0.5rem' }}>
                            {example}
                          </li>);
                })}
                    </ul>
                  </div>)}
              </div>) : (<p style={{ color: '#64748b' }}>
                Selecione um texto ou palavra e clique em &quot;Explicar com IA&quot;.
              </p>)}
          </div>
        </div>
      </div>
    </section>);
}
export default TextToSpeechPage;
