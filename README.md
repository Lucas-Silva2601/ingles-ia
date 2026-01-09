<div align="center">

# 🎓 LinguasIA

### *Aprenda idiomas com IA — do vocabulário à conversação, tudo em um só place*

![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-29-C21325?logo=jest&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Cloud-ffffff?logo=ollama&logoColor=black)

**Um projeto full-stack 100% JavaScript** — React + Next.js no frontend e Route Handlers no backend,
potencializado pelos modelos hospedados do Ollama Cloud.

[![Descrição](https://img.shields.io/badge/📖-Descrição-0ea5e9)](#-sobre-o-projeto)
[![Features](https://img.shields.io/badge/✨-Funcionalidades-22c55e)](#-funcionalidades)
[![Run](https://img.shields.io/badge/🚀-Como%20Rodar-f59e0b)](#-como-rodar-em-3-passos)

</div>

---

## 📖 Sobre o Projeto

Aprender um idioma novo é difícil — e não pela gramática. É difícil porque falta **prática real**:
conversar sem medo de errar, entender nuances que o dicionário não explica e descobrir aquele
atalho mental que faz tudo clicar na cabeça.

O **LinguasIA** resolve isso com 5 módulos alimentados por Inteligência Artificial:

> 🗣️ Você erra? A IA mostra o que um **nativo realmente entendeu** — e como dizer certo.

O resultado é uma plataforma onde estudantes de inglês (e mais 10 idiomas) praticam
vocabulário, pronúncia, conversação e cultura de forma **ativa, divertida e com feedback imediato**.

<div align="center">

| 🎯 Frontend | 🧠 Backend | ⚡ IA |
|:---:|:---:|:---:|
| React 19 + Next.js 16 | Route Handlers (`app/api/*`) | Ollama Cloud (API nativa) |
| Tailwind CSS 4 | Node.js (fetch nativo) | Prompts otimizados |
| Web Speech API | Validação server-side | Reparo de JSON |

</div>

---

## ✨ Funcionalidades

<table>
<tr>
<td width="50%">

#### 🔊 **Text-to-Speech Inteligente**
- Clique em qualquer palavra para ouvir a pronúncia
- Marque trechos com `<` `>` e reproduza só o que interessa
- Vozes e velocidade configuráveis (Web Speech API)
- Exemplos de frases com tradução gerados pela IA

#### 🃏 **Estudar Frases**
- 130+ frases geradas pela IA no idioma escolhido
- Modo cartões: ✅ acerto → confete 🎊 | ❌ erro → beep 🔊 + resposta correta
- Estatísticas de progresso em tempo real

#### 💬 **Roleplay (Conversação)**
- Chat fluido com assistente de IA no idioma alvo
- Respostas curtas e naturais, no ritmo de uma conversa real
- Sugestões rápidas para nunca travar no meio da conversa

</td>
<td width="50%">

#### 🚫 **Anti-Frases**
- Falsos amigos perigosos (`preservativo`, anyone?)
- Duplo sentido acidental em cumprimentos e convites
- Linguagem arcaica que soa como filme dos anos 40
- Severidade clara: 🟡 engraçado vs. 🔴 pode ofender

#### 🧠 **Hacks Proibidos**
- Heurísticas "não 100% científicas, mas 80% eficazes"
- Atalhos emocionais, visuais e sonoros no lugar de tabelas de conjugação
- Exemplos reais do dia a dia — não de livro didático

</td>
</tr>
</table>

---

## 🏗️ Arquitetura

**Projeto único, zero configuração duplo.** O backend mora dentro do próprio Next.js —
sem segundo servidor, sem proxy, sem CORS:

```
┌──────────────────────────────── LinguasIA ────────────────────────────────┐
│                                                                          │
│   🌐 Navegador                                                           │
│   ┌──────────────────────────────────────────────┐                       │
│   │  React 19 (App Router)                       │     fetch('/api/*')   │
│   │  pages: TTS · Estudar · Roleplay · Anti · Hack│ ──────────────────┐   │
│   │  state: Context API + hooks custom            │                   │   │
│   └──────────────────────────────────────────────┘                   │   │
│                                                                      ▼   │
│   ⚙️ Next.js Server (Node.js)                                         │
│   ┌───────────────────────────────────────────────────────────────┐      │
│   │  app/api/*/route.js      ← Route Handlers (7 endpoints)       │      │
│   │        │                                                      │      │
│   │        ▼                                                      │      │
│   │  lib/server/                                                 │      │
│   │   ├── validators.js     ← validação + sanitização            │      │
│   │   ├── ollamaService.js   ← prompts, cache, retry de JSON     │      │
│   │   ├── textUtils.js      ← pipeline de limpeza das respostas  │      │
│   │   └── errors.js         ← erros tipados + logging            │      │
│   └───────────────────────────────┬───────────────────────────────┘      │
│                                   │ HTTPS                                │
│                                   ▼                                      │
│                        ☁️ Ollama Cloud (gemma4:31b-cloud)                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

<details>
<summary>📡 <b>Referência da API</b> (7 endpoints)</summary>

<br/>

| Método | Endpoint | Descrição |
|:------:|----------|-----------|
| `GET` | `/api/health` | Health check do serviço |
| `POST` | `/api/explain` | Explica uma palavra/frase com IA |
| `POST` | `/api/sentences/generate` | Gera frases de estudo no idioma alvo |
| `POST` | `/api/anti-phrases/generate` | Gera Anti-Frases (o que NÃO dizer) |
| `POST` | `/api/hacks/generate` | Gera "Hacks Proibidos" (atalhos mentais) |
| `POST` | `/api/chat` | Chat/roleplay de conversação com IA |
| `POST` | `/api/word-explanation` | Tradução + exemplos de uso |

```bash
curl -X POST http://localhost:3000/api/explain \
  -H "Content-Type: application/json" \
  -d '{"text": "How are you?", "language": "en"}'
```

</details>

---

## ⚡ Destaques Técnicos

O que dá orgulho nesse projeto vai além da UI:

- 🧰 **Reparo inteligente de JSON** — LLMs adoram embrulhar JSON em markdown ou retorná-lo truncado.
  O `ollamaService` extrai o array de dentro de ```` ```json ``` ``, tenta fechar chaves faltantes
  e valida campo a campo antes de entregar ao frontend.

- 🧹 **Pipeline de saneamento de respostas** — regexs responsáveis por filtrar explicações da IA,
  remover numerações, classificações de nível (`B1-B2:`) e complementos soltos, garantindo que só
  frases completas cheguem ao usuário.

- 🛡️ **Erros tipados ponta a ponta** — hierarquia de erros (`ValidationError`, `ApiError`,
  `ApiNetworkError`...) que nasce na validação de entrada e vira resposta HTTP com status e
  mensagem corretos — o usuário sempre vê *por que* algo falhou.

- ⏱️ **Resiliência de rede** — timeouts via `AbortController`, cache em memória com TTL,
  classificação de 401/429/5xx com mensagens humanizadas e fallbacks por idioma no chat.

- 🧪 **Testes de verdade** — 18 testes Jest cobrindo a API, o serviço de IA (com `fetch` mockado),
  hooks e páginas — incluindo timeout, cache expirado e payloads malformados.

---

## 🛠️ Tecnologias

<div align="center">

| Camada | Stack |
|--------|-------|
| **UI** | ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black) ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white) |
| **Backend** | ![JavaScript](https://img.shields.io/badge/JavaScript-Node_20+-F7DF1E?logo=javascript&logoColor=black) ![Next.js Route Handlers](https://img.shields.io/badge/Next.js-Route%20Handlers-black?logo=vercel&logoColor=white) |
| **IA** | ![Ollama](https://img.shields.io/badge/Ollama-Cloud-ffffff?logo=ollama&logoColor=black) ![Gemma](https://img.shields.io/badge/Gemma-4%2031B-8AB4F8?logo=google&logoColor=white) |
| **Browser APIs** | ![Web Speech](https://img.shields.io/badge/Web_Speech_API-TTS%20%26%20STT-8b5cf6) |
| **Qualidade** | ![Jest](https://img.shields.io/badge/Jest-29-C21325?logo=jest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-React-E33332?logo=testinglibrary&logoColor=white) |

</div>

---

## 🚀 Como Rodar em 3 Passos

```bash
# 1️⃣  Instale as dependências
npm install

# 2️⃣  Configure sua chave do Ollama Cloud (ollama.com → Settings → API Keys)
cp .env.example .env
#    → edite .env e adicione: OLLAMA_API_KEY=sua_chave

# 3️⃣  Suba o projeto
npm run dev
#    (ou npm run app:start → sobe em segundo plano e abre o navegador)
```

> 🌐 Acesse **http://localhost:3000** — frontend e API no mesmo servidor. É só isso. 🎉

> 💡 **Prefere rodar a IA local?** Também funciona: instale o [Ollama](https://ollama.com),
> baixe um modelo (`ollama pull gpt-oss:120b`) e aponte `OLLAMA_BASE_URL=http://localhost:11434`
> no `.env` — sem chave e sem conta.

<details>
<summary>⚙️ <b>Variáveis de ambiente opcionais</b></summary>

<br/>

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OLLAMA_API_KEY` | — | **Obrigatória no cloud.** Chave da API (ollama.com → API Keys) |
| `OLLAMA_BASE_URL` | `https://ollama.com` | Host da API — use `http://localhost:11434` para Ollama local |
| `API_DEFAULT_MODEL` | `gemma4:31b-cloud` | Modelo padrão |
| `API_MAX_TOKENS_EXPLANATION` | `200` | Tamanho máx. das explicações |
| `API_MAX_TOKENS_SENTENCES` | `4000` | Tamanho máx. da geração de frases |
| `API_TIMEOUT` | `30000` | Timeout das chamadas à API (ms) |
| `MAX_TEXT_LENGTH` | `10000` | Comprimento máx. do texto de entrada |
| `ALLOWED_LANGUAGES` | `en,es,it,fr,de,nl,pl,ru,id,pt-BR,ja` | Idiomas suportados |

</details>

<details>
<summary>📦 <b>Outros comandos úteis</b></summary>

<br/>

| Comando | Descrição |
|---------|-----------|
| `npm run app:start` | Inicia em segundo plano e abre o navegador |
| `npm run app:stop` | Para a aplicação iniciada pelos scripts |
| `npm run app:restart` | Reinicia a aplicação |
| `npm run build` | Build de produção otimizado |
| `npm start` | Sobe o servidor de produção em primeiro plano |
| `npm test` | Executa os 19 testes (Jest) |

</details>

---

## 🖥️ Scripts de Execução

Abra, pare e reinicie a aplicação com um comando — ou um duplo clique no Windows:

| Ação | npm (qualquer sistema) | Windows (duplo clique) |
|------|------------------------|------------------------|
| ▶️ Iniciar + abrir o navegador | `npm run app:start` | `start-app.bat` |
| ⏹ Parar a aplicação | `npm run app:stop` | `stop-app.bat` |
| 🔄 Reiniciar | `npm run app:restart` | `restart-app.bat` |

**Como funciona:**

- O servidor sobe **em segundo plano** e os logs ficam em `.app.log`
- O navegador abre automaticamente assim que a aplicação fica pronta (`/api/health` responde)
- O estado (PID/porta) fica em `.app-state.json` — ambos os arquivos são ignorados pelo Git
- `--prod`: gera o build de produção antes de iniciar → `npm run app:start -- --prod`
- `--no-browser`: inicia sem abrir o navegador → `npm run app:start -- --no-browser`
- `--port=3001`: usa outra porta (padrão: 3000)
- **Segurança:** o `stop` encerra **apenas** a instância iniciada pelos scripts. Se a porta estiver
  ocupada por outro processo (ex.: outro projeto), nada é encerrado

---

## 📁 Estrutura

```
ingles-ia/
├── app/                        # Next.js App Router
│   ├── api/                    # 👑 Backend JavaScript (Route Handlers)
│   │   ├── health/  explain/  chat/  word-explanation/
│   │   └── sentences/  anti-phrases/  hacks/   (. → route.js cada)
│   ├── text-to-speech/  estudar-frases/  roleplay/
│   ├── anti-frase/  hacks/  estudar-frases-config/
│   └── layout.js  page.js  globals.css
├── components/                 # Button, Layout, NavBar + módulos
├── hooks/                      # useApi, useTextToSpeech, useSpeechRecognition
├── lib/
│   ├── api.js                  # Camada de acesso à API (cliente)
│   ├── AppStateContext.js      # Estado global (Context API)
│   └── server/                 # 👑 Lógica server-side
│       ├── config.js  errors.js  validators.js
│       ├── textUtils.js  ollamaService.js  http.js
├── utils/                      # Áudio, texto e validações (compartilhados)
├── styles/  public/assets/     # CSS dos módulos · mídias estáticas
├── scripts/                    # Iniciar / parar / reiniciar (npm run app:*)
├── start-app.bat  stop-app.bat  restart-app.bat
└── tests/server/               # Testes da API (Jest)
```

---

## 🗺️ Próximos Passos

- [ ] Suporte a voz no Roleplay (Speech-to-Text para responder falando)
- [ ] Persistência de progresso (estatísticas sobrevivem ao refresh)
- [ ] Modo flashcards com repetição espaçada
- [ ] Deploy automático (Vercel) + demo pública

---

## 📄 Licença

Distribuído sob a licença **ISC**. Veja [`LICENSE`](LICENSE) para detalhes.

<br/>

<div align="center">

Feito com 💜, JavaScript e um pouco de Café ☕

[![GitHub](https://img.shields.io/badge/GitHub-perfil-181717?logo=github&logoColor=white)](https://github.com/)
![Top Language](https://img.shields.io/github/languages/last-commit/?)

</div>
