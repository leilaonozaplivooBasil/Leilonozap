// 🔍 auditarVendaPessoal — AUDITORIA SOMENTE LEITURA (nunca grava nada).
//
// Criada em 04/08/2026 para provar (ou refutar) o caso levantado pelo dono:
// "Sofia Santana, da linha Distribuidor Bangu, comprou na própria loja virtual
//  e não recebeu a venda pessoal."
//
// REGRA OFICIAL CONFIRMADA PELO DONO (04/08/2026):
//   Todo cargo recebe a venda direta dele conforme venda_direta_pct do plano,
//   INCLUSIVE os cargos do bloco diretor. Os ganhos são CUMULATIVOS:
//   Distribuidor + Sócio Executivo = 20% de venda pessoal + 1% de executivo
//   + os pools dos cargos que tiver.
//
// O BUG SUSPEITO: a lista NIVEIS de acertarComissaoVenda só conhece o bloco
// rede. ceo / fundador / executivo_conta têm venda_direta_pct 20 na regra
// oficial (src/lib/careerLevels.js) e NÃO estão lá — quem tem só cargo de topo
// vende e recebe R$ 0 de venda pessoal.
//
// Esta função calcula a MESMA venda pelas duas listas (ATUAL x OFICIAL) e
// mostra a diferença linha por linha, sem tocar em nada.
//
// TRAINEE: fica exatamente como está hoje (sem percentual próprio) — decisão
// explícita do dono. Recebe apenas pelo cargo de rede que já possui.
//
// Payload: { nome: 'Sofia', papel?: 'comprador' | 'vendedor' | 'ambos', limite?: number }

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const sb = (path: string) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });

// ── PLANO ────────────────────────────────────────────────────────
const POOLS = [
  { id: 'ceo', pct: 3.0 }, { id: 'livoo_live', pct: 2.0 }, { id: 'embaixador', pct: 1.0 },
  { id: 'conselheiro', pct: 1.0 }, { id: 'fundador', pct: 1.0 },
  { id: 'diretoria_executiva', pct: 0.5 }, { id: 'diretoria_operacao', pct: 0.5 },
];

// Lista de venda direta HOJE no motor (só bloco rede)
const NIVEIS_ATUAL = [
  { id: 'influenciador', pct: 5.0 }, { id: 'vendedor', pct: 10.0 }, { id: 'licenciado', pct: 13.0 },
  { id: 'parceiro', pct: 15.0 }, { id: 'ponto_retirada', pct: 16.0 },
  { id: 'loja_fisica', pct: 19.0 }, { id: 'distribuidor', pct: 20.0 },
];

// Lista pela REGRA OFICIAL — acrescenta os cargos de topo que têm
// venda_direta_pct 20 em careerLevels.js. TRAINEE segue de fora, de propósito.
const NIVEIS_OFICIAL = [
  ...NIVEIS_ATUAL,
  { id: 'executivo', pct: 20.0 },
  { id: 'ceo', pct: 20.0 },
  { id: 'fundador', pct: 20.0 },
];

const CADEIA_TETO = 20.0;
const PCT_EXECUTIVO = 1.0;
const EMPRESA = 'Leilão NoZap - Site Oficial';

const ALIAS: Record<string, string[]> = {
  licenciado: ['licenciado', 'licenciado_catalogo'],
  influenciador: ['influenciador', 'influencer', 'licenciado_aplicativo'],
  executivo: ['executivo', 'executivo_conta', 'socio'],
  diretoria_executiva: ['diretoria_executiva', 'diretoria'],
  diretoria_operacao: ['diretoria_operacao', 'diretor'],
};
const temCargo = (u: any, cargo: string) => {
  const meus = Array.isArray(u?.career_levels) ? u.career_levels : [];
  return (ALIAS[cargo] || [cargo]).some((c) => meus.includes(c));
};
const carteiraExec = (u: any) => {
  if (!u) return null;
  if (u.executive_owner_id) return u.executive_owner_id;
  try {
    const p = typeof u.licenciado_context === 'string' ? JSON.parse(u.licenciado_context) : u.licenciado_context;
    return p?.executive_owner_id || null;
  } catch { return null; }
};

