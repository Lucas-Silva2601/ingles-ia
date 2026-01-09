/**
 * Validações e Sanitização
 * Valida e sanitiza dados de entrada (porte de src/utils/validators.py)
 */

import { settings } from '@/lib/server/config';
import { ValidationError } from '@/lib/server/errors';

/**
 * Sanitiza texto removendo caracteres de controle
 * (exceto quebras de linha e tabs).
 */
export function sanitizeText(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/**
 * Valida texto de acordo com critérios configuráveis.
 * Lança ValidationError se a validação falhar.
 */
export function validateText(text, { minLength = null, maxLength = null, allowEmpty = false } = {}) {
    if (typeof text !== 'string') {
        throw new ValidationError('O texto deve ser uma string.', 'text', text);
    }

    const minLen = minLength || settings.minTextLength;
    const maxLen = maxLength || settings.maxTextLength;

    const trimmed = text.trim();

    if (!allowEmpty && trimmed.length === 0) {
        throw new ValidationError('O texto não pode estar vazio.', 'text', text);
    }

    if (allowEmpty && trimmed.length === 0) {
        return true;
    }

    if (trimmed.length < minLen) {
        throw new ValidationError(`O texto deve ter pelo menos ${minLen} caracteres.`, 'text', text);
    }

    if (trimmed.length > maxLen) {
        throw new ValidationError(`O texto não pode exceder ${maxLen} caracteres.`, 'text', text);
    }

    return true;
}

/**
 * Valida código de idioma.
 * Lança ValidationError se o idioma não for permitido.
 */
export function validateLanguage(language) {
    if (typeof language !== 'string') {
        throw new ValidationError('O idioma deve ser uma string.', 'language', language);
    }

    const lang = language.trim();

    if (!settings.allowedLanguages.includes(lang)) {
        throw new ValidationError(
            `Idioma '${lang}' não é suportado. Idiomas permitidos: ${settings.allowedLanguages.join(', ')}`,
            'language',
            lang
        );
    }

    return true;
}

/**
 * Valida parâmetros para chamadas à API (texto + idioma).
 */
export function validateApiParams(text, language) {
    validateText(text, { allowEmpty: false });
    validateLanguage(language);
    return true;
}
