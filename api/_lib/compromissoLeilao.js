// compromissoLeilao — a REGRA DOS TRÊS ESTADOS DO DINHEIRO (oficial, 08/08/2026).
//
// A carteira do arrematante tem TRÊS situações, não duas:
//   1) LIVRE           → pode dar lance e pode comprar na Loja Virtual
//   2) COMPROMETIDO    → foi coberto num leilão que AINDA está rolando.
//                        Pode dar lance de novo, mas NÃO pode comprar na Loja Virtual.
//   3) RESERVADO       → está no lance em que a pessoa é a líder agora
//                        (app_users.saldo_reservado)
//
// Por que o estado 2 não é uma coluna nova:
//   Ele é DERIVADO dos próprios lances. Guardar em coluna criaria uma segunda
//   verdade que pode dessincronizar do leilão real (foi assim que nasceram as
//   reservas órfãs de 08/08). Aqui o número é sempre recalculado a partir dos
//   lances vivos — se o leilão fecha, o compromisso some sozinho, sem rotina de
//   liberação, sem risco de dinheiro travado para sempre.
//
// Regra do dono, na prática:
//   • Depositou R$ 100 (+10%) e espalhou em 10 lances de R$ 10 em leilões de
//     datas diferentes → cada leilão que fecha SEM vitória libera R$ 10 para a
//     Loja Virtual, um a um.
//   • Ser coberto devolve o dinheiro NA HORA para relançar — mas ele continua
//     preso para a loja enquanto aquele leilão não acabar.
//   • O dinheiro pode migrar livremente de um leilão para outro (autorizado
//     pelo dono em 08/08/2026): o compromisso segue o lance, não o leilão.

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

/**
 * Quanto do saldo desta pessoa está comprometido em leilões AINDA EM ANDAMENTO
 * nos quais ela já não é a líder (ou seja: foi coberta e o dinheiro voltou).
 * Esse valor está DENTRO de saldo_disponivel — serve para lance, não para a loja.
 *
 * O lance em que ela É a líder não entra: aquele dinheiro está em saldo_reservado,
 * fora do disponível, e contá-lo aqui descontaria a mesma quantia duas vezes.
 */
export async function compromissoEmLeiloes(userId) {
  const uid = String(userId || '').trim();
  if (!uid || !SUPABASE_URL || !SR) return 0;

  // leilões vivos em que esta pessoa deu lance
  const lances = await (await sb(
    `auction_messages?select=auction_id,bid_amount,frete_amount&message_type=eq.bid&sender_id=eq.${encodeURIComponent(uid)}&limit=1000`
  )).json();
  if (!Array.isArray(lances) || lances.length === 0) return 0;

  const ids = [...new Set(lances.map((l) => l.auction_id).filter(Boolean))];
  if (!ids.length) return 0;
  const inList = ids.map((i) => `"${i}"`).join(',');
  const leiloes = await (await sb(`auctions?select=id,status,winner_id&id=in.(${inList})`)).json();

  const vivos = {};
  for (const a of (Array.isArray(leiloes) ? leiloes : [])) {
    // só leilão rolando prende dinheiro; e se ela é a líder, o valor está reservado
    if (a.status === 'active' && a.winner_id !== uid) vivos[a.id] = true;
  }

  // por leilão vale o MAIOR lance dela (o anterior já tinha sido devolvido antes)
  const porLeilao = {};
  for (const l of lances) {
    if (!vivos[l.auction_id]) continue;
    const total = money((Number(l.bid_amount) || 0) + (Number(l.frete_amount) || 0));
    if (!porLeilao[l.auction_id] || total > porLeilao[l.auction_id]) porLeilao[l.auction_id] = total;
  }
  return money(Object.values(porLeilao).reduce((s, v) => s + v, 0));
}

/**
 * Fotografia completa do saldo para telas e para o checkout.
 * livre_para_loja é o ÚNICO número que a Loja Virtual pode gastar.
 */
export async function saldosDoUsuario(userId) {
  const uid = String(userId || '').trim();
  const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(uid)}&limit=1`)).json();
  const u = Array.isArray(rows) ? rows[0] : null;
  const disponivel = money(u?.saldo_disponivel);
  const reservado = money(u?.saldo_reservado);
  const comprometido = await compromissoEmLeiloes(uid);
  return {
    saldo_disponivel: disponivel,               // pode dar lance
    saldo_reservado: reservado,                 // preso no lance em que lidera
    saldo_comprometido_leilao: comprometido,    // dentro do disponível, preso para a loja
    saldo_livre_loja: money(Math.max(0, disponivel - comprometido)),
  };
}