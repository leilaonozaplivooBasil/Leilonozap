// 🌳 O INDICADO VIRA CONTATO DE QUEM INDICOU (25/09/2026).
//
// Dono: "os usuários que se cadastrarem na plataforma devem automaticamente
// virar um contato na sua respectiva árvore" — e, em 25/09, a régua fechada:
// "só vai para quem indicou mesmo, pelo menos por hora. Ex: João Paim indica
// alguém, esse alguém se cadastra, e automaticamente vira contato do João."
//
// REGRAS (as mesmas da Lista de Networking, pra não atrapalhar quem já tem
// contatos, reuniões e registros em andamento):
//   • só o INDICADOR DIRETO (app_users.referred_by_id) — não sobe a linha;
//   • a conta técnica do site (referral_code 'leilaonozap', o fallback de quem
//     chega sem link) NÃO ganha contato: não é uma pessoa com lista;
//   • nunca sobrepõe: se o indicador já tem alguém com o mesmo e-mail, o mesmo
//     telefone ou o mesmo nome, não cria de novo (e não toca no que existe);
//   • o contato nasce como 'lead', source 'indicacao', com carimbo em
//     raw_base44.origem = 'cadastro_indicado' (é o que permite desfazer em
//     massa: delete where raw_base44->>'origem' = 'cadastro_indicado');
//   • best-effort: falha aqui NUNCA derruba o cadastro — o cadastro já
//     aconteceu; isto é um espelho na lista do indicador.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enc = encodeURIComponent;

export const ORIGEM_CADASTRO_INDICADO = 'cadastro_indicado';
export const REFERRAL_DO_SITE = 'leilaonozap';

const soDigitos = (v) => String(v || '').replace(/\D/g, '');
const normNome = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Já existe alguém igual na lista do indicador? (e-mail, telefone ou nome) */
export function jaTemNaLista(lista = [], novo = {}) {
  const email = String(novo.email || '').trim().toLowerCase();
  const fone = soDigitos(novo.phone);
  const nome = normNome(novo.full_name);
  return (Array.isArray(lista) ? lista : []).some((c) => {
    if (!c) return false;
    if (email && String(c.email || '').trim().toLowerCase() === email) return true;
    if (fone.length >= 10 && soDigitos(c.phone) === fone) return true;
    if (nome && normNome(c.full_name) === nome) return true;
    return false;
  });
}

/** O contato pronto pra gravar na lista do indicador. */
export function contatoDoIndicado(novo, indicador, agora = new Date()) {
  const nome = String(novo?.full_name || '').replace(/\s+/g, ' ').trim();
  if (!nome || !indicador?.id) return null;
  const dia = agora.toISOString().slice(0, 10);
  return {
    full_name: nome,
    email: String(novo.email || '').trim().toLowerCase() || null,
    phone: String(novo.phone || '').trim() || null,
    status: 'lead',
    source: 'indicacao',
    created_by_id: String(indicador.id),
    created_by: indicador.email || null,
    notes: `Cadastrou-se no site pelo seu link de indicação em ${dia.split('-').reverse().join('/')}.`,
    raw_base44: { origem: ORIGEM_CADASTRO_INDICADO, user_id: novo.id ? String(novo.id) : null, em: agora.toISOString() },
  };
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/**
 * Cria o contato na lista do indicador direto, se couber. Nunca lança.
 * @returns {Promise<{criou:boolean, motivo:string}>}
 */
export async function criarContatoDaIndicacao(novo, { fetchImpl = null } = {}) {
  const f = fetchImpl || sb;
  try {
    if (!SUPABASE_URL || !SR) return { criou: false, motivo: 'config_ausente' };
    const indicadorId = novo?.referred_by_id ? String(novo.referred_by_id) : '';
    if (!indicadorId) return { criou: false, motivo: 'sem_indicador' };
    const uRows = await (await f(`app_users?select=id,email,referral_code&id=eq.${enc(indicadorId)}&limit=1`)).json();
    const indicador = Array.isArray(uRows) ? uRows[0] : null;
    if (!indicador) return { criou: false, motivo: 'indicador_nao_encontrado' };
    if (String(indicador.referral_code || '').toLowerCase() === REFERRAL_DO_SITE) return { criou: false, motivo: 'conta_do_site' };
    const lista = await (await f(`customers?select=id,email,phone,full_name&created_by_id=eq.${enc(indicadorId)}&limit=5000`)).json();
    if (jaTemNaLista(lista, novo)) return { criou: false, motivo: 'ja_tinha' };
    const contato = contatoDoIndicado(novo, indicador);
    if (!contato) return { criou: false, motivo: 'sem_nome' };
    const r = await f('customers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(contato) });
    if (!r.ok) {
      const detalhe = await r.text().catch(() => '');
      console.error(`[INDICACAO] não consegui criar o contato do indicado ${novo?.id} na lista de ${indicadorId} — HTTP ${r.status}:`, detalhe.slice(0, 200));
      return { criou: false, motivo: `http_${r.status}` };
    }
    console.log(`[INDICACAO] ${novo?.email || novo?.id} virou contato na lista de ${indicadorId}.`);
    return { criou: true, motivo: 'ok' };
  } catch (e) {
    console.error('[INDICACAO] erro ao criar contato do indicado:', String(e?.message || e));
    return { criou: false, motivo: 'excecao' };
  }
}
