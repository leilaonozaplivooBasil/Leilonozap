// Helper para limpar título de produto antes de buscar no Google Shopping / Mercado Livre.
// Remove termos irrelevantes (voltagem, condição, "leilão", etc) e mantém só palavras
// significativas para aumentar precisão da busca.

export function cleanProductTitle(title) {
    if (!title || typeof title !== 'string') return '';

    let clean = title
        .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
        .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
        .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
        .replace(/\b(110v|220v|bivolt|127v|220\/127v|127\/220v)\b/gi, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Pega até 8 palavras significativas (mínimo 2 caracteres)
    const words = clean.split(' ').filter(w => w.length > 1);
    return words.slice(0, 8).join(' ');
}

// Hash simples e estável para usar como chave de cache localStorage
export function hashTitle(title) {
    const str = String(title || '').toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // 32-bit
    }
    return Math.abs(hash).toString(36);
}