// 🔎 AUDITORIA TEMPORÁRIA — 100% LEITURA. NÃO ESCREVE, NÃO APAGA, NÃO ALTERA NADA.
// Objetivo: mostrar a ficha REAL das contas no Supabase de produção (Elyon / Eloha /
// Creiciane) para decidir com evidência o que é conta viva e o que é resíduo.
// Só faz GET no PostgREST. Nenhum PATCH/POST/DELETE existe neste arquivo — de propósito.
// Apagar depois de resolver o caso.

Deno.serve(async (req) => {
  try {
    const bruto = Deno.env.get("SUPABASE_URL") || "";
    const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!bruto || !chave) {
      return Response.json({ ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados" }, { status: 500 });
    }
    // normaliza: alguns ambientes já vêm com /rest/v1 no fim
    const base = bruto.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const cab = { apikey: chave, Authorization: `Bearer ${chave}` };

    const campos = [
      "id", "email", "full_name", "nickname", "store_name", "role",
      "career_levels", "primary_career_level", "enabled_panels",
      "commission_balance", "catalog_commission_balance", "total_commissions_generated",
      "seller_credit_balance", "test_wallet_balance",
      "saldo_disponivel", "saldo_alocado",
      "referral_code", "referred_by_id", "recruited_by_id", "is_seller",
      "phone", "cpf", "created_date"
    ].join(",");

    async function buscar(filtro) {
      const url = `${base}/rest/v1/app_users?select=${campos}&${filtro}&limit=50`;
      const r = await fetch(url, { headers: cab });
      if (!r.ok) return { erro: `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}` };
      return await r.json();
    }

    // 1) por e-mail (as duas grafias possíveis, sem diferenciar maiúsculas)
    const porEmail = await buscar("or=(email.ilike.*creiciane*,email.ilike.*cristiane*,email.ilike.*gleicetop*,email.ilike.*gleice*)");
    // 2) por nome (Elyon / Elion / Eloha / Santanna)
    const porNome = await buscar("or=(full_name.ilike.*elyon*,full_name.ilike.*elion*,full_name.ilike.*eloha*,full_name.ilike.*santanna*,full_name.ilike.*creiciane*,full_name.ilike.*cristiane*)");
    // 3) por loja (Gleicetop / Recreio)
    const porLoja = await buscar("or=(store_name.ilike.*gleice*,store_name.ilike.*recreio*,nickname.ilike.*gleice*,nickname.ilike.*recreio*)");

    // junta sem repetir
    const mapa = new Map();
    for (const grupo of [porEmail, porNome, porLoja]) {
      if (Array.isArray(grupo)) for (const u of grupo) mapa.set(u.id, u);
    }
    const contas = [...mapa.values()];

    // carteira digital de cada conta encontrada (saldo livre + reservado)
    const carteiras = {};
    for (const c of contas) {
      const r = await fetch(`${base}/rest/v1/digital_wallets?select=balance,held_balance&user_id=eq.${c.id}`, { headers: cab });
      carteiras[c.id] = r.ok ? await r.json() : `HTTP ${r.status}`;
    }

    // resumo compacto (a resposta completa estourava o limite de leitura)
    const resumo = contas.map((c) => {
      const w = Array.isArray(carteiras[c.id]) ? (carteiras[c.id][0] || {}) : {};
      return {
        email: c.email,
        nome: c.full_name,
        apelido: c.nickname,
        criada_em: String(c.created_date || "").slice(0, 10),
        role: c.role,
        carreira: c.career_levels,
        comissao: c.commission_balance,
        carteira_livre: w.balance ?? null,
        carteira_reservada: w.held_balance ?? null,
        saldo_disponivel: c.saldo_disponivel,
        codigo_indicacao: c.referral_code,
        indicado_por: c.referred_by_id,
        id: c.id
      };
    });

    return Response.json({
      ok: true,
      aviso: "LEITURA PURA — nada foi alterado no banco",
      total_contas_encontradas: contas.length,
      resumo,
      erros: {
        porEmail: porEmail?.erro || null,
        porNome: porNome?.erro || null,
        porLoja: porLoja?.erro || null
      }
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});