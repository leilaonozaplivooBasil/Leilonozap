// mpWebhook — recebe notificação do Mercado Pago, CONFIRMA o pagamento buscando-o na API do MP
// (não confia no corpo), marca a venda como paga e PAGA as comissões pela cadeia (telescópio, teto 20%).
// Idempotente: se a venda já está paga, não repaga.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { gerarEnvioAutomatico } from '../_lib/melhorEnvioShipment.js';
import { settlePdvPixSale } from '../_lib/pdvSettle.js';
// 🏪 Reposição de estoque do lojista (compra firme): entra estoque, não paga comissão.
import { aplicarReposicao } from '../_lib/supplySettle.js';
import { debitarCupomDaVenda, criarCupomPassaporte } from '../_lib/passaporteCoupon.js';
import { payDirectCommissions } from '../_lib/commissions.js';
import { registrarReceita } from '../_lib/financialIncome.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const round2 = (n) => Math.round(n * 100) / 100;

// Depósito na carteira: credita saldo de forma atômica (CAS). NÃO paga comissão nem cumpre pedido — é só recarga.
// Chamado só depois do flip atômico (execução única por venda). A coluna depende da carteira-destino:
//   wallet_deposit -> saldo_disponivel (carteira digital, usada em arremate/lance)
//   commission_deposit -> commission_balance (carteira de comissões, usada no 'Pagar com saldo' da loja)
async function creditWalletDeposit(sale) {
  // 💵 operacao_deposit → saldo_operacao: dinheiro recebido do cliente na rua,
  // usado para pagar pedidos. Não sacável (só mercadoria ou transferência).
  const col = sale.kind === 'commission_deposit' ? 'commission_balance'
    : sale.kind === 'operacao_deposit' ? 'saldo_operacao'
    : 'saldo_disponivel';
  const amount = round2(Number(sale.total_amount || sale.sale_price) || 0);
  if (!sale.buyer_id || amount <= 0) return { credited: 0, skipped: true };
  for (let attempt = 0; attempt < 6; attempt++) {
    const rows = await (await sb(`app_users?select=${col}&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { credited: 0, error: 'buyer_notfound' };
    const current = round2(Number(user[col]) || 0);
    const novo = round2(current + amount);
    // 🔒 CORREÇÃO PONTO 71: coluna nunca inicializada fica NULL no banco, e "col=eq.0"
    // nunca combina com NULL (NULL = 0 não é verdadeiro no Postgres) — o crédito falhava
    // pra sempre em silêncio pra todo usuário novo. Se current é 0, aceita NULL também.
    const casFilter = current === 0 ? `or=(${col}.eq.0,${col}.is.null)` : `${col}=eq.${current}`;
    const patch = await sb(`app_users?id=eq.${encodeURIComponent(sale.buyer_id)}&${casFilter}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ [col]: novo }),
    });
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated.length) return { credited: amount, wallet: col, new_balance: novo };
  }
  return { credited: 0, error: 'cas_conflict' };
}

