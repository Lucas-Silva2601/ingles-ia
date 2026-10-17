/**
 * Utilitários compartilhados pelos scripts de execução da aplicação.
 *
 * Responsabilidades:
 * - iniciar/parar o servidor Next.js em segundo plano (dev ou produção)
 * - controlar a porta usada e o arquivo de estado (.app-state.json)
 * - abrir o navegador quando a aplicação estiver pronta
 * - redirecionar os logs para .app.log
 */
'use strict';

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(ROOT_DIR, '.app-state.json');
const LOG_FILE = path.join(ROOT_DIR, '.app.log');
const NEXT_BIN = path.join(ROOT_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
const DEFAULT_PORT = 3000;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Interpreta os argumentos da linha de comando.
 * Opções: --prod, --webpack, --no-browser, --port=3001 (ou --port 3001)
 * Também aceita a variável de ambiente APP_PORT.
 *
 * --webpack só vale no modo desenvolvimento: usa o bundler webpack em vez do
 * Turbopack. Serve como contorno para o loop de recarregamento do HMR do
 * Turbopack no Next 16 (aba aberta + reinício do servidor de dev).
 */
function parseArgs(argv) {
    const options = {
        port: Number(process.env.APP_PORT) || DEFAULT_PORT,
        prod: false,
        webpack: false,
        openBrowser: true,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === '--prod') {
            options.prod = true;
        } else if (arg === '--webpack') {
            options.webpack = true;
        } else if (arg === '--no-browser') {
            options.openBrowser = false;
        } else if (arg === '--port' && argv[i + 1]) {
            options.port = Number(argv[++i]);
        } else if (arg.startsWith('--port=')) {
            options.port = Number(arg.slice('--port='.length));
        }
    }

    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
        throw new Error(`Porta inválida: ${options.port}`);
    }

    return options;
}

/* ============================== Estado ============================== */

function readState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return null;
    }
}

function writeState(state) {
    fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function clearState() {
    try {
        fs.unlinkSync(STATE_FILE);
    } catch {
        // estado já inexistente — nada a fazer
    }
}

/* ============================ Processos ============================= */

function isProcessAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        // EPERM = o processo existe, mas pertence a outro usuário
        return error.code === 'EPERM';
    }
}

/** Verifica se a porta está livre (true = disponível). */
function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.once('error', () => resolve(false));
        server.once('listening', () => server.close(() => resolve(true)));
        server.listen(port);
    });
}

/** Lista os PIDs que estão escutando na porta informada. */
function getListeningPids(port) {
    try {
        if (process.platform === 'win32') {
            const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
            const pids = new Set();

            for (const line of output.split(/\r?\n/)) {
                const match = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
                if (match && Number(match[1]) === port) {
                    pids.add(Number(match[2]));
                }
            }

            return [...pids];
        }

        const output = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
        return [...new Set(output.split(/\s+/).filter(Boolean).map(Number))];
    } catch {
        return [];
    }
}

/** Espera a porta ser liberada. Retorna true se liberou dentro do tempo. */
async function waitForPortFree(port, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await checkPortAvailable(port)) {
            return true;
        }
        await delay(250);
    }

    return false;
}

/** Encerra o processo e todos os seus filhos (árvore de processos). */
function killProcessTree(pid) {
    if (process.platform === 'win32') {
        try {
            execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        } catch {
            // processo já encerrado
        }
        return;
    }

    try {
        process.kill(-pid, 'SIGTERM');
    } catch {
        try {
            process.kill(pid, 'SIGTERM');
        } catch {
            // processo já encerrado
        }
    }
}

/** Força o encerramento (SIGKILL) — usado quando o SIGTERM não resolve. */
function forceKillProcessTree(pid) {
    if (process.platform === 'win32') {
        killProcessTree(pid);
        return;
    }

    try {
        process.kill(-pid, 'SIGKILL');
    } catch {
        try {
            process.kill(pid, 'SIGKILL');
        } catch {
            // processo já encerrado
        }
    }
}

/* ======================= Servidor / navegador ======================= */

