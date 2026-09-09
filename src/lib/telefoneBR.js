// ☎️ telefoneBR — normalizador ÚNICO de telefone brasileiro (08/09/2026).
//
// POR QUE ISTO EXISTE: a Fase A do importador de contatos. Uma agenda de
// celular exportada traz o MESMO número escrito de quatro jeitos —
// "+55 11 98888-7777", "11988887777", "(11) 8888-7777", "011 98888 7777" —
// e a base de hoje já tem a divergência: dos 26 contatos da `customers`,
// 25 têm 11 dígitos e 1 tem 10 (o que perdeu o nono dígito). Sem uma regra
// só, importar uma agenda duplica a lista de network inteira.
//
// O que já existia e NÃO resolve: `onlyDigits` (src/lib/format.js) e o
// `normKey` do crmUnifiedCustomers.js tiram a máscara, mas nenhum dos dois
// trata o "55" na frente nem o nono dígito — para eles "11988887777" e
// "1188887777" são duas pessoas diferentes. São a mesma.
//
// A REGRA DO NONO DÍGITO: o 9 foi ACRESCENTADO aos celulares que já existiam
// (8888-7777 virou 9 8888-7777). Então o miolo estável de um celular são os
// 8 dígitos finais — é por eles que se compara. Fixo nunca ganhou dígito
// nenhum, por isso entra na chave marcado como fixo: sem isso o fixo
// 3333-4444 colidiria com o celular 9 3333-4444 do mesmo DDD.

/** Só os dígitos, sem máscara, sem espaço, sem +. */
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// DDDs que existem de fato no Brasil. É esta lista que separa telefone de
// lixo de agenda: 0800, 4004, *144 e código de banco não têm DDD válido e
// caem fora sozinhos, sem precisar de regra caso a caso.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export const dddValido = (d) => DDDS.has(Number(d));

/**
 * Tira o que não é o telefone em si: zeros à esquerda (código de operadora,
 * "011") e o código do país.
 *
 * ⚠️ O "55" só sai quando sobram 10 ou 11 dígitos depois dele — porque 55 é
 * TAMBÉM um DDD real (Santa Maria/RS). Um número de 10 dígitos começando com
 * 55 é do DDD 55, não um número sem DDD com código de país. Cortar cedo
 * demais transformaria (55) 3333-4444 em algo que não existe.
 */
function semPrefixo(digitos) {
  let d = digitos.replace(/^0+/, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

/**
 * Lê um telefone escrito de qualquer jeito e devolve o que ele é de verdade,
 * ou `null` quando não é um telefone brasileiro reconhecível.
 *
 * Retorna { ddd, local, celular, nacional, e164, chave }:
 *   • local    — o miolo SEM o nono dígito (8 dígitos no celular)
 *   • nacional — como se escreve hoje: DDD + 9 + miolo (11 dígitos no celular)
 *   • chave    — o que compara duas pessoas (ver `chaveTelefone`)
 */
export function telefoneBR(valor) {
  const d = semPrefixo(soDigitos(valor));
  if (d.length !== 10 && d.length !== 11) return null;

  const ddd = d.slice(0, 2);
  if (!dddValido(ddd)) return null;

  let resto = d.slice(2);
  // 11 dígitos = celular com o nono dígito, e o nono dígito é SEMPRE 9. Não
  // se olha o dígito seguinte: a faixa depois do 9 muda conforme a ANATEL
  // libera numeração nova, e chutar isso recusaria celular legítimo.
  let celular = false;
  if (resto.length === 9) {
    if (resto[0] !== '9') return null;
    resto = resto.slice(1);
    celular = true;
  }
  if (resto.length !== 8) return null;

  // 10 dígitos: 6-9 é celular escrito no formato antigo (o que perdeu o nono
  // dígito na migração); 2-5 é fixo. 0 e 1 não abrem número de assinante.
  if (!celular) {
    if (/[6-9]/.test(resto[0])) celular = true;
    else if (!/[2-5]/.test(resto[0])) return null;
  }

  const nacional = celular ? `${ddd}9${resto}` : `${ddd}${resto}`;
  return {
    ddd,
    local: resto,
    celular,
    nacional,
    e164: `+55${nacional}`,
    chave: `${ddd}${celular ? 'c' : 'f'}${resto}`,
  };
}

/**
 * A chave de comparação: dois telefones são a MESMA pessoa quando a chave
 * bate. "+55 (11) 98888-7777" e "1188887777" dão a mesma chave; o fixo
 * (11) 3333-4444 e o celular (11) 9 3333-4444 dão chaves diferentes.
 * Devolve `null` pro que não é telefone — e `null` nunca é igual a `null`
 * aqui: quem usa a chave pra deduplicar tem que ignorar as nulas, senão
 * junta todo mundo que veio sem telefone numa pessoa só.
 */
export function chaveTelefone(valor) {
  return telefoneBR(valor)?.chave ?? null;
}

/** É um telefone brasileiro que dá pra usar? */
export const telefoneValido = (valor) => telefoneBR(valor) !== null;

/**
 * O jeito que a pessoa lê na tela: (11) 98888-7777 / (11) 3333-4444.
 * O que não for telefone reconhecível volta como veio — a tela de conferência
 * mostra o original pra pessoa entender por que aquela linha não entrou.
 */
export function formatarTelefoneBR(valor) {
  const t = telefoneBR(valor);
  if (!t) return String(valor ?? '').trim();
  const meio = t.celular ? `9${t.local.slice(0, 4)}` : t.local.slice(0, 4);
  return `(${t.ddd}) ${meio}-${t.local.slice(4)}`;
}

/**
 * Guarda o telefone no banco sempre do mesmo jeito: só dígitos, no formato
 * nacional de hoje (com o nono dígito no celular). É o que a `customers.phone`
 * já usa na maioria das linhas — 25 das 26 —, então grava igual ao que existe
 * em vez de inventar um terceiro formato. O irreconhecível é gravado só com os
 * dígitos, como já era antes: normalizar não pode apagar o que a pessoa digitou.
 */
export function telefoneParaGravar(valor) {
  return telefoneBR(valor)?.nacional ?? soDigitos(valor);
}
