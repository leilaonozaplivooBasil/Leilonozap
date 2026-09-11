// 📣 Quem pode receber a campanha — e quem não pode.
//
// Este arquivo é só regra, sem banco e sem internet, para poder ser testado.
// Quem vai buscar os contatos é o `listar.mjs`; quem dispara é o `disparar.mjs`.
//
// A regra de ouro: ninguém entra na lista por engano. Toda linha sai daqui com
// uma CLASSE dizendo por que ela pode (ou não pode) receber.

/** Domínios que a gente já viu digitados errado no cadastro. */
export const DOMINIOS_COM_ERRO_DE_DIGITACAO = Object.freeze([
  'gmail.vom', 'gmail.col', 'gmail.con', 'gmai.com',
  'iclou.com', 'hormail.com', 'gjmail.com',
]);

/**
 * Sufixo dos e-mails que o PRÓPRIO sistema inventou para o concurso.
 * Não existe caixa postal do outro lado: 100% de rejeição garantida.
 */
export const SUFIXO_SINTETICO = '@concurso.leilaonozap.net';

/** Telefones de teste que estão gravados como se fossem de cliente. */
export const TELEFONES_FALSOS = Object.freeze([
  '+5521999999999', '+5521000000000', '+5511999999999',
  '+5521123456789', '+5521999998888', '+552199999999',
]);

/** Caixas de teste/QA que não podem receber campanha nenhuma. */
export const EMAILS_DE_TESTE = Object.freeze([
  'teste@hotmail.com', 'teste@saidebaixo.com', 'criaremail@gmail.com',
  'inserir@gmail.com', 'site@leilaonozap.com', 'qa.nozap.teste@gmail.com',
  'blake.taylor38@mx-mailsrv.com',
]);

/** Caixas da própria operação. Recebem, mas ficam marcadas para você decidir. */
export const EMAILS_INTERNOS = Object.freeze([
  'relacionamento@leilaonozap.com', 'gestaoeoperacao@leilaonozap.com',
  'santannaequipe@gmail.com', 'luizsantanna@tttcorporate.com',
  'toptechdigitaldrive@gmail.com', 'livoolivecommerce@gmail.com',
  'tothetopdrive@gmail.com', 'gleicetoptrader@gmail.com',
]);

/** Só a classe 'ok' entra no disparo. Todas as outras ficam de fora. */
export const CLASSE_QUE_DISPARA = 'ok';

const FORMATO_DE_EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Deixa o e-mail no formato de comparação: minúsculo e sem espaço em volta.
 * @param {unknown} bruto
 * @returns {string} string vazia quando não veio nada
 */
export function normalizarEmail(bruto) {
  return String(bruto ?? '').trim().toLowerCase();
}

/**
 * Põe o telefone no padrão internacional (+55DDDNÚMERO).
 *
 * Aceita as três formas que existem no banco: só os dígitos, com o 55 na frente,
 * e com máscara ("(21) 98765-4321"). Devolve string vazia quando o número não dá
 * para aproveitar — número curto demais, de teste, ou de outro país.
 *
 * @param {unknown} bruto
 * @returns {string} '+55...' ou ''
 */
export function normalizarTelefone(bruto) {
  const digitos = String(bruto ?? '').replace(/[^0-9]/g, '');
  if (!digitos) return '';

  let e164 = '';
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    e164 = `+${digitos}`;
  } else if (digitos.length === 10 || digitos.length === 11) {
    e164 = `+55${digitos}`;
  } else {
    return '';
  }

  // 🔴 O filtro de telefone falso tem que rodar DEPOIS de normalizar.
  // Os números de teste estão gravados em duas formas no banco ('21999999999' e
  // '5521999999999'); comparar antes de normalizar deixava metade passar.
  return TELEFONES_FALSOS.includes(e164) ? '' : e164;
}

