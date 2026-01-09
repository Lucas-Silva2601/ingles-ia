export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}
export function sanitizeText(text) {
    if (typeof text !== 'string')
        return '';
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
export function validateText(text, { minLength = 1, maxLength = 10000, allowEmpty = false, } = {}) {
    if (typeof text !== 'string') {
        throw new ValidationError('O texto deve ser uma string.', 'text');
    }
    const trimmed = text.trim();
    if (!allowEmpty && trimmed.length === 0) {
        throw new ValidationError('O texto não pode estar vazio.', 'text');
    }
    if (allowEmpty && trimmed.length === 0) {
        return true;
    }
    if (trimmed.length < minLength) {
        throw new ValidationError(`O texto deve ter pelo menos ${minLength} caracteres.`, 'text');
    }
    if (trimmed.length > maxLength) {
        throw new ValidationError(`O texto não pode exceder ${maxLength} caracteres.`, 'text');
    }
    return true;
}
const ALLOWED_LANGUAGES = [
    'en',
    'es',
    'it',
    'fr',
    'de',
    'nl',
    'pl',
    'ru',
    'id',
    'pt-BR',
    'ja',
];
export function validateLanguage(language) {
    if (typeof language !== 'string') {
        throw new ValidationError('O código do idioma deve ser uma string.', 'language');
    }
    if (!ALLOWED_LANGUAGES.includes(language)) {
        throw new ValidationError(`Idioma '${language}' não é suportado.`, 'language');
    }
    return language;
}
export function validateAndSanitizeText(text, options) {
    const sanitized = sanitizeText(text);
    validateText(sanitized, options);
    return sanitized.trim();
}
