'use client';
import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { useApi } from '@/hooks/useApi';
import { useAppState } from '@/lib/AppStateContext';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { generateAntiPhrases } from '@/lib/api';
export function AntiFrasePage() {
    const { language, setLanguage } = useAppState();
    const [antiPhrases, setAntiPhrases] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { speak, voice, rate } = useTextToSpeech({ preferredLang: language });
    const { call: generateCall, loading, error } = useApi(generateAntiPhrases);
    const handleGenerate = async () => {
        try {
            const result = await generateCall({ language, count: 50 });
            setAntiPhrases(result.anti_phrases);
            setCurrentIndex(0);
        }
        catch (err) {
            console.error('Erro ao gerar anti-frases:', err);
        }
    };
    const handleSpeak = (phrase) => {
        speak(phrase, { voice: voice ?? undefined, rate });
    };
    const handlePrev = () => {
        if (currentIndex > 0)
            setCurrentIndex(currentIndex - 1);
    };
    const handleNext = () => {
        if (currentIndex < antiPhrases.length - 1)
            setCurrentIndex(currentIndex + 1);
    };
    const currentPhrase = antiPhrases[currentIndex];
    return (<section className="page page-anti-frase">
      <header className="page-header">
        <div>
          <h1>Anti-Frase</h1>
          <p className="page-subtitle">
            Aprenda o que <strong>NÃO</strong> dizer para evitar vergonhas, falsos amigos e
            duplos sentidos acidentais.
          </p>
        </div>
      </header>

      <div className="anti-frase-container">
        {/* Controles */}
        <div className="anti-frase-controls">
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

          <Button onClick={handleGenerate} disabled={loading} style={{ minWidth: '200px' }}>
            {loading ? 'Gerando Anti-Frases...' : 'Gerar Anti-Frases'}
          </Button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Card da Anti-Frase atual */}
        {antiPhrases.length > 0 && currentPhrase && (<div className="anti-frase-single">
            {/* Contador */}
            <div className="anti-frase-counter">
              {currentIndex + 1} / {antiPhrases.length}
            </div>

            <div className={`anti-frase-card anti-frase-card-full ${currentPhrase.severity === 'high' ? 'anti-frase-card-high' : 'anti-frase-card-medium'}`}>
              {/* Badge de severidade */}
              <div className="anti-frase-severity-badge">
                {currentPhrase.severity === 'high' ? '⚠️ Alto Risco' : '😅 Engraçado'}
              </div>

              {/* Frase errada */}
              <div className="anti-frase-section">
                <span className="anti-frase-label">❌ O que você NÃO deve dizer:</span>
                <div className="anti-frase-phrase-row">
                  <p className="anti-frase-wrong-text">{currentPhrase.wrong_phrase}</p>
                  <button type="button" className="anti-frase-speak-button" onClick={() => handleSpeak(currentPhrase.wrong_phrase)} title="Ouvir frase">
                    🔊
                  </button>
                </div>
              </div>

              {/* Explicação do erro */}
              <div className="anti-frase-section anti-frase-explanation">
                <span className="anti-frase-label">🤔 Por que está errado?</span>
                <p className="anti-frase-explanation-text">{currentPhrase.native_meaning}</p>
              </div>

              {/* Frase correta */}
              <div className="anti-frase-section">
                <span className="anti-frase-label">✅ Como deve ser dito:</span>
                <div className="anti-frase-phrase-row">
                  <p className="anti-frase-correct-text">{currentPhrase.correct_phrase}</p>
                  <button type="button" className="anti-frase-speak-button" onClick={() => handleSpeak(currentPhrase.correct_phrase)} title="Ouvir frase">
                    🔊
                  </button>
                </div>
                <p className="anti-frase-translation">{currentPhrase.correct_translation}</p>
              </div>
            </div>

            {/* Botões de navegação */}
            <div className="anti-frase-navigation">
              <Button onClick={handlePrev} disabled={currentIndex === 0} variant="secondary">
                ← Anterior
              </Button>
              <Button onClick={handleNext} disabled={currentIndex === antiPhrases.length - 1}>
                Próxima →
              </Button>
            </div>
          </div>)}

        {!loading && antiPhrases.length === 0 && (<div className="anti-frase-empty">
            <p className="muted">
              Clique em "Gerar Anti-Frases" para ver exemplos do que <strong>NÃO</strong> dizer no
              idioma selecionado.
            </p>
          </div>)}
      </div>
    </section>);
}
export default AntiFrasePage;
