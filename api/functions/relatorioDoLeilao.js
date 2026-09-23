// 📊 relatorioDoLeilao — os números de UM leilão, pra quem pode mandar demanda.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// O dono recebeu à mão o relatório de depósitos do leilão do PS5 e decidiu:
// "esse relatório de um leilão específico deve ser uma opção para todos que
// podem enviar demanda".
//
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 A PERMISSÃO É CONFERIDA AQUI, E SÓ AQUI
// ═══════════════════════════════════════════════════════════════════════════
// Este relatório carrega NOME DE CLIENTE e QUANTO CADA UM PAGOU. Se a regra de
// quem vê morasse na tela, qualquer pessoa logada chamaria a rota direto e
// puxaria a carteira alheia — esconder o botão não esconde o endereço.
//
// A régua é a MESMA de mandar demanda (src/lib/xgame.js → podeDistribuirTarefa):
// `super_admin` passa, e os outros só com `xgame_participantes.pode_distribuir`.
// Não dá pra duplicar a regra aqui: se ela mudar lá, tem que mudar aqui junto —
// por isso a função é importada, não reescrita.
//
// 📋 MÉTODO: ver a RESSALVA em src/lib/relatorioDoLeilao.js. Depósito não fica
// marcado com o leilão; o que existe é "depósito de quem deu lance, enquanto o
// leilão estava aberto". A ressalva viaja DENTRO da resposta pra tela não poder
// mostrar o número sem ela.
import { exigirSessao } from '../_lib/sessao.js';
import { podeDistribuirTarefa } from '../../src/lib/xgame.js';
import { relatorioDoLeilao } from '../../src/lib/relatorioDoLeilao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const lista = async (p) => {
  const r = await sb(p);
  if (!r.ok) return [];
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j : [];
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const actorId = String(body.actorId || body.actor_id || '').trim();
    const _ses = exigirSessao(req, actorId, 'relatorioDoLeilao');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    // ⚠️ Atalho, não fechadura: quem fecha de verdade é o `!ator` logo abaixo
    // (id vazio não acha ninguém no cadastro, e cai no mesmo 403). A prova por
    // mutação confirmou — tirando esta linha nenhum teste quebra. Fica porque
    // custa nada e evita uma ida ao banco por chamada sem id.
    if (!actorId) return res.status(403).json({ success: false, error: 'Acesso restrito' });

    // 🔐 a MESMA régua de mandar demanda — role + a marca do jogo
    const [atorRows, partRows] = await Promise.all([
      lista(`app_users?select=id,role&id=eq.${enc(actorId)}&limit=1`),
      lista(`xgame_participantes?select=pode_distribuir&user_id=eq.${enc(actorId)}&limit=1`),
    ]);
    const ator = atorRows[0] || null;
    if (!ator) return res.status(403).json({ success: false, error: 'Acesso restrito' });
    const pode = podeDistribuirTarefa({ role: ator.role, pode_distribuir: partRows[0]?.pode_distribuir === true });
    if (!pode) {
      return res.status(403).json({ success: false, error: 'Este relatório é de quem pode enviar demanda.' });
    }

    // ── a LISTA de leilões, pra tela ter o que escolher ──
    if (body.acao === 'listar') {
      const leiloes = await lista(
        'auctions?select=id,title,status,created_date,end_time,current_price,winner_name'
        + '&order=end_time.desc.nullslast&limit=120',
      );
      return res.status(200).json({ success: true, leiloes });
    }

    const auctionId = String(body.auctionId || body.auction_id || '').trim();
    if (!auctionId) return res.status(400).json({ success: false, error: 'Escolha um leilão' });

    const leiloes = await lista(
      `auctions?select=id,title,status,created_date,end_time,starting_price,current_price,winner_id,winner_name,frete_reservado_valor&id=eq.${enc(auctionId)}&limit=1`,
    );
    const leilao = leiloes[0] || null;
    if (!leilao) return res.status(200).json({ success: false, error: 'Leilão não encontrado' });

    const [lances, reservas] = await Promise.all([
      lista(`auction_messages?select=sender_id,bid_amount,created_date&auction_id=eq.${enc(auctionId)}&message_type=eq.bid&limit=2000`),
      lista(`reserva_ledger?select=user_id,tipo,direcao,valor,created_at&auction_id=eq.${enc(auctionId)}&limit=2000`),
    ]);

    // 🔎 os depósitos: só de quem deu lance, e só na janela. O filtro final é da
    // regra pura (que tem prova), mas o RECORTE vem daqui — puxar a tabela de
    // depósitos inteira pra filtrar no servidor seria trazer a carteira de 866
    // pessoas pra decidir sobre 6.
    const donos = [...new Set((lances || []).map((l) => l?.sender_id).filter(Boolean))];
    let depositos = [];
    if (donos.length) {
      const inList = donos.map((d) => `"${String(d).replace(/"/g, '')}"`).join(',');
      depositos = await lista(
        'catalog_sales?select=id,buyer_id,buyer_name,status,total_amount,payment_method,created_date'
        + `&kind=eq.wallet_deposit&buyer_id=in.(${inList})&limit=2000`,
      );
    }

    // nomes: só de quem aparece no relatório, nunca a tabela toda
    const idsDeInteresse = [...new Set([...donos, leilao.winner_id].filter(Boolean))];
    const nomes = {};
    if (idsDeInteresse.length) {
      const inList = idsDeInteresse.map((d) => `"${String(d).replace(/"/g, '')}"`).join(',');
      for (const u of await lista(`app_users?select=id,full_name&id=in.(${inList})&limit=500`)) {
        nomes[u.id] = u.full_name || null;
      }
    }

    const relatorio = relatorioDoLeilao({ leilao, lances, depositos, reservas, nomes });
    return res.status(200).json({ success: true, relatorio });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao montar o relatório', details: String(e?.message || e) });
  }
}
