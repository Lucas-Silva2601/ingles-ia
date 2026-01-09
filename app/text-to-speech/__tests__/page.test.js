import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextToSpeechPage } from '../page';
import { AppStateProvider } from '@/lib/AppStateContext';
jest.mock('@/hooks/useTextToSpeech', () => ({
    useTextToSpeech: () => ({
        isSupported: true,
        voices: [],
        voice: null,
        setVoice: jest.fn(),
        rate: 1,
        setRate: jest.fn(),
        pitch: 1,
        setPitch: jest.fn(),
        status: 'idle',
        loadingVoices: false,
        voicesError: null,
        speak: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
    }),
}));
jest.mock('@/hooks/useApi', () => ({
    useApi: () => ({
        data: null,
        loading: false,
        error: null,
        call: jest.fn(),
    }),
}));
describe('TextToSpeechPage', () => {
    it('permite digitar texto e habilita botão de reprodução', async () => {
        const user = userEvent.setup();
        render(<AppStateProvider>
        <TextToSpeechPage />
      </AppStateProvider>);
        const textarea = screen.getByPlaceholderText(/digite ou cole seu texto/i);
        await user.type(textarea, 'Hello world');
        const playButton = screen.getByRole('button', { name: /^reproduzir$/i });
        expect(playButton).toBeEnabled();
    });
});
