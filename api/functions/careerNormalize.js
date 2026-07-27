// careerNormalize — limpa os cargos que não existem mais no plano.
// Protegido por DIAG_KEY. Preview por padrão; grava só com confirm 'NORMALIZAR'.
//
// CONTEXTO (26/07/2026): o banco ainda carregava ids da loja antiga —
// licenciado_catalogo (18 cadastros), licenciado_aplicativo (7), influencer (3),
// trainee (2), user (1), plano_lider (1). Nenhum deles existe em careerLevels.js,
// que é a fonte única do plano. Resultado: a interface mostrava cargo errado
// (a conta Carvão Aceso, que é Licenciado 13%, aparecia como Influenciador) e o
// motor de comissão não achava percentual para esses ids.
//
// REGRA CONSERVADORA — normalizar não promove ninguém:
//   influencer  → influenciador      (mesmo cargo, id novo)
//   user        → usuario            (mesmo cargo, id novo)
//   trainee     → trainee_diretor    (mesmo cargo, id novo)
//   plano_lider → removido           (não existe equivalente)
//   licenciado_catalogo / licenciado_aplicativo → REMOVIDOS
//        (eram a licença da loja antiga; quem já é 'licenciado' continua
//         licenciado, quem não é NÃO vira — ficaria 'usuario', e o relatório
//         mostra quem caiu nessa situação para revisão humana)
// primary_career_level inválido vira o cargo VÁLIDO de maior ordem da pessoa.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

const lista = (x) => (Array.isArray(x) ? x : []);

// ordem = importância (espelha careerLevels.js)
const ORDEM = {
  usuario: 1, influenciador: 2, vendedor: 3, licenciado: 4, parceiro: 5,
  ponto_retirada: 6, loja_fisica: 7, distribuidor: 8,
  trainee_diretor: 101, executivo_conta: 102, diretoria_operacao: 103,
  diretoria_executiva: 104, ceo: 105, livoo_live: 106, embaixador: 107,
  conselheiro: 109, fundador: 110,
};
const CANON = new Set(Object.keys(ORDEM));

const RENOMEAR = {
  influencer: 'influenciador',
  user: 'usuario',
  trainee: 'trainee_diretor',
};
const REMOVER = new Set(['licenciado_catalogo', 'licenciado_aplicativo', 'plano_lider', 'kit_start', 'plano_lojista']);

function normalizarCargos(atuais) {
  const out = new Set();
  for (const c of lista(atuais)) {
    if (CANON.has(c)) { out.add(c); continue; }
    if (RENOMEAR[c]) { out.add(RENOMEAR[c]); continue; }
    // REMOVER e qualquer outro id desconhecido caem fora
  }
  if (!out.size) out.add('usuario'); // ninguém fica sem cargo
  return [...out].sort((a, b) => ORDEM[a] - ORDEM[b]);
}

function melhorPrincipal(cargos, atual) {
  if (atual && CANON.has(atual) && cargos.includes(atual)) return atual;
  // maior ordem entre os cargos válidos da pessoa
  return cargos.slice().sort((a, b) => ORDEM[b] - ORDEM[a])[0] || 'usuario';
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
      'app_users?select=id,full_name,email,career_levels,primary_career_level,active&limit=5000'
    )).json());

    const mudancas = [];
    const rebaixados = []; // quem perdeu o cargo da loja antiga e não tinha equivalente

    for (const u of users) {
      const antes = lista(u.career_levels);
      const depois = normalizarCargos(antes);
      const principalAntes = u.primary_career_level || null;
      const principalDepois = melhorPrincipal(depois, principalAntes);

      const mudouCargos = JSON.stringify(antes) !== JSON.stringify(depois);
      const mudouPrincipal = principalAntes !== principalDepois;
      if (!mudouCargos && !mudouPrincipal) continue;

      const tinhaLicencaAntiga = antes.some((c) => c === 'licenciado_catalogo' || c === 'licenciado_aplicativo');
      if (tinhaLicencaAntiga && !depois.includes('licenciado') && depois.join() === 'usuario') {
        rebaixados.push({ id: u.id, nome: u.full_name, email: u.email, antes, depois, ativo: u.active !== false });
      }

      mudancas.push({
        id: u.id,
        nome: u.full_name,
        ativo: u.active !== false,
        cargos_antes: antes,
        cargos_depois: depois,
        principal_antes: principalAntes,
        principal_depois: principalDepois,
      });
    }

    if (body.mode !== 'executar' || body.confirm !== 'NORMALIZAR') {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para gravar: { key, mode: 'executar', confirm: 'NORMALIZAR' }",
        cadastros_afetados: mudancas.length,
        atencao_revisar: rebaixados,
        mudancas,
      });
    }

    let ok = 0;
    const falhas = [];
    for (const m of mudancas) {
      const r = await sb(`app_users?id=eq.${encodeURIComponent(m.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          career_levels: m.cargos_depois,
          primary_career_level: m.principal_depois,
          updated_date: new Date().toISOString(),
        }),
      });
      if (r.ok) ok += 1;
      else falhas.push({ id: m.id, nome: m.nome, status: r.status });
    }

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      cadastros_afetados: mudancas.length,
      atualizados: ok,
      falhas,
      atencao_revisar: rebaixados,
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
