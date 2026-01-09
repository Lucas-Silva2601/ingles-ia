'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAppState } from '@/lib/AppStateContext';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { sendChatMessage } from '@/lib/api';
export function RoleplayPage() {
    const { language, setLanguage } = useAppState();
    const [inCall, setInCall] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [caption, setCaption] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const videoRef = useRef(null);
    const lastProcessedRef = useRef('');
    const lastProcessedTimeRef = useRef(0);
    const processingRef = useRef(false);
    const inCallRef = useRef(false);
    const [videoSrc, setVideoSrc] = useState('/assets/video/avatar_feminino.mp4');
    // Mantém ref sincronizado com inCall
    useEffect(() => {
        inCallRef.current = inCall;
    }, [inCall]);
    // Web Speech API - Speech Synthesis (Text-to-Speech) centralizado
    const { voices, voice, setVoice, rate, setRate, speak, stop: stopSpeaking, } = useTextToSpeech({ preferredLang: language });
    // Atualiza o avatar com base no nome da voz selecionada
    useEffect(() => {
        if (!voice) {
            setVideoSrc('/assets/video/avatar_feminino.mp4');
            return;
        }
        const name = voice.name.toLowerCase();
        const isMale = name.includes('david') ||
            name.includes('mark') ||
            name.includes('male') ||
            name.includes('menino') ||
            name.includes('homem') ||
            name.includes('guy');
        setVideoSrc(isMale ? '/assets/video/avatar_masculino.mp4' : '/assets/video/avatar_feminino.mp4');
    }, [voice]);
    // Web Speech API - Speech Recognition (Speech-to-Text)
    const recognition = useSpeechRecognition({
        language: language === 'pt-BR' ? 'pt-BR' : language === 'en' ? 'en-US' : language,
        continuous: true, // Modo contínuo para capturar frases completas
    });
    // Função para iniciar o microfone de forma segura
    const startListening = useCallback(() => {
        if (!inCallRef.current || isSpeaking || processingRef.current)
            return;
        setCaption('Ouvindo você...');
        try {
            recognition.start();
        }
        catch {
            // Já está ouvindo
        }
    }, [recognition, isSpeaking]);
    // Função para falar resposta da IA
    const speakAIResponse = useCallback((text) => {
        const video = videoRef.current;
        if (!voice || !text)
            return;
        recognition.stop();
        setIsSpeaking(true);
        speak(text, {
            voice,
            rate,
            pitch: 1.0,
            onStart: () => {
                if (video && video.paused) {
                    video.currentTime = 0;
                    video.play().catch(() => { });
                }
            },
            onEnd: () => {
                if (video && !video.paused) {
                    video.pause();
                }
                setIsSpeaking(false);
                processingRef.current = false;
                // Reativa o microfone após um pequeno delay
                setTimeout(() => {
                    if (inCallRef.current) {
                        startListening();
                    }
                }, 300);
            },
            onError: () => {
                if (video && !video.paused) {
                    video.pause();
                }
                setIsSpeaking(false);
                processingRef.current = false;
                setTimeout(() => {
                    if (inCallRef.current) {
                        startListening();
                    }
                }, 300);
            },
        });
    }, [voice, rate, recognition, speak, startListening]);
    // Converte mensagens para formato da API
    const getApiHistory = useCallback((msgs) => {
        return msgs.map(m => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text
        }));
    }, []);
    // Processa resultado do reconhecimento de voz
    useEffect(() => {
        const userText = recognition.result?.trim();
        const now = Date.now();
        // Ignora se: não há resultado, é igual ao último (com debounce de 2s), não está em chamada, está processando ou falando
        if (!userText ||
            !inCall ||
            processingRef.current ||
            isSpeaking ||
            userText.length < 2) {
            return;
        }
        // Evita processar mesma frase em menos de 2 segundos
        if (userText === lastProcessedRef.current && now - lastProcessedTimeRef.current < 2000) {
            return;
        }
        // Marca como processando para evitar duplicatas
        processingRef.current = true;
        lastProcessedRef.current = userText;
        lastProcessedTimeRef.current = now;
        // Para o reconhecimento enquanto processa
        recognition.stop();
        setCaption(userText);
        // Adiciona mensagem do usuário
        const newUserMessage = { from: 'user', text: userText, timestamp: new Date() };
        setMessages(prev => {
            // Verifica se já existe mensagem igual recente (evita duplicata)
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.from === 'user' && lastMsg.text === userText) {
                processingRef.current = false;
                startListening();
                return prev;
            }
            const updated = [...prev, newUserMessage];
            setIsThinking(true);
            // Chama API real para resposta da IA
            const history = getApiHistory(updated);
            sendChatMessage({ message: userText, language, history })
                .then(response => {
                const aiResponse = response.response;
                const newAIMessage = { from: 'ai', text: aiResponse, timestamp: new Date() };
                setMessages(prevMsgs => {
                    // Verifica se já existe resposta igual (evita duplicata)
                    const lastAiMsg = prevMsgs[prevMsgs.length - 1];
                    if (lastAiMsg?.from === 'ai' && lastAiMsg.text === aiResponse) {
                        return prevMsgs;
                    }
                    return [...prevMsgs, newAIMessage];
                });
                setIsThinking(false);
                speakAIResponse(aiResponse);
            })
                .catch(err => {
                console.error('Erro ao obter resposta:', err);
                setIsThinking(false);
                processingRef.current = false;
                startListening();
            });
            return updated;
        });
    }, [recognition.result, language, inCall, isSpeaking, speakAIResponse, recognition, getApiHistory, startListening]);
    const handleStartCall = useCallback(() => {
        setInCall(true);
        setMessages([]);
        lastProcessedRef.current = '';
        processingRef.current = false;
        // Mensagem inicial da IA
        setTimeout(() => {
            const greeting = language === 'pt-BR'
                ? 'Olá! Como posso ajudá-lo hoje?'
                : language === 'es'
                    ? '¡Hola! ¿En qué puedo ayudarte hoy?'
                    : 'Hello! How can I help you today?';
            setMessages([{ from: 'ai', text: greeting, timestamp: new Date() }]);
            speakAIResponse(greeting);
        }, 500);
    }, [language, speakAIResponse]);
    const handleEndCall = useCallback(() => {
        setInCall(false);
        setCaption('');
        setIsSpeaking(false);
        processingRef.current = false;
        lastProcessedRef.current = '';
        recognition.stop();
        stopSpeaking();
        const video = videoRef.current;
        if (video && !video.paused) {
            video.pause();
        }
        setMessages([]);
        setIsThinking(false);
    }, [recognition, stopSpeaking]);
    const handleToggleMic = useCallback(() => {
        if (recognition.status === 'listening') {
            recognition.stop();
            setCaption('Microfone pausado.');
        }
        else {
            startListening();
        }
    }, [recognition, startListening]);
    return (<section className="page page-roleplay">
      <header className="page-header">
        <div>
          <h1>Roleplay com IA</h1>
          <p className="page-subtitle">
            Simule diálogos em diferentes contextos e deixe a IA reagir à sua fala.
          </p>
        </div>
      </header>

      <div className="roleplay-layout">
        <div className="roleplay-chat-card">
          {!inCall && (<div className="roleplay-lobby">
              <h2>Configure sua conversa</h2>
              <p className="muted">
                Escolha o idioma e a voz antes de iniciar a chamada.
              </p>
              
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

              {voices.length > 0 ? (<label className="field">
                  <span>
                    Voz ({voices.length} disponível
                    {voices.length !== 1 ? 's' : ''})
                  </span>
                  <select value={voice?.name || ''} onChange={(e) => {
                    const selected = voices.find((v) => v.name === e.target.value);
                    if (selected)
                        setVoice(selected);
                }}>
                    {/* Agrupa vozes por idioma para melhor organização */}
                    {Array.from(new Set(voices.map((v) => v.lang))).map((lang) => (<optgroup key={lang} label={`Idioma: ${lang}`}>
                        {voices
                        .filter((v) => v.lang === lang)
                        .map((v) => (<option key={`${v.name}-${v.lang}`} value={v.name}>
                              {v.name}
                              {v.name.toLowerCase().includes('microsoft') && ' (Microsoft)'}
                            </option>))}
                      </optgroup>))}
                  </select>
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Inclui vozes Microsoft, Google e outras disponíveis no sistema
                  </p>
                </label>) : (<p className="muted">Carregando vozes disponíveis...</p>)}

              <label className="field">
                <span>Velocidade da voz: {rate.toFixed(1)}x</span>
                <input type="range" min={0.7} max={1.3} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))}/>
              </label>

              <Button onClick={handleStartCall}>Iniciar chamada</Button>
            </div>)}

          {inCall && (<div className="roleplay-call">
              {/* Avatar com vídeo */}
              <div className="roleplay-avatar-area">
                <video ref={videoRef} className="avatar-video" src={videoSrc} loop muted playsInline/>
                <div className="roleplay-caption">
                  <p>{caption || 'Aguardando interação...'}</p>
                </div>
              </div>

              {/* Chat/Mensagens */}
              <div className="roleplay-messages">
                {messages.map((m, idx) => (<div key={`${m.from}-${idx}-${m.timestamp.getTime()}`} className={`roleplay-bubble roleplay-bubble-${m.from}`}>
                    <p>{m.text}</p>
                  </div>))}
                {isThinking && (<div className="roleplay-bubble roleplay-bubble-ai thinking">
                    <span className="thinking-dot"/>
                    <span className="thinking-dot"/>
                    <span className="thinking-dot"/>
                  </div>)}
              </div>

              {/* Controles */}
              <div className="roleplay-controls">
                <Button variant={recognition.status === 'listening' ? 'primary' : 'secondary'} onClick={handleToggleMic} disabled={!recognition.isSupported || isThinking}>
                  {recognition.status === 'listening'
                ? 'Parar microfone'
                : 'Falar'}
                </Button>
                <Button variant="secondary" onClick={handleEndCall}>
                  Encerrar chamada
                </Button>
              </div>

              {recognition.error && (<p className="error">
                  Erro no reconhecimento de voz: {recognition.error}
                </p>)}
            </div>)}
        </div>

        <aside className="roleplay-context-card">
          <h2>Contexto da simulação</h2>
          <p className="muted">
            Use este modo para treinar situações do dia a dia: pedir café, fazer
            check-in em hotel, cumprimentar alguém, entre outras.
          </p>
          <ul className="roleplay-tips">
            <li>Fale frases curtas primeiro para a IA entender melhor.</li>
            <li>
              Repita a mesma frase mudando apenas uma palavra para treinar vocabulário.
            </li>
            <li>
              Observe como a IA responde e tente imitá-la em estrutura e pronúncia.
            </li>
          </ul>
        </aside>
      </div>
    </section>);
}
export default RoleplayPage;
