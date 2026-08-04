// PONTO 77 — Faxina de título NA ENTRADA (prevenção, não correção retroativa).
//
// ⚠️ ESTE ARQUIVO TEM UM ESPELHO: base44/functions/gerarProdutosDoLote/entry.ts
// tem uma cópia inline desta mesma lógica, porque roda no runtime Deno e NÃO
// consegue importar de api/_lib. Se mudar aqui, mudar lá também.
//
// Regra de ouro: se a limpeza piorar (resultado vazio ou < 3 caracteres),
// DEVOLVE O ORIGINAL INTACTO. Nunca destruir o nome de um produto.

// Ruído de marketplace copiado junto com o título do anúncio original.
const RUIDO = [
  /\bfrete\s*gr[aá]tis\b/gi,
  /\bfrete\s*gratis\b/gi,
  /\bpromo[cç][aã]o\b/gi,
  /\boferta\s*(do\s*dia|imperd[ií]vel)?\b/gi,
  // ⚠️ Parcelamento só casa com contexto EXPLÍCITO de pagamento. Um "\d+x" solto
  // destruía quantidade e medida reais ("Kit 4x Parafusos", "15 X 15 Cm").
  /\b\d{1,2}\s*x\s*sem\s*juros\b/gi,
  /\bem\s+\d{1,2}\s*x\b/gi,
  /\bsem\s*juros\b/gi,
  /\bR\$\s*[\d.,]+/gi,
  /\bcompre\s*j[aá]\b/gi,
  /\b[uú]ltimas?\s*unidades?\b/gi,
  /\benvio\s*imediato\b/gi,
  /\bpronta\s*entrega\b/gi,
  /\bnovo\s*lacrado\b/gi,
  /\b(super\s*)?desconto\b/gi,
  /\bmenor\s*pre[cç]o\b/gi,
];

// Emojis e pictogramas (não fazem parte de nome de produto).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu;

// Palavras que ficam em minúscula no meio do título.
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para', 'em', 'no', 'na', 'a', 'o', 'ou', 'por']);

// Lista fechada de siglas técnicas. Antes qualquer palavra de até 3 letras em
// maiúscula era preservada — e "KIT TAÇAS" virava "KIT Taças". Só sigla real fica.
const SIGLAS = new Set(['LED', 'USB', 'TV', 'HD', 'PC', 'GB', 'MB', 'TB', 'ML', 'KG', 'CM', 'MM', 'V', 'W', 'A', 'AC', 'DC', 'SSD', 'RGB', 'GPS', 'USD', 'PVC', 'ABS', 'CPU', 'RAM', 'HDMI', 'INOX', 'SMD', 'IP', 'NF']);

function ehSiglaOuCodigo(palavra) {
  const limpa = palavra.replace(/[^\p{L}\p{N}]/gu, '');
  if (!limpa) return true;
  // Contém número → é código/medida (M4, 137, 2L, 4K, XL2). Preserva como está.
  if (/\d/.test(limpa)) return true;
  // Sigla técnica conhecida, escrita em maiúscula.
  if (limpa === limpa.toUpperCase() && SIGLAS.has(limpa)) return true;
  // Sem nenhuma vogal e curta → provável sigla (XL, ML, TX).
  if (limpa.length <= 3 && limpa === limpa.toUpperCase() && !/[AEIOUÁÉÍÓÚÃÕÂÊÔ]/i.test(limpa)) return true;
  return false;
}

function capitalizarPalavra(palavra, indice) {
  if (ehSiglaOuCodigo(palavra)) return palavra;
  const minuscula = palavra.toLowerCase();
  if (indice > 0 && CONECTORES.has(minuscula)) return minuscula;
  return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
}

function estaTodoEmCaixaAlta(texto) {
  const letras = texto.match(/\p{L}/gu) || [];
  if (letras.length === 0) return false;
  const maiusculas = letras.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase());
  const proporcao = maiusculas.length / letras.length;
  const palavras = texto.trim().split(/\s+/).length;
  return proporcao >= 0.7 && palavras > 3;
}

/**
 * Limpa o título de um produto/leilão vindo de importação.
 * Puro, sem efeito colateral. Idempotente: título já limpo passa inalterado.
 */
export function limparTitulo(titulo) {
  const original = String(titulo == null ? '' : titulo);
  if (!original.trim()) return original;

  let texto = original.replace(EMOJI, ' ');
  for (const padrao of RUIDO) texto = texto.replace(padrao, ' ');

  // Separadores órfãos deixados pela remoção do ruído (" - - ", " | | ").
  texto = texto.replace(/\s*[|/•·]\s*/g, ' ').replace(/\s+-\s+-\s+/g, ' - ');
  texto = texto.replace(/\s{2,}/g, ' ').trim();

  if (estaTodoEmCaixaAlta(texto)) {
    texto = texto.split(/\s+/).map((p, i) => capitalizarPalavra(p, i)).join(' ');
  }

  // Pontuação solta nas pontas (mantém ")" e "%" internos intactos).
  texto = texto.replace(/^[\s\-–—:|,.;*+]+/, '').replace(/[\s\-–—:|,;*+]+$/, '').trim();
  texto = texto.replace(/\s{2,}/g, ' ');

  // Proteção: se piorou, devolve o original.
  if (texto.length < 3) return original;
  return texto;
}

/**
 * Corta o texto respeitando o limite, sempre no último espaço antes do limite.
 * Nunca corta no meio da palavra. Não adiciona reticências.
 */
export function cortarNaPalavra(texto, limite) {
  const t = String(texto == null ? '' : texto);
  if (!limite || limite <= 0) return t;
  if (t.length <= limite) return t;
  const fatia = t.slice(0, limite);
  const ultimoEspaco = fatia.lastIndexOf(' ');
  // Sem espaço nenhum (palavra única gigante) → corte duro, é o único caminho.
  if (ultimoEspaco < 3) return fatia.trim();
  return fatia.slice(0, ultimoEspaco).trim();
}