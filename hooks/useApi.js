import { useState, useCallback } from 'react';
export function useApi(apiFn) {
    const [state, setState] = useState({
        data: null,
        loading: false,
        error: null,
    });
    const call = useCallback(async (...args) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const result = await apiFn(...args);
            setState({ data: result, loading: false, error: null });
            return result;
        }
        catch (err) {
            const message = err?.message || 'Erro desconhecido ao chamar API';
            setState({ data: null, loading: false, error: message });
            throw err;
        }
    }, [apiFn]);
    return {
        ...state,
        call,
    };
}