// Adesão de cargo: ativa o nível, gera pedido de produto (valor volta em produto) e paga 20% pro vendedor
async function activateAdesao(sale) {
  const u = await (await sb(`app_users?select=career_levels&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  const buyer = Array.isArray(u) ? u[0] : null;
  const levels = Array.isArray(buyer?.career_levels) ? buyer.career_levels.slice() : [];
  if (!levels.includes(sale.adesao_level)) levels.push(sale.adesao_level);
  await sb(`app_users?id=eq.${sale.buyer_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ career_levels: levels, primary_career_level: sale.adesao_level }) });
  // pedido de produto (crédito = valor da adesão)
  await sb('adesao_orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: oid(), sale_id: sale.id, user_id: sale.buyer_id, user_name: sale.buyer_name, user_email: sale.buyer_email, adesao_level: sale.adesao_level, valor_produto: sale.total_amount, status: 'a_escolher' }) });
  // 20% de adesão em dinheiro pro vendedor (quem indicou)
  let bonus = 0;
  if (sale.seller_id) {
    bonus = round2(0.20 * Number(sale.total_amount));
    const s = await (await sb(`app_users?select=full_name,primary_career_level,commission_balance&id=eq.${encodeURIComponent(sale.seller_id)}&limit=1`)).json();
    const seller = Array.isArray(s) ? s[0] : null;
    if (seller) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sale_id: sale.id, beneficiary_id: sale.seller_id, beneficiary_name: seller.full_name, beneficiary_level: seller.primary_career_level, role_in_sale: 'bonus_adesao', pct: 20, amount: bonus }) });
      await sb(`app_users?id=eq.${sale.seller_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(seller.commission_balance) || 0) + bonus) }) });
    }
  }
  return { adesao: true, level: sale.adesao_level, product_credit: sale.total_amount, bonus };
}

// Adesão de Vendedor (primeira compra R$1.497): credita seller_credit_balance de forma
// atômica (CAS) — o vendedor usa esse crédito pra escolher produtos na Loja Virtual. Além
// disso, paga comissão pra cadeia de quem indicou o comprador (referred_by_id), reaproveitando
// o mesmo motor telescópico/teto 20% já usado nas vendas da loja (payDirectCommissions).
async function creditSellerAdhesion(sale) {
  const amount = round2(Number(sale.total_amount || sale.sale_price) || 0);
  if (!sale.buyer_id || amount <= 0) return { credited: 0, skipped: true };
  let referredById = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const rows = await (await sb(`app_users?select=seller_credit_balance,referred_by_id&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { credited: 0, error: 'buyer_notfound' };
    referredById = user.referred_by_id || null;
    const current = round2(Number(user.seller_credit_balance) || 0);
    const novo = round2(current + amount);
    const casFilter = current === 0 ? `or=(seller_credit_balance.eq.0,seller_credit_balance.is.null)` : `seller_credit_balance=eq.${current}`;
    const patch = await sb(`app_users?id=eq.${encodeURIComponent(sale.buyer_id)}&${casFilter}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ seller_credit_balance: novo }),
    });
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated.length) {
      // 💰 comissão pra quem indicou (best-effort — erro aqui não desfaz o crédito já dado)
      const commission = referredById ? await payDirectCommissions({ saleId: sale.id, sellerId: referredById, total: amount }) : 0;
      return { credited: amount, new_balance: novo, commission };
    }
  }
  return { credited: 0, error: 'cas_conflict' };
}

// Ativa o Plano de Parceiro (Lucre Conosco/InvestorDashboard): cria o registro em
// partner_plan_purchases com o mesmo formato usado pela ativação manual (PartnerPlanActivation.jsx).
async function activatePartnerPlan(sale) {
  const id = oid();
  const activatedAt = new Date().toISOString();
  const start = new Date();
  const schedule = [1, 2, 3].map((i) => {
    const d = new Date(start); d.setDate(d.getDate() + i * 15);
    return { period: i, date: d.toISOString(), status: 'scheduled' };
  });
  await sb('partner_plan_purchases', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id, base44_id: id,
      user_id: sale.buyer_id, user_name: sale.buyer_name, user_email: sale.buyer_email,
      plan_name: sale.product_title, plan_amount: round2(Number(sale.total_amount) || 0),
      activated_at: activatedAt, status: 'active',
      purchase_periods: schedule, activation_source: 'lucre_conosco',
    }),
  });
  return { partner_plan_activated: true, plan_name: sale.product_title, plan_amount: sale.total_amount };
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PONTO 122 (21/08/2026) — A PORTA DO DINHEIRO ESTAVA SEM FECHADURA (risco #27)
// ══════════════════════════════════════════════════════════════════════════════
// Esta rota é pública (tem que ser — quem chama é o Mercado Pago) e não conferia
// NADA sobre quem estava batendo. O `import crypto` no topo do arquivo estava lá
// desde sempre, sem uso: alguém começou esta trava e não terminou.
//
// SENDO JUSTO COM O CÓDIGO ANTIGO: o estrago não é "qualquer um marca venda como
// paga". O handler não confia no corpo — ele busca o pagamento na API do MP com o
// nosso token e só age se o MP disser `approved`. Forjar pagamento por aqui não dá.
// O que dá, sem assinatura:
//   • disparar processamento com IDs de pagamento chutados, à vontade;
//   • fazer a rota gastar chamada de API do MP e do banco a cada tiro (a conta e
//     o rate limit são nossos);
//   • forçar a hora do processamento de pagamentos reais de terceiros.
// É blindagem, não remendo de rombo — mas é a blindagem que todo gateway manda pôr.
//
// COMO LIGAR — EM DUAS ETAPAS, DE PROPÓSITO:
//
//   etapa 1 (observar): publicar só MP_WEBHOOK_SECRET na Vercel. A função confere
//     a assinatura e ANOTA NO LOG se bateu ou não, mas NÃO recusa nada.
//   etapa 2 (bloquear): depois de ver no log que bate em pagamento de verdade,
//     publicar MP_WEBHOOK_MODO=bloquear. Aí assinatura errada vira 401.
//
// A chave secreta sai em Mercado Pago → Suas integrações → a aplicação →
// Webhooks → "Assinatura secreta" — e ela SÓ EXISTE depois que o webhook estiver
// configurado naquela tela.
//
// POR QUE DUAS ETAPAS, E NÃO LIGAR DIRETO (decisão de 21/08/2026):
// hoje o Mercado Pago nos notifica porque cada cobrança leva `notification_url`
// dentro dela — não porque exista webhook cadastrado no painel. Eu NÃO tenho
// certeza de que a notificação que chega por esse caminho venha assinada com a
// mesma chave. Se não vier, ligar a trava direto recusaria TODA notificação e
// derrubaria o recebimento de pagamentos. O log da etapa 1 responde essa pergunta
// com pagamento real, sem arriscar um centavo. Padrão sem MP_WEBHOOK_MODO =
// observar: quem esquecer de configurar não quebra nada.
// Lê cabeçalho sem depender do formato: no Node os headers vêm como objeto de
// chaves minúsculas; em runtime tipo Edge vêm como Headers (com .get). Ler só de
// um jeito faria a assinatura "sumir" por motivo de plataforma, não de segurança.
function lerCabecalho(req, nome) {
  const h = req?.headers;
  if (!h) return '';
  if (typeof h.get === 'function') return String(h.get(nome) || '');
  return String(h[nome] || h[nome.toLowerCase()] || h[nome.toUpperCase()] || '');
}

// 🔎 DIAGNÓSTICO (21/08/2026) — a pergunta que o código não sabia responder.
// A notificação do Mercado Pago chega aqui por DOIS caminhos possíveis: o webhook
// cadastrado no painel, e o `notification_url` que cada cobrança leva dentro dela
// (é o que as 12 rotas de pagamento deste repositório usam). A documentação do MP
// afirma que a assinatura vai "na URL registrada", e não diz o que acontece no
// segundo caminho. Como nenhuma versão anterior deste arquivo LEU cabeçalho
// nenhum, não existe registro em lugar nenhum — nem no código, nem no banco.
// Esta linha faz a própria notificação real responder, sem mexer em configuração
// e sem risco: lista só os NOMES dos cabeçalhos que chegaram (nunca o valor da
// assinatura) e diz se o x-signature veio.
function diagnosticarCabecalhos(req, payId) {
  try {
    const h = req?.headers;
    const nomes = h
      ? (typeof h.keys === 'function' ? Array.from(h.keys()) : Object.keys(h))
      : [];
    const temAssinatura = !!lerCabecalho(req, 'x-signature');
    console.log(`[MP][DIAG] pagamento ${payId} · x-signature: ${temAssinatura ? 'VEIO' : 'NÃO VEIO'} · x-request-id: ${lerCabecalho(req, 'x-request-id') ? 'VEIO' : 'NÃO VEIO'} · user-agent: ${lerCabecalho(req, 'user-agent').slice(0, 60)} · cabeçalhos: ${nomes.join(',')}`);
  } catch (_) { /* diagnóstico nunca pode atrapalhar */ }
}

// 🔬 INVESTIGADOR DE MANIFESTO (21/08/2026) — roda SÓ quando a conferência falha.
//
// Quando a assinatura não bate, existem exatamente duas explicações, e elas pedem
// providências opostas:
//   (a) a CHAVE está errada — é de outra aplicação do Mercado Pago. Conserta-se
//       trocando MP_WEBHOOK_SECRET na Vercel, sem tocar em código.
//   (b) o MANIFESTO está errado — a gente monta o texto assinado de um jeito e o
//       MP monta de outro. Conserta-se no código, sem tocar em configuração.
//
// Chutar entre as duas custa um deploy e um pagamento de teste por tentativa.
// Então aqui a gente testa TODAS as montagens plausíveis do manifesto com a chave
// que está publicada. Se alguma bater, é o caso (b) e o log diz qual — conserto
// direto. Se NENHUMA bater, é o caso (a): a chave não é dessa aplicação.
//
// Nada de segredo vai pro log: o manifesto é feito de id de pagamento, id de
// requisição e carimbo de tempo. A chave nunca é impressa, e da assinatura só
// saem os 10 primeiros caracteres (hash truncado não serve pra forjar nada).
// Qual aplicação do Mercado Pago é a nossa? O access token traz o número da
// aplicação embutido no segundo pedaço (APP_USR-<aplicacao>-<data>-<hash>-<user>).
// Devolve SÓ esse número — nunca o token. O número da aplicação não é segredo:
// ele aparece na própria URL do painel do Mercado Pago (…/credentials?id=<numero>).
// Serve pra saber, sem chutar, de qual das aplicações copiar a assinatura secreta.
function idDaAplicacao() {
  const pedacos = String(process.env.MP_ACCESS_TOKEN || '').split('-');
  return /^\d{6,}$/.test(pedacos[1] || '') ? pedacos[1] : 'formato-inesperado';
}

function investigarManifesto({ segredo, idBody, idUrl, requestId, ts, v1 }) {
  try {
    const hmac = (texto) => crypto.createHmac('sha256', segredo).update(texto).digest('hex');
    const min = (x) => (/[a-zA-Z]/.test(String(x)) ? String(x).toLowerCase() : String(x));
    const variantes = [];
    const add = (nome, texto) => { if (texto) variantes.push([nome, texto]); };

    for (const [rotulo, bruto] of [['body', idBody], ['url', idUrl]]) {
      if (!bruto) continue;
      for (const [caso, valor] of [['min', min(bruto)], ['cru', String(bruto)]]) {
        add(`${rotulo}/${caso}/com-request-id`, requestId ? `id:${valor};request-id:${requestId};ts:${ts};` : '');
        add(`${rotulo}/${caso}/sem-request-id`, `id:${valor};ts:${ts};`);
        add(`${rotulo}/${caso}/sem-ponto-e-virgula-final`, requestId ? `id:${valor};request-id:${requestId};ts:${ts}` : '');
        add(`${rotulo}/${caso}/topico-antes`, `topic:payment;id:${valor};ts:${ts};`);
      }
    }

    // O formato ANTIGO (IPN Feed v2.0) chega com ?id=&topic= e NÃO tem data.id.
    // Nenhuma montagem oficial descreve o manifesto dele, então aqui entram as
    // formas plausíveis de um manifesto que simplesmente não carrega o id.
    add('legado/id-vazio', requestId ? `id:;request-id:${requestId};ts:${ts};` : '');
    add('legado/so-request-id', requestId ? `request-id:${requestId};ts:${ts};` : '');
    add('legado/so-ts', `ts:${ts};`);
    add('legado/ts-cru', String(ts));

    const alvo = String(v1 || '').toLowerCase();
    const acertou = variantes.find(([, texto]) => hmac(texto) === alvo);
    if (acertou) {
      console.error(`[MP][INVESTIGA] A CHAVE ESTÁ CERTA e o MANIFESTO É QUE ESTÁ ERRADO. Montagem que bate: "${acertou[0]}". Corrigir no código.`);
    } else {
      console.error(`[MP][INVESTIGA] NENHUMA das ${variantes.length} montagens bate com a chave publicada -> a MP_WEBHOOK_SECRET provavelmente e de OUTRA aplicacao do Mercado Pago. COPIAR A ASSINATURA SECRETA DA APLICACAO NUMERO ${idDaAplicacao()} (e a que o nosso MP_ACCESS_TOKEN usa; no painel do Mercado Pago esse numero aparece na URL, em credentials?id=...). id(body)=${idBody || '-'} id(url)=${idUrl || '-'} request-id=${requestId ? 'veio' : 'NAO veio'} ts=${ts} v1(10 primeiros)=${alvo.slice(0, 10)} nosso(10 primeiros)=${hmac(variantes[0] ? variantes[0][1] : '').slice(0, 10)}`);
    }
  } catch (e) { console.warn('[MP][INVESTIGA] falhou:', e?.message); }
}

// `legado` = a notificação chegou no formato antigo (IPN "Feed v2.0": ?id=&topic=,
// sem data.id). Ver o comentário do handler embaixo pra saber por que ele passa.
function conferirAssinatura(req, payId, idUrl = '', legado = false) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  const bloqueia = String(process.env.MP_WEBHOOK_MODO || '').toLowerCase() === 'bloquear';
  // Resultado quando a conferência falha: em modo observação vira aviso e passa.
  const reprovar = (motivo) => {
    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 21/08/2026 — POR QUE O FORMATO ANTIGO PASSA MESMO SEM CONFERIR
    // ══════════════════════════════════════════════════════════════════════════
    // Medido em produção: cada pagamento chega DUAS vezes, de dois remetentes
    // diferentes do próprio Mercado Pago:
    //   • "MercadoPago WebHook v1.0" — ?data.id=&type=payment — assinatura CONFERE
    //   • "MercadoPago Feed v2.0"    — ?id=&topic=payment     — assinatura NÃO confere
    // O segundo é o IPN antigo. Ele NÃO sai da configuração de Webhooks da
    // aplicação (desligar os eventos lá não o interrompe): é config de conta, de
    // outra época, e vem assinado com uma chave que não é a da aplicação. Não
    // existe, no painel, de onde copiar essa chave.
    //
    // Recusar esse remetente em modo bloqueio significaria devolver 401 pra metade
    // das notificações do Mercado Pago — ele reenviaria pra sempre, e o log de
    // erro viraria ruído permanente. Só que barrá-lo também não protege nada que
    // já não esteja protegido: o handler NÃO acredita no que chega. Ele pega o id,
    // vai na API do Mercado Pago com o NOSSO token e só age se o MP responder que
    // o pagamento existe e está aprovado. Forjar dinheiro por aqui não dá — o
    // máximo que alguém consegue, mandando um id real, é adiantar o processamento
    // de um pagamento que ia ser processado de qualquer jeito.
    //
    // Então: o formato NOVO é barrado se a assinatura não bater (é lá que mora a
    // proteção de verdade), e o formato ANTIGO passa com aviso no log. Se um dia
    // a investigação acertar o manifesto dele, esta exceção sai.
    if (legado) {
      console.warn(`[MP] Formato ANTIGO (IPN Feed v2.0) sem assinatura conferida (${motivo}) — liberado de propósito, o pagamento ainda é conferido na API do Mercado Pago. Pagamento ${payId}.`);
      return { ok: true, verificado: false, legado: true, motivo };
    }
    return bloqueia
      ? { ok: false, motivo }
      : (console.warn(`[MP] ASSINATURA NÃO CONFERE (${motivo}) — modo OBSERVAÇÃO, nada foi bloqueado. Pagamento ${payId}.`), { ok: true, verificado: false, motivo });
  };

  if (!segredo) {
    console.warn('[MP] MP_WEBHOOK_SECRET não publicada — webhook aceitando sem conferir assinatura (PONTO 122).');
    return { ok: true, verificado: false };
  }
  try {
    const cabecalho = lerCabecalho(req, 'x-signature');
    const requestId = lerCabecalho(req, 'x-request-id');
    const campos = {};
    for (const parte of cabecalho.split(',')) {
      const i = parte.indexOf('=');
      if (i > 0) campos[parte.slice(0, i).trim()] = parte.slice(i + 1).trim();
    }
    const ts = campos.ts;
    const v1 = campos.v1;
    if (!ts || !v1) return reprovar('x-signature ausente ou incompleto');

    // Manifesto exigido pelo MP: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
    // O id entra em minúsculas quando tem letra; pedaço sem valor sai do manifesto.
    const bruto = String(payId);
    const idNorm = /[a-zA-Z]/.test(bruto) ? bruto.toLowerCase() : bruto;
    let manifesto = `id:${idNorm};`;
    if (requestId) manifesto += `request-id:${requestId};`;
    manifesto += `ts:${ts};`;

    const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
    const a = Buffer.from(esperado, 'utf8');
    const b = Buffer.from(String(v1), 'utf8');
    // timingSafeEqual exige tamanhos iguais — comparar antes evita a exceção.
    const bate = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (bate) {
      if (!bloqueia) console.warn(`[MP] ASSINATURA CONFERE (modo OBSERVAÇÃO) — pagamento ${payId}. Pode publicar MP_WEBHOOK_MODO=bloquear.`);
      return { ok: true, verificado: true };
    }
    investigarManifesto({ segredo, idBody: payId, idUrl, requestId, ts, v1 });
    return reprovar('assinatura não confere');
  } catch (e) {
    return reprovar(`erro ao conferir assinatura: ${e?.message}`);
  }
}

export default async function handler(req, res) {
  // 🔴 PONTO 121: guarda o id da venda que ESTA execução marcou como paga. O
  // catch lá embaixo precisa saber disso pra devolver ao estado anterior — se
  // ficar dentro do try, ele não enxerga.
  let flipadaAgora = null;
  try {
    // ⚠️ Config ausente responde 500, não 200. Com 200 o Mercado Pago considera
    // entregue e NUNCA reenvia: uma janela de deploy quebrado engolia todas as
    // notificações do período, para sempre.
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ ok: false, error: 'config' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    // o id do pagamento vem em data.id (body) ou ?data.id / ?id (query)
    const url = new URL(req.url, 'http://x');
    const payId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || body?.id;
    if (!payId) return res.status(200).json({ ok: true, ignored: true });

    // 🔒 PONTO 122 (risco #27) — só depois de saber o payId dá pra montar o
    // manifesto que o Mercado Pago assina. Assinatura errada é 401 e para aqui:
    // não gasta chamada na API do MP nem consulta no banco.
    // GET continua aceito de propósito — a notificação IPN antiga do MP chega
    // como GET com ?topic=payment&id=..., e é justamente ela que as duas linhas
    // acima leem da query. Recusar GET desligaria esse caminho.
    if (!['POST', 'GET'].includes(String(req.method || '').toUpperCase())) {
      return res.status(405).json({ ok: false, error: 'metodo_nao_permitido' });
    }
    diagnosticarCabecalhos(req, payId);
    // O MP documenta o manifesto com o "data.id_url" — o valor que vem na QUERY da
    // notificação, que nem sempre é o mesmo do corpo. Vai junto pra investigação.
    // Formato antigo = veio `topic` e NÃO veio `data.id`. É a assinatura do IPN
    // "Feed v2.0" — ver o comentário dentro de conferirAssinatura.
    const formatoAntigo = !url.searchParams.get('data.id') && !!url.searchParams.get('topic');
    const assinatura = conferirAssinatura(
      req, payId, url.searchParams.get('data.id') || url.searchParams.get('id') || '', formatoAntigo
    );
    if (!assinatura.ok) {
      console.error(`[MP] NOTIFICAÇÃO RECUSADA — ${assinatura.motivo} (pagamento ${payId}).`);
      return res.status(401).json({ ok: false, error: 'assinatura_invalida' });
    }

    // BUSCA o pagamento real no MP (fonte de verdade — não confia no corpo do webhook)
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${payId}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    const pay = await r.json();
    if (!r.ok || !pay?.id) return res.status(200).json({ ok: true, notfound: true });

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 102 (21/08/2026) — CHARGEBACK ERA DESCARTADO EM SILÊNCIO
    // ══════════════════════════════════════════════════════════════════════════
    // Esta linha era só `if (pay.status !== 'approved') return { ok: true }`.
    // Qualquer status que não fosse 'approved' caía fora sem nada acontecer —
    // inclusive os que significam DINHEIRO INDO EMBORA:
    //
    //   charged_back  o comprador contestou no cartão e o banco estornou
    //   refunded      devolução total
    //   cancelled     pagamento cancelado depois de aprovado
    //
    // O estrago: a venda já tinha sido cumprida quando o pagamento aprovou —
    // estoque baixado, comissão de 30% creditada e sacável, escrow do vendedor
    // contando os 7 dias. Aí o dinheiro voltava pro comprador e o sistema
    // respondia "ok" pro Mercado Pago e seguia a vida. Ninguém era avisado.
    // A rede sacava a comissão de uma venda que foi estornada, e o prejuízo
    // aparecia só na conciliação bancária, semanas depois.
    //
    // Agora esses três statuses caem no MESMO cancelar_venda() que o
    // cancelamento manual usa (migração 20260821_cancelamento_estorna.sql):
    // prende o escrow, estorna a comissão já creditada e reporta o que não deu
    // pra recuperar de quem já sacou. Função atômica e idempotente — webhook do
    // MP dispara várias vezes e chamar de novo não estorna em dobro.
    //
    // ⚠️ 'in_mediation' (disputa aberta, dinheiro ainda não devolvido) NÃO entra
    // aqui de propósito: estornar comissão de uma disputa que a loja pode ganhar
    // puniria a rede à toa. Só registra alto no log pro humano acompanhar.
    const ESTORNADOS = ['charged_back', 'refunded', 'cancelled', 'canceled'];
    if (ESTORNADOS.includes(String(pay.status))) {
      const idVenda = pay.external_reference;
      console.error(`[MP] ESTORNO RECEBIDO (${pay.status}) — pagamento ${pay.id}, venda ${idVenda}. Desfazendo comissão e escrow.`);
      if (!idVenda) return res.status(200).json({ ok: true, status: pay.status, sem_referencia: true });
      // 🔴 PONTO 107 (21/08/2026) — `_devolver_ao_comprador: false`, EXPLÍCITO.
      // O valor já é o padrão da função, mas está escrito aqui de propósito pra
      // ninguém "consertar" isso por engano depois.
      //
      // No chargeback/refund o dinheiro JÁ VOLTOU pro comprador pelo cartão ou
      // pelo Mercado Pago. Se creditássemos a carteira também, a empresa perderia
      // a venda E daria saldo de presente — pagaria duas vezes pelo mesmo
      // estorno. Aqui só desfazemos a comissão e o escrow.
      //
      // Quem devolve é o cancelamento ADMINISTRATIVO (updateOrderStatus.js), onde
      // a empresa ficou com o dinheiro e precisa entregar de volta.
      const rpc = await sb('rpc/cancelar_venda', {
        method: 'POST',
        body: JSON.stringify({
          _sale_id: String(idVenda),
          _motivo: `Mercado Pago: ${pay.status} (pagamento ${pay.id})`,
          _devolver_ao_comprador: false,
        }),
      });
      if (!rpc.ok) {
        const t = await rpc.text();
        console.error(`[MP] FALHA AO ESTORNAR a venda ${idVenda} — resolver na mão: ${t.slice(0, 200)}`);
        return res.status(200).json({ ok: false, status: pay.status, estorno_falhou: true });
      }
      const estorno = await rpc.json().catch(() => null);
      console.error(`[MP] Estorno aplicado na venda ${idVenda}: ${JSON.stringify(estorno)}`);
      return res.status(200).json({ ok: true, status: pay.status, estornado: true, estorno });
    }
    if (String(pay.status) === 'in_mediation') {
      console.error(`[MP] DISPUTA ABERTA — pagamento ${pay.id}, venda ${pay.external_reference}. Nada foi estornado ainda; acompanhar.`);
      return res.status(200).json({ ok: true, status: pay.status, em_disputa: true });
    }

    if (pay.status !== 'approved') return res.status(200).json({ ok: true, status: pay.status });

    const saleId = pay.external_reference;
    const rows = await (await sb(`catalog_sales?select=*&or=(id.eq.${saleId},mp_payment_id.eq.${pay.id})&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ ok: true, sale_notfound: true });
    if (sale.status === 'paid') return res.status(200).json({ ok: true, already_paid: true }); // idempotência rápida

    // 🔒 FLIP ATÔMICO: o webhook do MP dispara VÁRIAS vezes. A checagem acima (ler-status →
    // marcar-paid) NÃO é atômica: dois webhooks liam 'pending' ao mesmo tempo, os dois passavam
    // e a comissão era paga EM DOBRO (aconteceu numa venda real). Aqui só flipa quem pegar a linha
    // AINDA em pending_payment; os outros recebem 0 linhas e param. Só quem flipou paga a comissão.
    //
    // 🔴 PONTO 121 (21/08/2026) — PIX PAGO EM PEDIDO CANCELADO (risco #11)
    // O filtro aceitava SÓ 'pending_payment'. Mas o cliente pode fechar o pedido,
    // desistir e clicar em Excluir: o sistema (certo) não apaga a linha, marca
    // 'canceled' justamente pra conseguir reconciliar se o pagamento chegar
    // atrasado. Só que o QR PIX continua vivo — nenhum criador de cobrança define
    // validade, e ninguém cancela a cobrança no MP. Se o cliente paga o QR antigo,
    // o flip não casava, o código caía no `already_paid` e respondia "ok".
    // Resultado: o dinheiro ENTROU, ninguém foi creditado, ninguém foi avisado, e
    // o log AFIRMAVA que já estava pago. A reconciliação que o comentário promete
    // simplesmente não existia.
    // Agora 'canceled'/'cancelado' também podem ser flipados: o pagamento é real e
    // o cliente tem direito ao que comprou. A barreira do `status === 'paid'` lá em
    // cima continua garantindo execução única.
    const flip = await sb(`catalog_sales?id=eq.${sale.id}&status=in.(pending_payment,canceled,cancelado,cancelled)`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'paid', mp_payment_id: String(pay.id) }),
    });
    const flipped = await flip.json().catch(() => []);
    if (!Array.isArray(flipped) || !flipped.length) {
      // 🔴 PONTO 121 — "não consegui virar" NÃO é "já estava paga".
      // Antes os dois casos devolviam a mesma resposta alegre. Se a venda está
      // mesmo 'paid', é corrida de webhook e está tudo bem. Qualquer OUTRO estado
      // aqui significa dinheiro que entrou e não foi processado — e isso não pode
      // sair com 200/ok, senão o Mercado Pago para de reenviar e o caso se perde.
      const conf = await (await sb(`catalog_sales?select=status&id=eq.${sale.id}&limit=1`)).json().catch(() => null);
      const agora = Array.isArray(conf) ? conf[0]?.status : null;
      if (agora === 'paid') {
        return res.status(200).json({ ok: true, already_paid: true, raced: true }); // outro webhook já pagou
      }
      console.error(`[MP] PAGAMENTO RECEBIDO E NÃO PROCESSADO — venda ${sale.id} está em '${agora}', pagamento ${pay.id}, R$ ${pay.transaction_amount}. Resolver na mão.`);
      return res.status(500).json({ ok: false, nao_processado: true, sale_id: sale.id, status_atual: agora });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 121 — O FLIP ACONTECE ANTES DO CRÉDITO (risco #10)
    // ══════════════════════════════════════════════════════════════════════════
    // A venda é marcada 'paid' aqui, e só DEPOIS o efeito acontece (creditar a
    // carteira, ativar a adesão, ativar o plano, liberar o produto). Se qualquer
    // coisa falhar nesse meio — conflito de escrita, comprador inexistente,
    // timeout, erro do banco — o sistema respondia 'ok' e seguia. Quando o
    // Mercado Pago reenviava, a barreira do `status === 'paid'` barrava na hora e
    // o crédito NUNCA mais acontecia. Sem alerta, sem fila, sem reconciliação.
    //
    // A rede de segurança abaixo, `devolverPendente`, é usada em todos os
    // caminhos de efeito: se o efeito falhar ou estourar, a venda VOLTA para
    // 'pending_payment' e a resposta sai 500 — o MP reenvia e a próxima tentativa
    // refaz o trabalho do zero. É preferível reprocessar do que perder.
    flipadaAgora = sale.id;

    const devolverPendente = async (motivo, extra = {}) => {
      try {
        await sb(`catalog_sales?id=eq.${sale.id}&status=eq.paid`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'pending_payment' }),
        });
      } catch (_) { /* o log abaixo é o que garante o rastro */ }
      console.error(`[MP] EFEITO FALHOU após marcar como paga — venda ${sale.id} devolvida para pending_payment. Motivo: ${motivo}. Pagamento ${pay.id}.`);
      return res.status(500).json({ ok: false, efeito_falhou: true, sale_id: sale.id, motivo, ...extra });
    };

    // 🏪 PDV (balcão) pago com PIX real: só AGORA baixa estoque e paga comissão
    if (sale.source === 'pdv') {
      const r = await settlePdvPixSale(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    // 🏪 REPOSIÇÃO DE ESTOQUE (compra firme do lojista): a mercadoria só sai do
    // estoque central e entra no estoque da loja agora, com o dinheiro confirmado.
    // Abastecimento NÃO é venda ao consumidor: nenhuma comissão é paga aqui.
    if (sale.kind === 'reposicao') {
      const r = await aplicarReposicao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, reposicao: true, ...r });
    }
    if (sale.kind === 'passaporte') {
      // Passaporte de Lances — REGRA OFICIAL (restaurada 19/08/2026, autorizado pelo
      // dono): o valor pago vira saldo de lance normal; o bônus de 10% nasce como
      // CUPOM BLOQUEADO (à parte, nunca soma no saldo de lance). Só libera pra usar
      // na Loja Virtual se o leilão terminar e o usuário NÃO arrematar; se arrematar,
      // o cupom é cancelado (ver finalizeAuctionCore.js).
      const r = await creditWalletDeposit({ ...sale, kind: 'wallet_deposit' });
      try {
        await sb('passaportes', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: sale.buyer_id, sale_id: sale.id, valor: round2(Number(sale.total_amount) || 0),
            status: 'ativo',
          }),
        });
      } catch (_) { /* crédito já entrou; registro do passaporte é secundário */ }
      // 🎟️ Cupom de 10% nasce BLOQUEADO — nunca entra no saldo de lance.
      const bonus = await criarCupomPassaporte(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, passaporte: true, ...r, bonus });
    }
    if (sale.kind === 'operacao_deposit') {
      // 💵 saldo de operação: só credita. Sem comissão, sem bônus, sem estoque.
      const r = await creditWalletDeposit(sale);
      // 🔴 PONTO 121: creditWalletDeposit NÃO lança exceção — devolve
      // { credited: 0, error: 'cas_conflict' | 'buyer_notfound' }. Antes esse erro
      // virava só um campo na resposta 200 e ninguém no repositório inteiro lia
      // esses códigos. Dinheiro entrava e o saldo não subia, calado.
      if (!r.credited) return devolverPendente(`credito_operacao_falhou:${r.error || 'sem_credito'}`, r);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, operacao: true, ...r });
    }
    if (sale.kind === 'wallet_deposit' || sale.kind === 'commission_deposit') {
      // recarga de carteira: credita saldo e para aqui (sem fulfillment, sem comissão)
      const r = await creditWalletDeposit(sale);
      // 🔴 PONTO 121: sem crédito, a venda VOLTA pra pendente e a resposta sai 500 —
      // o Mercado Pago reenvia e a próxima tentativa credita. Antes o cliente pagava
      // o PIX, o saldo não subia, e o webhook respondia "ok" pro MP nunca mais tentar.
      if (!r.credited) return devolverPendente(`credito_deposito_falhou:${r.error || 'sem_credito'}`, r);
      // 🎟️ Cupom de 10% também no aporte de carteira (>= R$ 100) — bloqueado, à
      // parte do saldo de lance (mesma regra do passaporte, ver comentário acima).
      const bonus = sale.kind === 'wallet_deposit' ? await criarCupomPassaporte(sale) : null;
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, deposit: true, ...r, bonus });
    }
    if (sale.kind === 'adesao') {
      const r = await activateAdesao(sale);
      // 💰 DIR-7 — taxa de adesão: empresa fica com o valor cheio, sem repasse a terceiro.
      await registrarReceita({ description: `Adesão — ${sale.buyer_name || sale.id}`, category: 'taxa_adesao', costCenter: 'Operacional', amount: sale.total_amount, source: 'taxa', saleId: sale.id });
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'seller_adhesion') {
      const r = await creditSellerAdhesion(sale);
      await registrarReceita({ description: `Adesão de vendedor — ${sale.buyer_name || sale.id}`, category: 'taxa_adesao_vendedor', costCenter: 'Operacional', amount: sale.total_amount, source: 'taxa', saleId: sale.id });
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, seller_adhesion: true, ...r });
    }
    if (sale.kind === 'partner_plan') {
      const r = await activatePartnerPlan(sale);
      await registrarReceita({ description: `Plano parceiro — ${sale.buyer_name || sale.id}`, category: 'plano_parceiro', costCenter: 'Operacional', amount: sale.total_amount, source: 'taxa', saleId: sale.id });
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'seller_freight') {
      // Frete da Etapa 2 do "Seja Vendedor": o flip acima já marcou como 'paid'.
      // Sem fulfillment/comissão — a página só espera esse status pra liberar "Fechar pedido".
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, freight: true });
    }
    if (sale.kind === 'loja') {
      const r = await fulfillStoreOrder(sale);
      // 🎟️ só agora (pagamento confirmado) o crédito do Cupom Passaporte é debitado
      const cupom = await debitarCupomDaVenda(sale);
      // 🚚 Frete automático: adiciona ao carrinho e compra a etiqueta na Melhor Envio.
      // Best-effort — nunca bloqueia a venda já paga/comissionada acima.
      const envio = await gerarEnvioAutomatico(sale);
      // 💰 DIR-7 — só a COMISSÃO é receita da empresa (o resto vai pro vendedor terceiro).
      await registrarReceita({ description: `Comissão — venda Loja Virtual #${sale.id}`, category: 'comissao_loja', costCenter: 'Loja Virtual', amount: r?.commission, source: 'venda', saleId: sale.id });
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r, cupom, envio });
    }
    // 💰 PLANO DIRETOR também para venda de produto (antes usava o motor velho, que não
    // pagava NADA ao bloco diretor). fulfillStoreOrder aplica a mesma regra de 26%.
    const rr = await fulfillStoreOrder(sale);
    const commission = rr?.commission ?? 0;
    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
    const envio2 = await gerarEnvioAutomatico(sale);
    // 💰 DIR-7 — arremate de leilão cai aqui (kind 'arremate'); qualquer outro produto
    // avulso sem kind específico também. Separa por centro de custo pra não misturar.
    await registrarReceita({
      description: `Comissão — ${sale.kind === 'arremate' ? 'arremate' : 'venda'} #${sale.id}`,
      category: sale.kind === 'arremate' ? 'comissao_leilao' : 'comissao_loja',
      costCenter: sale.kind === 'arremate' ? 'Leilões' : 'Loja Virtual',
      amount: commission, source: 'venda', saleId: sale.id,
    });
    return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, commission, envio: envio2 });
  } catch (e) {
    // 🔴 PONTO 121 (21/08/2026) — EXCEÇÃO DEPOIS DO FLIP NÃO PODE SAIR COM 200.
    // Antes qualquer estouro aqui virava `{ ok: false }` com HTTP 200. Pro Mercado
    // Pago, 200 quer dizer "recebi e resolvi" — ele para de reenviar. Só que a
    // venda já estava marcada 'paid' e o efeito não tinha acontecido: o crédito
    // nunca mais vinha, e não havia alerta, fila de pendência nem reconciliação.
    //
    // Agora: se esta execução chegou a marcar a venda como paga, ela é DEVOLVIDA
    // para 'pending_payment' e a resposta sai 500. O MP reenvia e a próxima
    // tentativa refaz o trabalho do zero. Reprocessar é sempre melhor que perder.
    if (flipadaAgora) {
      try {
        await sb(`catalog_sales?id=eq.${flipadaAgora}&status=eq.paid`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'pending_payment' }),
        });
      } catch (_) { /* o log abaixo é o rastro que sobra */ }
      console.error(`[MP] EXCEÇÃO após marcar como paga — venda ${flipadaAgora} devolvida para pending_payment: ${e?.message}`);
      return res.status(500).json({ ok: false, efeito_falhou: true, sale_id: flipadaAgora, error: String(e?.message || e) });
    }
    console.error(`[MP] Exceção no webhook: ${e?.message}`);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}