/** Calcula a distribuição de uma venda usando a lista de níveis informada. */
function calcular(sale: any, users: any[], niveis: any[]) {
  const valor = Number(sale.total_amount) || 0;
  const byId = new Map(users.map((u) => [u.id, u]));
  const linhas: any[] = [];
  if (!valor) return { linhas, cadeiaPct: 0, cadeia: [] as string[] };

  // cadeia: vendedor → quem indicou → ...
  const cadeia: any[] = [];
  const vistos = new Set();
  let cur = (sale.seller_id && byId.get(sale.seller_id)) || null;
  while (cur && !vistos.has(cur.id) && cadeia.length < 50) {
    cadeia.push(cur); vistos.add(cur.id);
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  const elegiveis = users.filter((u) => u.full_name !== EMPRESA);

  // TOPO — pools (idêntico ao motor; não é escopo desta auditoria mexer)
  for (const p of POOLS) {
    const donos = elegiveis.filter((u) => temCargo(u, p.id));
    if (!donos.length) continue;
    const centavosTotais = Math.round(valor * p.pct);
    if (centavosTotais <= 0) continue;
    const base = Math.floor(centavosTotais / donos.length);
    let sobra = centavosTotais - base * donos.length;
    const ord = [...donos].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const u of ord) {
      const cent = base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
      if (cent <= 0) continue;
      linhas.push({ nome: u.full_name, cargo: p.id, pct: round2(p.pct / donos.length), valor: cent / 100, tipo: 'governanca' });
    }
  }

  // EXECUTIVO 1% — carteira migrada > próprio cargo > sobe a linha > raiz
  let exec: any = null;
  {
    const vistosExec = new Set();
    let atual: any = cadeia[0] || null;
    while (atual && !vistosExec.has(atual.id) && vistosExec.size < 50) {
      vistosExec.add(atual.id);
      const dono = byId.get(carteiraExec(atual));
      if (dono && temCargo(dono, 'executivo')) { exec = dono; break; }
      if (temCargo(atual, 'executivo')) { exec = atual; break; }
      atual = atual.referred_by_id ? byId.get(atual.referred_by_id) : null;
    }
    if (!exec) exec = elegiveis.find((u) => temCargo(u, 'executivo') && temCargo(u, 'ceo')) || null;
  }
  if (exec) {
    linhas.push({ nome: exec.full_name, cargo: 'executivo', pct: PCT_EXECUTIVO, valor: Math.round(valor * PCT_EXECUTIVO) / 100, tipo: 'estrutura' });
  }

  // CADEIA TELESCÓPICA (venda direta + rebates subindo)
  const nivelDe = (u: any) => {
    let melhor: any = null;
    for (const n of niveis) if (temCargo(u, n.id) && (!melhor || n.pct > melhor.pct)) melhor = n;
    return melhor;
  };
  let piso = 0, pctCadeia = 0;
  for (const u of cadeia) {
    if (pctCadeia >= CADEIA_TETO - 0.0001) break;
    const nivel = nivelDe(u);
    if (!nivel) continue;
    const rebate = nivel.pct - piso;
    if (rebate <= 0) continue;
    const fatia = Math.min(rebate, CADEIA_TETO - pctCadeia);
    linhas.push({
      nome: u.full_name, cargo: nivel.id, pct: round2(fatia),
      valor: Math.round(valor * fatia) / 100,
      tipo: piso === 0 ? 'venda_pessoal' : 'rebate',
    });
    piso = nivel.pct; pctCadeia += fatia;
  }

  return { linhas, cadeiaPct: round2(pctCadeia), cadeia: cadeia.map((u) => u.full_name) };
}

