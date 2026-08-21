// freteLeilao — MOTOR ÚNICO DE FRETE DO LEILÃO (21/08/2026).
//
// Um lugar só decide quanto de frete um leilão cobra. Antes existiam três
// caminhos diferentes e nenhum deles era autoridade:
//   • o navegador cotava e mandava o valor no lance (submitAtomicBid);
//   • o Buy Now não cotava nada e reservava frete ZERO (submitAtomicBuyNow);
//   • a liquidação recotava por conta própria, e com o id errado.
//
// ⚠️ O PRODUTO É `auction.product_id`, NUNCA `auction.id`.
// `cotarOpcoes()` usa o id recebido para procurar em `public.products`. Passar o
// id do LEILÃO não acha produto nenhum, e a cotação cai silenciosamente na caixa
// mínima dos Correios (11×2×16 cm, 0,3 kg) — ou seja, cota um pacote fictício e
// escolhe transportadora e preço por um pacote que não existe. Era o defeito F8,
// e era meu.
import { cotarOpcoes } from './frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Cota o frete de um leilão para um usuário, do lado do servidor.
 *
 * @param {object} p
 *   auctionId   obrigatório
 *   userId      obrigatório — o CEP sai do cadastro dele
 *   freteId     opcional — se vier, a opção precisa existir na cotação
 *   auction     opcional — se quem chamou já leu o leilão, evita uma consulta
 *   cep         opcional — sobrepõe o CEP do cadastro (checkout com outro endereço)
 * @returns {Promise<{ok:boolean, motivo:string, frete:object|null, opcoes:array}>}
 *   motivo: sem_cep · produto_nao_vinculado · cotacao_indisponivel ·
 *           opcao_invalida · ok
 */
export async function cotarFreteDoLeilao({ auctionId, userId, freteId = null, auction = null, cep = null }) {
  if (!SUPABASE_URL || !SR) return { ok: false, motivo: 'config_ausente', frete: null, opcoes: [] };

  let leilao = auction;
  if (!leilao) {
    const rows = await (await sb(`auctions?select=id,product_id,current_price,starting_price&id=eq.${enc(auctionId)}&limit=1`)).json();
    leilao = Array.isArray(rows) ? rows[0] : null;
  }
  if (!leilao) return { ok: false, motivo: 'leilao_nao_encontrado', frete: null, opcoes: [] };

  let cepUsar = String(cep || '').replace(/\D/g, '');
  if (cepUsar.length !== 8) {
    const uRows = await (await sb(`app_users?select=address_zip_code&id=eq.${enc(userId)}&limit=1`)).json();
    cepUsar = String((Array.isArray(uRows) ? uRows[0]?.address_zip_code : '') || '').replace(/\D/g, '');
  }
  if (cepUsar.length !== 8) return { ok: false, motivo: 'sem_cep', frete: null, opcoes: [] };

  // ⚠️ product_id, não auction.id — ver o bloco no topo do arquivo.
  if (!leilao.product_id) return { ok: false, motivo: 'produto_nao_vinculado', frete: null, opcoes: [] };

  let r;
  try {
    r = await cotarOpcoes({
      cep: cepUsar,
      items: [{ product_id: leilao.product_id, quantidade: 1 }],
    });
  } catch (e) {
    return { ok: false, motivo: 'cotacao_indisponivel', erro: String(e?.message || e), frete: null, opcoes: [] };
  }
  if (!r?.ok || !Array.isArray(r.opcoes) || !r.opcoes.length) {
    return { ok: false, motivo: 'cotacao_indisponivel', erro: r?.error || null, frete: null, opcoes: [] };
  }

  const escolhida = freteId
    ? r.opcoes.find((o) => String(o.id) === String(freteId))
    : r.opcoes[0];   // sem escolha explícita: a mais barata (as opções já vêm ordenadas)

  if (!escolhida) return { ok: false, motivo: 'opcao_invalida', frete: null, opcoes: r.opcoes };

  return {
    ok: true, motivo: 'ok', opcoes: r.opcoes,
    frete: {
      id: String(escolhida.id), valor: money(escolhida.preco),
      empresa: escolhida.empresa || null, servico: escolhida.nome || null,
      prazo: escolhida.prazo ?? null, cep: cepUsar,
    },
  };
}
