#!/usr/bin/env node
/**
 * Reinicia a aplicação (para e inicia novamente), abrindo o navegador.
 *
 * Uso:
 *   npm run app:restart
 *   npm run app:restart -- --prod          # build de produção antes de iniciar
 *   npm run app:restart -- --webpack       # dev com webpack (contorna o loop de HMR do Turbopack)
 *   npm run app:restart -- --no-browser    # não abre o navegador
 *   npm run app:restart -- --port=3001     # usa outra porta
 */
'use strict';

const { parseArgs, restartApp } = require('./lib/app-utils');

async function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        process.exitCode = await restartApp(options);
    } catch (error) {
        console.error(`Erro: ${error.message}`);
        process.exitCode = 1;
    }
}

main();
