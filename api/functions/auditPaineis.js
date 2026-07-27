// auditPaineis — quem está com qual painel, e quem perdeu acesso. Só lê.
// Protegido por DIAG_KEY.
//
// POR QUE (27/07/2026): a Eloá (distribuidora, fundadora, diretora executiva) e o
// Gabriel (influenciador) ficaram sem o painel de alavancagem (/Licensing). Duas
// causas se somaram, e as duas vieram do trabalho desta madrugada:
//
//  1) A liberação do painel olha cargos ANTIGOS — licenciado_aplicativo e
//     licenciado_catalogo — que a normalização de cargos apagou por serem resíduo
//     da loja velha. Quem dependia deles perdeu o painel.
//  2) A gravação da carteira executiva SOBRESCREVE licenciado_context inteiro, e é
//     dentro dele que mora { enabled: true }, a outra chave que abre o painel.
//     A cascata passou por 13 cadastros e apagou esse conteúdo.
//
// Este endpoint mostra o estrago cadastro a cadastro, sem alterar nada.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

const lista = (x) => (Array.isArray(x) ? x : []);

// cargos da árvore oficial, do topo para a base
const REDE = ['distribuidor', 'loja_fisica', 'ponto_retirada', 'parceiro', 'licenciado', 'vendedor', 'influenciador', 'usuario'];
const TOPO = ['ceo', 'livoo_live', 'embaixador', 'conselheiro', 'fundador', 'diretoria_executiva', 'diretoria_operacao', 'executivo_conta', 'trainee_diretor'];

const cargosDe = (u) => (Array.isArray(u?.career_levels) ? u.career_levels : (u?.career_levels ? [u.career_levels] : []));

function lerContexto(u) {
  const ctx = u?.licenciado_context;
  if (!ctx) return null;
  try { return typeof ctx === 'string' ? JSON.parse(ctx) : ctx; } catch { return { _ilegivel: String(ctx).slice(0, 80) }; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'config_ausente' });

    const users = lista(await (await sb(
      'app_users?select=id,full_name,email,role,career_levels,primary_career_level,enabled_panels,licenciado_context,is_seller,active&limit=5000'
    )).json());
    const ativos = users.filter((u) => u.active !== false);

    const linhas = ativos.map((u) => {
      const cargos = cargosDe(u);
      const ctx = lerContexto(u);
      const painels = Array.isArray(u.enabled_panels) ? u.enabled_panels : [];

      // a regra ANTIGA de liberação do painel de alavancagem (/Licensing)
      const abriaAntes =
        u.role === 'licensee' ||
        cargos.includes('licenciado_aplicativo') ||
        cargos.includes('licenciado_catalogo') ||
        ctx?.enabled === true;

      const temPainelManual = painels.includes('licenciado');
      const cargoDeRede = cargos.find((c) => REDE.includes(c)) || null;
      const cargoDeTopo = cargos.find((c) => TOPO.includes(c)) || null;

      // pela árvore oficial, do VENDEDOR para cima é gente que ganha na rede
      const idxRede = cargoDeRede ? REDE.indexOf(cargoDeRede) : -1;
      const doVendedorParaCima = idxRede >= 0 && idxRede <= REDE.indexOf('vendedor');
      const mereceAlavancagem = doVendedorParaCima || !!cargoDeTopo || cargos.includes('influenciador');

      return {
        nome: u.full_name,
        email: u.email,
        role: u.role || null,
        cargos,
        cargo_de_rede: cargoDeRede,
        cargo_de_topo: cargoDeTopo,
        enabled_panels: painels,
        contexto_licenciado: ctx,
        contexto_tem_enabled: ctx?.enabled === true,
        contexto_so_tem_carteira: !!ctx && !('enabled' in (ctx || {})) && 'executive_owner_id' in (ctx || {}),
        tem_painel_hoje: abriaAntes || temPainelManual,
        deveria_ter: mereceAlavancagem,
        PERDEU_O_PAINEL: mereceAlavancagem && !(abriaAntes || temPainelManual),
      };
    });

    const perderam = linhas.filter((l) => l.PERDEU_O_PAINEL);
    const contextoLimpo = linhas.filter((l) => l.contexto_so_tem_carteira);

    return res.status(200).json({
      ok: true,
      total_ativos: ativos.length,
      sem_painel_de_alavancagem: perderam.length,
      cadastros_com_contexto_sobrescrito_pela_cascata: contextoLimpo.length,
      quem_perdeu: perderam.map((l) => ({
        nome: l.nome, email: l.email, cargos: l.cargos,
        contexto: l.contexto_licenciado, enabled_panels: l.enabled_panels,
      })),
      contexto_sobrescrito: contextoLimpo.map((l) => ({ nome: l.nome, contexto: l.contexto_licenciado })),
      todos: body.detalhado ? linhas : undefined,
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
