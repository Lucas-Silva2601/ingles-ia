'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
const AppStateContext = createContext(undefined);
const STORAGE_KEY = 'linguasia_app_state';
export function AppStateProvider({ children }) {
    const [language, setLanguageState] = useState('en');
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            if (parsed.language)
                setLanguageState(parsed.language);
        }
        catch {
            // ignore
        }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                language,
            }));
        }
        catch {
            // ignore
        }
    }, [language]);
    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
    }, []);
    const value = useMemo(() => ({
        language,
        setLanguage,
    }), [language, setLanguage]);
    return (<AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>);
}
export function useAppState() {
    const ctx = useContext(AppStateContext);
    if (!ctx) {
        throw new Error('useAppState deve ser usado dentro de AppStateProvider');
    }
    return ctx;
}
