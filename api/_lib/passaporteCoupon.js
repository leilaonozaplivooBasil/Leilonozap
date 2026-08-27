// passaporteCoupon — motor do Cupom Passaporte (crédito de 10% do valor aportado).
//
// Nasce BLOQUEADO no confirm do depósito. Cada leilão disputado resolve SÓ A FATIA
// dele: se o usuário deu um lance de R$X naquele leilão e NÃO ganhou, libera 10% de
// R$X (não 10% do depósito inteiro) pra Loja Virtual. Se ganhou, cancela essa mesma
// fatia (o valor pago virou compra).
//
// 🔒 REGRA CORRIGIDA (19/08/2026, autorizado pelo dono) — antes o cupom liberava
// INTEIRO na primeira derrota, não importa o tamanho do lance. Isso permitia
// depositar R$100, perder de propósito um lance de R$1, e destravar o bônus de
// R$10 inteiro sem nunca ter arriscado o depósito de verdade. Agora cada leilão
// só libera/cancela a fatia proporcional ao que foi realmente apostado nele —
// quem fatiar o depósito em vários lances recebe o bônus em fatias, conforme cada
// leilão se resolve.
//
// Consumo em FIFO pelos cupons mais antigos do usuário que ainda tenham saldo
// bloqueado — mesmo padrão já usado em recolherBonusPorArremate (passaporteBonus.js)
// pro modelo anterior. Se a soma de "10% de cada lance perdido" ultrapassar o total
// do bônus (dinheiro reciclado entre leilões sequenciais), o consumo simplesmente
// para quando o cupom zera — nunca libera/cancela mais do que os 10% do depósito.
//
// Tudo aqui roda com service role e NUNCA lança erro pra fora: é um efeito
// secundário — falha aqui não pode derrubar pagamento, lance nem arremate.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PCT_PASSAPORTE = 10;
export const DEPOSITO_MINIMO = 100;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = encodeURIComponent;
const ok = () => Boolean(SUPABASE_URL && SR);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Cria o cupom BLOQUEADO de um depósito confirmado. Idempotente por origin_sale_id. */
export async function criarCupomPassaporte(sale) {
  try {
    if (!ok()) return { created: false, reason: 'config' };
    const userId = String(sale?.buyer_id || '').trim();
    const aporte = money(sale?.total_amount || sale?.sale_price);
    if (!userId || aporte < DEPOSITO_MINIMO) return { created: false, reason: 'abaixo_do_minimo' };

    const credito = money(aporte * PCT_PASSAPORTE / 100);
    const r = await sb('passaporte_coupons', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        origin_sale_id: String(sale.id),
        valor_aportado: aporte,
        pct: PCT_PASSAPORTE,
        valor_credito: credito,
        // nada é gastável no nascimento — só existe saldo_restante depois que uma
        // fatia é liberada de verdade (ver liberarCupomPassaporte)
        saldo_restante: 0,
        status: 'bloqueado',
      }),
    });
    if (!r.ok) return { created: false, reason: 'duplicado_ou_erro' }; // UNIQUE = já existe
    return { created: true, valor_credito: credito };
  } catch (e) {
    return { created: false, reason: String(e?.message || e) };
  }
}

/**
 * Consome `alvo` do saldo BLOQUEADO do usuário, em FIFO pelos cupons mais antigos,
 * gravando o resultado no campo indicado ('valor_liberado' ou 'valor_cancelado').
 * Nunca consome mais do que existe de bloqueado em cada cupom. CAS por linha.
 *
 * 🔴 BUG CORRIGIDO EM 27/08/2026 — BÔNUS PAGO DUAS VEZES.
 *
 * Esta consulta lia TODOS os cupons do usuário, sem filtro nenhum. Entre 01/08 e
 * 19/08 valeu o modelo A (passaporteBonus.js): o bônus era somado DIRETO em
 * app_users.saldo_disponivel no ato do depósito, e o cupom ficava só como registro
 * de auditoria, com status 'creditado'.
 *
 * Só que um cupom desses guarda valor_credito = 10 com valor_liberado e
 * valor_cancelado zerados — que é EXATAMENTE a aparência de um cupom bloqueado do
 * modelo B. A conta `valor_credito - valor_liberado - valor_cancelado` dava 10, e o
 * encerramento do leilão liberava, como crédito de Loja Virtual, um bônus que já
 * tinha sido pago na carteira semanas antes.
 *
 * Medido no banco em 27/08/2026: R$ 76,09 pagos em dobro, 10 cupons, 8 pessoas —
 * R$ 6,06 pelo encerramento automático e R$ 70,03 amplificados por uma liberação
 * retroativa em lote. Nada tinha sido gasto ainda.
 *
 * A separação certa é por dono: cupom do modelo A pertence a passaporteBonus.js
 * (credita no depósito, recolhe no arremate). Cupom do modelo B pertence a este
 * arquivo. `bonus_creditado_em` é a marca que distingue os dois — só o modelo A
 * preenche essa coluna. O filtro abaixo vale para liberação E para cancelamento:
 * nenhum dos dois tem o que fazer num cupom que não é dele.
 */
