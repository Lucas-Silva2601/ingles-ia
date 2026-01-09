import { useCallback, useEffect, useMemo, useState } from 'react';
/**
 * Hook centralizado para gerenciar Web Speech API (Speech Synthesis)
 * - Carrega e gerencia vozes disponíveis
 * - Seleciona automaticamente vozes de alta qualidade (Microsoft / Google)
 * - Expõe função speak para ser usada em qualquer componente
 */
export function useTextToSpeech(options = {}) {
    const { preferredLang } = options;
    const [status, setStatus] = useState('idle');
    const [voices, setVoices] = useState([]);
    const [voice, setVoice] = useState(null);
    const [rate, setRate] = useState(1);
    const [pitch, setPitch] = useState(1);
    const [loadingVoices, setLoadingVoices] = useState(false);
    const [voicesError, setVoicesError] = useState(null);
    const isSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);
    /**
     * Score de qualidade de voz.
     * Quanto menor, maior a prioridade.
     */
    const getVoiceQualityScore = useCallback((v) => {
        const name = v.name.toLowerCase();
        // Prioridade para vozes Microsoft / Google
        if (name.includes('microsoft') || name.includes('google')) {
            // Nomes específicos muito comuns de alta qualidade
            if (name.includes('zira') || name.includes('david') || name.includes('mark')) {
                return 0;
            }
            if (name.includes('us english') || name.includes('uk english')) {
                return 0.5;
            }
            return 1;
        }
        // Demais vozes
        return 10;
    }, []);
    /**
     * Seleciona a melhor voz para um idioma desejado.
     */
    const selectBestVoiceForLang = useCallback((voicesList, lang) => {
        if (!voicesList.length)
            return null;
        // Se nenhum idioma foi passado, tenta detectar do navegador
        const targetLang = lang || (typeof navigator !== 'undefined' ? navigator.language : undefined);
        if (!targetLang) {
            // Sem idioma: retorna melhor voz geral, priorizando inglês
            const englishVoices = voicesList.filter((v) => v.lang.startsWith('en'));
            if (englishVoices.length) {
                const sorted = [...englishVoices].sort((a, b) => getVoiceQualityScore(a) - getVoiceQualityScore(b));
                return sorted[0];
            }
            const sorted = [...voicesList].sort((a, b) => getVoiceQualityScore(a) - getVoiceQualityScore(b));
            return sorted[0];
        }
        // Filtra vozes compatíveis com o idioma desejado
        const langLower = targetLang.toLowerCase();
        const sameLang = voicesList.filter((v) => v.lang.toLowerCase() === langLower ||
            v.lang.toLowerCase().startsWith(langLower) ||
            v.lang.toLowerCase().split('-')[0] === langLower.split('-')[0]);
        if (!sameLang.length) {
            // Sem voz exatamente no idioma: usa melhor voz geral
            const sorted = [...voicesList].sort((a, b) => getVoiceQualityScore(a) - getVoiceQualityScore(b));
            return sorted[0];
        }
        // Para inglês, tenta priorizar Microsoft/Google específicas
        if (langLower.startsWith('en')) {
            const microsoftVoices = sameLang.filter((v) => v.name.toLowerCase().includes('microsoft'));
            if (microsoftVoices.length) {
                const zira = microsoftVoices.find((v) => v.name.toLowerCase().includes('zira'));
                if (zira)
                    return zira;
                const david = microsoftVoices.find((v) => v.name.toLowerCase().includes('david'));
                if (david)
                    return david;
                const mark = microsoftVoices.find((v) => v.name.toLowerCase().includes('mark'));
                if (mark)
                    return mark;
                return microsoftVoices[0];
            }
            const googleVoices = sameLang.filter((v) => v.name.toLowerCase().includes('google'));
            if (googleVoices.length) {
                const us = googleVoices.find((v) => v.name.toLowerCase().includes('us english'));
                if (us)
                    return us;
                return googleVoices[0];
            }
        }
        // Ordena pela qualidade e retorna a melhor
        const sorted = [...sameLang].sort((a, b) => getVoiceQualityScore(a) - getVoiceQualityScore(b));
        return sorted[0];
    }, [getVoiceQualityScore]);
    // Carrega vozes e registra listener onvoiceschanged
    useEffect(() => {
        if (!isSupported)
            return;
        const synth = window.speechSynthesis;
        const loadVoices = () => {
            try {
                setLoadingVoices(true);
                const list = synth.getVoices();
                if (!list || list.length === 0) {
                    // Alguns navegadores precisam de múltiplas chamadas
                    return;
                }
                // Ordena vozes por qualidade > idioma > nome
                const sorted = [...list].sort((a, b) => {
                    const qa = getVoiceQualityScore(a);
                    const qb = getVoiceQualityScore(b);
                    if (qa !== qb)
                        return qa - qb;
                    if (a.lang !== b.lang)
                        return a.lang.localeCompare(b.lang);
                    return a.name.localeCompare(b.name);
                });
                setVoices(sorted);
                // Seleciona voz padrão se ainda não houver
                setVoice((current) => {
                    if (current)
                        return current;
                    const best = selectBestVoiceForLang(sorted, preferredLang);
                    return best || sorted[0] || null;
                });
                setVoicesError(null);
            }
            catch (error) {
                console.error('Erro ao carregar vozes de síntese:', error);
                setVoicesError('Não foi possível carregar as vozes de síntese de voz.');
            }
            finally {
                setLoadingVoices(false);
            }
        };
        // Primeira tentativa imediata
        loadVoices();
        // Listener assíncrono (Chrome / Edge)
        synth.onvoiceschanged = loadVoices;
        // Tentativa extra após pequeno atraso
        const timeoutId = window.setTimeout(loadVoices, 150);
        return () => {
            synth.onvoiceschanged = null;
            window.clearTimeout(timeoutId);
        };
    }, [isSupported, preferredLang, getVoiceQualityScore, selectBestVoiceForLang]);
    const speak = useCallback((text, opts) => {
        if (!isSupported || !text || !text.trim())
            return;
        const synth = window.speechSynthesis;
        // Cancela qualquer fala anterior para evitar fila
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const finalVoice = opts?.voice ?? voice;
        const finalRate = opts?.rate ?? rate;
        const finalPitch = opts?.pitch ?? pitch;
        if (finalVoice)
            utterance.voice = finalVoice;
        utterance.rate = finalRate;
        utterance.pitch = finalPitch;
        utterance.onstart = () => {
            setStatus('speaking');
            if (opts?.onStart)
                opts.onStart();
        };
        utterance.onend = () => {
            setStatus('idle');
            if (opts?.onEnd)
                opts.onEnd();
        };
        utterance.onpause = () => setStatus('paused');
        utterance.onresume = () => setStatus('speaking');
        utterance.onerror = (event) => {
            setStatus('idle');
            if (opts?.onError)
                opts.onError(event);
        };
        synth.speak(utterance);
    }, [isSupported, pitch, rate, voice]);
    const stop = useCallback(() => {
        if (!isSupported)
            return;
        window.speechSynthesis.cancel();
        setStatus('idle');
    }, [isSupported]);
    const pause = useCallback(() => {
        if (!isSupported)
            return;
        window.speechSynthesis.pause();
        setStatus('paused');
    }, [isSupported]);
    const resume = useCallback(() => {
        if (!isSupported)
            return;
        window.speechSynthesis.resume();
        setStatus('speaking');
    }, [isSupported]);
    return {
        isSupported,
        voices,
        voice,
        setVoice,
        rate,
        setRate,
        pitch,
        setPitch,
        status,
        loadingVoices,
        voicesError,
        speak,
        stop,
        pause,
        resume,
    };
}
