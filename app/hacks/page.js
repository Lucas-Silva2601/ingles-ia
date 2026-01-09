'use client';
import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { useApi } from '@/hooks/useApi';
import { useAppState } from '@/lib/AppStateContext';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { generateHacks } from '@/lib/api';
export function HacksProibidosPage() {
    const { language, setLanguage } = useAppState();
    const [hacks, setHacks] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { speak, voice, rate } = useTextToSpeech({ preferredLang: language });
    const { call: generateCall, loading, error } = useApi(generateHacks);
    const handleGenerate = async () => {
        try {
            const result = await generateCall({ language, count: 10 });
            setHacks(result.hacks);
            setCurrentIndex(0);
        }
        catch (err) {
            console.error('Erro ao gerar hacks:', err);
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
        if (currentIndex < hacks.length - 1)
            setCurrentIndex(currentIndex + 1);
    };
    const currentHack = hacks[currentIndex];
    return (<section className="page page-hacks">
      <header className="page-header">
        <div>
          <h1>🔓 Hacks Proibidos</h1>
          <p className="page-subtitle">
            Atalhos mentais que os livros não ensinam, mas funcionam na vida real.
          </p>
        </div>
      </header>

      <div className="hacks-container">
        {/* Controles */}
        <div className="hacks-controls">
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
            {loading ? 'Descobrindo Hacks...' : '🔍 Descobrir Hacks'}
          </Button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* Card do Hack atual */}
        {hacks.length > 0 && currentHack && (<div className="hacks-single">
            {/* Contador */}
            <div className="hacks-counter">
              Hack {currentIndex + 1} de {hacks.length}
            </div>

            <div className="hack-card">
              {/* Título do Hack */}
              <h2 className="hack-title">🔓 {currentHack.hack_title}</h2>

              {/* A "Mentira" / Regra Secreta */}
              <div className="hack-section hack-lie">
                <span className="hack-label">💡 A Regra Secreta:</span>
                <p className="hack-lie-text">{currentHack.the_lie}</p>
              </div>

              {/* Como Funciona */}
              <div className="hack-section">
                <span className="hack-label">🎯 Como Aplicar:</span>
                <p className="hack-how-text">{currentHack.how_it_works}</p>
              </div>

              {/* Exemplos */}
              <div className="hack-section hack-examples">
                <span className="hack-label">📝 Exemplos na Prática:</span>
                <ul className="hack-examples-list">
                  {currentHack.examples.map((example, idx) => (<li key={idx} className="hack-example-item">
                      <div className="hack-example-phrase">
                        <span>"{example.phrase}"</span>
                        <button type="button" className="hack-speak-button" onClick={() => handleSpeak(example.phrase)} title="Ouvir frase">
                          🔊
                        </button>
                      </div>
                      <span className="hack-example-translation">({example.translation})</span>
                    </li>))}
                </ul>
              </div>

              {/* Por que Funciona */}
              <div className="hack-section hack-why">
                <span className="hack-label">🧠 Por que Funciona:</span>
                <p className="hack-why-text">{currentHack.why_it_works}</p>
              </div>
            </div>

            {/* Botões de navegação */}
            <div className="hacks-navigation">
              <Button onClick={handlePrev} disabled={currentIndex === 0} variant="secondary">
                ← Anterior
              </Button>
              <Button onClick={handleNext} disabled={currentIndex === hacks.length - 1}>
                Próximo →
              </Button>
            </div>
          </div>)}

        {!loading && hacks.length === 0 && (<div className="hacks-empty">
            <p className="muted">
              Clique em "Descobrir Hacks" para revelar atalhos secretos do idioma.
            </p>
          </div>)}
      </div>
    </section>);
}
export default HacksProibidosPage;
