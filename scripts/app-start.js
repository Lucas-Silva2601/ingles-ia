#!/usr/bin/env node
/**
 * Inicia a aplicação e abre o navegador automaticamente.
 *
 * Uso:
 *   npm run app:start
 *   npm run app:start -- --prod          # build de produção antes de iniciar
 *   npm run app:start -- --webpack       # dev com webpack (contorna o loop de HMR do Turbopack)
 *   npm run app:start -- --no-browser    # não abre o navegador
 *   npm run app:start -- --port=3001     # usa outra porta
 */
'use strict';

const { parseArgs, startApp } = require('./lib/app-utils');

async function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        process.exitCode = await startApp(options);
    } catch (error) {
        console.error(`Erro: ${error.message}`);
        process.exitCode = 1;
    }
}

main();
