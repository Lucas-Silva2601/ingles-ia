'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { useAppState } from '@/lib/AppStateContext';
import { generateSentences } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
/** Chave usada para compartilhar a configuração entre as páginas de config e prática. */
export const STUDY_CONFIG_KEY = 'linguasia_estudar_config';
export function EstudarFrasesConfigPage() {
    const router = useRouter();
    const { language, setLanguage } = useAppState();
    const [selectedLanguage, setSelectedLanguage] = useState(language);
    const { voices, loadingVoices } = useTextToSpeech({ preferredLang: selectedLanguage });
    const [selectedVoice, setSelectedVoice] = useState(null);
    const { call: generateSentencesCall, loading, error } = useApi(generateSentences);
    useEffect(() => {
        if (voices.length > 0 && !selectedVoice) {
            setSelectedVoice(voices[0]);
        }
    }, [voices, selectedVoice]);
    const handleLanguageChange = (lang) => {
        setSelectedLanguage(lang);
        setSelectedVoice(null); // Reset voz ao mudar idioma
    };
    const handleConfirm = async () => {
        if (!selectedVoice)
            return;
        try {
            // Gera frases via API Ollama
            const result = await generateSentencesCall({ language: selectedLanguage });
            // Salva as configurações e navega para a página de prática com as frases geradas
            setLanguage(selectedLanguage);
            // Passa os parâmetros via sessionStorage (substitui o state do react-router)
            sessionStorage.setItem(STUDY_CONFIG_KEY, JSON.stringify({
                language: selectedLanguage,
                voiceName: selectedVoice.name,
                voiceLang: selectedVoice.lang,
                sentences: result.sentences, // Array de frases no formato "frase : (tradução)"
            }));
            router.push('/estudar-frases');
        }
        catch (err) {
            console.error('Erro ao gerar frases:', err);
            // Em caso de erro, ainda navega mas sem frases (pode usar fallback)
        }
    };
    return (<section className="page page-estudar-frases-config">
      <header className="page-header">
        <div>
          <h1>Configurar Estudo de Frases</h1>
          <p className="page-subtitle">
            Selecione o idioma e a voz para começar a praticar frases.
          </p>
        </div>
      </header>

      <div className="config-form">
        <div className="config-card">
          <label className="field">
            <span>Idioma</span>
            <select value={selectedLanguage} onChange={(e) => handleLanguageChange(e.target.value)}>
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
            {voices.length > 0 ? (<select value={selectedVoice?.name || ''} onChange={(e) => {
                const voice = voices.find((v) => v.name === e.target.value);
                if (voice)
                    setSelectedVoice(voice);
            }}>
                {voices.map((voice) => (<option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>))}
              </select>) : (<p className="muted">
                {loadingVoices ? 'Carregando vozes disponíveis...' : 'Nenhuma voz encontrada no navegador.'}
              </p>)}
          </label>

          <div className="actions">
            <Button onClick={handleConfirm} disabled={!selectedVoice || voices.length === 0 || loading}>
              {loading ? 'Gerando frases...' : 'Confirmar e Iniciar Prática'}
            </Button>
          </div>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </section>);
}
export default EstudarFrasesConfigPage;
