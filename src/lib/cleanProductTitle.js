// Helpers para limpar título de produto antes de buscar no Google Shopping / Mercado Livre.
// Estratégia em 3 camadas (do mais conservador ao mais agressivo):
//   1. cleanProductTitle           → limpeza inteligente, preserva marca+modelo+tipo (5 tokens)
//   2. cleanProductTitleAggressive → marca + modelo (3 tokens)
//   3. cleanProductTitleMinimal    → tipo do produto (1-2 tokens)

// Cores comuns isoladas — removidas APENAS quando estão no fim do título
const CORES_PT = [
    'preto', 'preta', 'branco', 'branca', 'cinza', 'azul', 'vermelho', 'vermelha',
    'verde', 'amarelo', 'amarela', 'rosa', 'roxo', 'roxa', 'laranja', 'marrom',
    'bege', 'dourado', 'dourada', 'prateado', 'prateada', 'grafite', 'pink',
    'nude', 'turquesa', 'lilas', 'lilás', 'vinho', 'champagne', 'titanio', 'titânio',
    'preto/branco', 'branco/preto'
];

// Tamanhos isolados de roupa/calçado — removidos APENAS no fim
const TAMANHOS_END = /\b(pp|p|m|g|gg|xg|xgg|xl|xxl|34|35|36|37|38|39|40|41|42|43|44|45|46)\s*(br|us|eu|uk)?\b\s*$/gi;

// Substantivos comuns de produto (para camada minimal)
const TIPOS_PRODUTO = [
    'console', 'tenis', 'tênis', 'fechadura', 'secador', 'volante', 'camera',
    'câmera', 'videoporteiro', 'aparelho', 'maquina', 'máquina', 'cadeira',
    'mesa', 'sofa', 'sofá', 'geladeira', 'fogao', 'fogão', 'microondas',
    'forno', 'liquidificador', 'batedeira', 'panela', 'jogo', 'kit',
    'monitor', 'notebook', 'celular', 'tablet', 'smartphone', 'tv', 'televisao',
    'televisão', 'caixa', 'fone', 'mouse', 'teclado', 'impressora', 'roteador',
    'cafeteira', 'ferro', 'ventilador', 'climatizador', 'ar-condicionado',
    'aspirador', 'lavadora', 'secadora', 'bicicleta', 'patinete', 'capacete',
    'mochila', 'bolsa', 'mala', 'relogio', 'relógio', 'oculos', 'óculos',
    'perfume', 'shampoo', 'creme', 'protetor', 'maquiagem', 'esmalte',
    'cooktop', 'depurador', 'coifa', 'lavadora', 'fritadeira'
];

// Normaliza para comparação (sem acentos, lowercase)
function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// =============================================================================
// CAMADA 1 — Limpeza inteligente (PRESERVA modelos como PS5, G29, MVW2000)
// =============================================================================
export function cleanProductTitle(title) {
    if (!title || typeof title !== 'string') return '';

    let clean = title
        // 1. Remove caracteres especiais
        .replace(/[®™©]/g, ' ')
        // 2. Remove termos de venda/leilão
        .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
        .replace(/\b(novo|nova|usado|usada|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
        .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
        // 3. Voltagens isoladas (qualquer posição)
        .replace(/\b(110v|220v|bivolt|127v|220\/127v|127\/220v)\b/gi, '')
        // 4. Códigos slash de cor tipo "ftwwht/cblack/solred"
        .replace(/\b[a-zA-Z]{3,}\/[a-zA-Z]{3,}(\/[a-zA-Z]{3,})+\b/g, ' ')
        // 5. Pontuação solta
        .replace(/[,|;]+/g, ' ')
        .replace(/[-_]+/g, ' ')
        // 6. Espaços múltiplos
        .replace(/\s+/g, ' ')
        .trim();

    // 7. Remove TAMANHO isolado no FINAL ("37 Br", "42", "M", "GG")
    clean = clean.replace(TAMANHOS_END, '').trim();

    // 8. Remove CORES isoladas do FINAL (até 2 tokens finais)
    //    Ex: "Secador Philco PSC3500 Prateado Bege" → tira "Prateado Bege"
    //    Mas mantém "Azul-claro" no meio porque já virou "Azul claro" (sem hífen) — manteremos as 2 últimas só se forem cores
    const tokensTmp = clean.split(' ').filter(Boolean);
    while (tokensTmp.length > 0) {
        const last = norm(tokensTmp[tokensTmp.length - 1]);
        if (CORES_PT.includes(last)) {
            tokensTmp.pop();
        } else {
            break;
        }
    }
    clean = tokensTmp.join(' ');

    // 9. Filtra tokens significativos (>= 2 chars)
    const words = clean.split(/\s+/).filter(w => w.length >= 2);

    // 10. Limita a 5 tokens (mais focado que os 8 antigos)
    return words.slice(0, 5).join(' ');
}

// =============================================================================
// CAMADA 2 — Marca + Modelo (3 tokens, foco)
// =============================================================================
export function cleanProductTitleAggressive(title) {
    const base = cleanProductTitle(title);
    if (!base) return '';
    const words = base.split(/\s+/).filter(w => w.length >= 2);
    return words.slice(0, 3).join(' ');
}

// =============================================================================
// CAMADA 3 — Mínimo viável (tipo + 1 qualificador)
// =============================================================================
export function cleanProductTitleMinimal(title) {
    const base = cleanProductTitle(title);
    if (!base) return '';
    const words = base.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return '';

    // Procura o primeiro substantivo de produto no título
    const normWords = words.map(norm);
    const tipoIdx = normWords.findIndex(w => TIPOS_PRODUTO.includes(w));

    if (tipoIdx >= 0) {
        // Encontrou: retorna o TIPO + a próxima palavra mais forte (marca/modelo)
        const tipo = words[tipoIdx];
        // Pega o token seguinte significativo (idealmente uma marca/modelo)
        const next = words[tipoIdx + 1] || words[tipoIdx - 1] || '';
        return next ? `${tipo} ${next}` : tipo;
    }

    // Não encontrou tipo conhecido → primeiras 2 palavras
    return words.slice(0, 2).join(' ');
}

// =============================================================================
// Hash estável para cache localStorage (não muda — preserva v3)
// =============================================================================
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