/**
 * Diz em que grupo o contato cai. É esta palavra que decide o disparo.
 *
 * - `ok`        → pode receber
 * - `sem_email` → só tem telefone (serve para SMS, não para e-mail)
 * - `sintetico` → endereço inventado pelo concurso, rejeição certa
 * - `teste`     → caixa de QA/teste
 * - `typo`      → domínio digitado errado (recuperável à mão)
 * - `invalido`  → endereço quebrado
 *
 * @param {string} email já normalizado
 * @returns {'ok'|'sem_email'|'sintetico'|'teste'|'typo'|'invalido'}
 */
export function classificarEmail(email) {
  if (!email) return 'sem_email';
  if (email.endsWith(SUFIXO_SINTETICO)) return 'sintetico';
  if (EMAILS_DE_TESTE.includes(email)) return 'teste';
  if (email.endsWith('.invalid') || email.startsWith('qa_')) return 'teste';
  if (!FORMATO_DE_EMAIL.test(email)) return 'invalido';
  const dominio = email.split('@')[1] || '';
  if (DOMINIOS_COM_ERRO_DE_DIGITACAO.includes(dominio)) return 'typo';
  return 'ok';
}

/**
 * Transforma uma linha crua de qualquer tabela num contato padronizado.
 * @param {{nome?:unknown,email?:unknown,telefone?:unknown,origem?:string,compras?:unknown,lances?:unknown}} bruto
 */
export function montarContato(bruto) {
  const email = normalizarEmail(bruto.email);
  const telefone = normalizarTelefone(bruto.telefone);
  return {
    nome: String(bruto.nome ?? '').trim(),
    email,
    telefone,
    classe: classificarEmail(email),
    interno: EMAILS_INTERNOS.includes(email),
    origem: String(bruto.origem ?? ''),
    compras: Number(bruto.compras) || 0,
    lances: Number(bruto.lances) || 0,
  };
}

/**
 * Junta contatos de várias tabelas numa lista só, sem repetir ninguém.
 *
 * A chave é o e-mail; quem não tem e-mail entra pelo telefone. Quando o mesmo
 * contato aparece duas vezes, fica o que tem mais histórico (comprou/deu lance),
 * porque é o registro com mais informação — e, no empate, o que tem telefone.
 *
 * @param {Array<object>} brutos
 * @returns {Array<object>} ordenado: quem já comprou primeiro
 */
export function juntarSemRepetir(brutos) {
  const porChave = new Map();

  for (const bruto of brutos) {
    const c = montarContato(bruto);
    const chave = c.email || c.telefone;
    if (!chave) continue;

    const antigo = porChave.get(chave);
    if (!antigo || ganhaDoOutro(c, antigo)) porChave.set(chave, c);
  }

  return [...porChave.values()].sort((a, b) =>
    b.compras - a.compras ||
    b.lances - a.lances ||
    (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR'));
}

function ganhaDoOutro(novo, atual) {
  if (novo.compras !== atual.compras) return novo.compras > atual.compras;
  if (novo.lances !== atual.lances) return novo.lances > atual.lances;
  if (Boolean(novo.telefone) !== Boolean(atual.telefone)) return Boolean(novo.telefone);
  return Boolean(novo.nome) && !atual.nome;
}

/**
 * Separa a lista nos grupos que o disparo usa.
 * @param {Array<object>} contatos saída de juntarSemRepetir
 * @param {Set<string>|Array<string>} [descadastrados] e-mails/telefones que pediram para sair
 */
export function separarParaDisparo(contatos, descadastrados = []) {
  const fora = descadastrados instanceof Set ? descadastrados : new Set(descadastrados);
  const saiu = (c) => fora.has(c.email) || fora.has(c.telefone);

  return {
    email: contatos.filter((c) => c.classe === CLASSE_QUE_DISPARA && c.email && !saiu(c)),
    sms: contatos.filter((c) => c.telefone && !saiu(c)),
    barrados: contatos.filter((c) => c.classe !== CLASSE_QUE_DISPARA),
    descadastrados: contatos.filter(saiu),
  };
}

/** Contagem por classe, para o relatório de antes do disparo. */
export function contarPorClasse(contatos) {
  const conta = {};
  for (const c of contatos) conta[c.classe] = (conta[c.classe] || 0) + 1;
  return conta;
}
