/**
 * Helpers HTTP para as Route Handlers
 * Converte erros da aplicação em respostas JSON com status adequado
 * (tratamento de erros de src/api/endpoints.py).
 */

import { NextResponse } from 'next/server';
import { AppError, ValidationError, logError } from '@/lib/server/errors';

/**
 * Executa o handler de um endpoint, convertendo os erros da aplicação
 * em respostas JSON com o status code correto.
 */
export async function handleApiRequest(endpoint, handler) {
    try {
        const data = await handler();
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof ValidationError) {
            console.warn(`Erro de validação: ${error.message}`, { details: error.details, endpoint });
            return NextResponse.json(
                { error: error.message, field: error.field ?? null, details: error.details },
                { status: 400 }
            );
        }
        if (error instanceof AppError) {
            logError(error, { endpoint });
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        logError(error, { endpoint });
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

/**
 * Lê o corpo JSON da requisição. Lança ValidationError se inválido.
 */
export async function readJsonBody(request) {
    try {
        return await request.json();
    } catch {
        throw new ValidationError('Corpo da requisição deve ser um JSON válido.');
    }
}
