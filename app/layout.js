import './globals.css';
import '@/styles/App.css';
import { AppStateProvider } from '@/lib/AppStateContext';
import { Layout } from '@/components/common/Layout';
export const metadata = {
    title: 'LinguasIA - Sistema de Estudo de Idiomas',
    description: 'Sistema inteligente de estudo de idiomas com apoio de Inteligência Artificial',
    icons: { icon: '/favicon.png' },
};
export default function RootLayout({ children }) {
    // suppressHydrationWarning no <body>: evita o aviso de hydration mismatch
    // causado por atributos injetados por extensões do navegador antes do React
    // carregar (ex.: cz-shortcut-listen="true" da ColorZilla). É raso — só vale
    // para atributos do próprio <body>, então não esconde problemas reais.
    return (<html lang="pt-BR">
      <body suppressHydrationWarning>
        <AppStateProvider>
          <Layout>{children}</Layout>
        </AppStateProvider>
      </body>
    </html>);
}
