#!/usr/bin/env node
/**
 * Para a aplicação iniciada pelos scripts de execução.
 *
 * Uso:
 *   npm run app:stop
 *   npm run app:stop -- --port=3001
 */
'use strict';

const { parseArgs, stopApp } = require('./lib/app-utils');

async function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        process.exitCode = await stopApp({ port: options.port });
    } catch (error) {
        console.error(`Erro: ${error.message}`);
        process.exitCode = 1;
    }
}

main();