/** Soma por pessoa, pra comparar os dois cenários. */
const somarPorPessoa = (linhas: any[]) => {
  const m: Record<string, number> = {};
  for (const l of linhas) m[l.nome] = round2((m[l.nome] || 0) + l.valor);
  return m;
};

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const nome = String(body.nome || '').trim();
    if (!nome) return Response.json({ error: 'informe nome (ex: "Sofia")' }, { status: 400 });
    const papel = body.papel || 'ambos';
    const limite = Math.min(Number(body.limite) || 20, 50);

    const users = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id,licenciado_context,commission_balance&limit=3000')).json();
    if (!Array.isArray(users) || !users.length) return Response.json({ error: 'falha ao ler app_users' }, { status: 500 });

    // quem é a pessoa procurada
    const alvo = String(nome).toLowerCase();
    const pessoas = users
      .filter((u: any) => String(u.full_name || '').toLowerCase().includes(alvo))
      .map((u: any) => ({
        id: u.id, nome: u.full_name,
        cargos: Array.isArray(u.career_levels) ? u.career_levels : [],
        indicado_por: users.find((x: any) => x.id === u.referred_by_id)?.full_name || null,
        carteira_executivo: users.find((x: any) => x.id === carteiraExec(u))?.full_name || null,
      }));

    // vendas onde ela é compradora e/ou vendedora — SEM filtro de data
    const ids = pessoas.map((p) => p.id);
    const vendasTodas: any[] = [];
    const vistas = new Set<string>();

    const push = (arr: any[]) => {
      for (const v of (Array.isArray(arr) ? arr : [])) {
        if (!vistas.has(v.id)) { vistas.add(v.id); vendasTodas.push(v); }
      }
    };

    if (papel === 'comprador' || papel === 'ambos') {
      push(await (await sb(`catalog_sales?select=*&buyer_name=ilike.*${encodeURIComponent(nome)}*&order=created_date.desc&limit=${limite}`)).json());
    }
    if ((papel === 'vendedor' || papel === 'ambos') && ids.length) {
      push(await (await sb(`catalog_sales?select=*&seller_id=in.(${ids.join(',')})&order=created_date.desc&limit=${limite}`)).json());
    }

    const nomesAlvo = new Set(pessoas.map((p) => p.nome));
    const relatorio = [];

    for (const v of vendasTodas.slice(0, limite)) {
      const pagosRaw = await (await sb(`commission_records?select=user_name,role,percent,amount&sale_id=eq.${encodeURIComponent(v.id)}`)).json();
      const pagos = Array.isArray(pagosRaw) ? pagosRaw : [];

      const atual = calcular(v, users, NIVEIS_ATUAL);
      const oficial = calcular(v, users, NIVEIS_OFICIAL);
      const somaAtual = somarPorPessoa(atual.linhas);
      const somaOficial = somarPorPessoa(oficial.linhas);

      const diferencas = Object.keys({ ...somaAtual, ...somaOficial })
        .map((n) => ({ nome: n, atual: round2(somaAtual[n] || 0), oficial: round2(somaOficial[n] || 0), delta: round2((somaOficial[n] || 0) - (somaAtual[n] || 0)) }))
        .filter((d) => Math.abs(d.delta) > 0.001)
        .sort((a, b) => b.delta - a.delta);

      relatorio.push({
        sale_id: v.id,
        data: String(v.created_date || '').slice(0, 10),
        produto: String(v.product_title || '').slice(0, 60),
        valor: round2(Number(v.total_amount)),
        status: v.status,
        comprador: v.buyer_name,
        vendedor_da_venda: atual.cadeia[0] || '(sem cadeia → empresa)',
        cadeia: atual.cadeia,
        // a pessoa procurada apareceu como beneficiária?
        alvo_recebeu_hoje: round2(pagos.filter((p: any) => nomesAlvo.has(p.user_name)).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)),
        alvo_deveria_receber: round2(Object.entries(somaOficial).filter(([n]) => nomesAlvo.has(n)).reduce((s, [, val]) => s + val, 0)),
        gravado_hoje: body.resumo ? pagos.length : pagos.map((p: any) => ({ nome: p.user_name, cargo: p.role, pct: p.percent, valor: round2(Number(p.amount)) })),
        regra_atual: body.resumo ? { cadeia_pct: atual.cadeiaPct } : { cadeia_pct: atual.cadeiaPct, linhas: atual.linhas },
        regra_oficial: body.resumo ? { cadeia_pct: oficial.cadeiaPct } : { cadeia_pct: oficial.cadeiaPct, linhas: oficial.linhas },
        diferencas,
      });
    }

    return Response.json({
      success: true,
      somente_leitura: true,
      gravou_algo: false,
      procurado: nome,
      pessoas_encontradas: pessoas,
      vendas_encontradas: relatorio.length,
      vendas: relatorio,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});