async function consumirBloqueado(userId, alvo, campo, extraFields = {}) {
  const uid = String(userId || '').trim();
  const total = money(alvo);
  if (!uid || total <= 0) return { consumido: 0 };

  const rows = await (await sb(
    `passaporte_coupons?select=id,valor_credito,valor_liberado,valor_cancelado,saldo_restante` +
    `&user_id=eq.${enc(uid)}&bonus_creditado_em=is.null&order=created_at.asc`
  )).json().catch(() => []);
  const lista = Array.isArray(rows) ? rows : [];

  let restaConsumir = total;
  let consumido = 0;
  for (const c of lista) {
    if (restaConsumir <= 0) break;
    const jaLiberado = money(c.valor_liberado);
    const jaCancelado = money(c.valor_cancelado);
    const bloqueadoNoCupom = money(money(c.valor_credito) - jaLiberado - jaCancelado);
    if (bloqueadoNoCupom <= 0) continue;

    const tirarDoCupom = money(Math.min(bloqueadoNoCupom, restaConsumir));
    const jaNoCampo = money(c[campo]);
    const casFilter = `${campo}=eq.${jaNoCampo}`;

    const patch = { [campo]: money(jaNoCampo + tirarDoCupom), ...extraFields };
    if (campo === 'valor_liberado') {
      patch.saldo_restante = money(money(c.saldo_restante) + tirarDoCupom);
      patch.status = 'liberado';
    }

    const claim = await sb(`passaporte_coupons?id=eq.${enc(c.id)}&${casFilter}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const claimed = await claim.json().catch(() => []);
    if (!Array.isArray(claimed) || !claimed.length) continue; // corrida: outra chamada mexeu neste cupom, segue pro próximo

    consumido = money(consumido + tirarDoCupom);
    restaConsumir = money(restaConsumir - tirarDoCupom);
  }
  return { consumido };
}

/**
 * Libera a FATIA do cupom correspondente a um lance que NÃO ganhou o leilão:
 * 10% do valor daquele lance específico (não do depósito inteiro). Chamado só
 * na RESOLUÇÃO do leilão (fim), nunca no meio de uma simples cobertura — quem
 * foi só superado ainda pode relançar e vencer.
 */
export async function liberarCupomPassaporte(userId, auctionId = null, valorLance = null) {
  try {
    if (!ok()) return { released: 0 };
    const alvo = money((money(valorLance) * PCT_PASSAPORTE) / 100);
    if (alvo <= 0) return { released: 0, reason: 'valor_lance_invalido' };
    const { consumido } = await consumirBloqueado(userId, alvo, 'valor_liberado', {
      liberado_em: new Date().toISOString(),
      ...(auctionId ? { auction_id_disputado: String(auctionId) } : {}),
    });
    return { released: consumido, alvo };
  } catch (e) {
    return { released: 0, reason: String(e?.message || e) };
  }
}

/**
 * Cancela a FATIA do cupom correspondente ao lance que GANHOU o leilão: 10% do
 * valor arrematado (não do depósito inteiro) — o valor pago virou compra.
 */
export async function cancelarCuponsBloqueados(userId, valorArrematado = null) {
  try {
    if (!ok()) return { canceled: 0 };
    const alvo = money((money(valorArrematado) * PCT_PASSAPORTE) / 100);
    if (alvo <= 0) return { canceled: 0, reason: 'valor_arremate_invalido' };
    const { consumido } = await consumirBloqueado(userId, alvo, 'valor_cancelado');
    return { canceled: consumido, alvo };
  } catch (e) {
    return { canceled: 0, reason: String(e?.message || e) };
  }
}

/**
 * Situação agregada dos cupons do usuário (para a Carteira e o carrinho).
 *
 * 27/08/2026 — duas correções, pelo mesmo motivo do bug acima:
 *
 * ① `tem_bloqueado` passou a contar SÓ cupom do modelo B. Um cupom do modelo A
 *    (bonus_creditado_em preenchido) tem valor_credito cheio e nada consumido, então
 *    entrava na conta e a Carteira dizia "seu crédito libera quando o leilão
 *    terminar" — para um bônus que já estava no saldo da pessoa e que nunca vai
 *    liberar nada. Era a mesma mentira do bug, só que na tela.
 *
 * ② passou a devolver QUANTO está bloqueado, não só se existe. A Carteira mostrava
 *    "você tem crédito bloqueado" sem dizer o valor, e o cliente ficava sem saber se
 *    eram R$ 10 ou R$ 45 esperando o leilão fechar — o que alimentava a sensação de
 *    que o bônus tinha sumido (pedido do dono: "isso precisa ficar explícito na
 *    carteira").
 *
 * O saldo GASTÁVEL continua somando todos os cupons: um cupom do modelo A corrigido
 * tem saldo_restante zero e não soma nada, e cupom antigo já liberado de verdade
 * precisa continuar valendo.
 */
export async function statusCupons(userId) {
  const vazio = { liberado: null, tem_bloqueado: false, bloqueado: null };
  if (!ok()) return vazio;
  const uid = String(userId || '').trim();
  if (!uid) return vazio;
  const rows = await (await sb(
    `passaporte_coupons?select=id,valor_credito,valor_liberado,valor_cancelado,saldo_restante,valor_aportado,bonus_creditado_em` +
    `&user_id=eq.${enc(uid)}&order=created_at.asc`
  )).json().catch(() => []);
  const lista = Array.isArray(rows) ? rows : [];

  const gastavelTotal = lista.reduce((s, c) => s + money(c.saldo_restante), 0);
  const creditoLiberadoTotal = lista.reduce((s, c) => s + money(c.valor_liberado), 0);
  const aporteTotal = lista.reduce((s, c) => s + money(c.valor_aportado), 0);

  // só cupom do modelo B (bonus_creditado_em vazio) tem crédito esperando leilão
  const bloqueadoTotal = lista.reduce((s, c) => {
    if (c.bonus_creditado_em) return s;
    const resta = money(c.valor_credito) - money(c.valor_liberado) - money(c.valor_cancelado);
    return resta > 0 ? s + resta : s;
  }, 0);

  return {
    liberado: gastavelTotal > 0
      ? { saldo: money(gastavelTotal), credito: money(creditoLiberadoTotal), aporte: money(aporteTotal) }
      : null,
    tem_bloqueado: bloqueadoTotal > 0,
    bloqueado: bloqueadoTotal > 0 ? { saldo: money(bloqueadoTotal) } : null,
  };
}

/**
 * Quanto o crédito liberado (somado entre TODOS os cupons do usuário) abate de
 * um total. Sem teto: abate até o total inteiro, limitado ao saldo disponível.
 */
export async function calcularDesconto(userId, total) {
  try {
    const { liberado } = await statusCupons(userId);
    if (!liberado) return null;
    const desconto = money(Math.min(liberado.saldo, money(total)));
    if (desconto <= 0) return null;
    return { desconto, saldo_antes: liberado.saldo };
  } catch (_) {
    return null; // sem cupom → cobra cheio (nunca bloqueia a venda)
  }
}

/**
 * Debita `amount` do crédito liberado do usuário, consumindo em FIFO por TODOS
 * os cupons com saldo_restante > 0 — o usuário pode ter mais de um cupom liberado
 * ao mesmo tempo (vários depósitos, vários leilões resolvidos). CAS por linha.
 */
export async function debitarCupomMultiplo(userId, amount, saleId = null) {
  try {
    if (!ok()) return { debited: 0 };
    const uid = String(userId || '').trim();
    const valor = money(amount);
    if (!uid || valor <= 0) return { debited: 0 };

    const rows = await (await sb(
      `passaporte_coupons?select=id,saldo_restante,primeiro_uso_em&user_id=eq.${enc(uid)}&saldo_restante=gt.0&order=created_at.asc`
    )).json().catch(() => []);
    const lista = Array.isArray(rows) ? rows : [];

    let restaDebitar = valor;
    let total = 0;
    for (const c of lista) {
      if (restaDebitar <= 0) break;
      const saldo = money(c.saldo_restante);
      if (saldo <= 0) continue;
      const debitar = money(Math.min(restaDebitar, saldo));
      const novo = money(saldo - debitar);

      const patch = await sb(`passaporte_coupons?id=eq.${enc(c.id)}&saldo_restante=eq.${saldo}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          saldo_restante: novo,
          primeiro_uso_em: c.primeiro_uso_em || new Date().toISOString(),
        }),
      });
      const updated = await patch.json().catch(() => []);
      if (!Array.isArray(updated) || !updated.length) continue; // corrida: outra compra mexeu, segue pro próximo cupom

      total = money(total + debitar);
      restaDebitar = money(restaDebitar - debitar);
    }
    return { debited: total, sale_id: saleId || null };
  } catch (e) {
    return { debited: 0, reason: String(e?.message || e) };
  }
}

/** Debita o crédito Passaporte usado numa venda paga (lido de raw_base44). */
export async function debitarCupomDaVenda(sale) {
  try {
    const userId = String(sale?.buyer_id || '').trim();
    const amount = money(sale?.raw_base44?.passaporte_desconto);
    if (!userId || amount <= 0) return { debited: 0, skipped: true };
    return await debitarCupomMultiplo(userId, amount, sale.id);
  } catch (e) {
    return { debited: 0, reason: String(e?.message || e) };
  }
}
