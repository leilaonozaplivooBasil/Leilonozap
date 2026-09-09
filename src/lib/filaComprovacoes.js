// 🔎 A FILA DE COMPROVAÇÕES DO ADM X-GAME (DIR-124, 09/09/2026) — dono,
// olhando a fila crescer: "eu preciso separar por data... data de
// comprovação, nome das pessoas, pra ficar mais fácil... ainda precisa ter
// uma busca, quando eu fizer buscar mais rápido, tanto a data e tanto o
// dia." Lógica PURA aqui (testável sem montar a tela) — quem desenha é
// XGameAdmin.jsx.

/** "lu" acha Luciano, Lúcia, LUIZ... — sem sofrer com acento nem maiúscula. */
export const semAcentoFila = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** A data ISO (2026-09-09) em dd/mm (09/09) — o formato que a pessoa digita pra buscar. */
export const ddmmDaData = (data) => `${String(data).slice(8, 10)}/${String(data).slice(5, 7)}`;

/**
 * Uma busca só: bate se o texto aparece no NOME da pessoa OU na DATA
 * (dd/mm ou o ISO cru) da comprovação — nunca precisa escolher qual campo
 * buscar, é a mesma caixa pros dois.
 * @param {{data:string}} item a comprovação (item de `xgame_diario`/`metodo_tarefas`)
 * @param {string} nomeDaPessoa já resolvido por quem chama (nomeDe/nomeExibicao)
 * @param {string} busca o texto digitado
 */
export function comprovacaoBateNaBusca(item, nomeDaPessoa, busca) {
  const q = semAcentoFila(String(busca || '').trim());
  if (!q) return true;
  return semAcentoFila(nomeDaPessoa).includes(q) || ddmmDaData(item?.data).includes(q) || semAcentoFila(item?.data).includes(q);
}

/**
 * Agrupa uma lista de comprovações por `data`, preservando a ORDEM em que
 * chegaram — a fila já vem do banco em `ORDER BY data DESC`; agrupar aqui
 * nunca pode reordenar por conta própria, só juntar quem tem a mesma data.
 * @param {Array<{data:string}>} lista
 * @returns {Array<[string, Array]>} pares [data, itensDaquelaData]
 */
export function agruparComprovacoesPorData(lista = []) {
  const grupos = [];
  const porData = new Map();
  lista.forEach((item) => {
    if (!porData.has(item.data)) {
      const bucket = [];
      porData.set(item.data, bucket);
      grupos.push([item.data, bucket]);
    }
    porData.get(item.data).push(item);
  });
  return grupos;
}

/**
 * Dentro de um grupo de UM dia (saída de `agruparComprovacoesPorData`),
 * agrupa por PESSOA — dono: "eu quero já separado por datas e por nomes...
 * data de hoje, nome das pessoas que estão participando." Mesma regra da
 * função acima: preserva a ORDEM de chegada, só junta quem é a mesma
 * pessoa (`user_id`), nunca reordena por conta própria.
 * @param {Array<{user_id:string}>} itens itens de um único dia
 * @param {(id:string)=>string} nomeDe já resolvido por quem chama
 * @returns {Array<[string, string, Array]>} triplas [user_id, nome, itensDaPessoa]
 */
export function agruparComprovacoesPorPessoa(itens = [], nomeDe = (id) => id) {
  const grupos = [];
  const porPessoa = new Map();
  itens.forEach((item) => {
    if (!porPessoa.has(item.user_id)) {
      const bucket = [];
      porPessoa.set(item.user_id, bucket);
      grupos.push([item.user_id, nomeDe(item.user_id), bucket]);
    }
    porPessoa.get(item.user_id).push(item);
  });
  return grupos;
}

const DIA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** "09/09 · terça-feira" — o cabeçalho de cada grupo do dia. */
export function rotuloDataComprovacao(data) {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(data || '');
  return `${ddmmDaData(data)} · ${DIA_SEMANA[d.getDay()]}`;
}

/**
 * "Hoje" / "Ontem" / "09/09 · quarta-feira" — o rótulo amigável do menu
 * suspenso de datas. Dono: "um menu suspenso pra escolher qual é a data do
 * mês. Hoje, ontem..." — pra ele não precisar decorar nem ler dd/mm pros
 * dois dias que mais importa (hoje e ontem).
 * @param {string} data a data ISO (2026-09-09)
 * @param {Date} [hoje] injetável nos testes; default é agora de verdade
 */
export function rotuloDataAmigavel(data, hoje = new Date()) {
  const alvo = new Date(`${data}T00:00:00`);
  if (Number.isNaN(alvo.getTime())) return String(data || '');
  const inicioDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diffDias = Math.round((inicioDeHoje.getTime() - alvo.getTime()) / 86400000);
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  return rotuloDataComprovacao(data);
}
