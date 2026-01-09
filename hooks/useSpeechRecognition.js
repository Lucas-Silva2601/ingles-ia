import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
export function useSpeechRecognition(options = {}) {
    const { language = 'en-US', continuous = false } = options;
    // Verifica se o navegador suporta Web Speech API - Speech Recognition
    const isSupported = useMemo(() => typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window), []);
    const recognitionRef = useRef(null);
    const shouldRestartRef = useRef(false);
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!isSupported)
            return;
        const AnyWindow = window;
        const SpeechRecognitionImpl = AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionImpl();
        recognition.continuous = continuous;
        recognition.interimResults = true; // Permite resultados parciais
        recognition.maxAlternatives = 1;
        recognition.lang = language;
        recognition.onstart = () => {
            setStatus('listening');
            setError(null);
        };
        recognition.onresult = (event) => {
            // Pega o último resultado
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim();
                if (transcript) {
                    setResult(transcript);
                }
            }
        };
        recognition.onerror = (event) => {
            // Ignora erros comuns que não são críticos
            if (event.error === 'no-speech' || event.error === 'aborted') {
                // Reinicia se deve continuar
                if (shouldRestartRef.current && continuous) {
                    setTimeout(() => {
                        try {
                            recognition.start();
                        }
                        catch {
                            // Já está rodando
                        }
                    }, 100);
                }
                return;
            }
            setError(event.error || 'Erro no reconhecimento de voz');
            setStatus('error');
        };
        recognition.onend = () => {
            setStatus('idle');
            // Reinicia automaticamente se continuous e shouldRestart
            if (shouldRestartRef.current && continuous) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    }
                    catch {
                        // Já está rodando
                    }
                }, 100);
            }
        };
        recognitionRef.current = recognition;
        return () => {
            shouldRestartRef.current = false;
            recognition.stop();
            recognitionRef.current = null;
        };
    }, [continuous, isSupported, language]);
    const start = useCallback(() => {
        if (!isSupported || !recognitionRef.current)
            return;
        shouldRestartRef.current = true;
        try {
            recognitionRef.current.start();
        }
        catch {
            // Já está rodando
        }
    }, [isSupported]);
    const stop = useCallback(() => {
        shouldRestartRef.current = false;
        recognitionRef.current?.stop();
        setStatus('idle');
    }, []);
    return {
        isSupported,
        status,
        result,
        error,
        start,
        stop,
    };
}
