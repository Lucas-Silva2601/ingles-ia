import { renderHook, act } from '@testing-library/react';
import { useApi } from '../useApi';
describe('useApi', () => {
    it('atualiza estado de loading e data em chamada bem-sucedida', async () => {
        const apiFn = jest.fn(async (value) => value * 2);
        const { result } = renderHook(() => useApi(apiFn));
        await act(async () => {
            const value = await result.current.call(2);
            expect(value).toBe(4);
        });
        expect(result.current.data).toBe(4);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });
});
