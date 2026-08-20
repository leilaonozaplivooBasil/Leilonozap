// pdvNetworkTree — alimenta o seletor "Quem está levando (licença)" do balcão.
// Devolve DUAS listas: a árvore inteira abaixo do balcão (em qualquer profundidade) e,
// só quando o operador digita algo, as pessoas de OUTRAS estruturas.
// Somente leitura — não move dinheiro, não grava nada.
import { bestSellingLevel } from '../_lib/networkChain.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIMITE_REDE = 400;
const LIMITE_OUTROS = 40;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
}
// busca sem acento e sem diferenciar maiúscula ("jose" acha "JOSÉ")
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ownerId = String(body?.ownerId || '').trim();
    const q = norm(body?.q || '');
    if (!ownerId) return res.status(400).json({ success: false, error: 'ownerId obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const [users, levelsArr] = await Promise.all([
      // 🔴 PONTO 122 (21/08/2026) — `active=neq.false` APAGAVA PEDAÇO DA ÁRVORE (risco #17)
      // No Postgres, `active <> false` com a coluna em NULL não dá "verdadeiro": dá
      // NULL — e a linha some do resultado. Conta antiga (ou criada por um caminho
      // que não preenche `active`) simplesmente não vinha nesta lista.
      // O estrago não é só a pessoa sumir do seletor: a árvore é montada por
      // pai→filho aqui embaixo. Se um NULL está no MEIO da linha, TODO MUNDO
      // abaixo dele fica órfão e desaparece junto — o balcão não consegue mais
      // escolher quem está levando a licença, e a venda vai pro dono errado.
      // O resto do sistema já trata NULL como ativo (`u.active !== false` em JS).
      // Esta consulta era a única que discordava. Agora as duas dizem a mesma coisa.
      (await sb('app_users?select=id,full_name,email,career_levels,primary_career_level,recruited_by_id,referred_by_id&or=(active.is.null,active.eq.true)&limit=5000')).json(),
      (await sb('career_levels?select=id,nome,venda_direta_pct')).json(),
    ]);
    if (!Array.isArray(users)) return res.status(200).json({ success: false, error: 'Falha ao ler a rede' });
    const levels = {};
    (Array.isArray(levelsArr) ? levelsArr : []).forEach((l) => { levels[l.id] = l; });

    // filhos por pai (recrutou OU indicou — a árvore é a mesma)
    const filhos = {};
    users.forEach((u) => {
      const pai = u.recruited_by_id || u.referred_by_id;
      if (pai) (filhos[pai] = filhos[pai] || []).push(u);
    });

    // árvore abaixo do balcão, em qualquer profundidade
    const daRede = new Set();
    const fila = [...(filhos[ownerId] || [])];
    while (fila.length) {
      const u = fila.shift();
      if (daRede.has(u.id)) continue;
      daRede.add(u.id);
      (filhos[u.id] || []).forEach((f) => { if (!daRede.has(f.id)) fila.push(f); });
    }

    const enfeitar = (u) => {
      const { level, pct } = bestSellingLevel(u, levels);
      return {
        id: u.id, full_name: u.full_name, email: u.email,
        nivel: level, nivel_nome: levels[level]?.nome || level, desconto_pct: Number(pct) || 0,
      };
    };
    const casa = (u) => !q || norm(u.full_name).includes(q) || norm(u.email).includes(q)
      || norm(levels[bestSellingLevel(u, levels).level]?.nome).includes(q);

    const minhaRede = users.filter((u) => daRede.has(u.id) && casa(u)).map(enfeitar)
      .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR', { sensitivity: 'base' }))
      .slice(0, LIMITE_REDE);

    // "outras estruturas" só aparece quando ele digita — senão vira lista infinita no balcão
    let outras = [];
    if (q) {
      const donos = {};
      users.forEach((u) => { donos[u.id] = u; });
      const estruturaDe = (u) => {
        let node = u;
        for (let i = 0; i < 12; i++) {
          const paiId = node.recruited_by_id || node.referred_by_id;
          if (!paiId || !donos[paiId]) break;
          node = donos[paiId];
        }
        return node?.id === u.id ? null : node?.full_name || null;
      };
      outras = users
        .filter((u) => u.id !== ownerId && !daRede.has(u.id) && casa(u))
        .slice(0, LIMITE_OUTROS)
        .map((u) => ({ ...enfeitar(u), estrutura: estruturaDe(u) }));
    }

    return res.status(200).json({ success: true, minha_rede: minhaRede, outras_estruturas: outras });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao carregar a rede', details: String(e?.message || e) });
  }
}