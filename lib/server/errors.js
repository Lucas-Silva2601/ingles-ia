/**
 * Tratamento de Erros Customizado
 * Classes de erro específicas para diferentes tipos de problemas
 * (porte de src/utils/error_handler.py)
 */

export class AppError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

export class ValidationError extends AppError {
    constructor(message, field = null, value = null) {
        const details = {};
        if (field) details.field = field;
        if (value !== null && value !== undefined) details.value = value;
        super(message, 400, details);
        this.name = 'ValidationError';
        this.field = field;
    }
}

export class ConfigurationError extends AppError {
    constructor(message, details = {}) {
        super(message, 500, details);
        this.name = 'ConfigurationError';
    }
}

export class ApiError extends AppError {
    constructor(message, statusCode = 500, details = {}) {
        super(message, statusCode, details);
        this.name = 'ApiError';
    }
}

export class ApiAuthenticationError extends ApiError {
    constructor(message, details = {}) {
        super(message, 401, details);
        this.name = 'ApiAuthenticationError';
    }
}

export class ApiRateLimitError extends ApiError {
    constructor(message, details = {}) {
        super(message, 429, details);
        this.name = 'ApiRateLimitError';
    }
}

export class ApiServerError extends ApiError {
    constructor(message, statusCode = 500, details = {}) {
        super(message, statusCode, details);
        this.name = 'ApiServerError';
    }
}

export class ApiNetworkError extends ApiError {
    constructor(message, details = {}) {
        super(message, 503, details);
        this.name = 'ApiNetworkError';
    }
}

/** Loga erro de forma estruturada */
export function logError(error, context = {}) {
    if (error instanceof AppError) {
        console.error(`${error.name}: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
            ...context,
        });
    } else {
        console.error(`Erro não tratado: ${error?.message || error}`, {
            errorType: error?.constructor?.name,
            ...context,
            stack: error?.stack,
        });
    }
}
