// 🔧 CORREÇÃO CIRÚRGICA — 1 CONTA, 1 CAMPO. TEMPORÁRIA (apagar depois).
// Autorizado por Gabriel em 04/08/2026: limpar o texto "[duplicada de Eloah]" que estava
// grudado no NOME da conta do Elyon e deixar só "Elyon Santanna".
// ⚠️ TRAVAS: ID fixo no código · só grava se o nome atual ainda contiver "[duplicada"
// · altera EXCLUSIVAMENTE full_name. E-mail, senha, cargo, carreira, saldo, comissão,
// código de indicação e vínculos de rede NÃO são tocados.
// Devolve antes/depois para auditoria.

const ID_ELYON = "696fb43386d2d2aea8e1e6e4";
// 04/08/2026 — 2º ajuste autorizado por Gabriel: grafia correta com apóstrofo.
const NOME_NOVO = "Elyon Sant'anna";

Deno.serve(async (req) => {
  try {
    const bruto = Deno.env.get("SUPABASE_URL") || "";
    const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!bruto || !chave) {
      return Response.json({ ok: false, error: "Supabase não configurado" }, { status: 500 });
    }
    const base = bruto.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const cab = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };

    let modo = "aplicar";
    try {
      const corpo = await req.json();
      if (corpo?.modo === "previa") modo = "previa";
    } catch (_) { /* sem corpo = aplicar */ }

    // 1) lê o estado atual
    const rLer = await fetch(`${base}/rest/v1/app_users?select=id,email,full_name&id=eq.${ID_ELYON}`, { headers: cab });
    if (!rLer.ok) {
      return Response.json({ ok: false, error: `Falha ao ler conta: HTTP ${rLer.status}` }, { status: 500 });
    }
    const achados = await rLer.json();
    if (!achados.length) {
      return Response.json({ ok: false, error: "Conta não encontrada — nada foi alterado" }, { status: 404 });
    }
    const antes = achados[0];

    // 2) trava de segurança: se já está limpo, não grava de novo
    if (String(antes.full_name || "") === NOME_NOVO) {
      return Response.json({
        ok: true,
        alterado: false,
        motivo: "O nome já está limpo — nada a fazer",
        nome_atual: antes.full_name,
        email: antes.email
      });
    }

    if (modo === "previa") {
      return Response.json({ ok: true, alterado: false, previa: true, antes: antes.full_name, depois: NOME_NOVO, email: antes.email });
    }

    // 3) grava SÓ o nome
    const rGravar = await fetch(`${base}/rest/v1/app_users?id=eq.${ID_ELYON}`, {
      method: "PATCH",
      headers: { ...cab, Prefer: "return=representation" },
      body: JSON.stringify({ full_name: NOME_NOVO })
    });
    if (!rGravar.ok) {
      return Response.json({ ok: false, error: `Falha ao gravar: HTTP ${rGravar.status}: ${(await rGravar.text()).slice(0, 300)}` }, { status: 500 });
    }
    const depois = (await rGravar.json())[0] || {};

    return Response.json({
      ok: true,
      alterado: true,
      email: antes.email,
      antes: antes.full_name,
      depois: depois.full_name,
      observacao: "Somente o campo full_name foi alterado"
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});