/** Espera o endpoint /api/health responder (aplicação pronta). */
async function waitForServerReady(url, timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${url}/api/health`, {
                signal: AbortSignal.timeout(3000),
                cache: 'no-store',
            });
            if (response.ok) {
                return true;
            }
        } catch {
            // ainda subindo — tenta novamente
        }
        await delay(500);
    }

    return false;
}

/** Abre a URL no navegador padrão do sistema. */
function openBrowser(url) {
    try {
        if (process.platform === 'win32') {
            spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
            spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        } else {
            spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
        }
    } catch {
        console.log(`   Não foi possível abrir o navegador. Acesse manualmente: ${url}`);
    }
}

/* ============================= Ações =============================== */

/**
 * Inicia a aplicação em segundo plano e (por padrão) abre o navegador.
 * Retorna 0 em sucesso e 1 em erro.
 */
async function startApp({ port, prod, webpack = false, openBrowser: shouldOpenBrowser }) {
    const url = `http://localhost:${port}`;
    // --webpack só se aplica ao servidor de desenvolvimento.
    const useWebpack = !prod && webpack;
    const modeLabel = `${prod ? 'produção' : 'desenvolvimento'}${useWebpack ? ', webpack' : ''}`;

    // Já existe uma instância nossa rodando?
    const state = readState();
    if (state && isProcessAlive(state.pid)) {
        const stateUrl = state.url || url;
        console.log(`A aplicação já está rodando (PID ${state.pid}) — ${stateUrl}`);
        if (shouldOpenBrowser) {
            openBrowser(stateUrl);
            console.log('Navegador aberto.');
        }
        return 0;
    }
    if (state) {
        clearState(); // estado obsoleto (processo morreu)
    }

    if (!fs.existsSync(NEXT_BIN)) {
        console.error('As dependências não estão instaladas. Rode "npm install" primeiro.');
        return 1;
    }

    // Porta livre?
    if (!(await checkPortAvailable(port))) {
        const pids = getListeningPids(port);
        console.error(`A porta ${port} já está em uso${pids.length ? ` (PID ${pids.join(', ')})` : ''} por outro processo.`);
        console.error('Nada foi iniciado. Encerre esse processo ou use outra porta:');
        console.error(`  npm run app:start -- --port=3001`);
        return 1;
    }

    // Modo produção: gera o build antes de iniciar
    if (prod) {
        if (webpack) {
            console.log('Aviso: --webpack é ignorado no modo produção.');
        }
        console.log('Gerando build de produção...');
        try {
            execFileSync(process.execPath, [NEXT_BIN, 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });
        } catch {
            console.error('Falha ao gerar o build de produção.');
            return 1;
        }
    }

    // Inicia o servidor em segundo plano com logs em arquivo
    fs.appendFileSync(
        LOG_FILE,
        `\n===== ${new Date().toISOString()} — iniciando (${modeLabel}) na porta ${port} =====\n`
    );

    const nextArgs = [NEXT_BIN, prod ? 'start' : 'dev'];
    if (useWebpack) {
        nextArgs.push('--webpack');
    }
    nextArgs.push('-p', String(port));

    const logFd = fs.openSync(LOG_FILE, 'a');
    const child = spawn(process.execPath, nextArgs, {
        cwd: ROOT_DIR,
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env },
    });
    child.unref();

    writeState({
        pid: child.pid,
        port,
        url,
        mode: prod ? 'production' : 'development',
        bundler: prod ? undefined : useWebpack ? 'webpack' : 'turbopack',
        startedAt: new Date().toISOString(),
        logFile: LOG_FILE,
    });

    console.log(`Iniciando a aplicação (${modeLabel}) na porta ${port}...`);

    const ready = await waitForServerReady(url);
    if (!ready) {
        console.error('A aplicação não respondeu a tempo. Verifique os logs em .app.log');
        return 1;
    }

    console.log(`Aplicação pronta: ${url} (PID ${child.pid})`);
    console.log('Logs: .app.log');

    if (shouldOpenBrowser) {
        openBrowser(url);
        console.log('Navegador aberto.');
    }

    return 0;
}

/**
 * Para a aplicação iniciada por estes scripts.
 * Nunca encerra um processo estranho que esteja ocupando a porta.
 */
async function stopApp({ port }) {
    const state = readState();

    if (!state) {
        const pids = getListeningPids(port);
        if (pids.length > 0) {
            console.log(`A porta ${port} está em uso (PID ${pids.join(', ')}), mas a aplicação não foi iniciada por estes scripts.`);
            console.log('Por segurança, nada foi encerrado.');
        } else {
            console.log('A aplicação não está rodando.');
        }
        return 0;
    }

    const appPort = state.port || port;

    if (!isProcessAlive(state.pid)) {
        clearState();
        console.log('A aplicação não está rodando (estado antigo removido).');
        return 0;
    }

    console.log(`Encerrando a aplicação (PID ${state.pid})...`);
    killProcessTree(state.pid);

    if (!(await waitForPortFree(appPort, 10000))) {
        forceKillProcessTree(state.pid);
        if (!(await waitForPortFree(appPort, 5000))) {
            console.error(`A porta ${appPort} continua em uso. Encerre o processo manualmente.`);
            return 1;
        }
    }

    clearState();
    console.log('Aplicação encerrada.');
    return 0;
}

/** Reinicia a aplicação (para + inicia). */
async function restartApp(options) {
    console.log('Reiniciando a aplicação...');
    const stopCode = await stopApp({ port: options.port });
    if (stopCode !== 0) {
        return stopCode;
    }
    return startApp(options);
}

module.exports = {
    DEFAULT_PORT,
    ROOT_DIR,
    LOG_FILE,
    STATE_FILE,
    parseArgs,
    startApp,
    stopApp,
    restartApp,
    // exportados para reuso/testes futuros
    checkPortAvailable,
    getListeningPids,
    isProcessAlive,
    openBrowser,
    waitForPortFree,
    waitForServerReady,
};
